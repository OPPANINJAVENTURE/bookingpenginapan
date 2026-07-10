const TABLE_COLUMN_COUNT = 6;
const ROOM_TYPES = ["Single room", "Double room", "Triple room", "Family room"];
const PAX_TYPES = ["Dewasa", "Remaja", "Kanak-kanak", "Bayi"];
const SESSION_STORAGE_KEY = "record_oppa_ninja_session";
const OWNER_USER = {
  id: "owner",
  name: "Owner",
  email: "owner@oppa.local",
  role: "owner",
  approvalStatus: "approved"
};

const sheetApi = createSheetApi();

const state = {
  bookings: [],
  currentUser: null,
  currentProfile: null,
  userProfiles: [],
  robotChallenge: createRobotChallenge(),
  ownerApprovalOpen: false,
  filters: {
    search: "",
    status: "all"
  }
};

const elements = {
  authShell: document.querySelector("#authShell"),
  appShell: document.querySelector("#appShell"),
  registerForm: document.querySelector("#registerForm"),
  registerName: document.querySelector("#registerName"),
  registerEmail: document.querySelector("#registerEmail"),
  registerPassword: document.querySelector("#registerPassword"),
  registerPasswordConfirm: document.querySelector("#registerPasswordConfirm"),
  registerChallengeQuestion: document.querySelector("#registerChallengeQuestion"),
  registerChallengeAnswer: document.querySelector("#registerChallengeAnswer"),
  refreshRobotCheck: document.querySelector("#refreshRobotCheck"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  ownerCodeInput: document.querySelector("#ownerCodeInput"),
  ownerCodeLogin: document.querySelector("#ownerCodeLogin"),
  authAlert: document.querySelector("#authAlert"),
  form: document.querySelector("#bookingForm"),
  bookingId: document.querySelector("#bookingId"),
  customerName: document.querySelector("#customerName"),
  phone: document.querySelector("#phone"),
  tripStartDate: document.querySelector("#tripStartDate"),
  tripStartDatePicker: document.querySelector("#tripStartDatePicker"),
  tripEndDate: document.querySelector("#tripEndDate"),
  tripEndDatePicker: document.querySelector("#tripEndDatePicker"),
  tripType: document.querySelector("#tripType"),
  packageLocation: document.querySelector("#packageLocation"),
  hotelName: document.querySelector("#hotelName"),
  hotelAddress: document.querySelector("#hotelAddress"),
  hotelPhone: document.querySelector("#hotelPhone"),
  roomRows: document.querySelector("#roomRows"),
  addRoom: document.querySelector("#addRoom"),
  paxRows: document.querySelector("#paxRows"),
  addPax: document.querySelector("#addPax"),
  status: document.querySelector("#status"),
  notes: document.querySelector("#notes"),
  formTitle: document.querySelector("#formTitle"),
  formMode: document.querySelector("#formMode"),
  formAlert: document.querySelector("#formAlert"),
  resetForm: document.querySelector("#resetForm"),
  newBooking: document.querySelector("#newBooking"),
  accountMenuButton: document.querySelector("#accountMenuButton"),
  accountMenu: document.querySelector("#accountMenu"),
  accountForm: document.querySelector("#accountForm"),
  accountName: document.querySelector("#accountName"),
  accountEmail: document.querySelector("#accountEmail"),
  accountCurrentPassword: document.querySelector("#accountCurrentPassword"),
  accountNewPassword: document.querySelector("#accountNewPassword"),
  accountNewPasswordConfirm: document.querySelector("#accountNewPasswordConfirm"),
  accountAlert: document.querySelector("#accountAlert"),
  closeAccountMenu: document.querySelector("#closeAccountMenu"),
  cancelAccountMenu: document.querySelector("#cancelAccountMenu"),
  ownerApprovalMenu: document.querySelector("#ownerApprovalMenu"),
  ownerApprovalMenuButton: document.querySelector("#ownerApprovalMenuButton"),
  ownerApprovalPanel: document.querySelector("#ownerApprovalPanel"),
  ownerPendingCount: document.querySelector("#ownerPendingCount"),
  ownerUsersList: document.querySelector("#ownerUsersList"),
  ownerUsersEmpty: document.querySelector("#ownerUsersEmpty"),
  currentUserName: document.querySelector("#currentUserName"),
  logoutUser: document.querySelector("#logoutUser"),
  exportPdf: document.querySelector("#exportPdf"),
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  bookingRows: document.querySelector("#bookingRows"),
  emptyState: document.querySelector("#emptyState"),
  emptyTitle: document.querySelector("#emptyTitle"),
  emptyText: document.querySelector("#emptyText"),
  totalCount: document.querySelector("#totalCount"),
  todayCount: document.querySelector("#todayCount"),
  upcomingCount: document.querySelector("#upcomingCount"),
  toast: document.querySelector("#toast")
};

init();

async function init() {
  elements.tripStartDate.value = formatDate(getToday());
  elements.tripEndDate.value = formatDate(getToday());
  syncDatePicker("tripStartDate", getToday());
  syncDatePicker("tripEndDate", getToday());
  updateTripDateConstraints();
  renderRoomFields();
  renderPaxFields();
  renderRobotChallenge();
  bindEvents();
  render();

  if (!sheetApi) {
    elements.authShell.hidden = false;
    elements.appShell.hidden = true;
    elements.authAlert.textContent = "Google Sheet belum disambungkan. Lengkapkan google-sheet-config.js dahulu.";
    return;
  }

  await initializeAuth();
}

function bindEvents() {
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.ownerCodeLogin.addEventListener("click", handleOwnerCodeLogin);
  elements.logoutUser.addEventListener("click", handleLogout);
  elements.refreshRobotCheck.addEventListener("click", refreshRobotChallenge);
  elements.accountMenuButton.addEventListener("click", openAccountMenu);
  elements.closeAccountMenu.addEventListener("click", closeAccountMenu);
  elements.cancelAccountMenu.addEventListener("click", closeAccountMenu);
  elements.accountForm.addEventListener("submit", handleAccountUpdate);
  elements.accountMenu.addEventListener("click", (event) => {
    if (event.target === elements.accountMenu) closeAccountMenu();
  });
  elements.ownerApprovalMenuButton.addEventListener("click", toggleOwnerApprovalMenu);
  elements.ownerUsersList.addEventListener("click", handleOwnerApprovalAction);
  elements.form.addEventListener("submit", handleSubmit);
  elements.resetForm.addEventListener("click", resetForm);
  elements.newBooking.addEventListener("click", resetForm);
  elements.exportPdf.addEventListener("click", exportPdf);
  elements.addRoom.addEventListener("click", () => addRoomField());
  elements.addPax.addEventListener("click", () => addPaxField());

  elements.roomRows.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='remove-room']");
    if (button) removeRoomField(button);
  });

  elements.paxRows.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='remove-pax']");
    if (button) removePaxField(button);
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.filters.search = event.target.value.trim().toLowerCase();
    renderRows();
  });

  elements.statusFilter.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    renderRows();
  });

  [elements.tripStartDate, elements.tripEndDate].forEach((input) => {
    input.addEventListener("blur", () => {
      const date = parseDateInput(input.value);
      if (date) {
        input.value = formatDate(date);
        syncDatePicker(input.id, date);
        updateTripDateConstraints();
      }
    });
  });

  [elements.tripStartDatePicker, elements.tripEndDatePicker].forEach((picker) => {
    picker.addEventListener("change", () => updateDateTextFromPicker(picker));
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date-target]");
    if (button) openDatePicker(button.dataset.dateTarget);
  });

  document.addEventListener("click", (event) => {
    if (!state.ownerApprovalOpen) return;
    if (elements.ownerApprovalMenu.contains(event.target)) return;
    closeOwnerApprovalMenu();
  });

  elements.bookingRows.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const booking = state.bookings.find((item) => item.id === button.dataset.id);
    if (!booking) return;

    if (button.dataset.action === "edit") editBooking(booking);
    if (button.dataset.action === "delete") deleteBooking(booking.id);
  });
}

