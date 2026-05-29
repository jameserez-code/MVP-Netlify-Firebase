## 2026-05-29 - [Chip Accessibility]
**Learning:** Custom interactive components (like scope chips) are invisible to screen readers and keyboard users unless they have explicit ARIA roles (`role="checkbox"`), state attributes (`aria-checked`), and keyboard event handlers for activation (Enter/Space).
**Action:** Always implement `role`, `aria-checked`, and `keydown` listeners when building custom interactive elements from scratch.
