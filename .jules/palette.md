## 2026-05-26 - Accessible Custom Interactive Components
**Learning:** Dynamic components like chips or custom checkboxes need explicit ARIA roles (`role="checkbox"`), state management (`aria-checked`), and keyboard activation listeners (Enter/Space) to be accessible to screen readers and keyboard-only users. Using `role="group"` with `aria-labelledby` provides necessary context for these related options.
**Action:** Always implement `role`, `aria-checked`, and keyboard listeners when creating custom interactive elements.
