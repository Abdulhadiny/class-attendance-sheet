# Class Attendance Register: Roadmap

**Goal:** grow the single-page attendance sheet into a complete register with several classes, teachers assigned per class, role-based access control (RBAC), and room to extend.

Work through the phases in order. Each phase ends with a working app. Don't start the next phase until the current one's **Done when** is true.

---

## Ground rules (apply to every phase)

- From Phase 2 onwards, the **server is the source of truth**. The browser only shows data and sends requests.
- **Check permissions on the server.** Hiding a button in the UI is not security.
- **Never store plain-text passwords.** Never commit secrets: `.env` goes in `.gitignore`.
- **Keep it simple.** Add a table, library or abstraction only when a task actually needs it.
- Commit after each task with a clear message.

---

## Phase 0: Single-class sheet ✅

- [x] Add and remove students
- [x] Add and remove class days (date columns, newest first)
- [x] Tick and untick attendance per student per day
- [x] Check-ins count per student
- [x] Sort by name (A→Z / Z→A)
- [x] Frozen name columns, sticky header, works on phones
- [x] Data saved in the browser (`localStorage`)

---

## Phase 1: Finish the frontend (no backend yet)

- [ ] Show attendance % next to check-ins, e.g. `4 / 5 · 80%`
- [ ] Highlight today's date column
- [ ] Highlight students below an attendance threshold (e.g. 75%)
- [ ] Edit a student's name
- [ ] Export the register to CSV (one row per student, one column per day)
- [ ] Print-friendly layout (`@media print`)
- [ ] Keep keyboard focus on the cell you just ticked (currently lost because the table is redrawn)
- [ ] Don't crash on broken saved data (`try/catch` around `JSON.parse`)

**Done when:** a teacher can run a whole term on one computer and hand in a CSV.

---

## Phase 2: Backend and database

Suggested stack: **Node.js + Express + PostgreSQL** (SQLite is fine while developing locally). Keep the frontend as plain HTML/CSS/JS.

