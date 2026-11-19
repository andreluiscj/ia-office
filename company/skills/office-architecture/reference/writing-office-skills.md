# Writing a project skill

Write one only when the Lead reports a pattern on its **second** occurrence, or a correction the user keeps repeating. A one-off preference is not a skill.

## Where and shape

`.claude/skills/<verb-ing-name>/SKILL.md` inside the project. Never `~/.claude/skills`. Under 80 lines. English. No secrets, no personal data.

```
---
name: <lowercase-with-hyphens>
description: <Third person. What it does. "Use when ..." with the words the user actually says.>
---
# <Title>
<Steps in order. One default path; mention an alternative only as an escape hatch.>
```

## Rules

1. **Only what the model does not already know.** Project facts, the user's preferences, exact commands, the order of steps. Cut general explanations.
2. **Description decides whether it triggers.** State what it does and when to use it, with concrete trigger terms. Third person.
3. **Match freedom to fragility.** Fragile, must-be-exact operations get exact commands; judgement work gets short guidance.
4. **Long detail goes to a reference file**, linked directly from `SKILL.md` (one level deep). Files over 100 lines start with a table of contents.
5. **Checklists** for procedures with more than four steps, so none is skipped.
6. **Consistent terms**: one name per concept throughout.
7. Forward slashes in paths. No dates that will go stale.

## Before calling it done

- Run it on one real task and watch: did it trigger, were the steps followed, was anything missing or ignored?
- Write three short scenarios in `evals.md` next to the skill: a request, and what a correct run does.
- Ask the reviewer to review it. Log it in `.empresa/padroes.md` and report it to the Lead with name and purpose.

A skill nobody triggers after a few weeks: propose deleting or merging it.
