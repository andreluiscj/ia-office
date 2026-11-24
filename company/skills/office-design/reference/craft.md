# Craft: identity, type, color, layout, illustration

Read this when defining or extending a direction. Rules a professional graphic designer applies; each is checkable.

## Identity and logo
- Start from one idea tied to the product's job (a ticket, a notch, a pin), not a generic shape. Draw it with 1 to 3 shapes; it must work at 16 px and in one color.
- Mark + wordmark lockup, with clear space equal to the mark's height/2. Test on light, dark and a photo; keep a one-color version.
- Never use a font as the logo without adjusting the letterforms (kerning at least); never a gradient or a shadow in the mark.

## Typography
- Two families at most: one for headings, one for text; or one family in two weights. Open-licensed only (SIL OFL): Inter, Source Sans 3, IBM Plex Sans/Serif, Fraunces, DM Sans/Serif, Work Sans, Space Grotesk (use sparingly), Newsreader.
- Scale by a ratio (1.2 for dense apps, 1.25 to 1.333 for marketing): 12/14/16/20/24/32/40. Body 16 px minimum on screens, line height 1.5 for text and 1.2 for headings, line length 45 to 75 characters.
- Hierarchy through size and weight first, color second. At most three weights. Numbers in tables: tabular figures, right aligned.
- Self-host the font files (`font-display: swap`, subset to the characters needed); no third-party font CDN calls without the Lead's OK.

## Color
- Build from one accent hue. Tokens: bg, surface, border, text, muted, primary, primary-contrast, danger, success, warning. Neutrals lean slightly toward the accent hue (a tinted gray looks designed, pure gray looks default).
- Contrast: text 4.5:1, large text and UI 3:1, checked for every pair in the direction. Status is never color alone (icon or word too).
- 60-30-10: 60% neutral surfaces, 30% secondary neutrals, 10% accent. The accent marks the primary action and the active state, not decoration.
- Dark mode: lighten surfaces by elevation instead of using shadows; reduce accent saturation; recheck contrast.
- Avoid by default: purple/indigo-to-blue, neon on near-black, pastel rainbow category colors.

## Layout and spacing
- One spacing scale (4/8/12/16/24/32/48/64). Space inside a group is smaller than space between groups (proximity does the grouping, not boxes).
- 12-column grid desktop, 4 columns phone, one max content width (about 1120 px, text 65ch). Align to a baseline and to each other: ragged alignment is the first thing people feel as "cheap".
- One radius value across the product (0, 4 or 8 px; not 24). Borders 1 px, hairline color; shadows rare and soft (one level).
- Whitespace is content. Remove a box before adding a color. A list or a table beats six cards.
- Message and status UI: text with a small marker (dot, icon, left rule) on a neutral surface; no full-width saturated banners.

## Imagery and illustration
- Pick one style per product and write it down: flat two-tone shapes, monoline (2 px) drawings, or photo-like with one color grade. Mixing styles is the loudest sign of generated imagery.
- Subject: the product's own world (a desk, a ticket, a queue, a form being filled), seen from a consistent angle and scale. Faces and hands only when essential; otherwise objects, hands-free scenes, abstract compositions.
- Composition: one focal point, generous margin, shapes touching the edge on purpose. 2 to 3 colors from the palette tokens + neutrals. No gradients, no glow, no text inside the image.
- Empty states: a small drawing + one honest sentence + the first action. Not a mascot.
- Icons: one set (Lucide or Phosphor, both permissive), one stroke width (1.5 or 2 px), 16/20/24 px grid, labelled when the meaning is not obvious.

## Photo-like and generated images
- Crop and grade to the palette (one tint, same contrast curve). Faces: only with real consent; generated faces are not shipped as "customers" or "team".
- Always provide alt text that says what matters for the task, or empty alt when decorative.
