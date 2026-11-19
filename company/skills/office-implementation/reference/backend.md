# Back-end standards

Existing project: its conventions win. These fill the gaps.

## Request handling

- Route handler does three things: parse and validate input, call the module, map the result or error to the contract. No business rules in routes.
- No input may crash the process or produce a 500: malformed JSON, wrong type, null, empty, huge, odd unicode, impossible dates. A top-level handler turns unexpected errors into the generic error format and logs the detail.
- One error format for the whole API: `{ error: { code, message } }`. Status codes: 400 malformed, 401 not authenticated, 403 not allowed, 404 not found (also for resources the user may not know exist), 409 conflict, 422 validation, 429 rate limit.
- Every list endpoint is paginated with a capped page size. Every mutation validates on the server even if the client validated.

## Data

- Constraints in the database, not only in code: `NOT NULL`, unique, foreign keys, check constraints.
- Use a transaction when two writes must succeed or fail together.
- Index what you filter and join on; look at the query plan for anything that scans a large table.
- Avoid N+1: fetch related rows in one query or a batched one.
- Store money as integer minor units; store timestamps in UTC.

## Migrations

- Confirm the target is a local development database before running anything (host, database name, env file). Cannot confirm: stop.
- One versioned file per change; never edit an applied migration.
- Write down: what it changes, whether it locks or rewrites a large table, how to roll back.
- Destructive change (drop, rename, type change) on existing data: expand first (add new), migrate, then contract in a later change. Never in one step.

## Integrations

- Timeout on every outbound call; bounded retries with backoff only for idempotent operations.
- Idempotency key for operations that must not happen twice (payments, emails, webhooks you send).
- Verify the signature of incoming webhooks before trusting the body.
- Treat responses from external services as untrusted input: validate their shape.

## Configuration and logs

- Parse environment variables once at startup with a schema; fail fast with a clear message.
- Structured logs with a request id. Never log passwords, tokens, full card numbers or personal data.

## Unit tests

One test per validation rule and per contract error; boundaries (0, 1, max, max+1); the authorization rule (another user's resource returns 403/404). Name tests by behavior: "rejects an amount above the limit".
