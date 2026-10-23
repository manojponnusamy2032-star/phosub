create extension if not exists pgcrypto;

create type public.exam_status as enum ('scheduled', 'active', 'closed');
create type public.photo_status as enum ('submitted', 'not_submitted');

create table public.teacher_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  created_at timestamptz not null default now()
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 3),
  class_name text not null check (char_length(trim(class_name)) >= 1),
  expected_count integer not null check (expected_count between 1 and 50),
  student_id_required boolean not null default true,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status public.exam_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  public_token_hash text not null unique,
  started_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index exam_sessions_one_live_session on public.exam_sessions(exam_id) where closed_at is null;
create index exams_owner_id_idx on public.exams(owner_id);
create index exam_sessions_exam_id_idx on public.exam_sessions(exam_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  session_id uuid not null references public.exam_sessions(id) on delete cascade,
  student_id text,
  student_name text not null check (char_length(trim(student_name)) >= 2),
  college_email text not null,
  photo_status public.photo_status not null,
  photo_path text,
  missing_photo_reason text,
  reference_number text not null unique default ('PH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  submitted_at timestamptz not null default now(),
  check ((photo_status = 'submitted' and photo_path is not null and missing_photo_reason is null) or (photo_status = 'not_submitted' and photo_path is null and char_length(trim(missing_photo_reason)) > 0)),
  unique (exam_id, student_id)
);

create index submissions_exam_id_idx on public.submissions(exam_id);
create index submissions_email_idx on public.submissions(exam_id, college_email);

alter table public.teacher_profiles enable row level security;
alter table public.exams enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.submissions enable row level security;

create policy "teachers read own profile" on public.teacher_profiles for select using (id = auth.uid());
create policy "teachers manage own exams" on public.exams for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "teachers manage own sessions" on public.exam_sessions for all using (exists (select 1 from public.exams where exams.id = exam_sessions.exam_id and exams.owner_id = auth.uid())) with check (exists (select 1 from public.exams where exams.id = exam_sessions.exam_id and exams.owner_id = auth.uid()));
create policy "teachers read own submissions" on public.submissions for select using (exists (select 1 from public.exams where exams.id = submissions.exam_id and exams.owner_id = auth.uid()));

insert into storage.buckets (id, name, public) values ('exam-photos', 'exam-photos', false) on conflict (id) do nothing;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger exams_set_updated_at before update on public.exams for each row execute function public.set_updated_at();