async function initializeAuth() {
  const session = getSession();
  if (!session) {
    loadSignedInUser(null);
    return;
  }

  try {
    if (session.role === "owner") {
      const data = await sheetRequest("verifyOwner", { ownerCode: session.ownerCode });
      await loadSignedInUser({ ...OWNER_USER, name: data.ownerName || OWNER_USER.name });
      return;
    }

    const data = await sheetRequest("getUser", {
      userId: session.userId,
      sessionToken: session.sessionToken
    });
    await loadSignedInUser(data.user || null);
  } catch (_error) {
    clearSession();
    loadSignedInUser(null);
  }
}

async function loadSignedInUser(user) {
  if (!user) {
    state.currentUser = null;
    state.currentProfile = null;
    state.bookings = [];
    state.userProfiles = [];
    updateAuthView();
    render();
    return;
  }

  if (!isUserApproved(user)) {
    elements.authAlert.textContent = user?.approvalStatus === "rejected" || user?.approvalStatus === "deleted"
      ? "Akaun ini tidak diluluskan oleh owner."
      : "Akaun ini masih menunggu approval owner.";
    clearSession();
    return;
  }

  state.currentUser = user;
  state.currentProfile = user;
  await loadBookingsFromSheet();
  if (isOwnerUser(user)) await loadUserProfiles();
  updateAuthView();
  render();
}

async function handleRegister(event) {
  event.preventDefault();
  elements.authAlert.textContent = "";
  elements.authAlert.classList.remove("success");

  const name = elements.registerName.value.trim();
  const email = normalizeEmail(elements.registerEmail.value);
  const password = elements.registerPassword.value;
  const passwordConfirm = elements.registerPasswordConfirm.value;
  const robotAnswer = elements.registerChallengeAnswer.value.trim();

  if (password.length < 6) {
    elements.authAlert.textContent = "Password mesti sekurang-kurangnya 6 aksara.";
    return;
  }

  if (password !== passwordConfirm) {
    elements.authAlert.textContent = "Confirm password tidak sama.";
    return;
  }

  if (robotAnswer !== state.robotChallenge.answer) {
    elements.authAlert.textContent = "Jawapan semakan bukan robot tidak betul.";
    refreshRobotChallenge();
    return;
  }

  try {
    await sheetRequest("registerUser", {
      name,
      email,
      password
    });
  } catch (error) {
    elements.authAlert.textContent = error.message;
    refreshRobotChallenge();
    return;
  }

  clearSession();
  clearAuthForms();
  refreshRobotChallenge();
  updateAuthView();
  elements.authAlert.classList.add("success");
  elements.authAlert.textContent = "Akaun sudah didaftarkan. Tunggu approval owner sebelum login.";
  showToast("Akaun menunggu approval owner.");
}

async function handleLogin(event) {
  event.preventDefault();
  elements.authAlert.textContent = "";
  elements.authAlert.classList.remove("success");

  const email = normalizeEmail(elements.loginEmail.value);
  const password = elements.loginPassword.value;

  try {
    const data = await sheetRequest("loginUser", { email, password });
    setSession({ role: "user", userId: data.user.id, sessionToken: data.sessionToken });
    await loadSignedInUser(data.user);
    showToast("Berjaya masuk sistem.");
  } catch (error) {
    elements.authAlert.textContent = error.message;
    return;
  }
}

async function handleOwnerCodeLogin() {
  elements.authAlert.textContent = "";
  elements.authAlert.classList.remove("success");

  const ownerCode = elements.ownerCodeInput.value;

  try {
    const data = await sheetRequest("verifyOwner", { ownerCode });
    setSession({ role: "owner", ownerCode });
    elements.ownerCodeInput.value = "";
    await loadSignedInUser({ ...OWNER_USER, name: data.ownerName || OWNER_USER.name });
    showToast("Berjaya masuk sebagai owner.");
  } catch (error) {
    elements.authAlert.textContent = error.message;
    return;
  }
}

