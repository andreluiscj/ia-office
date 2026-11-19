Build "InvoiceDesk" from scratch in the current (empty) folder: a multi-tenant SaaS where small businesses manage clients and issue invoices. Work like a real product team would, from the first idea to a verified delivery:

1. **Product thinking first.** Write `docs/product.md`: target users, the problem, scope for a first release, what is out of scope, and success metrics.
2. **Architecture.** Write `docs/architecture.md`: key decisions with the alternatives you rejected, data model, request flow, and the main risks.
3. **Implement** the product (backend, database and a web UI) following the contract below exactly.
4. **Automated tests** with `node --test`, covering the business rules and the security-relevant behavior.
5. **Security.** Write `docs/security.md`: a threat model, the vulnerability tests you ran (injection, authentication, session, authorization and tenant isolation, XSS, CSRF, brute force, input validation, headers), what you found and what you fixed.
6. A `README.md` with how to run and test it.

## Hard constraints
- Node.js 24 only, **built-ins only**. No `npm install`, no external packages, no network access. Use `node:http`, `node:sqlite`, `node:crypto`, `node:test`.
- `node server.js` starts the server. It reads `PORT` (default 3000) and `DB_PATH` (SQLite file, default `./data.db`). Data must persist across restarts.
- Plain HTML/CSS/JavaScript for the UI, served by the same server. No build step.

## API contract (must match exactly; all bodies and responses are JSON)
- `POST /api/signup` `{email, password, orgName}` → 201 `{user:{id,email,role}, org:{id,name,plan}}` and sets the session cookie. Creates a new organization; this user is its `owner`. Duplicate email → 409. Password shorter than 10 characters, invalid email or empty orgName → 400.
- `POST /api/login` `{email, password}` → 200 `{user, org}` and sets the session cookie; wrong credentials → 401. After 5 failed logins for the same email within 10 minutes, the next attempt → 429.
- `POST /api/logout` → 204 and invalidates the session. `GET /api/me` → 200 `{user, org}` or 401.
- `POST /api/members` `{email, password}` (owner only; otherwise 403) → 201 `{id,email,role:"member"}`. The member belongs to the owner's organization.
- `POST /api/clients` `{name, email}` → 201 `{id,name,email}`; `GET /api/clients` → 200 array (only the caller's organization).
- `POST /api/invoices` `{clientId, items:[{description, qty, unitPrice}]}` → 201 `{id, number, clientId, items, total, status}`. `qty` is an integer 1..1000, `unitPrice` is an integer number of cents 0..100000000, 1 to 50 items, strings trimmed, max 200 chars. `total` (cents) is computed by the server (ignore any client-sent total). `number` is sequential per organization: `INV-0001`, `INV-0002`... The clientId must belong to the caller's organization. `status` starts as `"draft"`.
- `GET /api/invoices` → 200 array; `GET /api/invoices/:id` → 200 or 404 (also 404 for another organization's invoice); `DELETE /api/invoices/:id` → 204, owner only (otherwise 403).
- Free plan: an organization may have at most 5 invoices; the 6th → 402 `{error}`. `POST /api/billing/upgrade` (owner only) → 200 `{org}` with `plan:"pro"` (simulated, no payment), after which the limit no longer applies.
- Session cookie is named `sid`: `HttpOnly`, `SameSite`, random unguessable value, new value on every login.
- CSRF: every `POST`, `PUT`, `PATCH` and `DELETE` must carry the header `X-Requested-With: fetch`, otherwise → 403.
- Every error is `{error: "message"}` with a proper status code. Never leak stack traces, file paths or SQL. Malformed JSON → 400. Bodies over 1 MB → 413.
- Send security headers on every response: a Content-Security-Policy, `X-Content-Type-Options: nosniff`, clickjacking protection and a `Referrer-Policy`.
- `GET /` serves the web app: sign up / log in, a dashboard (invoice count, total billed, plan and "x of 5 invoices used"), a clients screen and an invoices screen with a form that supports several line items. It must be responsive and accessible (labels, keyboard use, visible focus, sensible contrast).

Finish only when everything runs, the tests pass, and you have verified the result yourself. Report briefly what you built, what you verified, and anything you could not verify.

The plan is pre-approved by the owner. Do not stop to ask for approval or for clarifications: make reasonable assumptions, record them, and keep going until everything is delivered and verified.
