# Backend Record Oppa Ninja

Backend ini menggunakan Node.js, Express, PostgreSQL, JWT authentication dan bcrypt.

## Setup

1. Install dependency:

```bash
npm install
```

2. Buat database PostgreSQL dan run `schema.sql`.

3. Copy `.env.example` kepada `.env`, kemudian isi nilai sebenar:

```env
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=isi_secret_panjang_yang_random
FRONTEND_ORIGIN=https://username.github.io
PGSSL=false
```

Untuk database hosted yang perlukan SSL, set `PGSSL=true`.

4. Start backend:

```bash
npm start
```

## Jadikan owner

Register akaun owner melalui frontend dahulu supaya password disimpan sebagai hash bcrypt. Selepas itu run SQL ini:

```sql
update public.users
set role = 'owner', approval_status = 'approved'
where email = 'owner@email.com';
```

## Frontend

Copy `backend-config.example.js` kepada `backend-config.js` di folder utama app dan isi URL backend:

```js
window.BOOKING_BACKEND_CONFIG = {
  apiBaseUrl: "https://domain-backend-anda.com/api"
};
```

Jangan commit `.env`, `DATABASE_URL`, atau `JWT_SECRET` ke GitHub.
