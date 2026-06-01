## 2026-06-01 - Dashboard Keyboard Navigation
**Learning:** Avoid hijacking standard browser shortcuts like `Cmd/Ctrl + [1-9]` for application-specific navigation in web dashboards, as these are reserved for tab switching in most browsers. Using `Alt` as a modifier provides a safer alternative for power-user shortcuts.
**Action:** Always check native browser shortcut overlaps before implementing global key listeners.

**Learning:** Interactive elements using `role="option"` must have a dynamic `aria-selected` attribute to be accessible to screen readers and pass `jsx-a11y` linting rules.
**Action:** Ensure `aria-selected` reflects the actual state of the component.
