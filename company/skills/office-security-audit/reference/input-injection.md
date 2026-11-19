# Input, injection and output

Every value that crosses a trust boundary is hostile until validated: body, query, path, headers, cookies, files, webhook payloads, third-party API responses, and LLM output.

## Check

**Validation**
- [ ] Each entry point validates with a schema on the server: type, format, length, range, allowed values; unknown fields rejected or stripped.
- [ ] Limits exist: body size, array length, string length, page size, numeric range.
- [ ] Malformed input yields a 4xx with the generic error format, never a 500 or a stack trace.

**Injection**
- [ ] SQL: only parameterized queries or ORM bindings. Search for string concatenation or template literals inside queries, raw-query helpers, and dynamic `ORDER BY` / column names (must come from an allowlist).
- [ ] NoSQL: user input is never used as an operator object (`{$gt: ...}`); cast to the expected type.
- [ ] OS commands: no shell with user input; use argument arrays and an allowlist.
- [ ] No `eval`, `Function`, dynamic `require`/`import` or unsafe deserialization on user data.
- [ ] Templates: user input is data, never template source (server-side template injection).

**Output (XSS)**
- [ ] The framework's auto-escaping is on and not bypassed: search for `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `dangerouslySetInnerHTML`, `v-html`, `{@html}`, `| safe`, `{!! !!}`.
- [ ] Rich text that must be HTML passes through a maintained sanitizer with an allowlist.
- [ ] URLs built from data allow only `http:` and `https:` (no `javascript:` or `data:`).
- [ ] A Content-Security-Policy is set as defense in depth.

**Files**
- [ ] Uploads: size cap, type allowlist verified by content not just extension, random stored name, stored outside the web root or in private storage, never executed, served with a safe `Content-Type` and `Content-Disposition`.
- [ ] Paths built from input are normalized and confined to a base directory (no `../`).

**Server-side requests (SSRF)**
- [ ] Any URL the server fetches on a user's behalf is checked against an allowlist of hosts; private, loopback and link-local addresses and cloud metadata endpoints are blocked after DNS resolution; redirects are not followed blindly.

**Redirects and webhooks**
- [ ] Redirect targets are relative or from an allowlist (no open redirect).
- [ ] Incoming webhooks verify the provider's signature and reject replays.

## How to prove

- Send wrong types, nulls, empty strings, a 1 MB string, deeply nested JSON, odd unicode: expect 4xx, no crash.
- SQL: a quote or a boolean payload in each parameter against the local app; better, read the query construction at `path:line`.
- XSS: store `<img src=x onerror=alert(1)>` and view it where it renders.
- Path traversal: `../../etc/passwd` style names in download and upload parameters.
- SSRF: point the URL at `http://127.0.0.1`, `http://169.254.169.254`, `http://[::ffff:127.0.0.1]`, `http://localhost.` and a name that resolves to loopback (`http://localtest.me:<port>`, `http://127.0.0.1.nip.io:<port>`) with a local server listening on that port; every one must be refused and the local server never hit.
