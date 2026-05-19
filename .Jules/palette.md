# Palette Journal - Critical UX/Accessibility Learnings

## 2025-05-14 - [Custom Chips Accessibility]
**Learning:** In a vanilla JS/Tailwind app, custom interactive elements like "chips" often lack semantic meaning and keyboard support. Using `role="checkbox"` and `aria-checked` on the chips, combined with a `role="group"` container labeled by an `id`, provides the necessary context for screen readers.
**Action:** Always implement `keydown` listeners for "Enter" and "Space" when creating custom interactive elements that aren't natively focusable buttons or inputs.
