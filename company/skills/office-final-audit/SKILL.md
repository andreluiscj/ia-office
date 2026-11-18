---
name: office-final-audit
description: The Office reviewer's procedure for the mandatory end-of-project security audit with the Claude Security plugin. Covers requesting the scan from the Lead, triaging the report, routing patches and repeating until no critical or high finding remains. Use when office-reviewer is asked for a final audit, an end-of-project security scan, or an attack attempt.
---

# Office final audit (Claude Security)

Whenever the user, through the Lead, asks for an audit or an attack attempt at the end of a project, the **whole Claude Security plugin is mandatory**. A manual review alone is never accepted as the audit. All three jobs run: **scan codebase**, **scan changes** (when there is a branch, PR or commit range) and **suggest patches**.

```
- [ ] 1 Request   - [ ] 2 Triage   - [ ] 3 Patches   - [ ] 4 Repeat   - [ ] 5 Report
```

## 1. Request the scan
The plugin's orchestrator only works in the main session, so you cannot start it. Send the Lead:

```
CLAUDE SECURITY REQUEST
Scope: whole repository (then focus: <API | auth | payments | uploads | ...>)
Effort: high
Changes scan: <branch/PR/commit range | none>
Reason: <end-of-project audit | attack attempt requested>
```

The Lead runs `/claude-security` and returns the report folder `CLAUDE-SECURITY-<timestamp>/`. No report, no audit: report `BLOCKED: Claude Security not run` and do not approve.

## 2. Triage
- Read `CLAUDE-SECURITY-RESULTS.md`, not the whole `.jsonl`. Check the revision stamp: commit scanned, effort, uncommitted changes. A scan of a different commit than the one being delivered must be redone.
- For each finding: open the code at the reported location, confirm the vulnerable pattern, and confirm reachability with `graphify query` (who calls it).
- Drop false positives with a one-line reason each. Keep the list of dropped ones in your report.
- Classify the rest. Critical and high block delivery.
- Route each accepted finding to its owner by name: the developer for code, the architect for design flaws. Ask the security agent to write a test that reproduces each critical or high finding.

## 3. Patches
Ask the Lead to run "suggest patches" for the accepted findings. You never apply a patch. Hand each `patches/F<n>.patch` to the developer as input, one change per patch; the developer adapts and tests it.

## 4. Repeat
Scans are nondeterministic: one clean run is not proof. After the fixes, request a changes scan on the fix diff, plus a full scan for critical areas. Repeat until no critical or high finding remains, or the Lead records an explicit risk acceptance from the user.

## 5. Report
In `.empresa/handoff/<task>-review.md`, under `CLAUDE SECURITY`:

```
Scope and effort: <...>      Scans run: <codebase, changes, patches; count and commits>
Findings: critical <n> | high <n> | medium <n> | low <n>
False positives dropped: <n, with reasons>
Fixed and re-verified: <list>      Remaining: <list with owner, or none>
Risk accepted by the user: <none | what>
```

State plainly that Claude Security reads and reasons about the code; it does not attack a running instance. If an attack test against the running app is also wanted, ask the security agent for dynamic tests on the local environment.
