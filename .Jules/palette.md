## 2026-05-15 - [Gate and Chip Accessibility Improvements]
**Learning:** In terminal-style or high-security dashboard UIs, interactive elements like "chips" often forget standard keyboard accessibility (Enter/Space), and high-friction entry points like password gates benefit significantly from autofocus.
**Action:** Always check for `tabindex="0"` and keyboard listeners on custom interactive spans/divs. Ensure every input has a linked `<label>`, using `.sr-only` if visual design excludes labels.