async function handleLogout() {
  clearSession();
  state.currentUser = null;
  state.currentProfile = null;
  state.bookings = [];
  state.userProfiles = [];
  state.ownerApprovalOpen = false;
  updateAuthView();
  render();
  showToast("Berjaya keluar sistem.");
}

function updateAuthView() {
  const isLoggedIn = Boolean(state.currentUser && state.currentProfile);
  const isOwner = isLoggedIn && isOwnerUser(state.currentProfile);
  elements.authShell.hidden = isLoggedIn;
  elements.appShell.hidden = !isLoggedIn;
  elements.currentUserName.textContent = isLoggedIn ? formatUserLabel(state.currentProfile) : "";
  elements.currentUserName.classList.toggle("owner-user", isOwner);
  renderOwnerApprovalPanel();

  if (!isLoggedIn) {
    window.setTimeout(() => elements.loginEmail.focus(), 0);
  }
}

function clearAuthForms() {
  elements.registerForm.reset();
  elements.loginForm.reset();
  elements.ownerCodeInput.value = "";
  elements.authAlert.textContent = "";
  elements.authAlert.classList.remove("success");
}

function toggleOwnerApprovalMenu() {
  if (!isOwnerUser(state.currentProfile)) return;
  state.ownerApprovalOpen = !state.ownerApprovalOpen;
  renderOwnerApprovalPanel();
}

function closeOwnerApprovalMenu() {
  state.ownerApprovalOpen = false;
  renderOwnerApprovalPanel();
}

function openAccountMenu() {
  if (!state.currentProfile) return;
  elements.accountName.value = state.currentProfile.name || "";
  elements.accountEmail.value = isOwnerUser(state.currentProfile) ? "" : state.currentProfile.email || "";
  elements.accountCurrentPassword.value = "";
  elements.accountNewPassword.value = "";
  elements.accountNewPasswordConfirm.value = "";
  elements.accountEmail.disabled = isOwnerUser(state.currentProfile);
  elements.accountCurrentPassword.disabled = isOwnerUser(state.currentProfile);
  elements.accountNewPassword.disabled = isOwnerUser(state.currentProfile);
  elements.accountNewPasswordConfirm.disabled = isOwnerUser(state.currentProfile);
  elements.accountEmail.required = !isOwnerUser(state.currentProfile);
  elements.accountCurrentPassword.required = !isOwnerUser(state.currentProfile);
  elements.accountAlert.textContent = "";
  elements.accountAlert.classList.remove("success");
  elements.accountMenu.hidden = false;
  window.setTimeout(() => elements.accountName.focus(), 0);
}

function closeAccountMenu() {
  elements.accountMenu.hidden = true;
}

async function handleAccountUpdate(event) {
  event.preventDefault();
  elements.accountAlert.textContent = "";
  elements.accountAlert.classList.remove("success");

  const name = elements.accountName.value.trim();
  const email = normalizeEmail(elements.accountEmail.value);
  const currentPassword = elements.accountCurrentPassword.value;
  const newPassword = elements.accountNewPassword.value;
  const newPasswordConfirm = elements.accountNewPasswordConfirm.value;

  if (!name) {
    elements.accountAlert.textContent = "Nama akaun wajib diisi.";
    return;
  }

  if (isOwnerUser(state.currentProfile)) {
    state.currentProfile = { ...state.currentProfile, name };
    state.currentUser = { ...state.currentUser, name };
    updateAuthView();
    elements.accountAlert.classList.add("success");
    elements.accountAlert.textContent = "Akaun owner berjaya dikemaskini.";
    showToast("Akaun dikemaskini.");
    return;
  }

  if (!email) {
    elements.accountAlert.textContent = "Email akaun wajib diisi.";
    return;
  }

  if (newPassword || newPasswordConfirm) {
    if (newPassword.length < 6) {
      elements.accountAlert.textContent = "Password baru mesti sekurang-kurangnya 6 aksara.";
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      elements.accountAlert.textContent = "Confirm password baru tidak sama.";
      return;
    }
  }

  try {
    const data = await sheetRequest("updateUser", {
      ...getRequestAuth(),
      userId: state.currentProfile.id,
      name,
      email,
      currentPassword,
      newPassword
    });
    state.currentUser = data.user;
    state.currentProfile = data.user;
  } catch (error) {
    elements.accountAlert.textContent = error.message;
    return;
  }

  elements.accountCurrentPassword.value = "";
  elements.accountNewPassword.value = "";
  elements.accountNewPasswordConfirm.value = "";
  elements.accountAlert.classList.add("success");
  elements.accountAlert.textContent = "Akaun berjaya dikemaskini.";
  showToast("Akaun dikemaskini.");
}

async function handleOwnerApprovalAction(event) {
  const button = event.target.closest("button[data-user-action]");
  if (!button || !isOwnerUser(state.currentProfile)) return;

  const userId = button.dataset.userId;
  const action = button.dataset.userAction;
  const profile = state.userProfiles.find((item) => item.id === userId);
  if (!profile) return;

  if (action === "delete-user") {
    const ok = confirm(`Delete account ${profile.name || profile.email}?`);
    if (!ok) return;

    try {
      await sheetRequest("deleteUser", {
        ownerCode: getOwnerCode(),
        userId
      });
    } catch (error) {
      showToast(error.message);
      return;
    }

    await loadUserProfiles();
    renderOwnerApprovalPanel();
    showToast("Akaun user dipadam.");
    return;
  }

  const statusByAction = {
    "approve-user": "approved",
    "reject-user": "rejected"
  };
  const status = statusByAction[action];
  if (!status) return;

  try {
    await sheetRequest("updateUserStatus", {
      ownerCode: getOwnerCode(),
      userId,
      status
    });
  } catch (error) {
    showToast(error.message);
    return;
  }

  await loadUserProfiles();
  renderOwnerApprovalPanel();
  showToast(status === "approved" ? "User diluluskan." : status === "rejected" ? "User ditolak." : "Akaun user dipadam.");
}

