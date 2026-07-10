const SHEETS = {
  users: "Users",
  bookings: "Bookings"
};

const USER_HEADERS = [
  "id",
  "name",
  "email",
  "passwordHash",
  "passwordSalt",
  "role",
  "approvalStatus",
  "createdAt",
  "updatedAt",
  "sessionToken"
];

const BOOKING_HEADERS = [
  "id",
  "customerName",
  "phone",
  "tripStartDate",
  "tripEndDate",
  "tripType",
  "packageLocation",
  "hotelName",
  "hotelAddress",
  "hotelPhone",
  "rooms",
  "pax",
  "status",
  "notes",
  "createdBy",
  "createdAt",
  "updatedAt"
];

function setup() {
  getOrCreateSheet_(SHEETS.users, USER_HEADERS);
  getOrCreateSheet_(SHEETS.bookings, BOOKING_HEADERS);

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("OWNER_CODE")) {
    props.setProperty("OWNER_CODE", "930997Ay");
  }

  return json_({
    ok: true,
    message: "Setup siap. Deploy sebagai Web App selepas ini."
  });
}

function doGet() {
  return json_({
    ok: true,
    message: "Record Oppa Ninja Google Sheet API aktif."
  });
}

function doPost(e) {
  try {
    const request = parseRequest_(e);
    const result = route_(request);
    return json_({
      ok: true,
      ...result
    });
  } catch (error) {
    return json_({
      ok: false,
      message: error.message || "Ralat Google Sheet."
    });
  }
}

function route_(request) {
  setupSheets_();

  switch (request.action) {
    case "verifyOwner":
      assertOwner_(request.ownerCode);
      return { ownerName: "Owner" };
    case "registerUser":
      return registerUser_(request);
    case "loginUser":
      return loginUser_(request);
    case "getUser":
      return getUser_(request);
    case "updateUser":
      return updateUser_(request);
    case "listUsers":
      assertOwner_(request.ownerCode);
      return listUsers_();
    case "updateUserStatus":
      assertOwner_(request.ownerCode);
      return updateUserStatus_(request);
    case "deleteUser":
      assertOwner_(request.ownerCode);
      return deleteUser_(request);
    case "listBookings":
      return listBookings_(request);
    case "createBooking":
      return createBooking_(request);
    case "updateBooking":
      return updateBooking_(request);
    case "deleteBooking":
      return deleteBooking_(request);
    default:
      throw new Error("Action tidak sah.");
  }
}

function registerUser_(request) {
  const name = cleanText_(request.name);
  const email = normalizeEmail_(request.email);
  const password = String(request.password || "");

  if (!name || !email || password.length < 6) {
    throw new Error("Nama, email dan password wajib diisi.");
  }

  const usersSheet = getOrCreateSheet_(SHEETS.users, USER_HEADERS);
  const users = readObjects_(usersSheet, USER_HEADERS);
  if (users.some((user) => normalizeEmail_(user.email) === email)) {
    throw new Error("Email ini sudah berdaftar.");
  }

  const salt = Utilities.getUuid();
  const user = {
    id: createId_("user"),
    name,
    email,
    passwordHash: hashPassword_(password, salt),
    passwordSalt: salt,
    role: "user",
    approvalStatus: "pending",
    createdAt: now_(),
    updatedAt: now_()
  };

  appendObject_(usersSheet, USER_HEADERS, user);
  return {
    user: publicUser_(user)
  };
}

function loginUser_(request) {
  const email = normalizeEmail_(request.email);
  const password = String(request.password || "");
  const sheet = getOrCreateSheet_(SHEETS.users, USER_HEADERS);
  const users = readObjects_(sheet, USER_HEADERS);
  const rowIndex = users.findIndex((item) => normalizeEmail_(item.email) === email);
  const user = users[rowIndex];

  if (!user || !verifyPassword_(password, user.passwordSalt, user.passwordHash)) {
    throw new Error("Email atau password tidak betul.");
  }

  if (user.approvalStatus !== "approved") {
    throw new Error(user.approvalStatus === "rejected" ? "Akaun ini tidak diluluskan oleh owner." : "Akaun ini masih menunggu approval owner.");
  }

  const updated = {
    ...user,
    sessionToken: createId_("session"),
    updatedAt: now_()
  };
  writeObjectAt_(sheet, USER_HEADERS, rowIndex + 2, updated);

  return {
    user: publicUser_(updated),
    sessionToken: updated.sessionToken
  };
}

function getUser_(request) {
  const { user } = getUserRecordBySession_(request.userId, request.sessionToken);
  return {
    user: publicUser_(user)
  };
}

