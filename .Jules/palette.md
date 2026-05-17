## 2025-05-15 - [Interactive Accessibility Patterns]
**Learning:** Custom interactive components like chips require explicit ARIA roles (`role="checkbox"`), state attributes (`aria-checked`), and group labeling (`aria-labelledby`) to be usable by screen readers. Keyboard activation via "Enter" and "Space" must be manually implemented for non-button elements.
**Action:** Always wrap custom selection controls in a `role="group"` container and provide `keydown` listeners for keyboard interaction.
