## 2026-05-12 - [Accessible Terminal Aesthetics]
**Learning:** In terminal-themed UIs, form inputs often omit labels to maintain a "command line" look. This is a critical accessibility barrier.
**Action:** Use an `.sr-only` class for labels on terminal inputs. This preserves the visual style while ensuring screen readers can announce the field's purpose.

## 2026-05-12 - [Keyboard-Friendly Selection Chips]
**Learning:** Custom "chip" elements used for selection (like scope toggles) are often implemented as static `<span>` or `<div>` elements, making them invisible to keyboard users.
**Action:** Always add `tabindex="0"`, `role="checkbox"`, and `aria-checked` to chip elements. Implement a `keydown` listener for 'Enter' and 'Space' to mirror the click behavior.
