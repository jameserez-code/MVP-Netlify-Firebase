## 2025-05-15 - [Chip Component Accessibility]
**Learning:** Custom interactive components like chips require explicit ARIA roles and keyboard listeners (Enter and Space) to be accessible to all users. Screen readers need `role="checkbox"` and `aria-checked` to communicate state.
**Action:** Always include `role`, `aria-checked`, and `keydown` listeners when creating custom toggleable UI elements.

## 2025-05-15 - [PR Constraints and Dependencies]
**Learning:** UX agents must strictly adhere to line count limits (e.g., 50 lines) and avoid adding dependencies that trigger massive lockfile changes. Large diffs in lockfiles or test artifacts lead to PR rejection.
**Action:** Keep UX improvements extremely focused, verify changes locally without committing new dependencies, and ensure no build artifacts or lockfiles are included in the final PR.
