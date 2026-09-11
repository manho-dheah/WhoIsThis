-- WhoIsThis V2 migration
-- Run ONCE in Supabase > SQL Editor before deploying the V2 code.
-- This migration preserves all existing professors, reviews, and reports.

alter table public.professors
  add column if not exists is_active boolean not null default true;

alter table public.reviews
  add column if not exists interaction smallint;

alter table public.reviews
  drop constraint if exists reviews_interaction_check;

alter table public.reviews
  add constraint reviews_interaction_check
  check (interaction is null or interaction between 1 and 5);

alter table public.reports
  add column if not exists status text not null default 'open';

alter table public.reports
  add column if not exists resolved_at timestamptz;

alter table public.reports
  add column if not exists reporter_hash text;

alter table public.reports
  drop constraint if exists reports_status_check;

alter table public.reports
  add constraint reports_status_check
  check (status in ('open', 'resolved'));

-- Prevent duplicate faculty entries while ignoring case and accidental spaces.
create unique index if not exists professors_unique_name_department
  on public.professors (lower(trim(name)), lower(trim(department)));

create index if not exists professors_active_name_idx
  on public.professors (is_active, name);

create index if not exists reviews_device_created_idx
  on public.reviews (device_hash, created_at desc);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

create unique index if not exists reports_unique_reporter_review_idx
  on public.reports (review_id, reporter_hash)
  where reporter_hash is not null;
