# Campus API

NestJS + Prisma + PostgreSQL backend for the Campus school management platform.
Full design reference: [`../docs/specification.html`](../docs/specification.html).

## Status — the full Campus API, implemented and verified (2026-10-04)

Every resource group from the spec is implemented and was exercised end-to-end
against a real Postgres database, not just compiled:

- **Auth** (Table 00) — login, refresh, me
- **Platform**, Super Admin only (Table 01) — schools, plans
- **Tenancy & People** (Table 02) — staff, students, guardians, parents
- **Academics** (Table 03) — academic years, classes, sections, subjects,
  class-subject assignment, timetable
- **Attendance** (Table 04) — bulk marking, filtering, per-student summary
- **Exams, Grades & Assignments** (Table 05) — exams, schedules, bulk marks
  entry, computed report cards, assignments, submissions, grading
- **Fees & Billing** (Table 06) — fee structures, invoice generation,
  parent checkout, a signed public webhook, manual payment recording
- **Communication** (Table 07) — scoped notices (all/class/section/role),
  teacher↔parent messaging, a user's own notification log
- **Teacher discovery** (added while building the Flutter Teacher
  screens, not in the original Table list) — `GET /timetable/mine`,
  `GET /exam-schedules/mine`, `GET /exam-schedules/:id/marks` — a Teacher
  has no way to find their own classes or schedules otherwise, since the
  list endpoints for those are Admin-only

Full chain tested by hand: admit a student into a section → assign a
teacher → build a timetable slot → mark attendance → run an exam → enter
marks → read a computed report card → generate a fee invoice → check out
→ settle via the (mock) signed webhook, idempotently → post a scoped
notice → message a parent. Then re-verified the one guarantee the whole
architecture rests on: onboarded a second school and confirmed it sees
*none* of the first school's classes, subjects, exams, fees, or notices.

Along the way: four real bugs caught and fixed (see below), one missing
endpoint group filled in (`/staff`, `/students/:id/guardians`, `/parents/:id`
didn't exist yet even though Academics/Exams needed teacher and parent
accounts to test against), and one schema gap closed (`Notice` had an
`audienceScope` of CLASS/SECTION/ROLE with no column to say *which* class,
section, or role).

## Prerequisites

- Node.js 20+ — installed this session via `winget install OpenJS.NodeJS.LTS`.
- PostgreSQL 14+. Either:
  - **Docker** — `docker compose up -d` (starts Postgres on `:5432`), or
  - **A project-local cluster** — what this session actually used, since this
    machine already had a system-wide Postgres with an unknown password. See
    "Local dev database" below.

## Setup

```bash
cp .env.example .env        # edit DATABASE_URL to match whichever Postgres you use
npm install
npm run prisma:migrate      # creates the schema from prisma/schema.prisma
npm run prisma:seed         # creates a Super Admin + one sample school
npm run start:dev           # http://localhost:3000/v1
```

## Local dev database (no Docker, no system Postgres)

If you don't want to touch Docker or any existing Postgres install, initialize
a small cluster scoped entirely to this project (data lives in `.pgdata/`,
already gitignored):

```bash
# from backend/, with PostgreSQL's bin/ on PATH
initdb -D .pgdata -U campus --pwfile=<(echo campus_dev_password) -E UTF8 --locale=C
pg_ctl -D .pgdata -o "-p 5433" -l .pgdata/server.log start
createdb -h localhost -p 5433 -U campus campus
```

Then set `DATABASE_URL="postgresql://campus:campus_dev_password@localhost:5433/campus?schema=public"`
in `.env`. Stop it later with `pg_ctl -D .pgdata stop`.

Seeded logins (change immediately outside local dev):

