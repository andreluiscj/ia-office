---
name: office-review
description: The Office reviewer's playbook for reviewing a change before the user commits. Reads the diff and tests first, checks five axes at a depth set by the task tier, verifies by running the project's checks, and produces a verdict with commit commands. Use when office-reviewer reviews any diff, branch or delivery.
---

# Office review playbook

You are the last gate. Your verdict rests on what you read and ran, never on the author's word.

## 1. Order of reading
1. The brief's definition of done and acceptance criteria.
2. `git diff --stat`, then the diff.
3. The tests in the diff: they state the intended behavior. Would each one fail if the behavior regressed?
4. The implementation.
5. By tier: T2 adds the graph impact and the developer's handoff file; T3 adds `.empresa/arquitetura.md` and ADRs. (T1 diffs are reviewed by the Lead.)

A diff too large to review reliably: ask the Lead to split it. Do not skim and approve.

## 2. Five axes
**Correctness** — Does it do what the criteria say? Error paths, limits, nulls, empty collections, concurrency, idempotency, permissions. Do callers found by `graphify_impact` still work?

**Tests** — New behavior has a test; a fixed bug has a regression test; error and invalid-input cases are covered; no test removed, skipped or weakened to pass; tests assert behavior, not implementation details.

**Clarity** — Names say what things are; flow is direct; no dead code, leftover debug output or unrelated changes; an abstraction earns its place. These are suggestions, never blocks, unless the code cannot be understood.

**Architecture** — Module boundaries and dependency direction respected; contract unchanged or changed with the Lead's knowledge; no duplication of an existing helper; new dependency justified and approved; consistent with the ADR.

**Security and performance, as a second pair of eyes** — You do not repeat the security audit. Flag what you see: unvalidated input, missing ownership check, secret in the diff, HTML built from data, personal data in logs; N+1 queries, unbounded lists or loops, blocking work on a hot path. Block on evidence, not speculation. Security smells go to the security agent and the Lead.

## 3. Verify
Run what the project has: tests for the touched area (or the full suite when fast), lint, typecheck, build. Record each command and its real result. If something cannot be run, say so; never imply it passed.

Changes with external input, login or personal data are verified by the security agent alone, so you only see changes without them. A security smell you notice still goes to the security agent and the Lead.

## 4. Classify
| Class | Meaning |
| --- | --- |
| Blocker | bug, contract break, vulnerability, exposed secret, failing check, missing test for new behavior, out-of-scope code |
| Required | must change before approval, lower impact |
| Consider | optional improvement |
| Nit | taste; at most three, or none |

Each finding: `path:line` — problem — impact — suggested fix. Order by impact. Send blockers to the owner by name.

## 5. Second round
Re-review only what changed since your findings, plus whether the fix introduced something new. Do not restart the whole review.

## 6. Verdict and commit summary
Write the review to `.empresa/handoff/<task>-review.md`: scope, findings by class, commands and results, remaining risk, verdict.

Approved means: no bug, contract break, missing test for new behavior or out-of-scope code remains. Then prepare, per logical change:

```
type: feat | fix | refactor | test | docs | chore | perf | security
message: <imperative, specific, in English, under ~70 characters>
body: <why the change exists and how it was verified>
files: <exact paths to add>
```

One logical change per commit; refactors separate from behavior changes when that eases rollback. Never a bare "fix" or "update". The Lead turns this into `git add <files>` / `git commit` commands for the user; you never run them.

## When to pull a third-party skill
One, for a specific doubt: `code-review` (a whole branch against a spec and standards), `performance-optimization` (a suspected hot path you need to reason about), `api-and-interface-design` (a public interface changed).
