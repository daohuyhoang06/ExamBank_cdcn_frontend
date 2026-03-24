# ExamBank Design System - Academic Modern Light

## Product Intent
- Domain: Learning and exam preparation platform.
- Tone: Trustworthy, focused, modern-academic, approachable.
- UX target: Fast comprehension, clear hierarchy, low cognitive load.

## Style Direction
- Name: Academic Modern Light.
- Visual language: Light surfaces, deep blue anchors, restrained accents, soft depth.
- Motion: Subtle transitions (150ms-250ms), no decorative motion.

## Color Tokens
- Brand 700: `#0b3b78`
- Brand 600: `#0f4c93`
- Brand 500: `#1f63b4`
- Brand 100: `#dce9fb`
- Accent 500: `#1f8a5c`
- Accent 100: `#d7f4e8`
- Ink 900: `#101526`
- Ink 700: `#33415f`
- Ink 600: `#4f5a78`
- Ink 500: `#687593`
- Page background: `#f6f8fc`
- Panel background: `#ffffff`
- Soft background: `#eef4ff`
- Soft border: `#d7e1f2`

## Typography
- Display: Merriweather (for major hero messages only).
- Body: Be Vietnam Pro.
- Label/UI: IBM Plex Sans.
- Hierarchy:
  - H1/Hero: strong, 2.2rem-4.2rem responsive clamp.
  - H2 section title: 1.85rem-2.5rem.
  - Body: 1rem-1.05rem.
  - Labels/meta: 0.78rem-0.9rem with tracking.

## Radius & Shadow
- Field radius: 0.8rem.
- Panel radius: 1rem.
- Shadow soft: `0 12px 28px rgba(16, 21, 38, 0.08)`.
- Shadow brand CTA: `0 12px 24px rgba(15, 76, 147, 0.25)`.

## Layout Rules
- Desktop: split hero + form for auth pages.
- Tablet/mobile: stacked flow with hero first, form second.
- Container max widths:
  - Auth form: 470px-480px.
  - App content: 6xl-like width.

## Interaction & Accessibility Rules
- Minimum contrast target: WCAG AA.
- All interactive controls must expose visible keyboard focus.
- Buttons/links must have hover and focus states.
- Respect `prefers-reduced-motion`.
- Inputs use explicit labels and `autocomplete` where relevant.

## Component Rules
- Primary button: gradient brand fill, white text, strong focus ring.
- Secondary button: neutral panel fill + soft border.
- Inputs: high-legibility text, generous height (`>= 52px`), clear focus ring.
- Cards: subtle elevation + soft border.
- Modals: centered panel + translucent backdrop + keyboard-discernible close control.

## Anti-patterns
- Over-saturated neon colors.
- Decorative animations without purpose.
- Low-contrast placeholder-only forms.
- Inconsistent radii across form controls and buttons.
