const SHEETS = {
  bookings: "Bookings"
};

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
  assertOwner_(request.ownerCode);
  return { role: "owner" };
}

function assertOwner_(ownerCode) {
  if (String(ownerCode || "") !== getOwnerCode_()) {
    throw new Error("Kod owner tidak betul.");
  }
}

function getOwnerCode_() {
  return PropertiesService.getScriptProperties().getProperty("OWNER_CODE") || "930997Ay";
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
