---
name: office-design
description: The Office designer's playbook for giving a project its visual identity and imagery. Covers the brand brief, craft rules (type, color, layout, illustration), the image pipeline (GPT image generation first, hand-made SVG fallback), asset optimization, the AI-look checklist and the handoff to the developer. Use when office-designer receives any task about look, brand, images, logo, icons, illustrations or a screen that has no imagery.
---

# Office design playbook

Read one reference, only if the task touches it:
- the professional rules (mode, hierarchy, type, color, motion, **ambient effects: when smoke/steam fits and when not**, performance, a11y, the refuse list) → [reference/pro-practices.md](reference/pro-practices.md) (read the sections you need)
- identity, type, color, layout, illustration style → [reference/craft.md](reference/craft.md)
- making, prompting, optimizing and placing images → [reference/images.md](reference/images.md)
- **an animated, professional, new or redesigned site: `Skill office-web-pro` first (mandatory pipeline with gates)**, then:
- a website, landing page or any animated/3D front-end (reference-first method, Pedro + Igor in parallel, scroll animation, 3D) → [reference/web-experience.md](reference/web-experience.md)

## 0. Impeccable (mandatory for front-end work)

The Impeccable plugin (`Skill impeccable:impeccable`, installed by the user) is the Office's design engine for any web front-end. It costs more tokens and the user accepted that for a better result. Use it **after** this playbook's brief step:

| When | Pedro runs | Igor runs |
| --- | --- | --- |
| New site or surface | `init` (PRODUCT.md), then the new-work flow / `shape` to commit the visual world, then `document` (DESIGN.md) | reads PRODUCT.md and DESIGN.md, does not run init |
| Building | `typeset`, `colorize`, `layout`, `animate` (motion) on his files | `harden` (errors, edge cases), `clarify` (copy), `adapt` (devices) on his files |
| Before delivery | `critique` of the whole site, then `polish` of his files | `audit` (accessibility, performance, responsive), then `polish` of his files |

Rules: PRODUCT.md and DESIGN.md at the project root become the source of truth; `.empresa/design.md` shrinks to the contract between Pedro and Igor (token file, file ownership, assets map) and points to them. Each agent changes only the files they own; a finding in the other's files goes to the Lead. The plugin's launcher failing or being refused once: say so in the handoff and continue with this playbook, never retry in a loop. Keep the plugin's own detector hook off (`hooks` stays off): `ai-look-check.cjs` is the gate.

## 1. The cycle

1. **Brief (5 lines, from the Lead's plan and the grilling answers):** who uses it, what they should feel, the one thing each main screen must make obvious, what exists already (logo, colors, photos), what is forbidden. Missing something that changes the look: one question to the Lead, with your recommendation.
2. **Direction:** `.empresa/design.md` (template below). It exists: follow it and extend only what is missing. New: write it and **wait for approval** before producing assets.
3. **Asset list:** the smallest set that makes the product look finished (section 3). Each item: purpose, size, format, where it is used.
4. **Make:** one asset at a time, in the pipeline order of `reference/images.md`. Render and look at each result before the next.
5. **Optimize and name:** `public/assets/<kind>-<subject>.<ext>`, lowercase, hyphens; SVG cleaned, rasters sized for use.
6. **Map:** `.empresa/assets.md` with a row per file: path, use, alt text (or "decorative"), source (GPT or SVG), license.
7. **Handoff** to the Lead (agent file, section 5). the developer places the assets; you do not touch components.

## 2. Direction template (`.empresa/design.md`, at most 40 lines)

```
Product and audience: <what it is, who uses it, in what situation>
Feeling in three words: <e.g. calm, precise, warm> / not: <what to avoid>
Logo: <mark idea, wordmark, minimum size, clear space>
Color tokens: bg, surface, text, muted, primary, danger, success (hex each) + contrast pairs checked
Type: heading family, body family (open license), scale (e.g. 12/14/16/20/28/40), weights used
Layout: grid, max width, spacing scale (4/8/12/16/24/32/48), one radius value, border style
Imagery: style (flat illustration / line / photo-like / abstract pattern), subject matter, stroke or texture rules, 2 reference words
Icons: one set, one stroke width
Do not: <the AI-look list below plus product-specific bans>
```

## 3. Asset set (pick what the product needs; a product with none gets the first four)

1. Logo mark + wordmark (SVG), light and dark versions.
2. Favicon set from the mark (SVG + 32 px and 180 px PNG).
3. One image style for empty states and onboarding (3 to 4 pieces).
4. Icons for the main actions (one set, one stroke width).
5. Hero or header image only when the page sells or introduces something.
6. Social card 1200x630 (rendered from SVG/HTML).
7. Pattern or texture only if the direction asks for it.

## 4. The AI look: never ship

(The full refuse list is `reference/pro-practices.md` section 9; it wins over this summary.)

Gradient fills on backgrounds, buttons, text or illustrations; glossy 3D blobs; glass or neon glow; purple-to-blue default palettes; stock isometric people and robot mascots; emoji used as icons or bullets; sparkles; text drawn inside an image; the same rounded card with an icon repeated six times; colored full-width message banners where a line of text and a small marker would do; faces with uncanny hands; "futuristic" circuit-board backdrops. Prefer: flat or two-tone shapes, real hierarchy, honest empty space, one accent color, imagery drawn from the product's own domain.

## 5. Checklist before the handoff

```
- [ ] `.empresa/assets.md` exists (first line: GPT/Codex works or unavailable, then one row per file)
- [ ] every asset opened and looked at (SVG rendered to PNG with scripts/rasterize.cjs)
- [ ] palette and stroke match the direction; no gradient, no glow, no text inside images
- [ ] contrast of text over images >= 4.5:1 (3:1 for large text)
- [ ] weights: SVG < 20 KB each, raster hero < 200 KB, others < 100 KB; width/height known
- [ ] alt text written (or "decorative") for each file in .empresa/assets.md
- [ ] licenses: fonts OFL, nothing copied from a brand or a copyrighted work
- [ ] dark/light or small-size variants exist where the direction needs them
```