function updateUser_(request) {
  const { sheet, users, rowIndex, user } = getUserRecordBySession_(request.userId, request.sessionToken);
  const name = cleanText_(request.name);
  const email = normalizeEmail_(request.email);
  const currentPassword = String(request.currentPassword || "");
  const newPassword = String(request.newPassword || "");

  if (!name || !email || !currentPassword) {
    throw new Error("Nama, email dan password sekarang wajib diisi.");
  }

  if (!verifyPassword_(currentPassword, user.passwordSalt, user.passwordHash)) {
    throw new Error("Password sekarang tidak betul.");
  }

  if (newPassword && newPassword.length < 6) {
    throw new Error("Password baru mesti sekurang-kurangnya 6 aksara.");
  }

  const duplicate = users.some((item) => item.id !== user.id && normalizeEmail_(item.email) === email);
  if (duplicate) {
    throw new Error("Email ini sudah digunakan oleh akaun lain.");
  }

  const updated = {
    ...user,
    name,
    email,
    updatedAt: now_()
  };

  if (newPassword) {
    updated.passwordSalt = Utilities.getUuid();
    updated.passwordHash = hashPassword_(newPassword, updated.passwordSalt);
  }

  writeObjectAt_(sheet, USER_HEADERS, rowIndex + 2, updated);
  return {
    user: publicUser_(updated)
  };
}

function listUsers_() {
  const users = readObjects_(getOrCreateSheet_(SHEETS.users, USER_HEADERS), USER_HEADERS)
    .filter((user) => user.role !== "owner")
    .map(publicUser_);

  return { users };
}

function updateUserStatus_(request) {
  const status = cleanText_(request.status);
  if (!["pending", "approved", "rejected", "deleted"].includes(status)) {
    throw new Error("Status tidak sah.");
  }

  const sheet = getOrCreateSheet_(SHEETS.users, USER_HEADERS);
  const users = readObjects_(sheet, USER_HEADERS);
  const rowIndex = users.findIndex((user) => user.id === request.userId && user.role !== "owner");
  if (rowIndex < 0) throw new Error("User tidak dijumpai.");

  const updated = {
    ...users[rowIndex],
    approvalStatus: status,
    updatedAt: now_()
  };
  writeObjectAt_(sheet, USER_HEADERS, rowIndex + 2, updated);
  return {
    user: publicUser_(updated)
  };
}

function deleteUser_(request) {
  const sheet = getOrCreateSheet_(SHEETS.users, USER_HEADERS);
  const users = readObjects_(sheet, USER_HEADERS);
  const rowIndex = users.findIndex((user) => user.id === request.userId && user.role !== "owner");
  if (rowIndex < 0) throw new Error("User tidak dijumpai.");

  sheet.deleteRow(rowIndex + 2);
  return { deleted: true };
}

function listBookings_(request) {
  assertAccess_(request);
  const bookings = readObjects_(getOrCreateSheet_(SHEETS.bookings, BOOKING_HEADERS), BOOKING_HEADERS)
    .map(publicBooking_);
  return { bookings };
}

function createBooking_(request) {
  assertAccess_(request);
  const sheet = getOrCreateSheet_(SHEETS.bookings, BOOKING_HEADERS);
  const booking = normalizeBooking_(request.booking || {});
  const now = now_();
  const row = {
    ...booking,
    id: createId_("booking"),
    createdAt: now,
    updatedAt: now
  };

  appendObject_(sheet, BOOKING_HEADERS, row);
  return {
    booking: publicBooking_(row)
  };
}

function updateBooking_(request) {
  assertAccess_(request);
  const sheet = getOrCreateSheet_(SHEETS.bookings, BOOKING_HEADERS);
  const bookings = readObjects_(sheet, BOOKING_HEADERS);
  const booking = normalizeBooking_(request.booking || {});
  const rowIndex = bookings.findIndex((item) => item.id === request.booking.id);
  if (rowIndex < 0) throw new Error("Booking tidak dijumpai.");

  const updated = {
    ...bookings[rowIndex],
    ...booking,
    id: bookings[rowIndex].id,
    createdAt: bookings[rowIndex].createdAt,
    updatedAt: now_()
  };

  writeObjectAt_(sheet, BOOKING_HEADERS, rowIndex + 2, updated);
  return {
    booking: publicBooking_(updated)
  };
}

function deleteBooking_(request) {
  assertAccess_(request);
  const sheet = getOrCreateSheet_(SHEETS.bookings, BOOKING_HEADERS);
  const bookings = readObjects_(sheet, BOOKING_HEADERS);
  const rowIndex = bookings.findIndex((booking) => booking.id === request.id);
  if (rowIndex < 0) throw new Error("Booking tidak dijumpai.");

  sheet.deleteRow(rowIndex + 2);
  return { deleted: true };
}

