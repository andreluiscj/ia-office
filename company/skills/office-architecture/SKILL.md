---
name: office-architecture
description: The Office architect's playbook for structuring a project or feature before any code. Covers understanding the goal, mapping existing code, choosing the simplest design, contracts, a short threat model and vertical slices. Use when office-architect receives a design task, an ADR request, a new project, or a request to write a project skill.
---

# Office architecture playbook

Output is proportional: T2 gets one ADR of at most 30 lines; T3 gets `.empresa/arquitetura.md` plus ADRs. Templates: [reference/templates.md](reference/templates.md).

## The six steps

Copy this checklist into your working notes and tick as you go:

```
- [ ] 1 Understand   - [ ] 2 Map   - [ ] 3 Decide
- [ ] 4 Contract     - [ ] 5 Threats   - [ ] 6 Slices
```

### 1. Understand
Write down: the user outcome in one sentence, who uses it, what is out of scope, and acceptance criteria that a command or a visible behavior can verify. A criterion nobody can check is not a criterion: rewrite it or drop it.

### 2. Map what exists
`graph_stats`, the start of `GRAPH_REPORT.md`, then manifests and lockfiles (versions in use), existing migrations, existing patterns for the same kind of thing. The design must look like the project it lands in.

### 3. Decide: simplest design that fits
- Default shape: **modular monolith, modules by domain** (`billing/`, `auth/`), not by technical layer. Each module exposes a small interface and hides its internals.
- Prefer what the project already uses. New project: see [reference/stack-defaults.md](reference/stack-defaults.md) and [reference/project-structure.md](reference/project-structure.md).
- Compare two options **only** when the decision is expensive or hard to undo (data model, auth strategy, external provider, hosting). Compare on: fit, operational complexity, cost, security, reversibility. Everything else: pick, state why in one line.
- Check the official docs of the version in use through Context7 before committing to a library behavior. One lookup per decision.
- Do not design for requirements nobody stated (multi-region, plugin systems, queues "for later").

### 4. Contract before code
For every endpoint, event or module boundary write: inputs with types and limits, outputs, status codes, the single error format, auth required, idempotency, pagination. Front and back implement against this text; changing it later means telling the Lead.

### 5. Threat model in five lines
Required whenever there is external input, login, personal data, money or an integration:

```
Assets: <what is worth stealing or breaking>
Entry points: <routes, forms, uploads, webhooks, LLM prompts>
Attacker wants: <read others' data | act as someone else | exhaust resources | ...>
Controls: <validation, authz per resource, RLS, rate limit, ...>
Residual risk: <what remains and who accepted it>
```

Then set the **security level** for the audit: `L1` (default web app) or `L2` (personal data, payments, multi-tenant, admin actions). The security agent reads this to size the audit.

### 6. Vertical slices
Break the work into slices that each deliver one user-visible behavior end to end and can be tested alone. For each: owner role, files, dependency, expected evidence. First slice is the thinnest path that proves the design (walking skeleton).

## Writing a project skill
When asked to capture a repeated pattern as a skill, follow [reference/writing-office-skills.md](reference/writing-office-skills.md).

## When to pull a third-party skill
One at a time, only for the named problem: `spec-driven-development` (T3 with no spec at all), `api-and-interface-design` (public API others will depend on), `deprecation-and-migration` (changing live data or removing behavior), `domain-modeling` (business terms are ambiguous), `codebase-design` (deciding where a module boundary goes).
