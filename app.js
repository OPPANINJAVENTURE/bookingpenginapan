const STORAGE_KEY = "booking-recorder-v1";
const AUTH_USERS_KEY = "booking-recorder-users-v1";
const AUTH_SESSION_KEY = "booking-recorder-current-user-v1";
const AUTH_OWNER_SETTINGS_KEY = "booking-recorder-owner-settings-v1";
const TABLE_COLUMN_COUNT = 6;
const ROOM_TYPES = ["Single room", "Double room", "Triple room", "Family room"];
const PAX_TYPES = ["Dewasa", "Remaja", "Kanak-kanak", "Bayi"];
const OWNER_ACCOUNT = Object.freeze({
  id: "owner-account",
  name: "Owner",
  email: "owner@oppaninja.local",
  passwordHash: "04aeeb2222dcd4c8026fc3ae138bf0d072a18bf9b832ad93fffdbe18140d973d",
  passwordFallbackHash: "local-16542069",
  role: "owner",
  createdAt: "system"
});

const bookingsSeed = [
  {
    id: createId(),
    customerName: "Aina Rahman",
    phone: "012-345 6789",
    tripStartDate: getToday(),
    tripEndDate: getToday(),
    tripType: "Private",
    packageLocation: "Kuala Lumpur",
    hotelName: "Hotel Seri Contoh",
    hotelAddress: "Jalan Contoh 1, Kuala Lumpur",
    hotelPhone: "03-1234 5678",
    rooms: [
      {
        type: "Single room",
        count: "1"
      }
    ],
    pax: [
      {
        type: "Dewasa",
        count: "1"
      }
    ],
    status: "Disahkan",
    notes: "Bayaran deposit sudah diterima.",
    createdAt: new Date().toISOString()
  }
];

const state = {
  bookings: loadBookings(),
  currentUser: loadCurrentUser(),
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

function init() {
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
  updateAuthView();
}

function bindEvents() {
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.loginForm.addEventListener("submit", handleLogin);
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
  elements.addRoom.addEventListener("click", () => {
    addRoomField();
  });
  elements.addPax.addEventListener("click", () => {
    addPaxField();
  });

  elements.roomRows.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='remove-room']");
    if (!button) return;
    removeRoomField(button);
  });

  elements.paxRows.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='remove-pax']");
    if (!button) return;
    removePaxField(button);
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
    picker.addEventListener("change", () => {
      updateDateTextFromPicker(picker);
    });
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date-target]");
    if (!button) return;
    openDatePicker(button.dataset.dateTarget);
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

async function handleRegister(event) {
  event.preventDefault();
  elements.authAlert.textContent = "";
  elements.authAlert.classList.remove("success");

  const name = elements.registerName.value.trim();
  const email = normalizeEmail(elements.registerEmail.value);
  const password = elements.registerPassword.value;
  const passwordConfirm = elements.registerPasswordConfirm.value;
  const robotAnswer = elements.registerChallengeAnswer.value.trim();

  if (password.length < 4) {
    elements.authAlert.textContent = "Password mesti sekurang-kurangnya 4 aksara.";
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

  const users = loadUsers();
  if (users.some((user) => user.email === email)) {
    elements.authAlert.textContent = "Email ini sudah didaftarkan.";
    refreshRobotChallenge();
    return;
  }

  const user = {
    id: createId(),
    name,
    email,
    passwordHash: await hashPassword(password),
    passwordFallbackHash: hashPasswordLocal(password),
    role: "user",
    approvalStatus: "pending",
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);
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
  const passwordHash = await hashPassword(password);
  const passwordLocalHash = hashPasswordLocal(password);
  const users = loadUsers();
  const user = users.find((item) => {
    return (
      item.email === email &&
      (item.passwordHash === passwordHash ||
        item.passwordHash === passwordLocalHash ||
        item.passwordFallbackHash === passwordHash ||
        item.passwordFallbackHash === passwordLocalHash ||
        item.password === password)
    );
  });

  if (!user) {
    elements.authAlert.textContent = "Email atau password tidak betul.";
    return;
  }

  if (!isUserApproved(user)) {
    elements.authAlert.textContent =
      getApprovalStatus(user) === "rejected"
        ? "Akaun ini tidak diluluskan oleh owner."
        : "Akaun ini masih menunggu approval owner.";
    return;
  }

  if (!user.passwordHash) {
    user.passwordHash = passwordHash;
    user.passwordFallbackHash = passwordLocalHash;
    delete user.password;
    saveUsers(users);
  }

  setCurrentUser(user);
  clearAuthForms();
  updateAuthView();
  showToast("Berjaya masuk sistem.");
}

function handleLogout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  state.currentUser = null;
  state.ownerApprovalOpen = false;
  updateAuthView();
  showToast("Berjaya keluar sistem.");
}

