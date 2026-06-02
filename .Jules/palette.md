## 2026-06-02 - [Accessibility: Custom Chips Keyboard Support]
**Learning:** Custom interactive elements (like chips or toggles) built with `<span>` or `div` tags are completely invisible to screen readers and keyboard users unless explicitly given a `tabIndex`, ARIA roles (`role="checkbox"`), and keyboard event listeners. Simply adding a click handler is insufficient for a truly inclusive UX.
**Action:** Always ensure custom interactive elements have a `tabIndex="0"`, appropriate ARIA roles/states, and listeners for 'Enter' and 'Space' keys.
