# Phosub

QR-based student exam submission workflow for classroom use.

## Current implementation

- Next.js App Router, strict TypeScript, Tailwind CSS, Lucide icons.
- Teacher control room at `/` with status cards, searchable submission register, QR generation, classroom link, and session controls.
- Projector-friendly display at `/classroom/demo-midterm`.
- Mobile-first student flow at `/session/demo-midterm` with conditional photo/reason fields, client validation, preview, duplicate-submit protection, and receipt state.
- Typed service boundary in `src/lib/api.ts`. `NEXT_PUBLIC_USE_MOCK_ADAPTER=true` is an explicit UI-development adapter and does not persist student data.
- Live adapter calls the documented `/api` endpoints. Authentication, authorization, server-side validation, storage signing, duplicate prevention, and database persistence must be implemented by the deployed backend before switching mock mode off.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The default `.env.example` keeps the explicit mock adapter enabled.

## Environment

`NEXT_PUBLIC_APP_URL` is the public origin used when a teacher starts an exam. `NEXT_PUBLIC_USE_MOCK_ADAPTER` must be `false` only when the live API routes are available. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are placeholders for the browser-safe Supabase client; service-role keys must remain server-side.

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

The current test suite covers the conditional submission schema. The live service adapter is intentionally not presented as connected until the backend contract is deployed.

## API contract

The live adapter expects:

- `POST /api/exams`
- `POST /api/exams/:id/start`
- `POST /api/exams/:id/close`
- `POST /api/exams/:id/reopen`
- `GET /api/exams/:id`
- `GET /api/exams/:id/submissions`
- `GET /api/sessions/:id`
- `POST /api/sessions/:id/submissions`
- `POST /api/uploads/sign` for a short-lived private upload URL

The server must derive ownership and authorization from the authenticated session, enforce exam deadlines and file constraints, and prevent duplicate submissions. Never trust IDs, status flags, or photo ownership sent by a browser.This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
