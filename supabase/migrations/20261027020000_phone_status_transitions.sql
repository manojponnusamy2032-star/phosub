-- Additive, idempotent update to phone status transitions.
-- Preserves the database reason requirement for taken_back and not_submitted.
-- Adds the not_submitted -> submitted transition so a student can submit later.

create or replace function public.transition_phone_status(
  p_session_id uuid,
  p_new_status public.phone_status,
  p_reason text default null,
  p_request_id uuid default gen_random_uuid()
)
returns public.phone_statuses
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.phone_statuses;
  session_row public.phone_sessions;
  previous_status public.phone_status;
  event_name text;
begin
  select * into session_row from public.phone_sessions where id = p_session_id for update;
  if session_row.id is null or session_row.status <> 'active' then
    raise exception 'Session is not active';
  end if;
  if not exists (select 1 from public.student_profiles where user_id = auth.uid()) then
    raise exception 'Student profile required';
  end if;
  if not exists (select 1 from public.phone_session_students where session_id = p_session_id and student_id = auth.uid()) then
    raise exception 'Student is not eligible for this session';
  end if;
  if exists (select 1 from public.phone_status_events where session_id = p_session_id and student_id = auth.uid() and request_id = p_request_id) then
    select * into current_row from public.phone_statuses where session_id = p_session_id and student_id = auth.uid();
    return current_row;
  end if;
  select * into current_row from public.phone_statuses where session_id = p_session_id and student_id = auth.uid() for update;
  if current_row.session_id is null then
    current_row := (p_session_id, auth.uid(), 'not_reported', null, now());
  end if;
  previous_status := current_row.current_status;

  -- Allowed transitions.
  if current_row.current_status = 'not_reported' and p_new_status not in ('submitted', 'not_submitted') then
    raise exception 'Initial status must be submitted or not_submitted';
  end if;
  if current_row.current_status = 'submitted' and p_new_status <> 'taken_back' then
    raise exception 'Submitted status can only transition to taken_back';
  end if;
  if current_row.current_status = 'taken_back' and p_new_status <> 'submitted' then
    raise exception 'Taken_back status can only transition to submitted';
  end if;
  if current_row.current_status = 'not_submitted' and p_new_status not in ('submitted', 'not_submitted') then
    raise exception 'Not submitted status can only transition to submitted';
  end if;

  if p_new_status = 'taken_back' and char_length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A reason is required to take a phone back';
  end if;
  if p_new_status = 'not_submitted' and char_length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A reason is required';
  end if;

  event_name := case
    when p_new_status = 'taken_back' then 'phone_taken_back'
    when p_new_status = 'submitted' and current_row.current_status = 'taken_back' then 'phone_submitted_again'
    when p_new_status = 'not_submitted' then 'non_submission_recorded'
    else 'phone_submitted'
  end;

  insert into public.phone_statuses(session_id, student_id, current_status, current_reason, updated_at)
  values (p_session_id, auth.uid(), p_new_status, nullif(trim(p_reason), ''), now())
  on conflict (session_id, student_id) do update
    set current_status = excluded.current_status,
        current_reason = excluded.current_reason,
        updated_at = excluded.updated_at
  returning * into current_row;

  insert into public.phone_status_events(session_id, student_id, event_type, previous_status, new_status, reason, request_id)
  values (p_session_id, auth.uid(), event_name, previous_status, p_new_status, nullif(trim(p_reason), ''), p_request_id);

  return current_row;
end;
$$;

revoke all on function public.transition_phone_status(uuid, public.phone_status, text, uuid) from public;
grant execute on function public.transition_phone_status(uuid, public.phone_status, text, uuid) to authenticated;
