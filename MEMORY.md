# Campus — Project Memory

**Read this first if you're an AI agent picking this project up with no prior
context** — after a long gap, a cleared history, or a different agent/session.
This file exists so you can resume *from the current state*, not rebuild from
the spec. It is committed to the repo (public on GitHub) specifically so it
survives a wiped local device — which also means **it must never contain
live secrets**. See "Where the actual credentials live" below.

Last updated: 2026-10-15, after the Change Password feature and the
app-update-nudge feature shipped (see git log — this file should be updated
again the next time a real chunk of work lands; don't let it go stale).

---

## 1. What this is

**Campus** is a multi-school management SaaS for Bangladesh/South Asia —
one NestJS+Postgres backend serving multiple tenant schools, a Flutter
Android app for Students/Parents/Teachers, and two static admin web consoles
(Owner/Super Admin, School Admin). Full product/data-model spec:
[`docs/specification.html`](docs/specification.html) — open it in a browser.
Repo-layout and component READMEs: [`README.md`](README.md),
[`backend/README.md`](backend/README.md), [`admin-web/README.md`](admin-web/README.md),
[`mobile/README.md`](mobile/README.md) — those have the detailed build/run
history; this file is the orientation layer on top.

```
docs/           specification.html (master spec) + local-only manuals (gitignored)
backend/        NestJS + Prisma + PostgreSQL API — all 8 resource groups
admin-web/      Owner Console + School Console + landing page — static HTML/CSS/JS
mobile/         Flutter app — Student, Parent, Teacher
manuals/        local-only copies of the two end-user manuals (gitignored)
render.yaml     Render Blueprint — provisions campus-api + campus-db together
```

## 2. Current live deployment — check these first

| Component | Where | Notes |
|---|---|---|
| Backend API | `https://campus-api-f8b3.onrender.com/v1` | Render free web service `campus-api` (service id `srv-db3eg1favr4c739er0n0`), Oregon region. **Free tier: sleeps after ~15 min idle, cold start 30–60s** — the first request after a while will be slow or briefly fail; that's normal, not a bug. |
| Database | Render Postgres `campus-db` (free tier) | **Expires 2026-11-07 and gets deleted unless upgraded to a paid compute plan before then** — this is a real deadline, not a maybe. If you're reading this after that date, check whether it was upgraded or the DB (and all production data) is gone. |
| Admin web (Owner + School consoles + landing page) | `https://campustime.infinityfreeapp.com` | Free InfinityFree hosting. `/` = landing page, `/owner/` = Super Admin, `/school/` = School Admin. **Edge-cached up to 30 days** — after re-uploading a changed file, append/bump a `?v=N` query string to force a fresh fetch; a plain browser hard-refresh does NOT bypass this (it's a server-side cache, not the browser's). |
| Android app | GitHub Release `v1.0.0-android` on this repo | Direct APK download (not Play Store): `https://github.com/mrofiqul/school-management-system/releases/download/v1.0.0-android/app-release.apk`. The asset has been replaced in place multiple times as the app gained features — the tag name `v1.0.0-android` is no longer a reliable indicator of what's actually in it; check the repo's release notes/commit history instead. |
| GitHub repo | `github.com/mrofiqul/school-management-system` | **Public.** This is the reason secrets never get committed — see §5. |

A quick smoke test for "is everything still working": hit
`.../v1/health` and `.../v1/app-version`, then open the School Console URL
above (with a `?v=` bump if it looks stale) and try logging in — see §5 for
where to find the current password.

## 3. Architecture & tech stack

- **Backend**: NestJS (TypeScript) + Prisma ORM + PostgreSQL. JWT auth with
  rotating, single-use, revocable refresh tokens (family-based: replaying an
  already-rotated token revokes the whole family — see `auth.service.ts`).
  Multi-tenant: every school's data is isolated by `schoolId`, enforced
  server-side in queries, not just hidden in the UI.
- **Admin web**: plain HTML/CSS/JS, zero build step, zero framework —
  deliberately, so it can be dropped on any static host (that's why it's on
  InfinityFree, which can't run Node). Shared visual language across both
  consoles and the landing page (see CSS custom properties at the top of
  each file: paper/panel/ink/accent/teal tokens, Newsreader+Public
  Sans+IBM Plex Mono fonts) — reuse that token set for any new page in this
  family rather than inventing a new palette.
- **Mobile**: Flutter (Android only so far; iOS untested). `ApiClient`
  resolves its base URL per platform for local dev (emulator needs
  `10.0.2.2`, physical device needs `--dart-define=API_HOST=<lan-ip>`) but a
  **release build must use `--dart-define=API_BASE_URL=https://campus-api-f8b3.onrender.com/v1`**
  — see `mobile/lib/core/api_client.dart`. Forgetting that flag silently
  builds an APK that only works against `localhost`.
- **Backend modules** (`backend/src/modules/`): `academics` (years, classes,
  sections, subjects, class-subjects, timetable), `attendance`, `auth`,
  `communication` (notices, messages), `exams` (exams, schedules, marks,
  assignments), `fees` (structures, invoices, payments, webhook),
  `platform` (Super-Admin-only: schools, plans), `students` (students,
  staff, parents/guardians).
- **Deploy pipeline**: push to `master` → Render auto-deploys the backend
  (`render.yaml`, `autoDeploy: true`) in ~2 minutes. Admin-web and the APK
  are **not** auto-deployed — both need a manual upload/release step after a
  push (see §6).

## 4. Standing rules — established through direct back-and-forth, don't relitigate

These came from explicit user instructions earlier in this project's history.
Treat them as still in force unless the user says otherwise:

- **Never touch `bakibondhu.infinityfreeapp.com` or the `mrofiqul/bakibondhu`
  GitHub repo.** Unrelated project, shares the same InfinityFree account
  (`if0_42877652`) — it's right there in the same File Manager, easy to
  fat-finger. Always double-check you're in `campustime.infinityfreeapp.com`
  before uploading/deleting anything in InfinityFree's File Manager.
- **Never ask for or type InfinityFree FTP/cPanel credentials, or Render
  account credentials.** Drive the user's own already-authenticated browser
  session (Claude-in-Chrome) instead — the session expires between
  conversation turns, so expect to re-authenticate by navigating through
  `dash.infinityfree.com` → account → File Manager (or the equivalent Render
  dashboard path) each time, not by typing a password.
- **Never create third-party accounts** (Render, InfinityFree, GitHub, a
  future SSLCommerz sandbox, etc.) on the user's behalf — only prepare
  files/config and drive an already-logged-in session.
- **This GitHub repo is public.** Never commit real passwords, API keys, or
  DB connection strings — not even "temporarily" or "for a test". This was
  learned the hard way: a draft commit once nearly shipped two live
  passwords into `admin-web/README.md` before being caught. `.gitignore`
  already excludes `manuals/`, `docs/owner-manual.html`, and
  `docs/school-manual.html` for exactly this reason — keep that pattern for
  any future local-only file that needs to carry a real secret.
- **Don't try to route around a classifier-blocked action.** Twice now,
  attempts to extract a DB connection string (or edit live production env
  vars) via browser automation got blocked by the auto-mode safety
  classifier. Both times the right move was to stop, back out cleanly, and
  either ask the user or find a code-level alternative (e.g. the
  self-service change-password endpoint in §6 exists specifically *because*
  directly touching the DB connection string was the wrong path).
- Credentials **generated fresh for the user's own new system** (e.g. a new
  Super Admin password after seeding a database) are fine to disclose
  directly in chat — that's a legitimate deliverable, not a third-party
  credential. They still must never be committed to this public repo.

## 5. Where the actual credentials live (not in this file, on purpose)

- **Production Super Admin / School Admin passwords**: in
  [`docs/owner-manual.html`](docs/owner-manual.html) and
  [`docs/school-manual.html`](docs/school-manual.html) — both gitignored,
  local-only, last written 2026-10-12. **They rotate** (there's a
  self-service Change Password screen in both consoles now — see §6) so
  treat those files as "last known," not guaranteed-current. If login fails,
  either check those files were updated after the last rotation, or use the
  backend directly: `PATCH /v1/auth/change-password` needs the *current*
  password to set a new one, so if it's truly unknown there is currently
  **no password-reset-via-email flow** — recovering a lost Super Admin
  password means a direct DB update (same external-connection-string
  workaround used originally to seed the DB — see `backend/README.md`,
  "Deploying to Render" — and note §4's caution about not trying to extract
  that connection string via browser automation; ask the user to copy it
  from Render's dashboard themselves if it comes to that).
- **Database connection strings, JWT secrets, webhook secrets**: never
  written anywhere in this repo. `JWT_ACCESS_SECRET` and
  `PAYMENT_WEBHOOK_SECRET` are Render-generated (`generateValue: true` in
  `render.yaml`) and only ever live in Render's own environment variable
  store.
- **Known production account emails** (not secret, just identifiers):
  `owner@campus.app` (Super Admin, platform-wide), `admin@scholarsacademy.test`
  (School Admin, for the one seeded demo school "Scholars' Academy"). The
  production seed (`backend/prisma/seed.ts`) creates *only* these two
  accounts plus one subscription plan and one school shell — **no demo
  students, classes, or fee data** exist in production. (Local dev seeding
  is richer — see `mobile/README.md` for local-only demo accounts like
  `mahin.guardian@example.com` — do not confuse the two environments.)
- **`infinityfree credential.txt`** at the repo root: untracked, user-owned,
  never read or touched by an agent (per §4's credential-handling rule) —
  it's listed in `git status` as untracked but is the user's own file, not
  ours to manage.

## 6. What's actually built and shipped (as of the last commit below)

Chronological, oldest first — each item is live in production unless noted.
Cross-reference `git log` for exact commit hashes/messages.

1. **Backend**: all 8 resource groups implemented and covered by automated
   unit + e2e tests against a real Postgres test DB (`backend/test/`) —
   rotating refresh tokens, cross-tenant isolation verified with two live
   schools, timetable conflict detection, class-subject listing endpoint.
2. **Mobile app**: Student/Parent/Teacher screens, role-conditional bottom
   nav, silent session restore with auto-refresh-on-401, LAN-IP override for
   physical-device testing, Teacher Assignments (post/list/grade).
3. **Admin web**: Owner Console (Overview/Schools/Plans) and School Console
   (Dashboard/Students/Staff/Timetable/Fees/Notices), both wired to the real
   backend — this was the first version, built against `localhost`.
4. **Render deployment**: backend given a real public HTTPS home (the whole
   point: a public HTTPS page can never call `http://localhost` — Chrome's
   Private Network Access policy blocks it unconditionally, not a bug to
   work around). Hit and fixed a real build bug along the way:
   `NODE_ENV=production` makes a plain `npm install` skip devDependencies,
   but `@nestjs/cli` lives there — `render.yaml`'s `buildCommand` forces
   `--include=dev`.
5. **Admin-web repointed at Render**, re-uploaded to InfinityFree — hit and
   documented the 30-day edge-cache gotcha (§2).
6. **Release APK pipeline established**: `ApiClient` gained an
   `API_BASE_URL` dart-define override (it previously hardcoded
   `http://host:3000`, unusable for a real release build); first APK
   published as GitHub Release `v1.0.0-android`; both login pages and the
   landing page got a "Download the app" link.
7. **Self-service password change**: `PATCH /v1/auth/change-password`
   (requires current password, revokes every other refresh token on
   success) plus a "Change password" screen in both admin consoles. Built
   *specifically* to avoid ever needing to touch the raw DB connection
   string again for routine password rotation.
8. **Upgrade-nudge system**: `GET /app-version` (unauthenticated, same
   reasoning as `/health`) reads `APP_LATEST_VERSION` /
   `APP_MIN_SUPPORTED_VERSION` / `APP_DOWNLOAD_URL` env vars (defaults:
   `1.0.0` / `1.0.0` / the GitHub release URL above) — **currently all at
   defaults, so no upgrade dialog fires for anyone yet.** The app checks
   this once per session (`AppShell.initState`, covers both fresh login and
   silent restore) and shows a dismissible-or-blocking dialog depending on
   whether the installed version is below `minSupportedVersion`. **To
   actually use this for a future release**: bump `pubspec.yaml`'s
   `version:` and `kAppVersion` in `mobile/lib/core/app_update.dart`, build
   and publish the new APK, *then* bump `APP_LATEST_VERSION` (and
   `APP_MIN_SUPPORTED_VERSION` if forcing an update) on Render — that last
   step is just an env var edit + Render's own redeploy, no code push
   needed. The APK that's live right now (replacing the original
   `v1.0.0-android` asset) is the first build that actually contains this
   check — any copy installed before that commit has no way to ever see a
   future nudge; there is no way to retroactively reach those installs.

## 7. Known gotchas (don't rediscover these the hard way)

- **Render free tier has no Shell/SSH access** — contradicts an earlier
  (wrong, now-fixed) assumption in old docs. To run a one-off script against
  the production DB (e.g. seeding), use the Postgres "External Database
  URL" from Render's dashboard (Connect → External) and run the script
  *locally* with `DATABASE_URL` overridden — see §4 for why extracting that
  string via automation specifically is off-limits; it has to be a human
  copy-paste or a deliberate, explicitly-approved action.
- **InfinityFree's own anti-bot JS challenge** (`aes.js`) loads on first hit
  to any InfinityFree-hosted page — irrelevant noise, not a sign of a
  problem, and it's why `curl`/non-browser requests to
  `campustime.infinityfreeapp.com` return a near-empty challenge page
  instead of real content; always verify via an actual browser (or browser
  automation), never raw `curl`, for anything on that domain.
- **A stale `sessionStorage` token in whatever browser tab you're testing
  with** can make the app think it's logged in and skip straight to the
  dashboard shell, hiding the login form entirely (and silently breaking
  anything that assumes the login screen is what's visible) — if a login
  flow seems to do nothing, check `sessionStorage`/`localStorage` first,
  across both `campus_owner_token` (Owner Console) and
  `campus_school_token` (School Console) keys.
- **Windows-specific Flutter build issues**: (1) the project lives on `D:`
  while Pub cache/Gradle live on `C:` — Kotlin's incremental compiler can't
  handle a relative path across drive letters; fixed via
  `kotlin.incremental=false` in `mobile/android/gradle.properties`. (2)
  Flutter's plugin build needs Windows Developer Mode on
  (`start ms-settings:developers`) for symlink support — a system setting,
  flag it to the user rather than changing it automatically if it's ever
  off again.
- **CORS is deliberately narrow**: `CORS_ORIGIN` is scoped to exactly
  `https://campustime.infinityfreeapp.com`. A request from
  `http://localhost:5173` (the local admin-web preview server) against the
  *production* API will be correctly blocked — that's not a bug to fix, and
  testing full login flows against prod from a local preview simply isn't
  possible; test on the real deployed URL instead.

## 8. Not yet built / explicitly deferred

- **Payment gateway (SSLCommerz)**: never started. Needs the user's own
  sandbox signup first — same credential-handling boundary as
  Render/InfinityFree (§4). Don't start this without the user initiating it.
- **Password-reset-via-email**: doesn't exist. Only self-service *change*
  (needs the current password) exists — see §5's note on what that means
  for a truly lost password.
- **iOS**: untested, not built for.
- **The user's own feature wishlist**, written in their own words at
  [`docs/Speceficatiom-2.txt`](docs/Speceficatiom-2.txt) (a rough note, not
  a finalized spec — confirm scope with the user before building any of
  it): shift management, a "Group (9-12)" concept distinct from Class,
  teacher leave management, a dedicated Result/publishing flow (exam marks
  exist today via `exams`/Mark, but not a distinct "Result" surface),
  finer-grained role permissions beyond the current fixed
  Admin/Teacher/Student/Parent/SuperAdmin roles, and an "accounce" entry
  whose intent is unclear (possibly "announcement", overlapping with the
  existing Notice feature, or "accounts" — ask the user rather than
  guessing). Several items on that list already exist today under different
  names (class, section, subject, fee, attendance, notice) — read it as a
  checklist to reconcile against current features, not a from-scratch list.

## 9. If you're about to make a change, checklist

1. Is this a backend change? Push to `master` → Render auto-deploys in
   ~2 min. Verify with `GET /v1/health` (and re-check whatever route you
   changed — a cold start can make the first request slow/flaky, not
   broken).
2. Is this an admin-web change (`admin-web/*.html`)? A git push does
   **not** update the live site — you must also re-upload the changed
   file(s) to InfinityFree's File Manager (`htdocs/`, `htdocs/owner/`, or
   `htdocs/school/`) via a Claude-in-Chrome-driven session, then verify live
   with a cache-busting `?v=N` bump (§2/§7).
3. Is this a mobile change? Rebuild the release APK
   (`flutter build apk --release --dart-define=API_BASE_URL=https://campus-api-f8b3.onrender.com/v1`)
   and publish/replace it on the GitHub Release — a git push alone changes
   nothing for anyone with the app already installed.
4. Touching anything under `admin-web/` or `docs/` or anywhere else in this
   repo? Grep your own diff for anything password/secret-shaped before
   committing — this repo is public (§4/§5).
5. Update §6 of this file with what shipped, and bump the "Last updated"
   line at the top, once the change is live and verified — that's the
   entire point of this document.
