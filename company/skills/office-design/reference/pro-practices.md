# Professional front-end and design practices

Read the sections your task touches (the headings are the index). Distilled from the Impeccable design references (the strictest source we have), Refactoring UI, web.dev / MDN / Chrome guidance, WCAG techniques and Three.js performance advice. Where a number comes from a rule of thumb, it says so. Where this file and an older Office rule disagree, this file wins.

## 1. Decide before you draw

- **Pick the mode from the surface, not the product:** Persuade (landing, campaign: the visitor decides and acts; design is the product), Operate (app, dashboard, admin: a task gets done; scanability and consistency beat expression), Read (docs, articles: structure for comprehension), Experience (portfolio, showcase: the artifact leads). A tool's landing page is still Persuade.
- **The brief and the reference win.** Honor pinned fonts, palettes, eras and materials even if a rule below dislikes them. Refinement keeps the incumbent identity; redesign replaces it deliberately.
- **Commit to one visual world** drawn from the product's use scene (who, where, under what light), not from the category's habit. Light or dark follows the scene, not the industry. When torn between refined and committed, commit.
- **First viewport answers three things in about 10 seconds:** who it is for, what it does or sells, what to do next (one primary action, visible without scrolling on a phone too). (Secondary sources citing NN/g; the 10 s figure is folklore-grade, the clarity rule is not.)
- **Design from content.** Real copy, real product names, real prices at every breakpoint. Placeholder lorem hides every overflow and hierarchy problem.

## 2. Hierarchy, layout, spacing

- Hierarchy comes from **size, weight and color together**; size alone is weak. Squint test: with blurred eyes the primary, secondary and major groups still appear in order.
- **Group by proximity before adding boxes.** Tight inside a group, generous between groups, more space above a heading than below it. Rhythm = deliberate contrast between tight and loose intervals, not one uniform gap.
- One spacing scale (4-based: 4/8/12/16/24/32/48/64/96); gaps grow as elements grow. Use `gap` for sibling rhythm. Start with too much whitespace and remove.
- Design in grayscale first: if the hierarchy works without color, color only reinforces it.
- Responsive is structural: reorder, collapse, reflow or reveal by what stays important, not shrink. Container queries for components that live in different contexts; viewport breakpoints for page structure.
- Touch targets at least 44 px even when the visible mark is small. Keyboard, touch and screen-reader order match the visual order.
- Make optical, not just mathematical, alignment: check the rendered component (icons beside text, centered caps vs x-height).
- Do not stack nested cards; a list, a table or plain sections usually beats a card grid. Depth (shadow) only to explain state or elevation, with offset and soft blur; no zero-offset colored halos.

## 3. Typography

- 1 to 2 families, each with a job; no second family without a role only it can do. Own-world pages source and self-host a face whose character fits the brand (OFL licensed); a system display face as the brand voice reads as unfinished.
- Scale by role (display, heading, body, label, data), named for purpose (`--text-heading`), not value. Body 16 px minimum; display up to about 6rem; tracking not tighter than -0.04em; tighten large headlines slightly.
- Body measure 45 to 75 characters; line height inversely to measure (wider lines get more leading); light text on dark surfaces gets slightly more line height, tracking and one weight step.
- `text-wrap: balance` for headings and short centered blocks, `text-wrap: pretty` for body (progressive enhancement; do not blanket every element: it has a cost). Break headings by hand only between phrases and re-check every width.
- Fluid display type with `clamp()` for marketing pages; dense product surfaces keep fixed, predictable roles. Fallback fonts with metric-compatible overrides, `font-display: swap`, load only the weights used, subset.
- Numbers in tables: tabular figures, right-aligned. Paragraph rhythm by space or indent, not both.
- No monospace as a costume for "technical"; mono is for code, data and measurement.

## 4. Color