function renderOwnerApprovalPanel() {
  const isOwner = isOwnerUser(state.currentProfile);
  elements.ownerApprovalMenu.hidden = !isOwner;

  if (!isOwner) {
    state.ownerApprovalOpen = false;
    elements.ownerApprovalPanel.hidden = true;
    elements.ownerApprovalMenuButton.setAttribute("aria-expanded", "false");
    return;
  }

  const pendingCount = state.userProfiles.filter((user) => getApprovalStatus(user) === "pending").length;
  elements.ownerPendingCount.textContent = String(pendingCount);
  elements.ownerApprovalPanel.hidden = !state.ownerApprovalOpen;
  elements.ownerApprovalMenuButton.setAttribute("aria-expanded", String(state.ownerApprovalOpen));
  elements.ownerUsersEmpty.hidden = state.userProfiles.length > 0;
  elements.ownerUsersList.innerHTML = state.userProfiles.length ? state.userProfiles.map(toOwnerUserRowHtml).join("") : "";
}

function toOwnerUserRowHtml(user) {
  const status = getApprovalStatus(user);
  const statusLabel = getApprovalStatusLabel(status);
  const canApprove = status !== "approved";
  const canReject = status !== "rejected";
  const canDelete = status !== "deleted";

  return `
    <div class="owner-user-row">
      <div>
        <strong>${escapeHtml(user.name || "User")}</strong>
        <span>${escapeHtml(user.email || "")}</span>
      </div>
      <span class="approval-badge approval-${status}">${statusLabel}</span>
      <div class="owner-user-actions">
        <button class="ghost-button small-button" type="button" data-user-action="approve-user" data-user-id="${escapeAttribute(user.id)}"${canApprove ? "" : " disabled"}>Luluskan</button>
        <button class="ghost-button small-button" type="button" data-user-action="reject-user" data-user-id="${escapeAttribute(user.id)}"${canReject ? "" : " disabled"}>Tolak</button>
        <button class="ghost-button small-button danger-button" type="button" data-user-action="delete-user" data-user-id="${escapeAttribute(user.id)}"${canDelete ? "" : " disabled"}>Delete</button>
      </div>
    </div>
  `;
}

function refreshRobotChallenge() {
  state.robotChallenge = createRobotChallenge();
  elements.registerChallengeAnswer.value = "";
  renderRobotChallenge();
}

function renderRobotChallenge() {
  elements.registerChallengeQuestion.textContent = state.robotChallenge.question;
}

