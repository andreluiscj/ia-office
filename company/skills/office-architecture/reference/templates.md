# Templates

## ADR (`.empresa/adr/NNNN-title.md`, at most 30 lines for T2)

```
# NNNN <title>
Date: <YYYY-MM-DD>   Status: proposed | accepted | superseded by NNNN
Context: <the problem and the constraint that forces a decision, 2-3 lines>
Decision: <what we will do, 1-3 lines>
Alternatives rejected: <option — why not> (only for expensive or irreversible decisions)
Contract: <endpoints/events/interfaces; see format below>
Threat model: <the five lines>   Security level: L1 | L2
Consequences: <what gets easier, what gets harder, what triggers a revisit>
Rollback: <how to undo>
Slices: <ordered list: slice — owner — files — evidence>
Sources: <official doc URL and version>
```

## Contract entry

```
POST /api/<resource>
Auth: <none | session | role X>   Idempotent: <yes with key | no>
Body: { field: type (limits) ... }
200/201: { ... }
Errors: 400 validation | 401 | 403 | 404 | 409 | 422 | 429 — all as { error: { code, message } }
Limits: body <= N KB, page size <= N, rate <= N/min per <user|ip>
```

One error format for the whole project. Messages are safe to show a user; details go to logs.

## `.empresa/arquitetura.md` (T3 only)

Sections, each as short as the system allows:

1. Problem, goal, out of scope
2. Assumptions, constraints, versions
3. Context: users, external systems
4. Modules and responsibilities (one line each) and the allowed dependency direction
5. Main flows, including the error path
6. Contracts (format above)
7. Data model: tables, keys, indexes, integrity rules, what is personal data
8. Auth: authentication, authorization per resource, trust boundaries
9. Non-functional targets: performance budget, accessibility level, availability
10. Test strategy: what is unit, integration, E2E
11. Risks and mitigations
12. Slices in delivery order
13. Sources

Add a Mermaid diagram only when it makes a boundary or flow easier to review than the text.