- One accent hue carries one role: the primary action, active state and the focal moment. A deliberate region owns the strongest color instead of tiny accents scattered everywhere.
- Tokens by role: canvas, elevated surface, text, muted text, border, action, focus, selection, success, warning, danger, info. Neutrals tinted toward the brand hue read as designed; on colored surfaces, tint secondary text from the surface or foreground hue, never a washed gray.
- Contrast: text 4.5:1, large text and UI parts 3:1, in every state (hover, focus, disabled). Meaning never by color alone (label or shape too). Charts: distinct lightness, shape or labels.
- Dark mode is composed, not inverted: surfaces step lighter with elevation, accents lose saturation, contrast re-checked.
- Browser surfaces carry the design too: text selection, caret, scrollbars, focus rings, underline offset, `accent-color`, numerals. Theming them from the palette is the cheapest signal that a page was built rather than assembled.

## 5. Motion

- **Motion thesis before code (Persuade and Experience):** one authored focal moment drawn from this product (the object that opens, the price that counts up), plus quiet feedback and continuity motion. A generic fade-and-rise on every section, hover lifts and parallax layers are not a thesis.
- Motion explains **state, relationship or hierarchy**, or is the one moment the surface earned. Operate and Read surfaces: fast feedback, no page-load choreography.
- Durations: 100-150 ms immediate feedback; 150-300 ms state change; 300-500 ms overlays and layout; 500-800 ms an authored entrance. Exit faster than entrance. Ease-out with deceleration (`cubic-bezier(0.16, 1, 0.3, 1)`); no bounce or elastic by reflex.
- Animate `transform` and `opacity` first (compositor, no layout); blur, clip-path, mask and shadow are fair material when bounded to a region and measured. Never animate `width`, `height`, `top`, `left`, margins; use FLIP or transforms. `will-change` only while animating. Frame budget 16.7 ms.
- Content visible by default so a failed script never hides the page. Hover moves a child, not the hovered target (the element slides out from under the pointer and flickers).
- Scroll-driven motion only when the scroll relationship carries meaning, with a static fallback. Loops stop when off-screen or hidden. No autoplay sound.
- **Reduced motion is a designed path:** fewer, gentler animations, not none. Remove spatial movement and parallax, keep opacity and color changes that confirm actions. `prefers-reduced-motion` is a sufficient technique (WCAG C39 for 2.3.3), and 2.2.2 covers anything that moves for more than 5 s: give a pause control or stop it.
- Verify by capturing frames (normal and reduced) before calling it smooth; Impeccable's `motion-capture` + its motion reviewer exist for this; Playwright screenshots at 3 scroll positions are the minimum.

### Ambient effects (smoke, steam, embers, grain...) only when the product's world has them
Ask: does this phenomenon exist where the product lives? If yes, an effect makes the object feel real; if no, it is decoration, and decoration is debt.

| Product world | Effect that fits | If it does not fit, use instead |
| --- | --- | --- |
| grill, BBQ, smokehouse, whisky, incense, vape-free tobacco shops | slow smoke behind the subject | one authored object moment |
| coffee, tea, ramen, bakery, spa, sauna | rising steam | warm color shift between sections |
| forge, welding, fireplace, wood-fired | drifting embers (few) | light-and-shadow change on scroll |
| studio, library, vintage, cinema | dust in a light shaft, film grain | grain only |
| water, drinks, pool, surf, cleaning | ripples, caustics, droplets | clip-path reveal |
| editorial, print, craft, ceramics | paper grain, ink bleed on reveal | typographic moment |
| fintech, health, law, B2B software, admin tools | none | a precise type reveal, a data counter, or nothing |

Rules: one ambient effect per page; subject in front, effect behind at low opacity (0.1 to 0.3) and slow (20 to 40 s drift); render as a few blurred translucent shapes, an SVG turbulence filter, a transparent sprite or a noise shader inside the existing 3D scene, never a stock particle pack; off-screen pause; static frame under reduced motion; under 50 KB or a few ms per frame on a mid phone, otherwise drop it. Physical phenomena rendered with gradients or blur are allowed here and are recorded as deliberate in `design.md`; gradients as decoration stay banned.

## 6. Imagery and icons

