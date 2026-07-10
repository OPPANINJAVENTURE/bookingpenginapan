create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('owner', 'user')),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  trip_start_date date not null,
  trip_end_date date not null,
  trip_type text not null default 'Private' check (trip_type in ('Private', 'Open Group')),
  package_location text not null,
  hotel_name text not null,
  hotel_address text,
  hotel_phone text,
  rooms jsonb not null default '[]'::jsonb,
  pax jsonb not null default '[]'::jsonb,
  status text not null default 'Baru' check (status in ('Baru', 'Disahkan', 'Selesai', 'Batal')),
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);
create index if not exists users_role_idx on public.users (role);
create index if not exists bookings_trip_start_date_idx on public.bookings (trip_start_date);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_created_by_idx on public.bookings (created_by);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- Cara buat owner:
-- 1. Register owner melalui app supaya password di-hash oleh backend.
-- 2. Run SQL ini dengan email owner sebenar:
-- update public.users
-- set role = 'owner', approval_status = 'approved'
-- where email = 'owner@email.com';
