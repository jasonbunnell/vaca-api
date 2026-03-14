# 4.4 Security & Authorization — Review & Clarifications

**Purpose:** Align PRD 4.4 with implementation and list where your input is needed before finishing security work.

---

## 1. What’s clear (no clarification needed)

| Area | PRD 4.4 | Current code | Status |
|------|---------|--------------|--------|
| Passwords | Hashed, not stored plain | User model uses bcrypt | OK |
| JWT | Bearer token, Auth header | `protect` reads `Authorization: Bearer` + cookie | OK |
| Roles | user, host, admin | User schema `enum: ['admin','host','user']` | OK |
| Password reset | Single-use, 1hr expiry | Token hashed, `resetPasswordExpire` set | OK |
| Property create | Host or admin | `authorize('host','admin')` on POST | OK |
| Property update/delete | Owner or admin | Controller checks `isOwner \|\| isAdmin` | OK |
| Image upload | Host or admin | `authorize('host','admin')` on POST /upload/image | OK |
| GET /api/auth/me | Authenticated | `protect` only | OK |
| Change password (logged-in) | Authenticated | `protect` + currentPassword check | OK |
| User list | Admin only | `authorize('admin')` on GET /api/users | OK |
| User delete | Admin only | `authorize('admin')` on DELETE /api/users/:id | OK |
| Secrets in env | Not in source | dotenv, no secrets in repo | OK |

---

## 2. PRD vs code — need your decision

### 2.1 Property ownership: `host` array vs `owner` single

- **PRD 4.4:** “Property ownership is determined by user's _id in **property's host array**.” Data model (4.3) says `host: array of mongoose ObjectId`.
- **Code:** Property model has **`owner`** (single ObjectId). Controllers use `owner` for “is this user the owner?”
- **Implication:** Either (a) change code to use a `host` array and treat “in host array” as owner, or (b) change PRD to say ownership = `property.owner` and keep current code. Multi-host (e.g. co-hosts) would require `host[]` in the model.

**Clarification:** Do you want **single owner** only (keep `owner`), or **multiple hosts** (add/use `host[]` and treat anyone in `host[]` as allowed to CRUD that property)?

---

### 2.2 User update: block email and password in PUT /api/users/:id

- **PRD:** “A user cannot change their email. Only an admin can CRUD all users… An admin cannot change email or password.”
- **Code:** `updateUser` does not strip `email` or `password` from `req.body`. So today, email/password could be changed via PUT.
- **Needed:** In `updateUser`, always remove `email` and `password` from the update object (for both self and admin). Password changes stay via “change password” and “reset password” only.

**Clarification:** Confirm: “No one can change email or password via PUT /api/users/:id; admin can change name, phone, role, etc. only.” If yes, this is a code-only fix (no PRD change).

---

### 2.3 “List their own user record”

- **PRD:** “A user should be only list their own user record.”
- **Interpretation:** Regular users can only see themselves (e.g. GET /api/auth/me or GET /api/users/:id when :id is self). Admins can list all (GET /api/users) and get any user by id. Current code already does this (GET /api/users/:id allows self or admin).
- **Clarification:** Is “only list their own” meaning “only call GET for their own id,” and admins can list/get everyone? If yes, we’re aligned.

---

## 3. Where I need your input (scope / behavior)

### 3.1 Rate limiting

- **PRD:** Login and password-reset rate limited to 3 attempts per hour per user; same for “password reset” (so: 3 resets per hour per user). Message: “You have exceeded login attempts! Try again after an hour or contact an admin.”
- **Code:** No rate limiting yet.
- **Questions:**
  - Should “3 per hour” be by **email** (same user), by **IP**, or both (e.g. 3 per email and a separate cap per IP)?
  - Should the same message be shown for both “too many login attempts” and “too many password reset requests,” or different copy?

---

### 3.2 CORS

