-- Restrict phone session groups to the centrally defined squads.
alter table public.phone_sessions drop constraint if exists phone_sessions_class_group_check;
alter table public.phone_sessions
  add constraint phone_sessions_class_group_check
  check (class_group in ('138', '139', '183'));
