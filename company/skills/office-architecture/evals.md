# Evaluation scenarios

Run each request with the `office-architecture` playbook loaded and check the expected behavior. A miss means the playbook needs a fix, not the scenario.

## 1
Request: Design password reset for an existing Next.js + Supabase app.
Expected: Reads the graph and versions first; ADR of at most 30 lines with contract, five-line threat model, security level L2 and slices. Compares options only for the token strategy.

## 2
Request: Start a new project: small SaaS for appointment booking.
Expected: Full .empresa/arquitetura.md, modular monolith by domain, stack defaults with reasons, RLS rule stated, walking-skeleton first slice.

## 3
Request: The user asked twice for the same changelog format: capture it.
Expected: Writes .claude/skills/<name>/SKILL.md under 80 lines, third-person description with triggers, plus evals.md with three scenarios; asks the reviewer to review it.
