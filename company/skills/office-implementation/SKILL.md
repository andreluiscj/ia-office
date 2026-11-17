---
name: office-implementation
description: The Office developer's playbook for implementing a fix or feature in thin verified slices with secure-by-default code. Covers the slice cycle, twelve secure-coding rules, the self-check and the handoff. Use when office-dev starts any coding task, front-end or back-end.
---

# Office implementation playbook

Read one reference, only if the task touches it:
- API, business rule, database, integration → [reference/backend.md](reference/backend.md)
- screen, component, form, state → [reference/frontend.md](reference/frontend.md)
- a new look with no design system or reference to follow → [reference/visual-direction.md](reference/visual-direction.md)

## 1. Before the first edit

1. Read the brief and the `Read first` file. Restate the definition of done to yourself as a list of checks.
2. Find how the project already does this kind of thing (graph, then one or two excerpts). Copy that pattern.
3. Find the commands: test, lint, typecheck, build (package manifest or your memory file). Run the tests once to know the baseline is green.

## 2. The slice cycle

Repeat for each slice of the task, smallest useful behavior first:

1. **Test first.** Write a test that fails for the right reason. Bug fix: the test reproduces the bug.
2. **Code** the minimum that makes it pass, in the project's style.
3. **Check**: run the affected tests, then typecheck and lint. Fix before moving on.
4. **Next slice.** Never stack unverified slices.

T1 fix: one slice. If the fix needs more than 2 files or touches a contract, stop and tell the Lead: the tier is wrong.

Tests cover behavior, not implementation: the happy path, each validation rule, each error the contract lists, and limits (empty, max, max+1). Prefer real implementations over mocks; mock only what is slow, external or non-deterministic.

## 3. Twelve secure-coding rules (always, no audit needed)

1. Validate every external input at the boundary with a schema: type, format, length, range. Reject unknown fields.
2. Database access only through parameterized queries or the ORM. No string-built SQL.
3. Authorize **per resource** on the server: "is this user allowed to touch *this* record", not just "is logged in".
4. Secrets only in environment variables, read on the server. Nothing secret in client bundles, logs, errors or the repository.
5. User- or API-supplied text never becomes HTML: no `innerHTML`, `dangerouslySetInnerHTML`, `v-html` or template bypass.
6. Errors shown to users are generic; details and stack traces go to server logs only.
7. Cap sizes: request body, upload size and type, page size, string lengths.
8. Rate-limit login, password reset, sign-up and any costly endpoint.
9. Login, reset and sign-up answer the same way whether or not the account exists.
10. Supabase or any row-level database: RLS on for every table, with a policy per operation; the service key stays on the server.
11. Outbound calls have a timeout; URLs taken from user input are validated against an allowlist before the server fetches them.
12. No new dependency without the Lead's approval.

If a rule cannot be followed, do not work around it: report it to the Lead.

## 4. Self-check before handing off

```
- [ ] every acceptance check passes, with the command and its result noted
- [ ] tests, lint, typecheck, build are green (or absent, noted)
- [ ] the diff contains only this task: no debug logs, temp files, secrets, stray formatting
- [ ] no test removed or weakened; no lockfile change that was not approved
- [ ] screens: opened in a real browser, states and sizes checked, console clean
- [ ] migrations: ran on a confirmed local database, with a rollback noted
```

## 5. Handoff

Write `.empresa/handoff/<task>-dev.md`, at most 20 lines (two agents read it):

```
What changed: <behavior, in 2-4 lines>
Files: <list>
How to run: <commands>
Contracts: <endpoints/shapes added or changed>
For testing: <fixtures, preconditions, error scenarios worth attacking>
Checks: <command → result>
Risks / not done: <list or none>
```

Then return the short report from your agent file.

## When stuck

One third-party skill for the specific problem, the short one first: `tdd` (unsure how to test it), `diagnosing-bugs` (a failure you cannot explain after one honest attempt), `performance-optimization` (a measured slowness), `deprecation-and-migration` (changing existing data or removing behavior). A library call you are unsure about: Context7, one lookup.

Review feedback: read the finding, reproduce it, fix the cause, add the test that would have caught it.
