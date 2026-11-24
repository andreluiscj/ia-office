# Websites that look professional and animated

Read this for a landing page, marketing site or any site where the first impression sells. Method learned from a creator's walkthrough of building a client site with AI (reference first, design system second, imagery third, polish and motion last), extended with 3D and the Office rules.

## 1. Order of work (the site must not look generated)

1. **Reference.** The user gives 1 to 3 reference screenshots or links (Pinterest, Dribbble, a site they like), or Pedro picks 2 from the web and asks the Lead to confirm. A reference decides layout, rhythm, type and mood; copy structure and feeling, never the brand's assets or text.
2. **Design system from the reference** → `.empresa/design.md`. Extract the real patterns of the reference, do not invent generic ones. Sections: colors (hex + use), type (families, scale, weights, line height, tracking), CSS tokens (`:root` variables for color, space, radius, shadow, type), layout (grid, container, breakpoints, spacing), components (button, input, card, nav, badge, modal, with states), responsiveness (mobile first), accessibility (contrast, touch target, focus), image direction (style, treatment, ratios), implementation rules and what to avoid. Tables for tokens, code blocks for CSS.
3. **Image list.** Pedro writes one prompt per needed image (hero subject, section images, textures), each with: subject, style, palette, composition, ratio, file name. Real products need faithful subjects: when the client has real photos of their product, improve those instead of inventing look-alike images.
4. **Make the images** (`images.md` pipeline: GPT through Codex first, then SVG/3D). Cut-out subjects (a product in the hero) must be PNG or WebP with transparent background. File names descriptive (`hero-burger-cutout.webp`), kept in `public/assets/` so the developer finds them.
5. **Build** (Pedro and the developer in parallel, section 2).
6. **Polish pass.** Run `ai-look-check.cjs`, then check mobile, speed and consistency; remove anything that reads as generated (see `SKILL.md` section 4).
7. **Hand over** a build that runs locally, plus a static export folder when the user wants to host it.

## 2. Pedro and Igor work together (parallel, with file ownership)

Same message from the Lead starts both. Pedro first writes `.empresa/design.md` and the image list (short), then both work at once.

| Owner | Files |
| --- | --- |
| **Pedro** | `.empresa/design.md`, `.empresa/assets.md`, `public/assets/**`, the design layer: `src/design/tokens.css`, `src/design/motion.*`, `src/design/scenes/**` (3D and scroll animations), the hero and any section he is assigned in the brief |
| **Igor** | everything else: routing, pages, data, forms, state, accessibility fixes, tests, build, deploy folder |

Rules: one owner per file; shared contract = the CSS variables and the component props written in `design.md`; neither edits the other's files, they ask through the Lead; Pedro may build front-end sections (hero, animated sections), Igor wires them into the pages. Both read `design.md` before coding.

## 3. Motion

- **Scroll-driven hero animation** (an object that opens, rotates, assembles as the user scrolls): either a short generated video turned into an image sequence drawn on a `<canvas>` and scrubbed by scroll, or a 3D scene (section 4). Library: GSAP + ScrollTrigger (permissive license) or the native CSS `animation-timeline: scroll()` where enough.
- Subtle ambient effects only (soft smoke, grain, parallax of 2 layers); one hero effect per page, not five.
- Micro-interactions: 150 to 250 ms ease-out on hover and focus, 300 to 500 ms for section reveals; animate `transform` and `opacity` only.
- **Always**: respect `prefers-reduced-motion` (static first frame), keep content readable without animation, no animation blocking the first paint, hero image or poster loads first (LCP <= 2.5 s on mobile), pause off-screen canvases.
- Video/sequence frames: at most ~60 to 90 frames at the displayed size, WebP, lazy preloaded; total hero weight under 1.5 MB on mobile or fall back to a still image.

## 4. 3D objects

Pedro decides per project: 3D only when it explains or sells the product; otherwise skip it.

1. **From scratch (default, free, no license issues):** Three.js procedural geometry in `src/design/scenes/`: `LatheGeometry` for round objects (bottles, cups, burgers, vases), `ExtrudeGeometry` for logos and shapes, `TorusGeometry`, `RoundedBox`, simple materials (`MeshStandardMaterial`, a neutral environment light, soft shadow). Make it recognizable with a few well-chosen parts, not realism.
2. **Find a model:** only CC0 or clearly licensed glTF/GLB from Poly Haven, Quaternius, Kenney or glTF Sample Assets; record the URL, author and license in `.empresa/assets.md`; never a model whose license is unclear or a copy of a brand's product. Downloading needs the Lead's OK in the plan. Compress GLB (Draco/meshopt, under 1 MB).
3. **Scene rules:** one `<canvas>`, `devicePixelRatio` capped at 2, render on demand or while visible, dispose geometries on unmount, fallback still image when WebGL fails or on very small screens, an accessible label and the same information as text beside it.
4. Dependency `three` (and `gsap` if used) are approved when the plan says "animated/3D site"; any other library needs the Lead's OK.

## 5. Checks before handing over

```
- [ ] design.md matches the reference's real patterns; tokens used everywhere (no one-off hex)
- [ ] ai-look-check.cjs: 0 hits (or recorded exceptions)
- [ ] screen-check at 375, 768, 1280 px: no horizontal scroll, nothing cut, hero readable
- [ ] reduced-motion: page works and looks right without animation
- [ ] mobile weight: hero < 1.5 MB, total first load < 3 MB, LCP and CLS reasonable in a Lighthouse or Playwright trace
- [ ] every image/model has alt text or decorative flag and a license row in assets.md
- [ ] keyboard and contrast pass (WCAG 2.2 AA); animations never trap focus
```
