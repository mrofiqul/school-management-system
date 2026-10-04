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
admin-web/              ← Owner + School Console (not yet scaffolded)
mobile/                 ← Flutter app — Student/Parent/Teacher (not yet scaffolded)
```

## Status

- [x] Specification — data model, API, screen mockups
- [x] Backend — all 8 resource groups (Auth, Platform, Tenancy & People,
      Academics, Attendance, Exams/Grades/Assignments, Fees & Billing,
      Communication), implemented and verified end-to-end against a real
      Postgres DB, including cross-tenant isolation with two live schools
      (2026-10-04); see `backend/README.md`
- [ ] Admin web app (Owner Console + School Console)
- [ ] Flutter app (Student/Parent/Teacher)

See `backend/README.md` for how to run the API locally.

## Interactive design reference

The screen mockups and diagrams referenced in the specification were
designed as live, interactive documents — links are in
`docs/specification.html` §10.