function updateAuthView() {
  const isLoggedIn = Boolean(state.currentUser);
  const isOwner = isLoggedIn && isOwnerUser(state.currentUser);
  elements.authShell.hidden = isLoggedIn;
  elements.appShell.hidden = !isLoggedIn;
  elements.currentUserName.textContent = isLoggedIn ? formatUserLabel(state.currentUser) : "";
  elements.currentUserName.classList.toggle("owner-user", isOwner);
  renderOwnerApprovalPanel();

  if (!isLoggedIn) {
    const hasUsers = loadUsers().length > 0;
    refreshRobotChallenge();
    window.setTimeout(() => {
      (hasUsers ? elements.loginEmail : elements.registerName).focus();
    }, 0);
  }
}

function setCurrentUser(user) {
  localStorage.setItem(AUTH_SESSION_KEY, user.id);
  state.currentUser = user;
}

function clearAuthForms() {
  elements.registerForm.reset();
  elements.loginForm.reset();
  elements.authAlert.textContent = "";
  elements.authAlert.classList.remove("success");
}

function toggleOwnerApprovalMenu() {
  if (!isOwnerUser(state.currentUser)) return;
  state.ownerApprovalOpen = !state.ownerApprovalOpen;
  renderOwnerApprovalPanel();
}

function closeOwnerApprovalMenu() {
  state.ownerApprovalOpen = false;
  renderOwnerApprovalPanel();
}

function openAccountMenu() {
  if (!state.currentUser) return;
  elements.accountName.value = state.currentUser.name || "";
  elements.accountEmail.value = state.currentUser.email || "";
  elements.accountCurrentPassword.value = "";
  elements.accountNewPassword.value = "";
  elements.accountNewPasswordConfirm.value = "";
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

  const currentUser = getStoredUserById(state.currentUser?.id);
  if (!currentUser) {
    elements.accountAlert.textContent = "Akaun tidak dijumpai. Sila login semula.";
    return;
  }

  const name = elements.accountName.value.trim();
  const email = normalizeEmail(elements.accountEmail.value);
  const currentPassword = elements.accountCurrentPassword.value;
  const newPassword = elements.accountNewPassword.value;
  const newPasswordConfirm = elements.accountNewPasswordConfirm.value;

  if (!name) {
    elements.accountAlert.textContent = "Nama akaun wajib diisi.";
    return;
  }

  if (!email) {
    elements.accountAlert.textContent = "Email akaun wajib diisi.";
    return;
  }

  if (isEmailUsedByAnotherAccount(email, currentUser.id)) {
    elements.accountAlert.textContent = "Email ini sudah digunakan oleh akaun lain.";
    return;
  }

  if (!(await doesPasswordMatch(currentUser, currentPassword))) {
    elements.accountAlert.textContent = "Password sekarang tidak betul.";
    return;
  }

  if (newPassword || newPasswordConfirm) {
    if (newPassword.length < 4) {
      elements.accountAlert.textContent = "Password baru mesti sekurang-kurangnya 4 aksara.";
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      elements.accountAlert.textContent = "Confirm password baru tidak sama.";
      return;
    }
  }

  const updatedUser = {
    ...currentUser,
    name,
    email,
    updatedAt: new Date().toISOString()
  };

  if (newPassword) {
    updatedUser.passwordHash = await hashPassword(newPassword);
    updatedUser.passwordFallbackHash = hashPasswordLocal(newPassword);
    delete updatedUser.password;
  }

  saveUserAccount(updatedUser);
  setCurrentUser(updatedUser);
  updateAuthView();
  elements.accountCurrentPassword.value = "";
  elements.accountNewPassword.value = "";
  elements.accountNewPasswordConfirm.value = "";
  elements.accountAlert.classList.add("success");
  elements.accountAlert.textContent = "Akaun berjaya dikemaskini.";
  showToast("Akaun dikemaskini.");
}

function handleOwnerApprovalAction(event) {
  const button = event.target.closest("button[data-user-action]");
  if (!button || !isOwnerUser(state.currentUser)) return;

  const userId = button.dataset.userId;
  const action = button.dataset.userAction;
  const users = loadUsers();

  if (action === "delete-user") {
    const user = users.find((item) => item.id === userId && !isOwnerUser(item));
    if (!user) return;

    const ok = confirm(`Delete account ${user.name || user.email}?`);
    if (!ok) return;

    saveUsers(users.filter((item) => item.id !== userId));
    renderOwnerApprovalPanel();
    showToast("Akaun user dipadam.");
    return;
  }

  const updatedUsers = users.map((user) => {
    if (user.id !== userId || isOwnerUser(user)) return user;

    if (action === "approve-user") {
      return {
        ...user,
        approvalStatus: "approved",
        approvedAt: new Date().toISOString(),
        rejectedAt: ""
      };
    }

    if (action === "reject-user") {
      return {
        ...user,
        approvalStatus: "rejected",
        rejectedAt: new Date().toISOString(),
        approvedAt: ""
      };
    }

    return user;
  });

  saveUsers(updatedUsers);
  renderOwnerApprovalPanel();
  showToast(action === "approve-user" ? "User diluluskan." : "User ditolak.");
}

