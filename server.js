require("dotenv").config();

const bcrypt = require("bcrypt");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./db");

const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET", "FRONTEND_ORIGIN"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingEnv.length) {
  throw new Error(`Missing environment variables: ${missingEnv.join(", ")}`);
}

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 12;
const allowedOrigin = process.env.FRONTEND_ORIGIN;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === allowedOrigin) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    }
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!name || !email || password.length < 6) {
    return res.status(400).json({ message: "Nama, email dan password wajib diisi." });
  }

  const existing = await db.query("select id from public.users where email = $1", [email]);
  if (existing.rowCount) {
    return res.status(409).json({ message: "Email ini sudah berdaftar." });
  }

  const passwordHash = await bcrypt.hash(password, saltRounds);
  const result = await db.query(
    `insert into public.users (name, email, password_hash, role, approval_status)
     values ($1, $2, $3, 'user', 'pending')
     returning id, name, email, role, approval_status, created_at`,
    [name, email, passwordHash]
  );

  res.status(201).json({
    message: "Akaun sudah didaftarkan. Tunggu approval owner sebelum login.",
    user: toUser(result.rows[0])
  });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  const result = await db.query("select * from public.users where email = $1", [email]);
  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: "Email atau password tidak betul." });
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ message: "Email atau password tidak betul." });
  }

  if (user.approval_status !== "approved") {
    return res.status(403).json({ message: "Akaun belum diluluskan oleh owner." });
  }

  const cleanUser = toUser(user);
  res.json({
    token: signToken(cleanUser),
    user: cleanUser
  });
}));

app.get("/api/auth/me", requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: toUser(req.user) });
}));

app.patch("/api/auth/me", requireAuth, asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (!name || !email || !currentPassword) {
    return res.status(400).json({ message: "Nama, email dan password sekarang wajib diisi." });
  }

  const passwordOk = await bcrypt.compare(currentPassword, req.user.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ message: "Password sekarang tidak betul." });
  }

  if (newPassword && newPassword.length < 6) {
    return res.status(400).json({ message: "Password baru mesti sekurang-kurangnya 6 aksara." });
  }

  const duplicate = await db.query("select id from public.users where email = $1 and id <> $2", [email, req.user.id]);
  if (duplicate.rowCount) {
    return res.status(409).json({ message: "Email ini sudah digunakan oleh akaun lain." });
  }

  const passwordHash = newPassword ? await bcrypt.hash(newPassword, saltRounds) : req.user.password_hash;
  const result = await db.query(
    `update public.users
     set name = $1, email = $2, password_hash = $3
     where id = $4
     returning id, name, email, role, approval_status, created_at`,
    [name, email, passwordHash, req.user.id]
  );

  const cleanUser = toUser(result.rows[0]);
  res.json({
    token: signToken(cleanUser),
    user: cleanUser
  });
}));

app.get("/api/users", requireAuth, requireOwner, asyncHandler(async (_req, res) => {
  const result = await db.query(
    `select id, name, email, role, approval_status, created_at
     from public.users
     where role <> 'owner'
     order by created_at asc`
  );

  res.json({ users: result.rows.map(toUser) });
}));

app.patch("/api/users/:id/access", requireAuth, requireOwner, asyncHandler(async (req, res) => {
  const status = String(req.body.status || "");
  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Status tidak sah." });
  }

  const result = await db.query(
    `update public.users
     set approval_status = $1
     where id = $2 and role <> 'owner'
     returning id, name, email, role, approval_status, created_at`,
    [status, req.params.id]
  );

  if (!result.rowCount) {
    return res.status(404).json({ message: "User tidak dijumpai." });
  }

  res.json({ user: toUser(result.rows[0]) });
}));

app.delete("/api/users/:id", requireAuth, requireOwner, asyncHandler(async (req, res) => {
  const result = await db.query("delete from public.users where id = $1 and role <> 'owner' returning id", [req.params.id]);

  if (!result.rowCount) {
    return res.status(404).json({ message: "User tidak dijumpai." });
  }

  res.status(204).send();
}));

app.get("/api/bookings", requireAuth, requireApproved, asyncHandler(async (_req, res) => {
  const result = await db.query(
    `select *
     from public.bookings
     order by trip_start_date asc, created_at asc`
  );

  res.json({ bookings: result.rows.map(toBooking) });
}));

app.post("/api/bookings", requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const booking = validateBooking(req.body);
  const result = await db.query(
    `insert into public.bookings (
      customer_name, phone, trip_start_date, trip_end_date, trip_type, package_location,
      hotel_name, hotel_address, hotel_phone, rooms, pax, status, notes, created_by
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14)
    returning *`,
    [
      booking.customerName,
      booking.phone,
      booking.tripStartDate,
      booking.tripEndDate,
      booking.tripType,
      booking.packageLocation,
      booking.hotelName,
      booking.hotelAddress,
      booking.hotelPhone,
      JSON.stringify(booking.rooms),
      JSON.stringify(booking.pax),
      booking.status,
      booking.notes,
      req.user.id
    ]
  );

  res.status(201).json({ booking: toBooking(result.rows[0]) });
}));

