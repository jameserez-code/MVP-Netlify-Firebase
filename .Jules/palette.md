## 2025-05-15 - [Accessibility & Keyboard Navigation Patterns]
**Learning:** In a "terminal-style" UI, labels are often missing because placeholders are visually preferred. However, explicit labels (even if visually hidden via `.sr-only`) are crucial for screen readers. Furthermore, custom interactive elements like "chips" need explicit ARIA roles and keyboard listeners to be accessible.
**Action:** Always verify label-to-input association using `for` and `id`. Add `role="checkbox"` and `aria-checked` to custom toggles, and handle `Enter`/`Space` keys.
