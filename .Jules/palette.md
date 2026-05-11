## 2025-05-21 - [Accessibility for Custom Terminal UI Components]
**Learning:** Custom UI elements like "chips" or "tags" often lack keyboard navigation and screen reader support by default. In a terminal-style UI, users expect keyboard efficiency.
**Action:** Always ensure interactive custom elements have `role="checkbox"` (or appropriate role), `aria-checked`, and listeners for "Enter" and "Space" keys to maintain a high accessibility standard while keeping the aesthetic.
