-- Add squad column to teacher_profiles and student_profiles
alter table public.teacher_profiles add column if not exists squad text check (squad in ('138', '139', '183'));
alter table public.student_profiles add column if not exists squad text check (squad in ('138', '139', '183'));

-- Update phone_sessions title constraint to allow 1-character titles (matching validation)
alter table public.phone_sessions drop constraint if exists phone_sessions_title_check;
alter table public.phone_sessions add constraint phone_sessions_title_check check (char_length(trim(title)) >= 1);