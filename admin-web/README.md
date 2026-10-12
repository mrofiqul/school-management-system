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

## Live demo — test accounts (2026-10-12)

Both consoles are deployed and working end-to-end against the production
backend. Use the `?v=2` query string on first load if you see a stale
cached page — see "Deployed to InfinityFree" below for why.

| Console | URL | Email |
|---|---|---|
| Owner (Super Admin) | <https://campustime.infinityfreeapp.com/owner/?v=2> | `owner@campus.app` |
| School (School Admin) | <https://campustime.infinityfreeapp.com/school/?v=2> | `admin@scholarsacademy.test` |

These are real accounts against the live production database (seeded
via `backend/prisma/seed.ts` with `SEED_SUPER_ADMIN_PASSWORD` /
`SEED_SCHOOL_ADMIN_PASSWORD` overrides — see `backend/README.md`,
"Deploying to Render"), not a mock environment. **Passwords are
deliberately not written here** — this repo is public, and these are
live production credentials; ask whoever seeded the database for the
current password, and change it after logging in.

Both login pages also link to the Android app release
(`admin-web/owner/index.html` and `.../school/index.html`, footer of the
login card) — see "Android app download" below.

## Status — verified against the real backend (2026-10-04)

Both apps were exercised in a real browser against the live NestJS API,
not just written and assumed to work.

**Owner Console** (`owner@campus.app` / `ChangeMe123!` locally — see live credentials above for production)
- Overview — real counts (schools by status, total users across every
  school) computed client-side from `/platform/schools` +
  `/platform/plans`. No fabricated growth chart or MRR figure — see
  "Scope cut" below for why.
- Schools — list, filter by status, click-through detail slideover,
  Suspend/Reactivate (verified both directions), "+ Onboard school"
  (creates a school and its first Admin in one call)
- Plans — list, "+ New plan"

**School Console** (`admin@scholarsacademy.test` / `ChangeMe123!` locally — see live credentials above for production)
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

## Known gap, fixed (2026-10-05)

**No way to list existing class-subject assignments** — the Timetable
tab's "+ Add slot" modal could only offer the one class-subject just
assigned in the same browser session (`state.lastClassSubjectId`), so
the dropdown was empty if you navigated away and came back to add a
slot for an older assignment. Fixed by adding
`GET /classes/:classId/subjects` to the backend
(`ClassSubjectsService.listForClass`) and having `openSlotModal` fetch
it fresh every time the modal opens, keyed off the section's class —
verified in-browser to list every assignment for a class (Mathematics
and Science, both taught by Kamal Hossain, for Class 6), not just the
most recent one.

## Running locally

Any static file server works — no build step:

```bash
npx serve admin-web -l 5173
# then open http://localhost:5173/owner/ or http://localhost:5173/school/
```

Both apps point at `http://localhost:3000` (hardcoded `API_BASE` at the
top of each `<script>`) — the backend has to be running locally; see
`../backend/README.md`.

## Deployed to InfinityFree — live, full data (2026-10-12)

Live at **`campustime.infinityfreeapp.com`** — `owner/` and `school/`
both load and talk to the real production backend. Test accounts are
listed above.

Getting here needed two fixes, in order:

1. **Private Network Access.** The original plan was "it'll load data
   when *your* browser, on *your* machine, can reach
   `http://localhost:3000`." That never works, for anyone — Chrome
   blocks a public HTTPS origin from calling a private address
   (`localhost` included) unless the target opts in with
   `Access-Control-Allow-Private-Network: true`, which a plain local
   backend never sends. No CORS header fixes this; it's a hard browser
   rule. Fixed by giving the backend a real public home — see
   `../backend/README.md`, "Deploying to Render" — then pointing the
   one `API_BASE` line at the top of each file's `<script>` at
   `https://campus-api-f8b3.onrender.com/v1` and re-uploading.
2. **InfinityFree's own edge cache.** Even after re-uploading the fixed
   files, some visitors kept seeing the old (localhost-pointing)
   version — InfinityFree serves static files through a caching proxy
   (`cache-control: max-age=2592000`, i.e. 30 days), and a different
   edge node can keep serving a stale copy regardless of a client-side
   hard refresh. Workaround: a cache-busting query string
   (`?v=2`, bumped on each re-deploy) forces a fresh fetch, since the
   query string is part of the cache key.

Upload steps, for reference (needed again any time either `index.html`
changes):

1. Log into the InfinityFree control panel for `campustime.infinityfreeapp.com`.
2. If the dashboard's Health Check says the website directory is
   missing, click **Recreate Directory** first — uploads silently fail
   otherwise, regardless of which tool you use.
3. Open its File Manager, go to `htdocs/`, and upload the updated
   `index.html` into `owner/` and/or `school/`, overwriting the old one.
4. Visit `https://campustime.infinityfreeapp.com/owner/?v=N` and
   `https://campustime.infinityfreeapp.com/school/?v=N` (bump `N`) to
   confirm the new version is live, bypassing the edge cache.

## Android app download

Both login pages link to the latest Android release APK, built from
`../mobile` and published as a GitHub Release (not the Play Store —
installing it needs "allow installs from unknown sources" on the
device):

<https://github.com/mrofiqul/school-management-system/releases/download/v1.0.0-android/app-release.apk>

The release build points at the production backend via a dart-define
override added for exactly this purpose (`ApiClient` otherwise assumes
local dev — see `../mobile/lib/core/api_client.dart`):

```bash
cd mobile
flutter build apk --release --dart-define=API_BASE_URL=https://campus-api-f8b3.onrender.com/v1
```

To publish a new version: build as above, then
`gh release create vX.Y.Z-android mobile/build/app/outputs/flutter-apk/app-release.apk`
(or upload the APK to an existing release), and update the download
links in `owner/index.html` and `school/index.html` if the tag changed.
