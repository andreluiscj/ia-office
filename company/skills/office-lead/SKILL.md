---
name: office-lead
description: The Office Lead's playbook. Classifies a request into tiers T0-T3, writes the plan, briefs specialists, validates evidence and prepares commit commands. Use at the start of every Office session led by office-ceo, before delegating or answering.
---

# Office Lead playbook

## 1. Classify (before reading anything)

| Signal in the request | Tier |
| --- | --- |
| "what / why / how does", explain, compare, no file changes | T0 |
| typo, copy, style tweak, one-function bug, up to 2 files | T1 |
| new screen, endpoint, rule, integration; no auth or data-model change | T2 |
| touches login, permissions, payments, personal data, a public contract | T2 with security, or T3 if the model itself changes |
| new project or module, migration of real data, 3+ specialists, costs money | T3 |

Vague request ("make me an X" with no who/why): ask up to 3 questions in one message, each with your recommended answer. Use `grilling` only if the answers still leave the goal unclear.

## 2. Plan (size follows tier)

- **T0**: no plan. Answer.
- **T1**: one line: what, which file, who. Start in the same reply.
- **T2**: 5-10 lines in `.empresa/plano.md`, then start.
- **T3**: full plan in `.empresa/plano.md`, present it, **stop until approved**.

Plan template (T2 uses the first four fields):

```
# <task-slug>
Goal: <one sentence, the user outcome>
Acceptance criteria: <numbered, each verifiable by a command or a visible behavior>
Out of scope: <what will not be done>
Slices:
  1. <vertical slice> — owner: <role> — files: <...> — depends on: <none|n> — evidence: <test/command>
  2. ...
Risks: <data, auth, cost, irreversible steps>
Model: sonnet | opus — <reason, only for strongly visual screens or very large structures>
Claude Security: (T3) a low-effort scan of <dirs> after the last slice; it can take several minutes and use many tokens. Approving this plan accepts that cost.
Decisions for the user: <only T3 or critical>
```

Slices are vertical (one user-visible behavior end to end), not layers. Slices with no dependency between them and no shared file run in parallel.

## 3. Brief the specialist

The brief is the roadmap: write it once, completely, so nobody comes back to ask. Every brief carries the map, the exact files, the contract or acceptance criteria and where to read previous work.

Five fields, nothing else. The specialist already knows their playbook, limits and report format.

```
Task: Add password-reset request endpoint. Done when POST /auth/reset returns 202 for any email and sends a token only to existing users; tests cover unknown email and rate limit.
Tier: T2
Map: auth module (src/auth/*), used by src/routes/auth.ts; tests in tests/auth/.
Files: src/auth/reset.ts, src/routes/auth.ts, tests/auth/reset.test.ts | Do not touch: src/db/schema.ts
Read first: .empresa/adr/0004-password-reset.md
```

Never paste file contents, logs or another specialist's report into a brief. Pass paths.

## 4. Validate

For each returned report check: status, the command and its result, the handoff path. Before delivering anything, re-run the project's test command yourself: a result you did not see is not evidence. Missing evidence: send it back with "Evidence missing: <what>". Open a handoff file only when you must decide something from it.

Order by tier:
- **T1**: dev, then you review (below). No reviewer agent.
- **T2 without external input**: architect (if needed) → dev → reviewer.
- **T2 with external input, login or personal data** (security from the first minute):
  1. Start dev and security **in the same message**. Security's brief: `Mode: pre-code` plus the contract and acceptance criteria; it writes the threat model and black-box attack tests in `tests/security/` while the code is written.
  2. Dev finishes: run the full test command yourself (it now includes security's tests). Failures in security tests go back to dev with the test name.
  3. In one message: start the reviewer, and **continue the same security agent** (`SendMessage` to `leonardo`, `Mode: audit`, diff range) so it keeps its threat model instead of re-reading. Either verdict blocking blocks.
- **T3** (continuous security):
  1. Architect → plan with slices (each slice small, testable, with its security relevance marked).
  2. Start security in `Mode: pre-code` for the whole plan, in the same message as the first slice.
  3. For each slice: dev implements → you run the tests → `SendMessage` to `leonardo` with `Mode: checkpoint`, the slice and its diff range. A critical or high finding stops the next slice until fixed.
  4. After the last slice, **mandatory**: run Claude Security yourself (section 6, `Scan changes`, effort `low`). Start the reviewer in the same message, so the review runs while the scan does.
  5. When the scan ends, `SendMessage` to `leonardo` with `Mode: triage` and the report folder. Deliver only after both verdicts.

A reviewer or security block returns to the owner named in the finding, not to you for fixing.

### T1 review (you, no subagent)
Run `git diff` and read it, then run the project's test command yourself; nothing else unless the diff forces a question.
```
- [ ] the diff does what the task asked and nothing more (no unrelated files, no debug output, no secrets)
- [ ] a test for the fix exists in the diff, and the test command passes when **you** run it
- [ ] no contract, auth, data-model or dependency change (if there is one: the tier was wrong, send it to the reviewer)
```
All ticked: approved, write the commit summary yourself. Anything unticked: back to the developer with the exact line.

Stop the loop after 2 failed fix rounds on the same finding: reassess the design with the architect, or escalate the model for that slice, and record why.

## 5. Deliver

Only after the review approved (yours in T1, the reviewer's otherwise). Give the user, in their language, the final report from your agent file plus commit commands, one block per logical change:

```bash
git add src/auth/reset.ts src/routes/auth.ts tests/auth/reset.test.ts
git commit -m "feat: add password reset request endpoint" -m "Returns 202 for any email to prevent enumeration. Verified with bun test tests/auth (14 passed)."
```

End with `git push`. Never `git add .`. Messages in English, imperative, specific.

## 6. Claude Security (Anthropic's attacker-minded scanner)

The plugin runs only in the main session, so you start it: call `Skill` with `claude-security:claude-security` and arguments naming the job, scope and effort. Return the report folder `CLAUDE-SECURITY-<timestamp>/` to whoever asked.

Two rules from the plugin decide how you call it:
- `Scan changes` reads **commits** only, and the team never commits. For uncommitted work use `Scan codebase` with `--scope` set to the directories the work changed.
- It starts only when the **user's own words** accept that the scan may take a long time and use many tokens. That is why every T3 plan has the line below, and you quote the user's acceptance in the arguments. No acceptance: do not run it; report `Claude Security not run: cost not accepted`.

- **T3, after the last slice**: `Scan codebase, scope <changed dirs>, effort low` plus the user's acceptance. Security triages.
- **End of project, or when the user asks for an audit or an attack attempt**: the reviewer runs their final-audit playbook and sends you the request (`Scan codebase`, effort `high`, then `Suggest patches`).
- Never for T1; for T2 only when the user asks.

## 7. Learning

- User repeats a preference or correction: append one line to `.empresa/padroes.md` (`date | situation | preference | count`). Count reaches 2: ask the architect for a project skill.
- Mistake caught by review or tests: one line in `.empresa/licoes.md` (`date | cause | rule`). Search this file by term before briefing a similar task; never read it whole.
