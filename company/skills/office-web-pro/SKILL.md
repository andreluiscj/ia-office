---
name: office-web-pro
description: The Office's mandatory pipeline for any request for an animated, professional, new or redesigned website or landing page. Reproduces the method of the creator walkthrough the user asked us to learn (reference first, design system extracted from the reference, imagery by prompt, Impeccable polish, one authored animation, deploy-ready build) with a gate and evidence for every phase and a visual-difference check against the current site. Use when the Lead sees words like animated, professional, new landing, redesign, "like the video", or a site/landing with no design direction.
---

# Office web-pro pipeline

The user asked for "everything in the video" to be used whenever an animated, professional page is requested. This playbook is that method, with gates. A run that skips a phase, or delivers a page that looks like the old one when a redesign was asked, has failed, however clean the code is.

## 0. Scope (the Lead decides in the grilling, one question each, with your recommendation)

1. **Redesign or refine?** Words like *new landing, animated, professional, redesign, nova* = **REDESIGN** (a new visual world; only what the user names stays: logo, copy, the 3D object). Refine only when the user says refine/keep the look. Write the answer in the plan: `Scope: redesign|refine`.
2. **References.** Ask for 1 to 3: screenshots in a folder, URLs, or names of sites they like. None given: the Lead searches (WebSearch) for 3 sites of the same category plus one that is the quality bar, lists the URLs, and asks the user to pick. The user cannot answer (unattended run): pick the strongest, mark `Assumed` and say so in the report.
3. **What stays**: logo, palette, fonts, copy, the 3D object, product screenshots.
4. **Baseline.** Existing site: Pedro takes screenshots of the current pages first (phase 1).

Never start building before the scope and at least one reference exist.

## 1. Phases, owners and evidence (Pedro keeps `.empresa/web-method.md`, one row per phase: phase | evidence path | status)

| # | Phase | Owner | Evidence |
| --- | --- | --- | --- |
| 1 | **Baseline and references captured** | Pedro | `.empresa/baseline/*.png` (current site) and `.empresa/ref/*.png` made with `node ~/.claude/skills/office-design/scripts/shot-url.cjs <url> <prefix> --styles`; the `--styles` JSON gives the reference's real fonts, sizes and colors |
| 2 | **Design system extracted from the reference** (not invented) | Pedro | Impeccable `init` from the Lead's brief facts (a subagent cannot ask the user: mark `[inferred]` items, the Lead confirms them), the new-work flow with `Scope: redesign` (replaces the visual world), then `document` → PRODUCT.md and DESIGN.md. Contents: colors with hex and use, type (families, scale, weights, line height, tracking), CSS tokens in `:root` (color, space, radius, shadow, type), layout (grid, container, breakpoints), components with states (button, input, card, nav, badge, modal), responsiveness (mobile first), accessibility (contrast, touch area, focus), image direction (style, treatment, ratios), implementation rules and what to avoid. Each rule cites the reference it came from. |
| 3 | **Imagery list** | Pedro | `.empresa/image-prompts.md` (one prompt per image: subject, style, palette, ratio, transparent background or not, exact file name) per `reference/images.md` path 1b; real product screenshots first for software; the focal object as a cut-out |
| 4 | **Build in parallel** | Pedro + Igor | ownership table in `reference/web-experience.md`; Pedro: design layer, hero, animated sections, assets; Igor: structure, pages, copy, forms, a11y, tests |
| 5 | **One focal animation** | Pedro | scroll animation of the hero object (3D scene or frame sequence), ambient effect only if `pro-practices.md` section 5 says the product's world has it; screenshots at 3 scroll positions, normal and reduced motion |
| 6 | **Polish with Impeccable** | Pedro, Igor | Pedro: `typeset`, `colorize`, `layout`, `animate`, `critique`, `polish`; Igor: `harden`, `clarify`, `adapt`, `audit`, `polish`; critique has no material fix left; `ai-look-check.cjs` 0 hits |
| 7 | **Match-the-reference loop** | Pedro | screenshot the result (`shot-url.cjs`), open reference and result side by side (Read both), write **5 concrete differences** (type, spacing, color, composition, motion) in `web-method.md` and fix them; one more round if the second look still has 3 or more |
| 8 | **Visual-difference gate** (redesign only) | Pedro, Lead verifies | `node ~/.claude/skills/office-design/scripts/look-diff.cjs .empresa/baseline/<page>-top.png .empresa/result/<page>-top.png 35` for the home and two other pages: at least **35% of pixels changed**. Below that the redesign did not happen: back to phase 2 and change composition, type and color, not details |
| 9 | **Deploy-ready** | Igor | build passes, tests pass, static export folder, mobile check at 375/768/1280, the hosting instructions in the report |

## 2. The Lead's gate before delivering

Read `.empresa/web-method.md`. Every row has its evidence file or a reason written by the owner; the gate-8 numbers are in the report; Impeccable was actually run by both agents (each handoff names the commands and what they changed). Missing evidence: send it back to the owner. Say in the final report which phases ran, the changed-pixels percentages and what was assumed.

## 3. Rules that keep the result from being "the old page, slightly touched"

- Redesign means the first viewport of the home, the type, the palette use and the composition are visibly different. Improving only details is the failure the user already saw.
- Real value beats safety: when torn between refined and committed, commit (the Impeccable rule). Keep only what the user named.
- The reference rules: copy structure, rhythm, type feeling and motion idea; never its brand assets, copy or images.
- Unknown facts about the product go to the Lead as one question, not into invented claims.
- Impeccable runs as the plugin says (`Skill impeccable:impeccable`); if its launcher is refused once, say so in the handoff and apply the same rules from `pro-practices.md` instead of skipping the phase.
- Smoke, steam or any ambient effect: only per `pro-practices.md` section 5; otherwise a different focal moment.

## 4. Source of this method

The user's reference video (creator walkthrough: reference from Pinterest, design system extracted from the reference image with a prompt, a first version from a design tool, image prompts generated by the AI and pasted into ChatGPT, transparent-PNG hero object, Impeccable skill to remove the AI look, scroll animation of the hero object, ambient smoke effect, mobile check, static hosting). Pieces we cannot run (Claude Design, Monid video generation, sales outreach) are replaced as described in `reference/web-experience.md` and `pro-practices.md`.
