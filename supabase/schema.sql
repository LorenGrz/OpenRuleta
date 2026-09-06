-- OpenRuleta — database schema.
--
-- Paste into the Supabase SQL editor (Dashboard → SQL Editor) and run, or apply
-- it with the Supabase CLI. It is idempotent: safe to run again.
--
-- Both apps share this one table:
--   - apps/form   inserts rows with the anon key (INSERT-only under RLS).
--   - apps/ruleta reads/updates/deletes with the service_role key (bypasses RLS,
--     local use only).

create extension if not exists "pgcrypto";

create table if not exists public.participants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  -- Optional. The form can be configured to drop this field entirely
  -- (packages/config → form.docField.enabled = false), in which case it is null.
  doc_last3  text check (doc_last3 is null or doc_last3 ~ '^\d{3}$'),
  created_at timestamptz not null default now(),
  -- Set by the wheel app when this person wins. null = still in the pool.
  -- Persistent: a winner stays excluded across draws and machines.
  won_at     timestamptz,
  -- Prize assigned when the winner is confirmed (written by the wheel app).
  prize      text
);

-- Older databases: make sure the added columns exist.
alter table public.participants add column if not exists won_at timestamptz;
alter table public.participants add column if not exists prize  text;

-- One entry per email address (case-insensitive). This unique index is what
-- raises SQLSTATE 23505 -> the form route answers 409.
create unique index if not exists participants_email_key
  on public.participants (lower(email));

create index if not exists participants_won_at_idx
  on public.participants (won_at);

-- Cheap round-trip for the keep-alive route (apps/form /api/ping). Touches no
-- table and returns no data: just now(). Keeps Supabase's free tier from
-- pausing the project. SECURITY INVOKER: `select now()` needs no privileges.
create or replace function public.app_ping()
  returns timestamptz
  language sql
  security invoker
  set search_path = ''
as $$ select now() $$;

revoke all on function public.app_ping() from public;
grant execute on function public.app_ping() to anon, authenticated;

-- ── Row Level Security ─────────────────────────────────────────────────────
-- The deployed form uses the anon key and only needs INSERT.
-- The wheel app uses the service_role key, which ignores RLS entirely.
alter table public.participants enable row level security;

-- The form's INSERT (won_at is always null on sign-up).
drop policy if exists "public insert participants" on public.participants;
create policy "public insert participants"
  on public.participants for insert
  to anon, authenticated
  with check (won_at is null);

-- The anon key must not read, update or delete anything.
drop policy if exists "anon select participants" on public.participants;
drop policy if exists "anon update won_at"       on public.participants;
drop policy if exists "anon delete participants" on public.participants;

revoke select, update, delete, truncate, references, trigger
  on public.participants from anon, authenticated;

revoke insert on public.participants from anon, authenticated;
grant  insert (name, email, doc_last3) on public.participants to anon, authenticated;