- Real subjects beat invented ones: a client's own product photos, improved, beat look-alikes. Cut-outs need a real alpha matte; a circle or polygon mask faking an organic edge reads worse than omitting the effect.
- Icons are drawn: one real library or authored SVG family, one stroke and weight, one size grid. Never emoji or Unicode glyphs as icons.
- Every image has dimensions (`width`/`height` or `aspect-ratio`), a purposeful alt (empty alt if decorative), and a license row in `assets.md`.

## 7. Performance

- **LCP image:** `fetchpriority="high"` on at most 1 to 2 critical images; never `loading="lazy"` on the LCP image; `<link rel="preload">` when its URL is known early; CSS `background-image` heroes are not discovered by the preload scanner, so prefer `<img>`.
- Formats: AVIF first, WebP next, JPEG fallback in `<picture>` (WebP is safe everywhere; AVIF is smaller but less universal); `srcset` and `sizes` so a 400 px slot never decodes a 4000 px file. Lazy-load everything below the fold. Reserve space for late content (CLS <= 0.1). Targets at p75 on mobile: LCP <= 2.5 s, INP <= 200 ms.
- Code-split heavy things (Three.js, large libraries) and load them after first paint or on visibility; ship no library for an effect the platform already does (CSS scroll timelines, view transitions, `@starting-style`).
- **Three.js** (rules of thumb, profile on a real phone): cap `devicePixelRatio` (1.5 on mobile, 2 on desktop); keep draw calls low (merge geometry, instance repeated parts; `renderer.info` shows the count); `antialias` off on mobile; few lights, small shadow maps; render on demand or only while visible; `dispose()` geometries, materials and textures when removing; compress GLB (Draco or meshopt).

## 8. Accessibility (WCAG 2.2 AA is the floor)

Semantic HTML before ARIA; one `h1`; landmarks; visible focus that sticky headers never hide; a skip link; labels on every field; errors beside the field and announced; dialogs trap and return focus; targets >= 24 px minimum (44 px goal); no drag-only actions. Canvas and 3D get an accessible name and the same information as text beside them.

## 9. Refuse list (defaults that make a page read as generated)

- Gradient fills or gradient text; glass and blur as decoration; neon glow, zero-offset colored shadows; hard offset block shadows outside a real neobrutalist world.
- A kicker or eyebrow above a heading (the heading carries its own weight); section numbers 01/02/03 unless the sequence is information; the hero-metric template (big number, small label, supporting stats).
- Same-size cards of icon + heading + text as the page structure; nested cards; sparklines, progress rings and soft rounded rectangles standing in for content.
- A bar down one side of a rounded box (one-sided border or inset shadow), in any color: use a full border, a tint, or a leading icon or label. This replaces the older "3 px left rule" advice.
- Full-width saturated message banners; emoji or Unicode glyphs as icons; modals for tasks that need no interruption.
- The same entrance animation on every section; identical hover lift on everything.
- Default indigo/violet/purple palettes; light or dark chosen by category habit.

## 10. Process (how a professional gets it right)

1. Brief and reference → committed visual world (PRODUCT.md / DESIGN.md or `.empresa/design.md`).
2. Build the real content in the world; tokens first, components second, pages third.
3. Check the render, batched: contrast, spacing, type at all breakpoints, states (hover, focus, disabled, loading, empty, error), real content lengths, browser-surface theming, copy that names actions and recoveries.
4. Polish the whole path, not the screenshot: flow, hierarchy, responsive, token drift, motion, cleanup of dead code and debug output. Triage by harm: broken or inaccessible first, missing states next, visual drift last.
5. A clean automatic scan is a floor, not proof: look at the rendered result at 375, 768 and 1280.

Sources: Impeccable v4.10 references (craft-floor, animate, typeset, colorize, layout, polish; Apache 2.0); web.dev and MDN animation-performance guides; Chrome "optimize image priority"; web.dev accessibility "animation and motion" and WCAG 2.2 understanding notes (SC 2.3.3, 2.2.2, technique C39); Refactoring UI (Wathan, Schoger) as summarized by secondary sources; Three.js community and Codrops performance guides (rules of thumb); Chrome modern-web-guidance on typography and responsive design.