**Tables for this phase:** `students`, `class_days`, `attendance` (see [Target data model](#target-data-model)). No classes yet, so leave out `class_id` for now.

- [ ] Create a `server/` folder with Express, and serve the frontend files from it
- [ ] Read `DATABASE_URL` and `PORT` from `.env`; commit a `.env.example`
- [ ] Create tables with a **migration script**, not by hand
- [ ] Seed script with sample students and days
- [ ] API routes:
  - `GET    /api/register`: students, days and ticks in one response
  - `POST   /api/students` · `DELETE /api/students/:id`
  - `POST   /api/days` · `DELETE /api/days/:id`
  - `PUT    /api/days/:dayId/attendance/:studentId`: tick
  - `DELETE /api/days/:dayId/attendance/:studentId`: untick
- [ ] Validate input on the server: empty names, invalid dates, duplicate days → `400` with a clear message
- [ ] Replace `loadData()` / `saveData()` in `script.js` with `fetch()` calls
- [ ] Show loading and error states in the UI
- [ ] Check-ins come from the database (`COUNT`); don't store them

**Done when:** two browsers on different computers see the same register, and restarting the server loses nothing.

---

## Phase 3: Several classes

- [ ] Migration: add `classes` and `enrollments` tables; add `class_id` to `class_days` (unique on `class_id + date`)
- [ ] Move existing data into a "Default class" as part of the migration
- [ ] A student can be enrolled in more than one class (this is why `enrollments` is its own table)
- [ ] **Classes page**: list of classes with number of students and last class day
- [ ] **Register page** opens one class, e.g. `register.html?class=3`
- [ ] Routes become class-scoped: `/api/classes/:classId/students`, `/api/classes/:classId/days`, …
- [ ] Add an existing student to a class, or create a new one
- [ ] Removing a student from a class sets `left_at` on the enrollment; it does **not** delete the student or their history
- [ ] Archive a class (`archived_at`) instead of deleting it

**Done when:** you can run three classes side by side, and one student can appear in two of them with separate attendance.

---

## Phase 4: Users and login

- [ ] `users` table: name, email (unique), `password_hash`, role
- [ ] Hash passwords with **bcrypt** (or argon2)
- [ ] Routes: `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/me`
- [ ] Use a session cookie (`httpOnly`, `secure`, `sameSite`), not a token in `localStorage`
- [ ] **Login page**; redirect there whenever the API returns `401`
- [ ] Every `/api` route except login requires a logged-in user
- [ ] Create the first admin with the seed script or a CLI command. No public sign-up page.
- [ ] Rate-limit login attempts

**Done when:** nobody can see or change anything without logging in.

---

## Phase 5: Roles and permissions (RBAC)

### Roles

| Role | Who | Scope |
|---|---|---|
| `admin` | Academy staff | Everything |
| `teacher` | Class teachers | Only classes they are assigned to |
| `student` *(optional)* | Students with a login | Read-only, own attendance only |

One role per user is enough. A class can have several teachers, and a teacher can have several classes.

### Permission matrix

| Action | Admin | Teacher (own classes) | Student |
|---|:-:|:-:|:-:|
| Manage users and roles | ✓ | | |
| Create / archive classes | ✓ | | |
| Assign teachers to classes | ✓ | | |
| View class register | ✓ | ✓ | |
| Add / remove students in a class | ✓ | ✓ | |
| Add / remove class days | ✓ | ✓ | |
| Tick / untick attendance | ✓ | ✓ | |
| View and export reports | ✓ | ✓ | |
| View own attendance | | | ✓ |

### Tasks

- [ ] `class_teachers` table linking teachers to classes
- [ ] Keep the role → permissions map in **one file**, e.g. `server/permissions.js`:
  ```js
  const PERMISSIONS = {
    admin:   ['users:manage', 'classes:manage', 'classes:view', 'students:manage',
              'days:manage', 'attendance:mark', 'reports:view'],
    teacher: ['classes:view', 'students:manage', 'days:manage',
              'attendance:mark', 'reports:view'],
    student: ['attendance:view-own'],
  };
  ```
- [ ] Middleware `requirePermission('attendance:mark')` → `403` if the role lacks it
- [ ] Class-scope check: a teacher must be in `class_teachers` for the `:classId` in the URL, otherwise `403` (admins skip this check)
- [ ] `GET /api/classes` returns only the classes the user is allowed to see
- [ ] **Admin page**: create users, set roles, deactivate users, assign teachers to classes
- [ ] UI hides actions the user can't perform (permissions come from `GET /api/me`), but the server still checks every request
- [ ] Tests:
  - Teacher A cannot view or tick Teacher B's class
  - A student cannot tick anyone, including themselves
  - A deactivated user cannot log in
  - Changing a user's role takes effect on their next request

**Done when:** every row of the permission matrix is enforced by the server and covered by a test.

---

## Phase 6: Audit and data safety

- [ ] Record who ticked and when: `attendance.marked_by`, `attendance.marked_at`
- [ ] `audit_log` table for important actions (students, class days, role changes, teacher assignments)
- [ ] Lock past days: teachers can edit only the last N days; admins can edit any time
- [ ] Soft delete everywhere: `archived_at` / `deactivated_at` instead of `DELETE` for users, classes and students
- [ ] Daily database backup, and test restoring it at least once

**Done when:** for any tick you can answer "who set this, and when?"

---

## Phase 7: Reports

- [ ] Per class: attendance % per student over a date range
- [ ] Per student: attendance across all their classes
- [ ] Low-attendance list below a threshold set by the admin
- [ ] CSV export for every report, generated on the server
- [ ] Reports follow RBAC: teachers only see their own classes

**Done when:** an admin can answer "which students are below 75% this term, in every class?" in under a minute.

---

## Phase 8: Ship it

- [ ] Automated API tests (at minimum: login, RBAC, tick/untick)
- [ ] CI runs the tests on every push (e.g. GitHub Actions)
- [ ] Deploy server and database; HTTPS only
- [ ] All configuration through environment variables
- [ ] Accessibility check: keyboard-only use, screen reader labels, colour contrast
- [ ] `README.md`: how to run locally, environment variables, seeding, creating the first admin

**Done when:** a teacher at another location can log in and take attendance on their phone.

---

## Target data model

End state after Phase 6. Earlier phases build up to this one migration at a time.

```
users           id, name, email, password_hash, role, deactivated_at, created_at
classes         id, name, description, archived_at, created_at
class_teachers  class_id → classes, user_id → users                    PK (class_id, user_id)
students        id, name, user_id → users (nullable), archived_at, created_at
enrollments     class_id → classes, student_id → students,
                enrolled_at, left_at                                   PK (class_id, student_id)
class_days      id, class_id → classes, date                           UNIQUE (class_id, date)
attendance      class_day_id → class_days, student_id → students,
                status, marked_by → users, marked_at                   PK (class_day_id, student_id)
audit_log       id, user_id → users, action, details (JSON), created_at
```

Design notes:

- **`attendance.status` instead of true/false.** Start with only `'present'`. Later you can add `'late'` or `'excused'` without changing the table.
- **`students` is separate from `users`.** Most students never log in. Set `user_id` only for those who do.
- **A row in `attendance` means "marked".** No row means not ticked, so unticking deletes the row.

## Pages at the end

| Page | Who sees it |
|---|---|
| `login.html` | Everyone |
| `classes.html`: list of classes | Admin, teachers (own classes) |
| `register.html?class=…`: the sheet | Admin, teachers (own classes) |
| `reports.html` | Admin, teachers (own classes) |
| `admin.html`: users and teacher assignments | Admin |
| `my-attendance.html` *(optional)* | Students |

---

## Extensions (after Phase 8, pick any)

- **More statuses:** late, excused, absent with a reason (the `status` column is ready for this)
- **Student self check-in:** the teacher shows a short code or QR code that expires after a few minutes
- **Timetable:** create class days automatically (e.g. every Mon/Wed/Fri) and skip holidays
- **Term and holiday calendar**
- **Import students from CSV**
- **Notifications:** email or SMS to the student or guardian after N absences
- **Assistant teachers:** add a `role` column to `class_teachers` (`'lead'` / `'assistant'`) with read-only access for assistants
- **Custom roles:** move permissions from code into `roles` and `role_permissions` tables (only if admins really need to create new roles)
- **Multiple campuses or organisations:** add `organisation_id` to the top-level tables (multi-tenancy)
- **Offline mode (PWA):** tick without internet and sync later
- **Dashboard charts:** attendance trend per class over the term
- **Integrations:** expose an API or webhooks, e.g. only issue a certificate if attendance ≥ 80%
- **Languages and date formats** (internationalisation)
