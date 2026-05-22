## 2025-05-14 - [Accessibility for Custom Interactive Chips]
**Learning:** Custom interactive elements like "chips" often lack semantic meaning and keyboard support when implemented as `<span>` or `<div>`. To ensure accessibility, they must have appropriate ARIA roles (e.g., `role="checkbox"`) and state attributes (e.g., `aria-checked`). They also require manual handling of `Enter` and `Space` keys to match standard checkbox behavior.
**Action:** When implementing custom selection components, always wrap them in a container with `role="group"` and `aria-labelledby`, and ensure individual items have `tabindex="0"`, appropriate ARIA roles, and keyboard event listeners.

## 2025-05-21 - [CI requirements for lockfiles and TS]
**Learning:** The CI deployment uses `npm ci` in `netlify/functions`, requiring a `package-lock.json`. Also, frontend type-checking in CI includes test files which may fail if types are missing.
**Action:** Use `npm install` instead of `npm ci` in CI if lockfiles are missing or inconsistent across platforms. Exclude test files from `frontend/tsconfig.json` to prevent type-check failures in CI if test types are not available.