function renderOwnerApprovalPanel() {
  const isOwner = isOwnerUser(state.currentUser);
  elements.ownerApprovalMenu.hidden = !isOwner;

  if (!isOwner) {
    state.ownerApprovalOpen = false;
    elements.ownerApprovalPanel.hidden = true;
    elements.ownerApprovalMenuButton.setAttribute("aria-expanded", "false");
    return;
  }

  const users = loadUsers().filter((user) => !isOwnerUser(user));
  const pendingCount = users.filter((user) => getApprovalStatus(user) === "pending").length;
  elements.ownerPendingCount.textContent = String(pendingCount);
  elements.ownerApprovalPanel.hidden = !state.ownerApprovalOpen;
  elements.ownerApprovalMenuButton.setAttribute("aria-expanded", String(state.ownerApprovalOpen));
  elements.ownerUsersEmpty.hidden = users.length > 0;
  elements.ownerUsersList.innerHTML = users.length ? users.map(toOwnerUserRowHtml).join("") : "";
}

function toOwnerUserRowHtml(user) {
  const status = getApprovalStatus(user);
  const statusLabel = getApprovalStatusLabel(status);
  const canApprove = status !== "approved";
  const canReject = status !== "rejected";

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
        <button class="ghost-button small-button danger-button" type="button" data-user-action="delete-user" data-user-id="${escapeAttribute(user.id)}">Delete</button>
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

function handleSubmit(event) {
  event.preventDefault();
  elements.formAlert.textContent = "";

  const booking = readForm();
  const validationError = validateBooking(booking);
  if (validationError) {
    elements.formAlert.textContent = validationError;
    return;
  }

  if (booking.id) {
    state.bookings = state.bookings.map((item) => (item.id === booking.id ? booking : item));
    showToast("Booking dikemaskini.");
  } else {
    booking.id = createId();
    booking.createdAt = new Date().toISOString();
    state.bookings.push(booking);
    showToast("Booking disimpan.");
  }

  saveBookings();
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
    notes: elements.notes.value.trim(),
    createdAt: getExistingCreatedAt(elements.bookingId.value)
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

function deleteBooking(id) {
  const booking = state.bookings.find((item) => item.id === id);
  if (!booking) return;

  const ok = confirm(`Padam booking ${booking.customerName}?`);
  if (!ok) return;

  state.bookings = state.bookings.filter((item) => item.id !== id);
  saveBookings();
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
  elements.todayCount.textContent = state.bookings.filter((booking) => {
    return isDateWithinTrip(today, booking);
  }).length;
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
    .sort((a, b) => {
      const dateA = getPrimaryDate(a);
      const dateB = getPrimaryDate(b);
      return dateA.localeCompare(dateB);
    });
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
  const hotelAddress = booking.hotelAddress || "";
  const hotelPhone = booking.hotelPhone || "";
  const hotelAddressHtml = hotelAddress ? `<span>Alamat: ${escapeHtml(hotelAddress)}</span>` : "";
  const hotelPhoneHtml = hotelPhone ? `<span>Tel: ${escapeHtml(hotelPhone)}</span>` : "";
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

function saveUserAccount(user) {
  if (isOwnerUser(user)) {
    saveOwnerAccount(user);
    return;
  }

  const users = loadUsers().map((item) => (item.id === user.id ? user : item));
  saveUsers(users);
}

function saveOwnerAccount(user) {
  const ownerSettings = {
    name: user.name || OWNER_ACCOUNT.name,
    email: user.email || OWNER_ACCOUNT.email,
    passwordHash: user.passwordHash || OWNER_ACCOUNT.passwordHash,
    passwordFallbackHash: user.passwordFallbackHash || OWNER_ACCOUNT.passwordFallbackHash,
    updatedAt: user.updatedAt || new Date().toISOString()
  };
  localStorage.setItem(AUTH_OWNER_SETTINGS_KEY, JSON.stringify(ownerSettings));
}

function saveUsers(users) {
  const regularUsers = users.filter((user) => !isOwnerUser(user));
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(regularUsers));
}

function getOwnerAccount() {
  const raw = localStorage.getItem(AUTH_OWNER_SETTINGS_KEY);
  if (!raw) return OWNER_ACCOUNT;

  try {
    const settings = JSON.parse(raw);
    return {
      ...OWNER_ACCOUNT,
      ...settings,
      id: OWNER_ACCOUNT.id,
      role: OWNER_ACCOUNT.role
    };
  } catch {
    return OWNER_ACCOUNT;
  }
}

function loadUsers() {
  const raw = localStorage.getItem(AUTH_USERS_KEY);
  const ownerAccount = getOwnerAccount();
  if (!raw) return [ownerAccount];

  try {
    const parsed = JSON.parse(raw);
    const regularUsers = Array.isArray(parsed) ? parsed.filter((user) => !isOwnerUser(user)) : [];
    return [ownerAccount, ...regularUsers];
  } catch {
    return [ownerAccount];
  }
}

function getStoredUserById(id) {
  return loadUsers().find((user) => user.id === id) || null;
}

function isEmailUsedByAnotherAccount(email, currentUserId) {
  return loadUsers().some((user) => user.id !== currentUserId && normalizeEmail(user.email) === email);
}

function loadCurrentUser() {
  const currentUserId = localStorage.getItem(AUTH_SESSION_KEY);
  if (!currentUserId) return null;
  const user = loadUsers().find((item) => item.id === currentUserId) || null;
  if (user && isUserApproved(user)) return user;
  localStorage.removeItem(AUTH_SESSION_KEY);
  return null;
}

function isOwnerUser(user) {
  return user?.id === OWNER_ACCOUNT.id || user?.role === "owner";
}

function isUserApproved(user) {
  return isOwnerUser(user) || getApprovalStatus(user) === "approved";
}

function getApprovalStatus(user) {
  if (isOwnerUser(user)) return "approved";
  return user?.approvalStatus || "approved";
}

function getApprovalStatusLabel(status) {
  if (status === "pending") return "Menunggu";
  if (status === "rejected") return "Ditolak";
  return "Diluluskan";
}

async function doesPasswordMatch(user, password) {
  const passwordHash = await hashPassword(password);
  const passwordLocalHash = hashPasswordLocal(password);
  return (
    user.passwordHash === passwordHash ||
    user.passwordHash === passwordLocalHash ||
    user.passwordFallbackHash === passwordHash ||
    user.passwordFallbackHash === passwordLocalHash ||
    user.password === password
  );
}

function formatUserLabel(user) {
  return isOwnerUser(user) ? `${user.name || "Owner"} (Owner)` : user.name;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function hashPassword(password) {
  if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return hashPasswordLocal(password);
}

function hashPasswordLocal(password) {
  let hash = 0;
  for (let index = 0; index < password.length; index += 1) {
    hash = (hash << 5) - hash + password.charCodeAt(index);
    hash |= 0;
  }
  return `local-${Math.abs(hash)}`;
}

function saveBookings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bookings));
}

