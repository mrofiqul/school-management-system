# Campus Admin Web

Two static, framework-free web apps — the Owner Console (Super Admin)
and the School Console (School Admin) — built directly on top of the
Campus Owner Console / Campus School Console mockup artifacts from
earlier in this project, now wired to the real backend instead of
hardcoded sample data. Full design reference:
[`../docs/specification.html`](../docs/specification.html).

No build step, on purpose: plain HTML + CSS + vanilla JS, so the whole
thing can be dropped onto any static host — including InfinityFree,
which can't run the NestJS backend but can serve these just fine.

```
admin-web/
  owner/index.html    ← Super Admin: Overview, Schools, Plans
  school/index.html   ← School Admin: Dashboard, Students, Staff,
                         Timetable, Fees, Notices
```

## Status — verified against the real backend (2026-10-04)

Both apps were exercised in a real browser against the live NestJS API,
not just written and assumed to work.

**Owner Console** (`owner@campus.app` / `ChangeMe123!`)
- Overview — real counts (schools by status, total users across every
  school) computed client-side from `/platform/schools` +
  `/platform/plans`. No fabricated growth chart or MRR figure — see
  "Scope cut" below for why.
- Schools — list, filter by status, click-through detail slideover,
  Suspend/Reactivate (verified both directions), "+ Onboard school"
  (creates a school and its first Admin in one call)
- Plans — list, "+ New plan"

**School Console** (`admin@scholarsacademy.test` / `ChangeMe123!`)
- Dashboard — real today's-attendance percentage, real fee collection
  (paid vs. due), real student/staff counts, real days-to-next-exam
- Students — list with class filter chips (built from real `/classes`),
  detail slideover with live attendance summary, "+ Admit student",
  "Link guardian"
- Staff — list, "+ Add staff"
- Timetable — a full setup chain verified end-to-end in one session:
  create a subject → assign it + a teacher to a class → add a weekly
  slot → grid re-renders with the new period, alongside the slot
  already seeded from backend testing
- Fees — fee structures, "Generate invoices," real invoice list with
  status pills
- Notices — compose + publish (verified: posted a notice, watched it
  appear at the top of "Published" immediately)

## Scope cuts — deliberate, not oversights

The original Owner Console mockup had five tabs (Overview, Schools,
Plans, Billing, Audit Log). This real version has three. **Billing**
and **Audit Log** needed backend endpoints that were never built
(`PlatformInvoice`/`PlatformPayment` exist in the Prisma schema but
nothing reads or writes them yet; there's no audit-log table at all).
Rather than wire those tabs to fake data, they're left out — a
half-real admin screen is worse than an honest gap. Same reasoning
killed the fabricated "schools grown over 6 months" chart on Overview:
there's no historical snapshot endpoint, so it's real current-state
counts only.

## Known gap found while building this

**No way to list existing class-subject assignments.** The Timetable
tab's "+ Add slot" modal needs to offer a class-subject to attach the
slot to, but the backend has no `GET` for `ClassSubject` rows — only
`POST /classes/:id/subjects` to create one. The workaround here
(`state.lastClassSubjectId`, set only right after you *just* used
"Assign teacher to class") works for the one-sitting setup flow this
was tested with, but means the dropdown is empty if you navigate away
and come back to add a slot for an older assignment. The real fix is a
`GET /classes/:id/subjects` (or similar) endpoint — not built yet,
flagged here rather than silently left broken.

## Running locally

Any static file server works — no build step:

```bash
npx serve admin-web -l 5173
# then open http://localhost:5173/owner/ or http://localhost:5173/school/
```

Both apps point at `http://localhost:3000` (hardcoded `API_BASE` at the
top of each `<script>`) — the backend has to be running locally; see
`../backend/README.md`.

## Deploying to InfinityFree

Per your choice: a new, separate InfinityFree subdomain (not touching
`bakibondhu.infinityfreeapp.com`), with the backend staying on
localhost for now — so a deployed copy only actually loads data when
*your own* browser, on *your own* machine, can reach
`http://localhost:3000`. It's a real, working deployment of the
frontend; it just isn't usable by anyone but you until the backend has
a public home too.

Steps (all in your InfinityFree account — nothing here needs
credentials from me):

1. In the vPanel, create a new subdomain, e.g. `campus-admin` →
   `campus-admin.infinityfreeapp.com`.
2. Open its File Manager (or connect via FTP) and upload everything
   under `admin-web/` to that subdomain's `htdocs/` root, preserving
   the `owner/` and `school/` folders.
3. Visit `https://campus-admin.infinityfreeapp.com/owner/` and
   `https://campus-admin.infinityfreeapp.com/school/`.

When the backend gets real hosting later, change the one `API_BASE`
line at the top of each file's `<script>` to that URL and re-upload —
nothing else in either app needs to change.
