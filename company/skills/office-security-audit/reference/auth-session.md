# Authentication and sessions

Aligned with the OWASP ASVS chapters on authentication and session management. Items marked `L2` apply when the security level is L2.

## Check

- [ ] Passwords are hashed with a slow, salted algorithm (Argon2id, bcrypt, scrypt), by a maintained library or the auth platform. Never plain, never a fast hash (MD5, SHA-*).
- [ ] No hand-rolled auth where a platform (Supabase Auth, Auth.js, framework auth) exists.
- [ ] Minimum password length of at least 8 (prefer 12+), long passphrases allowed, no silent truncation; breached-password check where the platform offers it.
- [ ] Login, sign-up and password reset respond identically whether or not the account exists (message, status, and roughly timing).
- [ ] Rate limiting or lockout with backoff on login, reset, sign-up, OTP verification.
- [ ] Reset and verification tokens are random (>= 128 bits), single use, short lived, stored hashed, and invalidated on use and on password change.
- [ ] Session identifier is regenerated on login and privilege change; destroyed on logout server-side.
- [ ] Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`, scoped path/domain. Tokens are not kept in `localStorage` when a cookie session is possible.
- [ ] Sessions expire: idle timeout and absolute lifetime. Changing password or email ends other sessions.
- [ ] JWTs: signature and algorithm verified with a fixed allowlist (never `none`, never trust the header's choice), `exp` checked, audience/issuer checked, secret strong and server-side only. Short lifetime plus refresh rotation.
- [ ] State-changing requests are protected against CSRF when cookies carry the session (SameSite plus token, or the framework's protection).
- [ ] OAuth/OIDC: `state` (and PKCE for public clients) validated; redirect URIs are an exact allowlist.
- [ ] `L2` MFA available for admin and sensitive actions; re-authentication before changing password, email, MFA or payout details.
- [ ] `L2` Authentication events (login success/failure, reset, MFA change) are logged without secrets.

## How to prove

- Enumeration: send the same request for an existing and a non-existing account; compare status, body and timing.
- Rate limit: 20 quick wrong attempts against the local app; expect 429 or a lock.
- Token reuse: use a reset token twice; second use must fail.
- Session fixation: capture the session id before login, compare after.
- Cookie flags: read the `Set-Cookie` header.
- JWT: re-sign with `alg: none` or a wrong key in a test; must be rejected.

## Common failures

Reset link that never expires; login check only in the client; "remember me" as a long-lived token in `localStorage`; different error text for "user not found" and "wrong password"; logout that only clears the cookie.
