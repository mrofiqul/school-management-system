# Campus App

Flutter app for the Student, Parent, and Teacher experience — one
codebase, a role-conditional bottom nav (Campus App Flow Figure 0). Talks
to [`../backend`](../backend) over REST. Full design reference:
[`../docs/specification.html`](../docs/specification.html).

## Status — running on a real Android emulator, against the real backend (2026-10-04)

Built and verified end-to-end on Android (API 35, `emulator-5554`), not
just compiled:

- **Auth** — real login against `POST /auth/login`, session persisted via
  `shared_preferences`, silent restore on relaunch
- **Home** — live attendance summary + notices, both pulled from the
  running backend
- **Academics** — report card screen, computed marks rendered exactly as
  `/students/:id/report-card` returns them (91/100, A+, same exam used in
  the backend's own end-to-end test)
- **Fees** — invoice list with status pills; "Pay now" (mock checkout)
  renders only for Parent, matching the backend's role restriction
- **Messages** (Parent only) — conversation list derived from the flat
  `/messages` list, a working thread view, and a verified round-trip send
  (typed a reply on-device, it POSTed, reloaded, and rendered as the
  "mine" bubble)
- **Profile** — account info; a Parent additionally sees linked children
  and can switch which one the other tabs show
- **Teacher Home** — today's periods only, from a new `/timetable/mine`
  endpoint (see below), each one tap from marking attendance
- **Teacher Attendance** — the full week's schedule, grouped by day,
  today highlighted; opens the same `MarkAttendanceScreen` as Home
- **Mark attendance** (Teacher) — bulk P/A/L toggle with live counts,
  "Mark all present," pre-fills from existing records so reopening a
  slot already marked isn't blank; verified both the create path and the
  upsert path (re-submitted the same slot+date and it updated, not
  duplicated)
- **Teacher Marks** — list of exam schedules from a new
  `/exam-schedules/mine` endpoint, opens **Enter Marks**: grade computed
  live against the A+–F scale as a number is typed, class average/
  highest/lowest recompute live, pre-fills existing marks from a new
  `GET /exam-schedules/:id/marks` read endpoint; verified editing an
  existing mark (91→65, badge flipped A+→A- live) and saving it back

Verified by logging in as all three seeded accounts and confirming the
nav itself differs, not just its content:

| Role | Bottom nav | Confirmed |
|---|---|---|
| Student (`mahin.guardian@example.com`) | Home · Academics · Fees · Profile (4 tabs, no Messages) | ✅ screenshot |
| Parent (`rina.ahmed@example.com`) | Home · Academics · Fees · Messages · Profile (5 tabs) | ✅ screenshot |
| Teacher (`kamal.teacher@scholarsacademy.test`) | Home · Attendance · Marks · Messages · Profile (5 tabs, distinct from Parent's) | ✅ screenshot |

## Prerequisites

- Flutter SDK (this session used 3.47.6 stable, installed manually from
  <https://docs.flutter.dev/get-started/install/windows> since it isn't on
  winget — extract and add `<flutter>/bin` to `PATH`)
- Windows: **Developer Mode** must be on (Settings → Privacy & Security →
  For Developers) — Flutter's plugin build needs symlink support, which
  Windows restricts without it
- An Android emulator or device (`flutter emulators`, `flutter devices`)
- The backend running — see `../backend/README.md`

## Setup

```bash
flutter pub get
flutter run -d <device-id>        # flutter devices to list them
```

Android only needs two things already in place in this repo:
`INTERNET` permission and `android:usesCleartextTraffic="true"` in
`android/app/src/main/AndroidManifest.xml` — the backend runs on plain
`http://`, not `https`, which Android blocks by default on API 28+.

### Connecting to the backend

`ApiClient` resolves the host per platform (`lib/core/api_client.dart`):
Android emulators can't reach the host machine via `localhost` — they
need the special `10.0.2.2` alias — so that's the default there; web and
desktop really do mean `localhost`. A physical device needs the host
machine's LAN IP instead; that's not handled yet (see Known gaps).

## Bugs and environment issues found by actually running this

1. **Cross-drive Gradle/Kotlin build failure.** The project lives on
   `D:\`, but the Gradle daemon and Pub cache live on `C:\`. This Kotlin
   version's incremental-compilation cache throws
   (`this and base files have different roots`) the moment it has to
   compute a relative path between two drive letters — it assumes
   everything shares one root. Fixed with `kotlin.incremental=false` in
   `android/gradle.properties`; the real fix upstream would be keeping
   the Flutter SDK, Pub cache, and project on the same drive.
2. **Windows Developer Mode was off**, which blocks Flutter's plugin
   build (it needs symlink support). This is a system security setting —
   flagged to the user rather than changed automatically; see the git
   history for that exchange.
3. **`GET /invoices` didn't allow the Student role** — only Admin and
   Parent — even though the spec always intended Students to *view*
   (never pay) their own fees. Caught while wiring up the Fees tab; fixed
   in `backend/src/modules/fees/fees.controller.ts` and
   `fees.service.ts` (a Student is now hard-scoped to their own
   `studentId`, never a client-supplied one, same reasoning as the Parent
   case next to it).
4. **Parent's Home/Notices didn't pass which child they meant.** The
   backend's notice fan-out needs a `studentId` to resolve a Parent's
   CLASS/SECTION-scoped notices (it has no way to guess which of
   possibly several children). The first version of `home_tab.dart` and
   `notices_screen.dart` called `/notices` with no `studentId` at all,
   so a Parent silently saw only ALL/ROLE-scope notices — a
   section-scoped one (visible to the Student themself) was invisible to
   their own parent. Fixed by passing `session.subjectStudentId`.
5. **adb coordinate math** — not a code bug, but logged because it cost
   real time: screenshots pulled from the emulator are full-resolution
   (1080×2400), while the images rendered back are scaled for display
   (900×2000). Tap coordinates have to be computed in the *original*
   resolution (`displayed × 1.2` here) — `uiautomator dump` for exact
   widget bounds turned out more reliable than eyeballing screenshots.

### Round 2 — Teacher screens

Three backend gaps, all found *before* writing any Flutter code, by
asking "how would a Teacher even reach this screen" rather than
discovering it the hard way at runtime:

6. **No way for a Teacher to discover their own timetable.**
   `GET /sections/:sectionId/timetable` existed, but required already
   knowing a `sectionId` — nothing let a Teacher ask "what do I teach, and
   when." Added `GET /timetable/mine`, scoped via
   `classSubject.teacherId` (a required relation, so safe to nest — see
   the comment in `timetable.service.ts`).
7. **No way for a Teacher to discover their own exam schedules**, for
   the same reason — `GET /exams` and `GET /exams/:id/schedules` were
   Admin-only. Added `GET /exam-schedules/mine`, matched by
   `(classId, subjectId)` against the teacher's `ClassSubject` rows
   (`ExamSchedule` has no `teacherId` of its own).
8. **No way to read marks already entered for a schedule** — only
   `POST` existed. Reopening Enter Marks for an already-graded exam would
   have shown a blank form, silently discarding visibility into what was
   already saved. Added `GET /exam-schedules/:id/marks`.

Also extended `GET /students` with an optional `classId` filter (Marks
entry needs the whole class's roster across every section, not one
section at a time) — safe as a *required*-style filter here, unlike the
`sectionId` scalar filter next to it: a student with no section genuinely
has no class, so excluding them is correct, not the null-FK trap from
bug #3 in Round 1.

## Known gaps before production

- Teacher screens cover Attendance and Marks only (the two highest-
  frequency actions per the spec). Posting assignments, grading
  submissions, and building the timetable itself stay Admin/web-only for
  now.
- No auto-retry on 401 — a call made after the 15-minute access token
  expires fails rather than silently refreshing and retrying. The
  backend now supports rotating, revocable refresh tokens (see
  `backend/README.md`, "Round 4") and `Session.logout()` calls
  `/auth/logout` to revoke them, but `ApiClient` doesn't yet call
  `/auth/refresh` itself on a 401 — the user just has to log back in.
- `ApiClient`'s host resolution has no path for a physical device on the
  same LAN (only emulator vs. web/desktop).
- No automated widget/integration tests beyond the one smoke test in
  `test/widget_test.dart` — everything above was verified by hand, with
  real taps on a real emulator against the real backend.