function createRobotChallenge() {
  const firstNumber = getRandomInt(3, 12);
  const secondNumber = getRandomInt(2, 9);
  return {
    question: `${firstNumber} + ${secondNumber} = ?`,
    answer: String(firstNumber + secondNumber)
  };
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function handleSubmit(event) {
  event.preventDefault();
  elements.formAlert.textContent = "";

  const booking = readForm();
  const validationError = validateBooking(booking);
  if (validationError) {
    elements.formAlert.textContent = validationError;
    return;
  }

  if (booking.id) {
    try {
      await sheetRequest("updateBooking", {
        ...getRequestAuth(),
        booking: {
          ...booking,
          createdBy: state.currentProfile?.id || ""
        }
      });
    } catch (error) {
      elements.formAlert.textContent = error.message;
      return;
    }
    showToast("Booking dikemaskini.");
  } else {
    try {
      await sheetRequest("createBooking", {
        ...getRequestAuth(),
        booking: {
          ...booking,
          createdBy: state.currentProfile?.id || ""
        }
      });
    } catch (error) {
      elements.formAlert.textContent = error.message;
      return;
    }
    showToast("Booking disimpan.");
  }

  await loadBookingsFromSheet();
  resetForm();
  render();
}

function readForm() {
  return {
    id: elements.bookingId.value,
    customerName: elements.customerName.value.trim(),
    phone: elements.phone.value.trim(),
    tripStartDate: parseDateInput(elements.tripStartDate.value),
    tripEndDate: parseDateInput(elements.tripEndDate.value),
    tripType: elements.tripType.value,
    packageLocation: elements.packageLocation.value.trim(),
    hotelName: elements.hotelName.value.trim(),
    hotelAddress: elements.hotelAddress.value.trim(),
    hotelPhone: elements.hotelPhone.value.trim(),
    rooms: readRooms(),
    pax: readPax(),
    status: elements.status.value,
    notes: elements.notes.value.trim()
  };
}

function editBooking(booking) {
  elements.bookingId.value = booking.id;
  elements.customerName.value = booking.customerName;
  elements.phone.value = booking.phone;
  elements.tripStartDate.value = formatDate(getTripStartDate(booking) || getToday());
  elements.tripEndDate.value = formatDate(getTripEndDate(booking) || getTripStartDate(booking) || getToday());
  syncDatePicker("tripStartDate", getTripStartDate(booking) || getToday());
  syncDatePicker("tripEndDate", getTripEndDate(booking) || getTripStartDate(booking) || getToday());
  updateTripDateConstraints();
  elements.tripType.value = getKnownTripType(booking.tripType);
  elements.packageLocation.value = booking.packageLocation || "";
  elements.hotelName.value = booking.hotelName || "";
  elements.hotelAddress.value = booking.hotelAddress || "";
  elements.hotelPhone.value = booking.hotelPhone || "";
  renderRoomFields(getRooms(booking));
  renderPaxFields(getPax(booking));
  elements.status.value = booking.status;
  elements.notes.value = booking.notes;
  elements.formTitle.textContent = "Edit booking";
  elements.formMode.textContent = "Edit";
  elements.formAlert.textContent = "";
  elements.customerName.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteBooking(id) {
  const booking = state.bookings.find((item) => item.id === id);
  if (!booking) return;

  const ok = confirm(`Padam booking ${booking.customerName}?`);
  if (!ok) return;

  try {
    await sheetRequest("deleteBooking", {
      ...getRequestAuth(),
      id
    });
  } catch (error) {
    showToast(error.message);
    return;
  }

  await loadBookingsFromSheet();
  render();
  showToast("Booking dipadam.");
}

function resetForm() {
  elements.form.reset();
  elements.bookingId.value = "";
  elements.tripStartDate.value = formatDate(getToday());
  elements.tripEndDate.value = formatDate(getToday());
  syncDatePicker("tripStartDate", getToday());
  syncDatePicker("tripEndDate", getToday());
  updateTripDateConstraints();
  elements.tripType.value = "Private";
  elements.packageLocation.value = "";
  elements.hotelName.value = "";
  elements.hotelAddress.value = "";
  elements.hotelPhone.value = "";
  renderRoomFields();
  renderPaxFields();
  elements.status.value = "Baru";
  elements.formTitle.textContent = "Booking baru";
  elements.formMode.textContent = "Baru";
  elements.formAlert.textContent = "";
  elements.customerName.focus();
}

function openDatePicker(targetId) {
  const picker = getDatePicker(targetId);
  const textInput = elements[targetId];
  if (!picker || !textInput) return;

  updateTripDateConstraints();
  const parsedDate = parseDateInput(textInput.value);
  if (parsedDate) picker.value = parsedDate;

  if (typeof picker.showPicker === "function") {
    picker.showPicker();
    return;
  }

  picker.focus();
  picker.click();
}

function updateDateTextFromPicker(picker) {
  const targetId = picker.id.replace("Picker", "");
  const textInput = elements[targetId];
  if (!textInput) return;

  textInput.value = formatDate(picker.value);
  updateTripDateConstraints();
}

function syncDatePicker(targetId, value) {
  const picker = getDatePicker(targetId);
  if (picker) picker.value = value || "";
}

function getDatePicker(targetId) {
  return elements[`${targetId}Picker`];
}

function updateTripDateConstraints() {
  const startDate = parseDateInput(elements.tripStartDate.value) || elements.tripStartDatePicker.value;
  if (!startDate) {
    elements.tripEndDatePicker.min = "";
    return;
  }

  elements.tripEndDatePicker.min = startDate;

  const endDate = parseDateInput(elements.tripEndDate.value) || elements.tripEndDatePicker.value;
  if (!endDate || endDate < startDate) {
    elements.tripEndDate.value = formatDate(startDate);
    syncDatePicker("tripEndDate", startDate);
  }
}

function renderRoomFields(rooms = [{ type: "", count: "1" }]) {
  const safeRooms = rooms.length ? rooms : [{ type: "", count: "1" }];
  elements.roomRows.innerHTML = "";
  safeRooms.forEach((room) => addRoomField(room));
  updateRoomRemoveButtons();
}

function addRoomField(room = { type: "", count: "1" }) {
  const row = document.createElement("div");
  row.className = "room-row";
  row.innerHTML = `
    <label>
      Jenis
      <select data-room-type required>
        ${getRoomTypeOptionsHtml(room.type)}
      </select>
    </label>
    <label>
      Bilangan
      <input data-room-count type="number" min="1" step="1" inputmode="numeric" required value="${escapeAttribute(room.count || "1")}" />
    </label>
    <button class="icon-button" data-action="remove-room" type="button" title="Padam bilik" aria-label="Padam bilik">X</button>
  `;
  elements.roomRows.appendChild(row);
  updateRoomRemoveButtons();
}

function removeRoomField(button) {
  const rows = [...elements.roomRows.querySelectorAll(".room-row")];
  if (rows.length <= 1) return;

  button.closest(".room-row").remove();
  updateRoomRemoveButtons();
}

function updateRoomRemoveButtons() {
  const buttons = elements.roomRows.querySelectorAll("button[data-action='remove-room']");
  buttons.forEach((button) => {
    button.disabled = buttons.length <= 1;
  });
}

function readRooms() {
  return [...elements.roomRows.querySelectorAll(".room-row")]
    .map((row) => {
      const type = row.querySelector("[data-room-type]").value.trim();
      const count = normalizeRoomCount(row.querySelector("[data-room-count]").value);
      return { type, count };
    })
    .filter((room) => room.type || room.count);
}

function renderPaxFields(pax = [{ type: "", count: "1" }]) {
  const safePax = pax.length ? pax : [{ type: "", count: "1" }];
  elements.paxRows.innerHTML = "";
  safePax.forEach((item) => addPaxField(item));
  updatePaxRemoveButtons();
}

function addPaxField(pax = { type: "", count: "1" }) {
  const row = document.createElement("div");
  row.className = "pax-row";
  row.innerHTML = `
    <label>
      Kategori
      <select data-pax-type required>
        ${getPaxTypeOptionsHtml(pax.type)}
      </select>
    </label>
    <label>
      Bilangan
      <input data-pax-count type="number" min="1" step="1" inputmode="numeric" required value="${escapeAttribute(pax.count || "1")}" />
    </label>
    <button class="icon-button" data-action="remove-pax" type="button" title="Padam pax" aria-label="Padam pax">X</button>
  `;
  elements.paxRows.appendChild(row);
  updatePaxRemoveButtons();
}

function removePaxField(button) {
  const rows = [...elements.paxRows.querySelectorAll(".pax-row")];
  if (rows.length <= 1) return;

  button.closest(".pax-row").remove();
  updatePaxRemoveButtons();
}

function updatePaxRemoveButtons() {
  const buttons = elements.paxRows.querySelectorAll("button[data-action='remove-pax']");
  buttons.forEach((button) => {
    button.disabled = buttons.length <= 1;
  });
}

function readPax() {
  return [...elements.paxRows.querySelectorAll(".pax-row")]
    .map((row) => {
      const type = row.querySelector("[data-pax-type]").value.trim();
      const count = normalizePaxCount(row.querySelector("[data-pax-count]").value);
      return { type, count };
    })
    .filter((pax) => pax.type || pax.count);
}

function validateBooking(booking) {
  if (!booking.tripStartDate || !booking.tripEndDate) return "Lengkapkan start trip dan end trip dalam format dd-mm-yyyy.";
  if (booking.tripEndDate < booking.tripStartDate) return "End trip tidak boleh lebih awal daripada start trip.";
  if (!booking.rooms.length) return "Tambah sekurang-kurangnya satu jenis bilik.";
  if (booking.rooms.some((room) => !room.type)) return "Lengkapkan jenis bilik untuk setiap baris.";
  if (!booking.pax.length) return "Tambah sekurang-kurangnya satu jumlah pax.";
  if (booking.pax.some((pax) => !pax.type)) return "Lengkapkan kategori pax untuk setiap baris.";
  return "";
}

function render() {
  renderSummary();
  renderRows();
}

function renderSummary() {
  const today = getToday();
  const activeBookings = state.bookings.filter((booking) => booking.status !== "Batal");
  const upcoming = activeBookings.filter((booking) => getPrimaryDate(booking) >= today);

  elements.totalCount.textContent = state.bookings.length;
  elements.todayCount.textContent = state.bookings.filter((booking) => isDateWithinTrip(today, booking)).length;
  elements.upcomingCount.textContent = upcoming.length;
}

function renderRows() {
  const rows = getFilteredBookings();
  elements.emptyState.hidden = rows.length > 0;
  updateEmptyState();
  elements.bookingRows.innerHTML = toGroupedRowsHtml(rows);
}

function getFilteredBookings() {
  const query = state.filters.search;

  return [...state.bookings]
    .filter((booking) => {
      const haystack = [
        booking.customerName,
        booking.phone,
        getTripStartDate(booking),
        getTripEndDate(booking),
        formatDate(getTripStartDate(booking)),
        formatDate(getTripEndDate(booking)),
        booking.tripType,
        booking.packageLocation,
        booking.hotelName,
        booking.hotelAddress,
        booking.hotelPhone,
        formatRoomsForSearch(booking),
        formatPaxForSearch(booking),
        booking.notes,
        booking.status
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);
      const matchesStatus = state.filters.status === "all" || booking.status === state.filters.status;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => getPrimaryDate(a).localeCompare(getPrimaryDate(b)));
}

function toRowHtml(booking) {
  const note = booking.notes ? escapeHtml(booking.notes) : "Tiada nota";
  const status = getKnownStatus(booking.status);
  const tripType = getKnownTripType(booking.tripType);
  const bookingId = escapeHtml(booking.id);
  const customerName = escapeHtml(booking.customerName);
  const tripStartDate = getTripStartDate(booking);
  const tripEndDate = getTripEndDate(booking);
  const packageLocation = booking.packageLocation || "Tiada lokasi";
  const hotelName = booking.hotelName || "Tiada hotel";
  const hotelAddressHtml = booking.hotelAddress ? `<span>Alamat: ${escapeHtml(booking.hotelAddress)}</span>` : "";
  const hotelPhoneHtml = booking.hotelPhone ? `<span>Tel: ${escapeHtml(booking.hotelPhone)}</span>` : "";
  const rooms = getRooms(booking);
  const roomsHtml = rooms.length
    ? rooms
        .map(
          (room) =>
            `<span class="room-detail"><strong>${escapeHtml(room.type || "Tiada jenis bilik")}</strong> | ${escapeHtml(room.count)} bilik</span>`
        )
        .join("")
    : `<span class="room-detail"><strong>Tiada jenis bilik</strong></span>`;
  const pax = getPax(booking);
  const paxHtml = pax.length
    ? pax.map((item) => `<span>${escapeHtml(item.type || "Tiada kategori pax")} | ${escapeHtml(item.count)} pax</span>`).join("")
    : "<span>Tiada pax</span>";
  const totalPax = getTotalPaxCount(booking);

  return `
    <tr>
      <td class="customer-cell">
        <strong>${customerName}</strong>
        <span>${escapeHtml(booking.phone)}</span>
      </td>
      <td class="date-cell">
        <strong>${formatDateRange(tripStartDate, tripEndDate)}</strong>
        <span>${escapeHtml(packageLocation)} | ${escapeHtml(tripType)}</span>
      </td>
      <td class="pax-cell">
        <strong>${escapeHtml(totalPax)} pax</strong>
        ${paxHtml}
      </td>
      <td class="hotel-cell">
        <strong>${escapeHtml(hotelName)}</strong>
        ${hotelAddressHtml}
        ${hotelPhoneHtml}
        <span class="hotel-room-divider" aria-hidden="true"></span>
        ${roomsHtml}
        <span class="booking-note">${note}</span>
      </td>
      <td>
        <span class="status-badge status-${status}">${status}</span>
      </td>
      <td>
        <div class="row-actions">
          <button class="icon-button" type="button" title="Edit" aria-label="Edit ${customerName}" data-action="edit" data-id="${bookingId}">Edit</button>
          <button class="icon-button" type="button" title="Padam" aria-label="Padam ${customerName}" data-action="delete" data-id="${bookingId}">X</button>
        </div>
      </td>
    </tr>
  `;
}

function toGroupedRowsHtml(bookings) {
  let currentGroup = "";

  return bookings
    .map((booking) => {
      const group = getMonthGroupKey(booking);
      const groupRow = group !== currentGroup ? toMonthGroupRow(booking) : "";
      currentGroup = group;
      return `${groupRow}${toRowHtml(booking)}`;
    })
    .join("");
}

function toMonthGroupRow(booking) {
  return `
    <tr class="month-group-row">
      <td colspan="${TABLE_COLUMN_COUNT}">
        <span>${escapeHtml(getMonthGroupLabel(booking))}</span>
      </td>
    </tr>
  `;
}

function updateEmptyState() {
  const hasFilters = state.filters.search || state.filters.status !== "all";
  elements.emptyTitle.textContent = hasFilters ? "Tiada padanan" : "Belum ada booking";
  elements.emptyText.textContent = hasFilters
    ? "Ubah carian atau tapisan untuk lihat rekod lain."
    : "Rekod pertama akan muncul di sini selepas disimpan.";
}

async function loadBookingsFromSheet() {
  const data = await sheetRequest("listBookings", getRequestAuth());
  state.bookings = (data.bookings || []).map(mapBookingRow);
}

async function loadUserProfiles() {
  if (!isOwnerUser(state.currentProfile)) {
    state.userProfiles = [];
    return;
  }

  const data = await sheetRequest("listUsers", {
    ownerCode: getOwnerCode()
  });
  state.userProfiles = (data.users || []).map(mapProfileRow);
}

function mapBookingRow(row) {
  return {
    id: row.id,
    customerName: row.customerName || row.customer_name || "",
    phone: row.phone || "",
    tripStartDate: row.tripStartDate || row.trip_start_date || "",
    tripEndDate: row.tripEndDate || row.trip_end_date || row.tripStartDate || row.trip_start_date || "",
    tripType: row.tripType || row.trip_type || "Private",
    packageLocation: row.packageLocation || row.package_location || "",
    hotelName: row.hotelName || row.hotel_name || "",
    hotelAddress: row.hotelAddress || row.hotel_address || "",
    hotelPhone: row.hotelPhone || row.hotel_phone || "",
    rooms: Array.isArray(row.rooms) ? row.rooms : [],
    pax: Array.isArray(row.pax) ? row.pax : [],
    status: row.status || "Baru",
    notes: row.notes || "",
    createdAt: row.createdAt || row.created_at || "",
    createdBy: row.createdBy || row.created_by || ""
  };
}

function mapProfileRow(row) {
  return {
    id: row.id,
    name: row.name || row.full_name || row.email || "User",
    email: row.email || "",
    role: row.role || "user",
    approvalStatus: row.approvalStatus || row.approval_status || "pending",
    createdAt: row.createdAt || row.created_at || ""
  };
}

function exportPdf() {
  if (!state.bookings.length) {
    showToast("Tiada booking untuk export.");
    return;
  }

  const blob = createBookingsPdf(state.bookings);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rekod-booking-${getToday()}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Fail PDF dimuat turun.");
}

function createBookingsPdf(bookings) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 42;
  const bottomMargin = 48;
  const contentWidth = pageWidth - margin * 2;
  const pages = [];
  let page = [];
  let y = pageHeight - margin;

  function addPage() {
    if (page.length) pages.push(page);
    page = [];
    y = pageHeight - margin;
  }

  function ensureSpace(height) {
    if (y - height < bottomMargin) addPage();
  }

  function drawText(text, x = margin, size = 9, font = "F1") {
    ensureSpace(size + 5);
    page.push(`BT /${font} ${size} Tf ${x} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
    y -= size + 5;
  }

  function drawWrappedText(text, x = margin, size = 9, font = "F1", width = contentWidth) {
    wrapPdfText(text, width, size).forEach((line) => drawText(line, x, size, font));
  }

  function drawSeparator() {
    ensureSpace(14);
    y -= 2;
    page.push(`${margin} ${y.toFixed(2)} m ${pageWidth - margin} ${y.toFixed(2)} l S`);
    y -= 10;
  }

  drawText("Record Oppa Ninja", margin, 17, "F2");
  drawText(`Senarai booking - ${formatDate(getToday())}`, margin, 10, "F1");
  drawSeparator();

  let currentGroup = "";
  getBookingsForExport(bookings).forEach((booking) => {
    const group = getMonthGroupKey(booking);
    if (group !== currentGroup) {
      ensureSpace(34);
      drawText(getMonthGroupLabel(booking).toUpperCase(), margin, 11, "F2");
      currentGroup = group;
    }

    const tripStartDate = getTripStartDate(booking);
    const tripEndDate = getTripEndDate(booking);
    const tripType = getKnownTripType(booking.tripType);
    const location = booking.packageLocation || "Tiada lokasi";
    const hotelName = booking.hotelName || "Tiada hotel";
    const hotelAddress = booking.hotelAddress || "-";
    const hotelPhone = booking.hotelPhone || "-";
    const pax = formatPaxForExport(booking) || "-";
    const rooms = formatRoomsForExport(booking) || "-";
    const notes = booking.notes || "-";

    ensureSpace(132);
    drawWrappedText(booking.customerName || "Tiada nama", margin, 11, "F2");
    drawWrappedText(`Telefon: ${booking.phone || "-"}`);
    drawWrappedText(`Trip: ${formatDateRange(tripStartDate, tripEndDate)} | ${tripType} | ${location}`);
    drawWrappedText(`Jumlah pax: ${getTotalPaxCount(booking)} pax - ${pax}`);
    drawWrappedText(`Hotel: ${hotelName}`);
    drawWrappedText(`Alamat hotel: ${hotelAddress}`);
    drawWrappedText(`No telefon hotel: ${hotelPhone}`);
    drawWrappedText(`Bilik: ${rooms} | Jumlah bilik: ${getTotalRoomCount(booking)}`);
    drawWrappedText(`Status: ${getKnownStatus(booking.status)}`);
    drawWrappedText(`Nota: ${notes}`);
    drawSeparator();
  });

  if (page.length) pages.push(page);
  return buildPdfBlob(pages, pageWidth, pageHeight);
}

function getBookingsForExport(bookings) {
  return [...bookings].sort((a, b) => getPrimaryDate(a).localeCompare(getPrimaryDate(b)));
}

function buildPdfBlob(pages, pageWidth, pageHeight) {
  const encoder = new TextEncoder();
  const objects = [
    "",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];
  const pageObjectIds = [];

  pages.forEach((commands) => {
    const content = `${commands.join("\n")}\n`;
    const contentId = objects.length;
    objects.push(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);
    const pageId = objects.length;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageObjectIds.push(pageId);
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = encoder.encode(pdf).length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function wrapPdfText(text, width, size) {
  const maxCharacters = Math.max(18, Math.floor(width / (size * 0.52)));
  const words = sanitizePdfText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (nextLine.length > maxCharacters && line) {
      lines.push(line);
      line = word;
      return;
    }
    line = nextLine;
  });

  if (line) lines.push(line);
  return lines.length ? lines : ["-"];
}

function sanitizePdfText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value) {
  return sanitizePdfText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function createSheetApi() {
  const config = globalThis.GOOGLE_SHEET_CONFIG || {};
  const webAppUrl = String(config.webAppUrl || "").trim();
  if (!webAppUrl || webAppUrl.includes("YOUR_")) return null;
  return { webAppUrl };
}

async function sheetRequest(action, payload = {}) {
  if (!sheetApi) throw new Error("Google Sheet belum disambungkan.");

  const response = await fetch(sheetApi.webAppUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action,
      ...payload
    }),
    redirect: "follow"
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || "Sambungan Google Sheet gagal.");
  }

  return data;
}

function getSession() {
  return readJson(SESSION_STORAGE_KEY, null);
}

function setSession(session) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

function getRequestAuth() {
  const session = getSession();
  if (!session) return {};

  if (session.role === "owner") {
    return { ownerCode: session.ownerCode || "" };
  }

  return {
    userId: session.userId || "",
    sessionToken: session.sessionToken || ""
  };
}

function readJson(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function getOwnerCode() {
  const session = getSession();
  return session?.role === "owner" ? session.ownerCode || "" : "";
}

function isOwnerUser(profile) {
  return profile?.role === "owner";
}

function isUserApproved(profile) {
  return isOwnerUser(profile) || getApprovalStatus(profile) === "approved";
}

function getApprovalStatus(profile) {
  return profile?.approvalStatus || "pending";
}

function getApprovalStatusLabel(status) {
  if (status === "pending") return "Menunggu";
  if (status === "rejected") return "Ditolak";
  if (status === "deleted") return "Deleted";
  return "Diluluskan";
}

function formatUserLabel(profile) {
  return isOwnerUser(profile) ? `${profile.name || "Owner"} (Owner)` : profile.name;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getRooms(booking) {
  if (Array.isArray(booking.rooms) && booking.rooms.length) {
    return booking.rooms.map((room) => ({
      type: String(room.type || "").trim(),
      count: normalizeRoomCount(room.count)
    }));
  }
  return [];
}

function formatRoomsForSearch(booking) {
  return getRooms(booking)
    .map((room) => `${room.type} ${room.count}`)
    .join(" ");
}

function formatRoomsForExport(booking) {
  return getRooms(booking)
    .filter((room) => room.type)
    .map((room) => `${room.type} (${room.count})`)
    .join("; ");
}

function getTotalRoomCount(booking) {
  return getRooms(booking).reduce((sum, room) => sum + Number(room.count || 0), 0);
}

function normalizeRoomCount(value) {
  const count = Number.parseInt(value || "0", 10);
  if (Number.isNaN(count) || count < 1) return "1";
  return String(count);
}

function getPax(booking) {
  if (Array.isArray(booking.pax) && booking.pax.length) {
    return booking.pax.map((pax) => ({
      type: String(pax.type || "").trim(),
      count: normalizePaxCount(pax.count)
    }));
  }
  return [];
}

function formatPaxForSearch(booking) {
  return getPax(booking)
    .map((pax) => `${pax.type} ${pax.count}`)
    .join(" ");
}

function formatPaxForExport(booking) {
  return getPax(booking)
    .filter((pax) => pax.type)
    .map((pax) => `${pax.type} (${pax.count})`)
    .join("; ");
}

function getTotalPaxCount(booking) {
  return getPax(booking).reduce((sum, pax) => sum + Number(pax.count || 0), 0);
}

function normalizePaxCount(value) {
  const count = Number.parseInt(value || "0", 10);
  if (Number.isNaN(count) || count < 1) return "1";
  return String(count);
}

function formatDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
}

function parseDateInput(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!match) return "";

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  const date = new Date(`${year}-${month}-${day}T00:00:00`);

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "";
  if (!endDate || startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getKnownStatus(value) {
  const statuses = ["Baru", "Disahkan", "Selesai", "Batal"];
  return statuses.includes(value) ? value : "Baru";
}

function getKnownTripType(value) {
  const tripTypes = ["Private", "Open Group"];
  return tripTypes.includes(value) ? value : "Private";
}

function getRoomTypeOptionsHtml(selectedType = "") {
  const safeSelectedType = String(selectedType || "").trim();
  const options = ROOM_TYPES.map((type) => {
    const selected = type === safeSelectedType || (!safeSelectedType && type === ROOM_TYPES[0]) ? " selected" : "";
    return `<option value="${escapeAttribute(type)}"${selected}>${escapeHtml(type)}</option>`;
  });

  if (safeSelectedType && !ROOM_TYPES.includes(safeSelectedType)) {
    options.unshift(`<option value="${escapeAttribute(safeSelectedType)}" selected>${escapeHtml(safeSelectedType)}</option>`);
  }

  return options.join("");
}

function getPaxTypeOptionsHtml(selectedType = "") {
  const safeSelectedType = String(selectedType || "").trim();
  const options = PAX_TYPES.map((type) => {
    const selected = type === safeSelectedType || (!safeSelectedType && type === PAX_TYPES[0]) ? " selected" : "";
    return `<option value="${escapeAttribute(type)}"${selected}>${escapeHtml(type)}</option>`;
  });

  if (safeSelectedType && !PAX_TYPES.includes(safeSelectedType)) {
    options.unshift(`<option value="${escapeAttribute(safeSelectedType)}" selected>${escapeHtml(safeSelectedType)}</option>`);
  }

  return options.join("");
}

function getPrimaryDate(booking) {
  return getTripStartDate(booking);
}

function getMonthGroupKey(booking) {
  const startDate = getTripStartDate(booking);
  return startDate ? startDate.slice(0, 7) : "tanpa-tarikh";
}

function getMonthGroupLabel(booking) {
  const startDate = getTripStartDate(booking);
  if (!startDate) return "Tanpa tarikh";

  return new Intl.DateTimeFormat("ms-MY", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${startDate.slice(0, 7)}-01T00:00:00`));
}

function getTripStartDate(booking) {
  return booking.tripStartDate || "";
}

function getTripEndDate(booking) {
  return booking.tripEndDate || booking.tripStartDate || "";
}

function isDateWithinTrip(date, booking) {
  const startDate = getTripStartDate(booking);
  const endDate = getTripEndDate(booking) || startDate;
  if (!startDate) return false;
  return date >= startDate && date <= endDate;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2400);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
