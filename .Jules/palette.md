## 2025-05-15 - [Interactive Chips Accessibility]
**Learning:** Custom interactive elements like chips often lack keyboard and screen reader support. Using `role="checkbox"` and `aria-checked` along with `keydown` listeners for Enter/Space provides a standard accessible pattern without heavy dependencies.
**Action:** Always wrap custom interactive groups in a `role="group"` with `aria-labelledby` and ensure individual items have proper ARIA roles and keyboard support.
