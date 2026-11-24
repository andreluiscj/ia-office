# Images: making, prompting, optimizing, placing

## Pipeline: use the first path that works, record which one in `.empresa/assets.md`

### 1. GPT through Codex (preferred, free plan only)
Codex CLI has an image generation tool. Run once per asset from the project root, with a 280 s timeout; the file must be written inside the project folder:

```bash
codex exec --sandbox workspace-write --skip-git-repo-check "Generate ONE image with your image generation tool and save it as public/assets/<name>.png. <prompt from the template below>. Print only the saved path."
```

Try it **once per project, on the first raster you need** (or a test hero), even when you expect SVG to be better: the user wants GPT used when it works. Write the outcome in the first line of `.empresa/assets.md` (`GPT/Codex: works` or `GPT/Codex: unavailable (<reason>)`). Open the file and judge it with the checklist. At most 3 attempts per asset; change the prompt, not the luck. Do not retry a path that already failed in this project.

It failed ("no access to the built-in image tool", usage limit, not logged in, not installed): write `GPT: unavailable (<reason>)` in `.empresa/assets.md` and go to path 3. **Never** fall back to path 2 on your own.

### 1b. ChatGPT by hand (free, the user pastes; the method of the walkthrough, and the default when path 1 is unavailable and the site needs realistic images)
Write `.empresa/image-prompts.md`: one block per image with the **exact file name**, the prompt (template below, in English), the ratio, and whether it needs a transparent background (cut-out subjects: ask for "transparent background, PNG"). Ask the Lead to tell the user: "paste each prompt in ChatGPT, save each image with the file name given into `public/assets/` (or a folder you name), then tell me". Build the page with placeholders meanwhile (the 3D or SVG stand-in), and swap in the real files when they arrive: check size, weight and alt text, convert to WebP, never block the delivery on the images. Product photos of a real client beat invented ones: ask the user for them first and improve those.

### 2. GPT through the OpenAI API (costs money: needs the user's approval)
Only when `OPENAI_API_KEY` is set **and** the Lead relays the user's approval with a budget (for example "up to US$ 2"). Count images, stop at the budget, log the cost. No approval: skip. The Office rule is that nothing is spent beyond the user's plans.

### 3. Hand-made SVG (always available, free)
Write the SVG by hand with the flat or monoline rules from `craft.md`: `viewBox`, a few `path`/`rect`/`circle` elements, palette tokens as `fill` values, no filters, no gradients, no embedded raster, no text (use outlines or leave text to HTML). Raster outputs (favicons, social card, PNG fallbacks) come from the script:

```bash
node ~/.claude/skills/office-design/scripts/rasterize.cjs <in.svg|in.html> <out.png> <width> [height]
```

SVG art done well is the better choice for logos, icons, patterns and flat illustrations even when GPT works: it is sharp at any size, weighs little and uses the exact palette.

Claude cannot produce raster images itself; do not claim it did.

## Prompt template for GPT images

```
Subject: <one concrete scene from the product's world>
Style: <flat two-tone illustration | monoline 2 px drawing | soft photo-like, one color grade>
Palette: only <hex 1>, <hex 2>, <hex 3> and off-white <hex>; no gradients
Composition: <one focal point, camera angle, margin, aspect ratio>
Avoid: text or letters, gradients, glow, glossy 3D, stock isometric people, robots, extra fingers, watermarks
Use: <where it appears, size>
```

Generate logos, text and icons as SVG instead: image models draw letters badly.

## Judging a generated image
Reject for: any text or lettering, gradient or glow, wrong palette, melted hands or faces, two styles in one image, busy background behind UI text, trademarks or recognizable brands. Keep one image per purpose; discard the rest.

## Optimizing and placing
- Raster: resize to the largest displayed size x 2 (retina), save `.webp` (quality 80) or `.png` for flat art; set `width` and `height` in the markup; `loading="lazy"` below the fold; hero gets `fetchpriority="high"`.
- SVG: remove editor metadata, round numbers to 1 to 2 decimals, `role="img"` with `<title>` when informative, `aria-hidden="true"` when decorative. Inline only small icons; larger art as a file.
- Favicon: `favicon.svg` + `favicon-32.png` + `apple-touch-icon.png` (180 px); social card `og.png` 1200x630 with the `og:image` tag in the page head.
- Put files in `public/assets/`; the developer references them. Never hotlink.
- Every row of `.empresa/assets.md`: `path | used in | alt text or decorative | source (GPT/Codex, SVG) | license`.
