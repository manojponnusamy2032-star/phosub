# Phosub

College classroom phone-submission accountability system, with the existing QR exam/photo workflow preserved as a separate feature.

## What is implemented

- Next.js App Router with strict TypeScript, Tailwind CSS, accessible form controls, and Lucide icons.
- Teacher dashboard with persisted-data API contract, counts, filtering, QR session controls, and `/teacher/exams/new` creation form.
- Teacher Supabase Auth login and middleware protection for teacher routes when live mode is enabled.
- Projector display at `/classroom/:sessionToken`.
- Public student flow at `/session/:sessionToken` with conditional phone/photo status, reason validation, private signed upload flow, duplicate protection, and receipt state.
- Supabase PostgreSQL migration with teacher roles, exams, sessions, submissions, constraints, indexes, RLS, and a private storage bucket.
- API handlers for exams, lifecycle transitions, authorized submissions, public session validation, and signed uploads.
- Explicit mock adapter for local UI development. It is selected in development when `NEXT_PUBLIC_USE_MOCK_ADAPTER=true` or when the flag is absent. Production never silently falls back to mock data.
- No-QR phone workflow at `/mentor/phone` and `/student`: mentors start/end sessions, students report `submitted`, `taken_back`, or `not_submitted`, and every transition is server-timestamped in an immutable event history.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The default local mode is mock-backed and does not persist student data. Use `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Apply the already-existing migrations in order, then apply `supabase/migrations/20261023020000_phone_tracking.sql` for phone sessions and status history.
3. Enable Email/Password Auth and create teacher users.
4. Insert each authorized mentor into `public.teacher_profiles` with the matching `auth.users.id` and role `mentor`.
5. Insert students into `public.student_profiles` with their Auth user ID, trusted name, and college email.
6. Configure the environment variables below and set `NEXT_PUBLIC_USE_MOCK_ADAPTER=false`.

```env
NEXT_PUBLIC_APP_URL=https://your-public-app.example
NEXT_PUBLIC_USE_MOCK_ADAPTER=false
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
SUPABASE_STORAGE_BUCKET=exam-photos
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it. The migration creates a private `exam-photos` bucket. The service role is used only on the server for trusted staff/student profile lookups, account provisioning, public-token lookup, and signed storage operations.

Teacher provisioning is intentionally controlled: create the user through Supabase Auth, then insert the matching profile from the Supabase SQL editor or an administrator-only provisioning tool. Public sign-up must not be used as a role-granting mechanism.

## API routes

- `POST /api/exams`
- `POST /api/exams/:id/start`
- `POST /api/exams/:id/close`
- `POST /api/exams/:id/reopen`
- `POST /api/auth/logout`
- `GET /api/exams/:id`
- `GET /api/exams/:id/submissions`
- `GET /api/exams/:id/submissions/:submissionId/photo`
- `GET /api/sessions/:token`
- `POST /api/sessions/:token/submissions`
- `POST /api/uploads/sign`
- `GET /api/phone-sessions/active`
- `GET /api/phone-sessions`
- `POST /api/phone-sessions`
- `GET /api/phone-sessions/:id`
- `POST /api/phone-sessions/:id/status`
- `POST /api/phone-sessions/:id/end`
- `GET /api/phone-sessions/:id/events`

Teacher routes derive ownership from the Supabase Auth session. Public routes use a random session token; only its SHA-256 hash is stored. The server enforces lifecycle status, deadlines, upload ownership, file limits, duplicate constraints, and student ID requirements.

Phone status transitions use the `transition_phone_status` PostgreSQL function. It locks the session/current row, validates eligibility and allowed transitions, updates current status, and appends an event atomically. Students must be enrolled in `phone_session_students`; the current implementation enrolls all student profiles when a mentor starts a session without an explicit ID list.

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

CI runs all four commands on pushes and pull requests through `.github/workflows/ci.yml`. The existing unit tests cover conditional submission validation. Supabase integration, storage, and authorization tests require a configured isolated Supabase project and are not claimed as locally executed without those credentials.

## Deployment

Deploy the Next.js application to Vercel or another Node-compatible host with the environment variables above. Apply migrations before setting live mode. Keep backups enabled in Supabase, test restoring the database and storage bucket separately, and rotate the service-role key if it is ever exposed.