app.put("/api/bookings/:id", requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const booking = validateBooking(req.body);
  const result = await db.query(
    `update public.bookings
     set customer_name = $1,
         phone = $2,
         trip_start_date = $3,
         trip_end_date = $4,
         trip_type = $5,
         package_location = $6,
         hotel_name = $7,
         hotel_address = $8,
         hotel_phone = $9,
         rooms = $10::jsonb,
         pax = $11::jsonb,
         status = $12,
         notes = $13
     where id = $14
     returning *`,
    [
      booking.customerName,
      booking.phone,
      booking.tripStartDate,
      booking.tripEndDate,
      booking.tripType,
      booking.packageLocation,
      booking.hotelName,
      booking.hotelAddress,
      booking.hotelPhone,
      JSON.stringify(booking.rooms),
      JSON.stringify(booking.pax),
      booking.status,
      booking.notes,
      req.params.id
    ]
  );

  if (!result.rowCount) {
    return res.status(404).json({ message: "Booking tidak dijumpai." });
  }

  res.json({ booking: toBooking(result.rows[0]) });
}));

app.delete("/api/bookings/:id", requireAuth, requireApproved, asyncHandler(async (req, res) => {
  const result = await db.query("delete from public.bookings where id = $1 returning id", [req.params.id]);

  if (!result.rowCount) {
    return res.status(404).json({ message: "Booking tidak dijumpai." });
  }

  res.status(204).send();
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Server error. Cuba semula." });
});

app.listen(port, () => {
  console.log(`Booking backend running on port ${port}`);
});

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Login diperlukan." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query("select * from public.users where id = $1", [payload.sub]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Sesi tidak sah." });
    }

    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Sesi tamat atau tidak sah." });
  }
}

function requireApproved(req, res, next) {
  if (req.user.approval_status !== "approved") {
    return res.status(403).json({ message: "Akaun belum diluluskan oleh owner." });
  }
  next();
}

function requireOwner(req, res, next) {
  if (req.user.role !== "owner" || req.user.approval_status !== "approved") {
    return res.status(403).json({ message: "Akses owner sahaja." });
  }
  next();
}

function validateBooking(body) {
  const booking = {
    customerName: String(body.customerName || "").trim(),
    phone: String(body.phone || "").trim(),
    tripStartDate: String(body.tripStartDate || "").trim(),
    tripEndDate: String(body.tripEndDate || "").trim(),
    tripType: ["Private", "Open Group"].includes(body.tripType) ? body.tripType : "Private",
    packageLocation: String(body.packageLocation || "").trim(),
    hotelName: String(body.hotelName || "").trim(),
    hotelAddress: String(body.hotelAddress || "").trim(),
    hotelPhone: String(body.hotelPhone || "").trim(),
    rooms: Array.isArray(body.rooms) ? body.rooms.map(toCountItem).filter(Boolean) : [],
    pax: Array.isArray(body.pax) ? body.pax.map(toCountItem).filter(Boolean) : [],
    status: ["Baru", "Disahkan", "Selesai", "Batal"].includes(body.status) ? body.status : "Baru",
    notes: String(body.notes || "").trim()
  };

  if (!booking.customerName || !booking.phone || !booking.tripStartDate || !booking.tripEndDate || !booking.packageLocation || !booking.hotelName) {
    throw httpError(400, "Lengkapkan semua maklumat booking wajib.");
  }

  if (!booking.rooms.length || !booking.pax.length) {
    throw httpError(400, "Lengkapkan jenis bilik dan jumlah pax.");
  }

  return booking;
}

function toCountItem(item) {
  const type = String(item?.type || "").trim();
  const count = Number.parseInt(item?.count || "0", 10);
  if (!type || Number.isNaN(count) || count < 1) return null;
  return {
    type,
    count: String(count)
  };
}

function toBooking(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone,
    tripStartDate: formatDateOnly(row.trip_start_date),
    tripEndDate: formatDateOnly(row.trip_end_date),
    tripType: row.trip_type,
    packageLocation: row.package_location,
    hotelName: row.hotel_name,
    hotelAddress: row.hotel_address || "",
    hotelPhone: row.hotel_phone || "",
    rooms: row.rooms || [],
    pax: row.pax || [],
    status: row.status,
    notes: row.notes || "",
    createdBy: row.created_by || "",
    createdAt: row.created_at
  };
}

function toUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    approvalStatus: row.approval_status,
    createdAt: row.created_at
  };
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function getBearerToken(req) {
  const header = req.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDateOnly(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((error) => {
      if (error.status) {
        res.status(error.status).json({ message: error.message });
        return;
      }
      next(error);
    });
  };
}
