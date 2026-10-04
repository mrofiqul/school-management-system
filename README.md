# Campus — School Management SaaS

Multi-school management platform for Bangladesh/South Asia — Android + web,
built on Flutter, NestJS, and PostgreSQL.

**Start here:** [`docs/specification.html`](docs/specification.html) — the
full product and technical specification (scope, roles, data model, API,
screens, open items). Open it in any browser.

## Repository layout

```
docs/
  specification.html   ← master spec, read this first
backend/                ← NestJS + Prisma API (all 8 resource groups implemented)
admin-web/              ← Owner Console + School Console — static, no build step
mobile/                 ← Flutter app — Student, Parent & Teacher screens built and verified
```

## Status

- [x] Specification — data model, API, screen mockups
- [x] Backend — all 8 resource groups (Auth, Platform, Tenancy & People,
      Academics, Attendance, Exams/Grades/Assignments, Fees & Billing,
      Communication) plus teacher-discovery endpoints
      (`/timetable/mine`, `/exam-schedules/mine`, `/exam-schedules/:id/marks`),
      implemented and verified end-to-end against a real Postgres DB,
      including cross-tenant isolation with two live schools (2026-10-04);
      see `backend/README.md`
- [x] Flutter app — Student, Parent, and Teacher screens, role-conditional
      navigation (three distinct nav bars), running on a real Android
      emulator against the live backend (2026-10-04); see `mobile/README.md`
- [x] Admin web app — Owner Console (Schools, Plans, Overview) and School
      Console (Dashboard, Students, Staff, Timetable, Fees, Notices), both
      static HTML/CSS/JS wired to the real backend, verified end-to-end
      in a real browser (2026-10-04); see `admin-web/README.md`

See `backend/README.md`, `mobile/README.md`, and `admin-web/README.md`
for how to run each piece locally.

## Interactive design reference

The screen mockups and diagrams referenced in the specification were
designed as live, interactive documents — links are in
`docs/specification.html` §10.
