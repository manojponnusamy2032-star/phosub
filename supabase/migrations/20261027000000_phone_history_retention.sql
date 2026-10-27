-- Preserve accountability history: mentors may not delete phone sessions that have status history.
drop policy if exists "mentors manage own phone sessions" on public.phone_sessions;

create policy "mentors read own phone sessions"
  on public.phone_sessions for select
  using (mentor_id = auth.uid());

create policy "mentors insert own phone sessions"
  on public.phone_sessions for insert
  with check (mentor_id = auth.uid());

create policy "mentors update own phone sessions"
  on public.phone_sessions for update
  using (mentor_id = auth.uid())
  with check (mentor_id = auth.uid());

-- Prevent cascading deletion of status history when a session is removed.
alter table public.phone_status_events
  drop constraint if exists phone_status_events_session_id_fkey;
alter table public.phone_status_events
  add constraint phone_status_events_session_id_fkey
  foreign key (session_id) references public.phone_sessions(id) on delete restrict;

alter table public.phone_statuses
  drop constraint if exists phone_statuses_session_id_fkey;
alter table public.phone_statuses
  add constraint phone_statuses_session_id_fkey
  foreign key (session_id) references public.phone_sessions(id) on delete restrict;
