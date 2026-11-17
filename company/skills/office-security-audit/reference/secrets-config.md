# Secrets and configuration

## Check

**Secrets**
- [ ] No secret in the repository, in history, in client bundles, in logs or in error messages. Search for key-like strings and for `.env` files tracked by git; run `gitleaks` if installed.
- [ ] `.env` is in `.gitignore`; `.env.example` holds names only.
- [ ] Anything prefixed for the client (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`) is truly public. Service keys, database URLs, API secrets and signing keys never carry such a prefix.
- [ ] A secret found in history is treated as leaked: report it as critical and recommend rotation. Removing the line does not un-leak it.
- [ ] Secrets are read on the server at startup and validated; missing ones fail fast.

**Transport and headers**
- [ ] HTTPS only in production, with `Strict-Transport-Security`.
- [ ] `Content-Security-Policy` present and without `unsafe-inline` for scripts where feasible; `X-Content-Type-Options: nosniff`; framing restricted (`frame-ancestors` or `X-Frame-Options`); a `Referrer-Policy`.
- [ ] CORS: explicit origin allowlist. Never `*` together with credentials; never reflecting the request's `Origin` unchecked.
- [ ] Cookies carrying sessions: `HttpOnly`, `Secure`, `SameSite`.

**Errors and logs**
- [ ] User-facing errors are generic; no stack traces, SQL, file paths or library versions in responses.
- [ ] Debug mode, verbose errors, source maps with secrets, admin panels and API explorers are off or protected in production builds.
- [ ] Logs carry no passwords, tokens, full payment data or unnecessary personal data.

**Abuse limits**
- [ ] Rate limits on authentication, on costly operations (search, export, AI calls, email/SMS sending) and on anything that costs money per call.
- [ ] Timeouts and size caps so a single request cannot exhaust the server.

**Platform**
- [ ] Database not reachable from the public internet without need; least-privilege database user for the app.
- [ ] Default credentials changed; sample routes and seed accounts removed.
- [ ] `L2` Backups exist and are access-controlled; restore has been tried.

## How to prove

- `git log -p -S"<key prefix>"` or `gitleaks git --redact` for history.
- Build the client and search the output for key names and prefixes.
- Read response headers from the local app (`curl -I`).
- CORS: send a request with a foreign `Origin` and credentials; check the reflected headers.
- Trigger an error and read the response body.
