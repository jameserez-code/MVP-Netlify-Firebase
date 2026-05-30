## 2025-05-30 - [Accessible Custom Chips]
**Learning:** Custom interactive elements (like the scope chips) often lack standard keyboard interaction and ARIA states, making them invisible or unusable for screen reader and keyboard-only users.
**Action:** Always ensure custom selection components use appropriate ARIA roles (e.g., 'checkbox' or 'option') and implement listeners for 'Space' and 'Enter' keys to match native browser behavior.
