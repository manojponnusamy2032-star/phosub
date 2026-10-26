create type public.phone_session_status as enum ('active', 'ended');
create type public.phone_status as enum ('not_reported', 'submitted', 'taken_back', 'not_submitted');

alter table public.teacher_profiles drop constraint if exists teacher_profiles_role_check;
update public.teacher_profiles set role = 'mentor' where role in ('teacher', 'admin');
alter table public.teacher_profiles add constraint teacher_profiles_role_check check (role = 'mentor');

create table public.phone_sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.teacher_profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) >= 2),
  class_group text not null check (char_length(trim(class_group)) >= 1),
  classroom text,
  status public.phone_session_status not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'active' and ended_at is null) or (status = 'ended' and ended_at is not null))
);

create unique index phone_sessions_one_active_per_group on public.phone_sessions(mentor_id, class_group) where status = 'active';
create index phone_sessions_mentor_idx on public.phone_sessions(mentor_id, created_at desc);

create table public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role = 'student'),
  full_name text not null check (char_length(trim(full_name)) >= 2),
  college_email text not null unique,
  created_at timestamptz not null default now()
);

create table public.phone_session_students (
  session_id uuid not null references public.phone_sessions(id) on delete cascade,
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

create table public.phone_statuses (
  session_id uuid not null references public.phone_sessions(id) on delete cascade,
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  current_status public.phone_status not null default 'not_reported',
  current_reason text,
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id),
  check ((current_status = 'not_submitted' and char_length(trim(current_reason)) > 0) or current_status <> 'not_submitted')
);

create table public.phone_status_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.phone_sessions(id) on delete cascade,
  student_id uuid not null references public.student_profiles(user_id) on delete cascade,
  event_type text not null check (event_type in ('status_changed', 'phone_submitted', 'phone_taken_back', 'phone_submitted_again', 'non_submission_recorded')),
  previous_status public.phone_status,
  new_status public.phone_status not null,
  reason text,
  request_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index phone_session_students_student_idx on public.phone_session_students(student_id);
create index phone_statuses_session_idx on public.phone_statuses(session_id, current_status);
create index phone_status_events_session_idx on public.phone_status_events(session_id, created_at);
create unique index phone_status_events_request_idx on public.phone_status_events(session_id, student_id, request_id);

alter table public.phone_sessions enable row level security;
alter table public.student_profiles enable row level security;
alter table public.phone_session_students enable row level security;
alter table public.phone_statuses enable row level security;
alter table public.phone_status_events enable row level security;

create policy "mentors manage own phone sessions" on public.phone_sessions for all using (mentor_id = auth.uid()) with check (mentor_id = auth.uid());
create policy "students read own profile" on public.student_profiles for select using (user_id = auth.uid());
create policy "mentors read enrolled profiles" on public.student_profiles for select using (exists (select 1 from public.phone_sessions s join public.phone_session_students ss on ss.session_id = s.id where s.id = ss.session_id and s.mentor_id = auth.uid() and ss.student_id = student_profiles.user_id));
create policy "mentors manage enrollment" on public.phone_session_students for all using (exists (select 1 from public.phone_sessions where phone_sessions.id = phone_session_students.session_id and phone_sessions.mentor_id = auth.uid())) with check (exists (select 1 from public.phone_sessions where phone_sessions.id = phone_session_students.session_id and phone_sessions.mentor_id = auth.uid()));
create policy "students read own enrollment" on public.phone_session_students for select using (student_id = auth.uid());
create policy "students read own status" on public.phone_statuses for select using (student_id = auth.uid());
create policy "mentors read session statuses" on public.phone_statuses for select using (exists (select 1 from public.phone_sessions where phone_sessions.id = phone_statuses.session_id and phone_sessions.mentor_id = auth.uid()));
create policy "students read own events" on public.phone_status_events for select using (student_id = auth.uid());
create policy "mentors read session events" on public.phone_status_events for select using (exists (select 1 from public.phone_sessions where phone_sessions.id = phone_status_events.session_id and phone_sessions.mentor_id = auth.uid()));

create or replace function public.transition_phone_status(p_session_id uuid, p_new_status public.phone_status, p_reason text default null, p_request_id uuid default gen_random_uuid())
returns public.phone_statuses language plpgsql security definer set search_path = public
as $$
declare
  current_row public.phone_statuses;
  session_row public.phone_sessions;
  previous_status public.phone_status;
  event_name text;
begin
  select * into session_row from public.phone_sessions where id = p_session_id for update;
  if session_row.id is null or session_row.status <> 'active' then raise exception 'Session is not active'; end if;
  if not exists (select 1 from public.student_profiles where user_id = auth.uid()) then raise exception 'Student profile required'; end if;
  if not exists (select 1 from public.phone_session_students where session_id = p_session_id and student_id = auth.uid()) then raise exception 'Student is not eligible for this session'; end if;
  if exists (select 1 from public.phone_status_events where session_id = p_session_id and student_id = auth.uid() and request_id = p_request_id) then select * into current_row from public.phone_statuses where session_id = p_session_id and student_id = auth.uid(); return current_row; end if;
  select * into current_row from public.phone_statuses where session_id = p_session_id and student_id = auth.uid() for update;
  if current_row.session_id is null then current_row := (p_session_id, auth.uid(), 'not_reported', null, now()); end if;
  previous_status := current_row.current_status;
  if current_row.current_status = 'not_reported' and p_new_status not in ('submitted', 'not_submitted') then raise exception 'Initial status must be submitted or not_submitted'; end if;
  if current_row.current_status = 'submitted' and p_new_status <> 'taken_back' then raise exception 'Submitted status can only transition to taken_back'; end if;
  if current_row.current_status = 'taken_back' and p_new_status <> 'submitted' then raise exception 'Taken_back status can only transition to submitted'; end if;
  if p_new_status = 'taken_back' and char_length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'A reason is required to take a phone back'; end if;
  if p_new_status = 'not_submitted' and char_length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'A reason is required'; end if;
  event_name := case when p_new_status = 'taken_back' then 'phone_taken_back' when p_new_status = 'submitted' and current_row.current_status = 'taken_back' then 'phone_submitted_again' when p_new_status = 'not_submitted' then 'non_submission_recorded' else 'phone_submitted' end;
  insert into public.phone_statuses(session_id, student_id, current_status, current_reason, updated_at) values (p_session_id, auth.uid(), p_new_status, nullif(trim(p_reason), ''), now()) on conflict (session_id, student_id) do update set current_status = excluded.current_status, current_reason = excluded.current_reason, updated_at = excluded.updated_at returning * into current_row;
  insert into public.phone_status_events(session_id, student_id, event_type, previous_status, new_status, reason, request_id) values (p_session_id, auth.uid(), event_name, previous_status, p_new_status, nullif(trim(p_reason), ''), p_request_id);
  return current_row;
end;
$$;

revoke all on function public.transition_phone_status(uuid, public.phone_status, text, uuid) from public;
grant execute on function public.transition_phone_status(uuid, public.phone_status, text, uuid) to authenticated;