function loadBookings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return bookingsSeed;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : bookingsSeed;
  } catch {
    return bookingsSeed;
  }
}

function getExistingCreatedAt(id) {
  const existing = state.bookings.find((item) => item.id === id);
  return existing?.createdAt || new Date().toISOString();
}

function getRooms(booking) {
  if (Array.isArray(booking.rooms) && booking.rooms.length) {
    return booking.rooms.map((room) => ({
      type: String(room.type || "").trim(),
      count: normalizeRoomCount(room.count)
    }));
  }

  if (booking.roomType || booking.roomCount) {
    return [
      {
        type: String(booking.roomType || "").trim(),
        count: normalizeRoomCount(booking.roomCount)
      }
    ];
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

  if (booking.paxType || booking.paxCount) {
    return [
      {
        type: String(booking.paxType || "").trim(),
        count: normalizePaxCount(booking.paxCount)
      }
    ];
  }

  return [];
}

function formatPaxForSearch(booking) {
  return getPax(booking)
    .map((pax) => `${pax.type} ${pax.count}`)
    .join(" ");
}

function formatPaxForDisplay(booking) {
  return getPax(booking)
    .filter((pax) => pax.type)
    .map((pax) => `${pax.type} | ${pax.count} pax`)
    .join("; ");
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
  return booking.tripStartDate || booking.tripDate || booking.bookingDate || "";
}

function getTripEndDate(booking) {
  return booking.tripEndDate || booking.tripDate || booking.tripStartDate || booking.bookingDate || "";
}

function isDateWithinTrip(date, booking) {
  const startDate = getTripStartDate(booking);
  const endDate = getTripEndDate(booking) || startDate;
  if (!startDate) return false;
  return date >= startDate && date <= endDate;
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
