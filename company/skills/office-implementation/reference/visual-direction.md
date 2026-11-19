# Visual direction

Read this only when building a new look: a new project, or a screen with no design system or reference to follow.

## Order of preference

1. **The project has a design system or `.empresa/design.md`**: follow it. Do not load any design skill.
2. **There is a reference** (Figma, screenshot, existing site): reproduce its intent and list any divergence in the handoff.
3. **Nothing exists**: define the direction once, record it, reuse it.

## Defining the direction (case 3, once per project)

1. Call `frontend-design` once to choose an intentional direction instead of a templated default.
2. Write `.empresa/design.md`, at most 40 lines:

```
Goal and audience: <who uses it, what they should feel and do>
Hierarchy: <the one thing each main screen must make obvious>
Type: <heading family, body family, scale>
Color: <background, surface, text, primary, danger, success — as tokens with values>
Spacing and radius: <the scale>
Components: <library in use; where 21st.dev components were adapted>
Motion: <what animates and why; reduced-motion behavior>
Do not: <patterns to avoid in this product>
```

3. Send the Lead this direction in a few lines and **wait for approval** before building the new look.

Every later screen reads `.empresa/design.md` instead of reloading the skill.

## Components

- New project default: Tailwind CSS + shadcn/ui.
- Use the 21st.dev MCP to find a component, then adapt it to the project's tokens. Never paste a component that brings its own colors, fonts or a second component library.
- Keep the library the project already uses; do not mix two.

## What reads as generic

Avoid by default: purple-to-blue gradients on everything, uniform rounded cards in a grid with an icon each, centered hero with two buttons and no real content, decorative emoji, glass effects without purpose. Prefer: real content, a clear hierarchy, generous and consistent spacing, one accent color used sparingly.

Strongly visual or animated work is one of the two cases where the Lead may start you on Opus.
