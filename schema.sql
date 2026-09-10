-- Run this once in Supabase > SQL Editor.
-- The website never exposes the service-role key. All database access goes through Netlify Functions.

create table if not exists public.professors (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 120),
  department text not null check (char_length(department) between 2 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  professor_id bigint not null references public.professors(id) on delete cascade,
  academic_term text not null check (char_length(academic_term) between 1 and 30),
  course_name text not null check (char_length(course_name) between 1 and 120),
  clarity smallint not null check (clarity between 1 and 5),
  fairness smallint not null check (fairness between 1 and 5),
  organization smallint not null check (organization between 1 and 5),
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

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  review_id bigint not null references public.reviews(id) on delete cascade,
  reason text not null check (char_length(reason) between 2 and 400),
  created_at timestamptz not null default now()
);

-- Lock direct browser access. Netlify Functions use the Supabase service-role key server-side.
alter table public.professors enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;

-- Intentionally no anon/authenticated policies.
-- Service role bypasses RLS, so only the server-side functions can read/write.
