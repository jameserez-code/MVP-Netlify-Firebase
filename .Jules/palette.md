# Palette's Journal - UX & Accessibility Learnings

## 2025-05-15 - Improving Form and Interactive Component Accessibility
**Learning:** Many interactive elements like chips and form inputs in this project lacked proper ARIA roles and label associations, making them difficult for screen reader users and keyboard-only users to navigate.
**Action:** Always ensure custom interactive elements have appropriate ARIA roles (e.g., `role="checkbox"`) and state (e.g., `aria-checked`). Use `for`/`id` on labels and inputs to improve click targets and accessibility.