function normalizeBooking_(booking) {
  const row = {
    customerName: cleanText_(booking.customerName),
    phone: cleanText_(booking.phone),
    tripStartDate: cleanText_(booking.tripStartDate),
    tripEndDate: cleanText_(booking.tripEndDate),
    tripType: ["Private", "Open Group"].includes(booking.tripType) ? booking.tripType : "Private",
    packageLocation: cleanText_(booking.packageLocation),
    hotelName: cleanText_(booking.hotelName),
    hotelAddress: cleanText_(booking.hotelAddress),
    hotelPhone: cleanText_(booking.hotelPhone),
    rooms: Array.isArray(booking.rooms) ? booking.rooms : [],
    pax: Array.isArray(booking.pax) ? booking.pax : [],
    status: ["Baru", "Disahkan", "Selesai", "Batal"].includes(booking.status) ? booking.status : "Baru",
    notes: cleanText_(booking.notes),
    createdBy: cleanText_(booking.createdBy)
  };

  if (!row.customerName || !row.phone || !row.tripStartDate || !row.tripEndDate || !row.packageLocation || !row.hotelName) {
    throw new Error("Lengkapkan semua maklumat booking wajib.");
  }

  if (!row.rooms.length || !row.pax.length) {
    throw new Error("Lengkapkan jenis bilik dan jumlah pax.");
  }

  return row;
}

function setupSheets_() {
  getOrCreateSheet_(SHEETS.users, USER_HEADERS);
  getOrCreateSheet_(SHEETS.bookings, BOOKING_HEADERS);
}

function getOrCreateSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  ensureHeaders_(sheet, headers);
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeaders = headers.some((header, index) => firstRow[index] !== header);
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 1), headers.length).setNumberFormat("@");

  if (sheet.getName() === SHEETS.users && sheet.getMaxColumns() >= 5) {
    sheet.hideColumns(4, 2);
    if (sheet.getMaxColumns() >= 10) sheet.hideColumns(10, 1);
  }
}

function readObjects_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .map((row) => rowToObject_(headers, row))
    .filter((item) => item.id);
}

function rowToObject_(headers, row) {
  return headers.reduce((object, header, index) => {
    const value = row[index];
    if (header === "rooms" || header === "pax") {
      object[header] = parseJson_(value, []);
      return object;
    }
    object[header] = value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd") : String(value || "");
    return object;
  }, {});
}

function appendObject_(sheet, headers, object) {
  sheet.appendRow(headers.map((header) => cellValue_(header, object[header])));
}

function writeObjectAt_(sheet, headers, rowIndex, object) {
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([headers.map((header) => cellValue_(header, object[header]))]);
}

function cellValue_(header, value) {
  if (header === "rooms" || header === "pax") return JSON.stringify(value || []);
  return value == null ? "" : String(value);
}

function publicUser_(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
    approvalStatus: user.approvalStatus || "pending",
    createdAt: user.createdAt || ""
  };
}

function publicBooking_(booking) {
  return {
    id: booking.id,
    customerName: booking.customerName,
    phone: booking.phone,
    tripStartDate: booking.tripStartDate,
    tripEndDate: booking.tripEndDate,
    tripType: booking.tripType,
    packageLocation: booking.packageLocation,
    hotelName: booking.hotelName,
    hotelAddress: booking.hotelAddress || "",
    hotelPhone: booking.hotelPhone || "",
    rooms: Array.isArray(booking.rooms) ? booking.rooms : parseJson_(booking.rooms, []),
    pax: Array.isArray(booking.pax) ? booking.pax : parseJson_(booking.pax, []),
    status: booking.status,
    notes: booking.notes || "",
    createdBy: booking.createdBy || "",
    createdAt: booking.createdAt || "",
    updatedAt: booking.updatedAt || ""
  };
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function parseJson_(value, fallback) {
  try {
    return value ? JSON.parse(String(value)) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function assertAccess_(request) {
  if (request.ownerCode) {
    assertOwner_(request.ownerCode);
    return { role: "owner" };
  }

  const { user } = getUserRecordBySession_(request.userId, request.sessionToken);
  return { role: "user", user };
}

function getUserRecordBySession_(userId, sessionToken) {
  const sheet = getOrCreateSheet_(SHEETS.users, USER_HEADERS);
  const users = readObjects_(sheet, USER_HEADERS);
  const rowIndex = users.findIndex((user) => user.id === userId);
  if (rowIndex < 0) throw new Error("Sesi login tidak sah.");

  const user = users[rowIndex];
  if (user.approvalStatus !== "approved") {
    throw new Error("Akaun ini belum diluluskan oleh owner.");
  }

  if (!sessionToken || String(user.sessionToken || "") !== String(sessionToken)) {
    throw new Error("Sesi login tidak sah. Sila login semula.");
  }

  return { sheet, users, rowIndex, user };
}

function assertOwner_(ownerCode) {
  if (String(ownerCode || "") !== getOwnerCode_()) {
    throw new Error("Kod owner tidak betul.");
  }
}

function getOwnerCode_() {
  return PropertiesService.getScriptProperties().getProperty("OWNER_CODE") || "930997Ay";
}

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, `${salt}:${password}`, Utilities.Charset.UTF_8);
  return bytes.map((byte) => (`0${(byte & 0xff).toString(16)}`).slice(-2)).join("");
}

function verifyPassword_(password, salt, hash) {
  return hashPassword_(password, salt) === hash;
}

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText_(value) {
  return String(value || "").trim();
}

function createId_(prefix) {
  return `${prefix}-${Utilities.getUuid()}`;
}

function now_() {
  return new Date().toISOString();
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
