-- WhoIsThis complete schema for a fresh Supabase project.
-- Existing projects should use migration_v2.sql instead.

create table if not exists public.professors (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 120),
  department text not null check (char_length(department) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists professors_unique_name_department
  on public.professors (lower(trim(name)), lower(trim(department)));
create index if not exists professors_active_name_idx
  on public.professors (is_active, name);

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  professor_id bigint not null references public.professors(id) on delete cascade,
  academic_term text not null check (char_length(academic_term) between 1 and 30),
  course_name text not null check (char_length(course_name) between 1 and 120),
  clarity smallint not null check (clarity between 1 and 5),
  fairness smallint not null check (fairness between 1 and 5),
  organization smallint not null check (organization between 1 and 5),
  interaction smallint check (interaction is null or interaction between 1 and 5),
  difficulty smallint not null check (difficulty between 1 and 5),
  overall_rating smallint not null check (overall_rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1200),
  device_hash text not null,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  unique (professor_id, academic_term, device_hash)
);

create index if not exists reviews_professor_status_idx
  on public.reviews (professor_id, status, created_at desc);
create index if not exists reviews_device_created_idx
  on public.reviews (device_hash, created_at desc);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  review_id bigint not null references public.reviews(id) on delete cascade,
  reason text not null check (char_length(reason) between 2 and 400),
  reporter_hash text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);
create unique index if not exists reports_unique_reporter_review_idx
  on public.reports (review_id, reporter_hash)
  where reporter_hash is not null;

alter table public.professors enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;

-- Intentionally no anon/authenticated policies.
-- Netlify Functions use the server-side Supabase secret/service-role key.