| Role | Email | Password |
|---|---|---|
| Super Admin | `owner@campus.app` | `ChangeMe123!` |
| School Admin (Scholars' Academy) | `admin@scholarsacademy.test` | `ChangeMe123!` |

## Try it

```bash
# Log in as the school admin
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@scholarsacademy.test","password":"ChangeMe123!"}'

# Use the returned accessToken
curl http://localhost:3000/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

## Bugs found by actually running this

### Round 1 — Auth, Platform, Students

Three, all fixed, all worth knowing about if you're extending this code:

1. **`User` had no `fullName` column.** Carried over from the original ER
   diagram, which never modeled a name field for any role. Found while
   wiring up student admission — fixed in `schema.prisma` and
   `CreateSchoolDto`/`CreateStudentDto`.
2. **`ClassSubject.class` had no opposite relation on `Class`.** Prisma
   schema validation catches this at `generate` time, not at runtime —
   fixed by adding `classSubjects ClassSubject[]` to `Class`.
3. **`StudentsService.list()` silently hid every student with no section
   yet** — i.e. every student right after admission. The query filtered
   through the optional `section` relation (`section: { id: sectionId, ... }`),
   which Prisma treats as "a matching related row must exist" — the same
   way an inner join drops a null foreign key. Fixed by scoping through
   `user.schoolId` (always set) and filtering `sectionId` as a plain,
   independently-optional scalar. This is the kind of bug that looks like
   "no students yet" in a demo and is actually "tenant scoping is broken."

A fourth issue was environmental, not a code bug: the seed script's
placeholder UUIDs (`00000000-...-0001`) are valid in Postgres's `uuid`
column type but fail `class-validator`'s `@IsUUID()` on any endpoint that
takes one as input, since that placeholder has no valid UUID version/variant
nibble. Fixed by seeding with properly-formatted v4 UUIDs instead.

### Round 2 — Academics, Attendance, Exams, Fees, Communication

Zero bugs found by testing this time — the patterns from Round 1 (scope
through a *required* relation chain, never an optional one; verify a
parent-id a client sends actually belongs to the caller's school before
writing anything against it; check `assertCanAccessStudent` on every route
a Parent or Student can reach) were applied from the start instead of found
afterward. What *was* caught, during schema design rather than testing:

- **`Notice.audienceScope` had no target column.** It could say CLASS,
  SECTION, or ROLE but never record *which* class, section, or role — a
  notice system that can't actually target anything. Fixed by adding
  `targetClassId` / `targetSectionId` / `targetRole` to the schema, each
  validated as required exactly when its matching scope is chosen
  (`NoticesService.create`).
- **Table 02 was never finished.** The original scaffold only built
  student list/admit; `/staff`, `/students/:id/guardians`, and
  `/parents/:id` didn't exist. This became a hard blocker the moment
  Academics needed a teacher to assign to a class — filled in before any
  of the new modules could be tested at all.

### Round 3 — closing a gap flagged by the admin web app

While wiring up the School Console's Timetable tab (see
`admin-web/README.md`), it became clear there was no way to list
existing `ClassSubject` assignments — only `POST /classes/:id/subjects`
to create one. The "+ Add slot" modal had been working around this by
remembering just the one assignment made earlier in the same browser
session, which broke the moment you navigated away and came back.
Fixed by adding `ClassSubjectsService.listForClass` and a matching
`GET /classes/:classId/subjects` route; verified against the two live
assignments from earlier testing (Mathematics and Science, both taught
by Kamal Hossain, Class 6) before wiring the frontend to it.

One operational note, not a code issue: `prisma migrate dev` refuses to
run in this non-interactive environment whenever it has a warning to show
(here, a new unique constraint on `student_invoices`), even with
`--create-only`. Since nothing here has ever been deployed, the fix was to
drop the dev database, delete `prisma/migrations/`, and regenerate a
single consolidated `init` migration — not something to do casually once
real data exists.

## Known gaps before production

See `docs/specification.html` §08 for the full list. Most relevant to this
code specifically:

- Refresh tokens are stateless JWTs with no revocation — see the comment on
  `AuthService.refresh()`.
- The payment gateway is a mock (`payment-gateway.util.ts`): a fake
  checkout URL and an HMAC signature scheme standing in for SSLCommerz's
  real callback verification. Swap both halves together once sandbox
  credentials exist.
- Timetable conflict detection (same teacher or section double-booked) is
  not implemented — `TimetableService.create` will happily create
  overlapping slots. Flagged in `dto/update-timetable-slot.dto.ts`.
- No automated tests yet (`npm run test` / `test:e2e` scripts exist but no
  specs have been written) — everything above was verified by hand, first
  with curl, then with PowerShell's `Invoke-RestMethod` after this
  environment's Bash shell lost the ability to reach `localhost` following
  a session restart (PowerShell could still reach it fine — a shell
  quirk, not a server issue).
