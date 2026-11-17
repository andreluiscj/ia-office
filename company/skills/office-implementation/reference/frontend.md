# Front-end standards

Existing project: its design system, component library and patterns win. These fill the gaps.

## Every screen, every state

Design and implement all of them, never just the happy path:

| State | Requirement |
| --- | --- |
| Loading | skeleton or spinner within 100 ms of the action; layout does not jump when data arrives |
| Empty | says what this place is for and offers the first action |
| Error | plain-language message, what the user can do, a retry; never a blank screen or a raw error |
| Success | visible confirmation of what happened |
| Disabled / pending | buttons disabled while submitting; no double submit |

## Structure

- One obvious primary action per screen. Clear, specific copy on buttons ("Save invoice", not "Submit").
- Components small and single-purpose; data fetching and state at the edge, presentation inside.
- Server state through the project's data layer (or the framework's server components / a query library); local UI state stays local. No global store for what one component needs.
- Design tokens for color, type, spacing and radius; no one-off hex values or pixel spacing. At most two font families.

## Forms

- A visible `<label>` for every field; errors next to the field, announced to screen readers, with how to fix them.
- Validate on blur and on submit with the same schema the server uses; the server validates again.
- Keep what the user typed after an error. Correct `type`, `inputmode` and `autocomplete` attributes.

## Responsive

Check in a real browser at 375, 768 and 1280 px: no horizontal scroll, body text at least 16 px, touch targets at least 44 by 44 px (WCAG 2.2 requires a 24 px minimum), content readable without zoom. If mobile is out of scope, say so in the report.

## Accessibility (WCAG 2.2 AA)

```
- [ ] semantic HTML: button for actions, a for navigation, headings in order, landmarks
- [ ] everything works with keyboard alone; focus order follows the visual order
- [ ] focus is always visible and never hidden behind sticky elements
- [ ] text contrast >= 4.5:1 (large text and UI components >= 3:1)
- [ ] images have alt text (empty alt for decorative ones)
- [ ] dynamic messages use aria-live; dialogs trap focus and return it on close
- [ ] nothing conveyed by color alone
- [ ] animation respects prefers-reduced-motion
- [ ] no action requires dragging without a click alternative
```

Use native elements before ARIA. Wrong ARIA is worse than none.

## Performance budget

Targets at the 75th percentile on mobile: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1.
- Images: correct size, modern format, `width`/`height` set, lazy below the fold, the hero image prioritized.
- Reserve space for anything that loads late (images, embeds, banners).
- Split code by route; do not ship a heavy library for a small need.
- Keep main-thread work short in event handlers; defer what is not needed for the response.

## Safety in the client

- Text from users or APIs is rendered as text. No `innerHTML`, `dangerouslySetInnerHTML`, `v-html`.
- Links built from data allow only `http`/`https`; external links get `rel="noopener noreferrer"`.
- No secrets, service keys or private endpoints in client code. Anything in the bundle is public.
- Hiding a button is not authorization: the server enforces it.

## Proof

Open the screen, walk the happy path and one error path, confirm a clean console, note the sizes tested. Component tests cover the states and the interaction, querying by role and label.
