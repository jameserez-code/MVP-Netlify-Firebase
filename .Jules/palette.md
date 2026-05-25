## 2025-05-14 - Interactive Chips Accessibility
**Learning:** Custom interactive components like chips often lack keyboard support and ARIA states when implemented with simple spans/divs. This makes them invisible to screen readers and unusable for keyboard-only users.
**Action:** Always include `role="checkbox"` (or `role="button"`), `aria-checked` (or `aria-pressed`), and keyboard listeners for `Enter` and `Space` when creating custom interactive elements. Ensure they have a `tabindex="0"` to be focusable.