- **PRD:** “API should only allow requests from frontend origins and localhost for dev.”
- **Code:** `app.use(cors())` with no options — allows all origins.
- **Question:** What is the exact production frontend origin (e.g. `https://flxvacations.com`)? Any staging origin (e.g. `https://staging.flxvacations.com`)? Then we can set `origin: [allowed origins]` and allow localhost in dev.

---

### 3.3 GET /api/events

- **PRD:** Public routes include “GET properties, GET property, **GET events**.”
- **Code:** No `/api/events` route yet (events may come from jables-api / FLXcompass).
- **Question:** Is “GET events” a vaca-api route you want added (e.g. proxy to jables-api), or is it only on the frontend calling another service? That determines whether we add it to the API and document it as public.

---

### 3.4 Sensitive action logging

- **PRD:** “Log sensitive actions for security and support.”
- **Code:** No structured audit log yet.
- **Question:** Which actions must be logged? Suggested minimum: login (success/failure), password reset request, password change, user create/update/delete (admin), property create/update/delete. Anything else (e.g. image upload/delete)?

---

### 3.5 Input validation

- **PRD:** “API validates and sanitizes all inputs (body, query, params), enforces max lengths and types… parameterized queries / Mongoose so no raw user input in queries.”
- **Code:** Mongoose handles types and some validation; no centralized validation layer (e.g. express-validator) or max-length/sanitization on all inputs.
- **Question:** Do you want a single validation layer (e.g. express-validator) applied to all mutation routes and documented in 4.4, or is “Mongoose + careful controller checks” enough for now?

---

## 4. Easiest way to clarify route security & authorization

**Recommendation: one source of truth.**

- **Option A — PRD table (simplest):** Add a **single table** in section 4.4 that lists every route, method, and access rule. For example:

  | Route | Method | Access |
  |-------|--------|--------|
  | /api/health | GET | Public |
  | /api/auth/login | POST | Public |
  | /api/auth/forgot-password | POST | Public |
  | /api/auth/reset-password | POST | Public |
  | /api/users | POST | Public (registration) |
  | /api/properties | GET | Public |
  | /api/properties/:id | GET | Public |
  | /api/auth/me | GET | Authenticated |
  | /api/auth/change-password | POST | Authenticated |
  | /api/properties/my | GET | Authenticated (owner list) |
  | /api/users/:id | GET, PUT | Self or admin |
  | /api/users | GET | Admin only |
  | /api/users/:id | DELETE | Admin only |
  | /api/properties | POST | Host or admin |
  | /api/properties/:id | PUT, DELETE | Owner or admin |
  | /api/upload/image | POST | Host or admin |

  Then implementation and OpenAPI/Bruno stay in sync with that table.

- **Option B — OpenAPI as source of truth:** Keep `openapi.yaml` as the canonical list of routes and `security` (none vs `bearerAuth`) and document in 4.4 that “route-level security is defined in openapi.yaml.” PRD then references the spec instead of duplicating a table.

**Suggested approach:** Add the **table in 4.4** (Option A) so the PRD is self-contained and easy to review. Keep `openapi.yaml` in sync with that table when you add or change routes. Bruno/Postman can still be generated from the OpenAPI spec.

---

## 5. Summary: what needs to be done (after clarifications)

1. **Resolve host vs owner** — PRD vs model; decide single owner vs host array.
2. **User update** — Strip `email` and `password` in PUT /api/users/:id (code fix).
3. **Rate limiting** — Add to login + forgot-password (and optionally reset-password) per your answers on “per user” vs “per IP.”
4. **CORS** — Restrict to frontend origin(s) + localhost using your listed origins.
5. **GET /api/events** — Add if it belongs in vaca-api; otherwise document as “frontend calls external API.”
6. **Sensitive action logging** — Implement logging for the actions you want (and optionally add to 4.4).
7. **Input validation** — Decide: full validation layer vs Mongoose + controller checks; then implement and document.
8. **4.4 route table** — Add the single “Route | Method | Access” table (and optionally “Roles” column) so route security is unambiguous.

Once you answer the clarification points above, the next steps are straightforward to implement and keep aligned with 4.4.
