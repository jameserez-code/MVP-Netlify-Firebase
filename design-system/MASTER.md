+----------------------------------------------------------------------------------------+
|  TARGET: AI Agent Passport - RECOMMENDED DESIGN SYSTEM                                 |
+----------------------------------------------------------------------------------------+
|
|  PATTERN: Feature-Rich Showcase + Conversion-Optimized
|     Conversion: Developer-focused value prop with terminal/code credibility signals
|     CTA: Primary CTA at hero, secondary at features section, sticky nav CTA
|     Sections: 1) Hero (terminal aesthetic + live metrics), 2) Features grid (bento),
|               3) Security/Trust signals, 4) Interactive demo preview, 5) Pricing/CTA,
|               6) Footer with API status
|
|  STYLE: Dark Mode (OLED) + Glassmorphism + AI-Native UI
|     Keywords: Terminal, secure, precise, developer-native, zero-trust
|     Best For: Security tools, dev tools, AI infrastructure, enterprise SaaS
|     Performance: High (CSS-only effects) | Accessibility: WCAG AA (dark mode)
|
|  COLORS:
|     Primary:    #2ea043 (Terminal Green) — success, primary actions, active states
|     Secondary:  #58a6ff (Azure) — links, info states, secondary highlights
|     CTA:        #f78166 (Coral) — destructive, warnings, high-attention CTAs
|     Background: #0d1117 (GitHub Dark) — page background, deepest layer
|     Surface:    #161b22 (Elevated) — cards, panels, elevated surfaces
|     Surface 2:  #21262d (Higher Elevated) — hover states, active nav items
|     Border:     #30363d (Subtle Border) — card borders, dividers
|     Border 2:   #484f58 (Active Border) — focus rings, hover borders
|     Text:       #c9d1d9 (Primary Text) — body text, labels
|     Muted:      #8b949e (Secondary Text) — captions, placeholders, metadata
|     Dim:        #484f58 (Tertiary Text) — disabled, timestamps
|     Danger:     #f85149 (Red) — errors, revocation, deletion
|     Warning:    #d2991d (Amber) — pending, caution
|     Success:    #2ea043 (Green) — healthy, allowed, completed
|     Notes: Terminal green signals "secure/allowed" which maps perfectly to
|             agent permission enforcement. Dark OLED reduces eye strain for
|             developers who stare at dashboards. Azure provides cool contrast.
|
|  TYPOGRAPHY: Geist (display) + JetBrains Mono (mono/data)
|     Mood: Modern geometric sans + precise monospace for data/JSON/API elements
|     Best For: SaaS dashboards, security consoles, developer tools
|     Fallback / Import: Geist via next/font/google, JetBrains Mono via next/font/google
|     Scale:
|       10px — micro labels, badges, timestamps
|       12px — captions, table cells, monospace data
|       14px — body-sm, buttons, nav items
|       16px — body (base)
|       20px — lead, card titles
|       24px — h3, section subtitles
|       32px — h2, page titles
|       40px — h1, hero headline
|       48px — display (hero accent)
|     Line height: 1.5 body, 1.2 headings, 1.0 display
|     Letter spacing: -0.02em headings, 0.05em uppercase labels
|
|  KEY EFFECTS:
|     Terminal cursor blink — animated caret on code blocks and terminal headers
|     Glassmorphism panels — backdrop-blur(12px), rgba backgrounds, subtle borders
|     Subtle green glow — box-shadow: 0 0 12px rgba(46,160,67,0.1) on hover/active
|     Smooth micro-interactions — 150-200ms transitions on all interactive elements
|     Scanline overlay — optional 4px repeating gradient for terminal aesthetic
|     Shimmer bar — animated gradient line at top of dashboard
|     Count-up animation — numeric stats animate from 0 on load/refresh
|     Border pulse — active/selected states pulse border color subtly
|
|  AVOID (Anti-patterns):
|     Light mode default — this is a security tool, dark mode is the brand
|     Stock photos — use code snippets, diagrams, terminal screenshots
|     Cluttered heroes — single value prop + CTA, not 5 feature bullets
|     More than 3 font weights — max 400, 600, 700
|     Pure black (#000) — always use #0d1117 or #010409
|     Gradient backgrounds — keep it flat with glass panels for depth
|     Rounded corners > 12px — this is a tool, not a social app (max 8px)
|     Emoji icons — use Lucide React icons exclusively
|     Missing focus states — all interactive elements need visible focus rings
|     Center-aligned body text — left-align all paragraphs
|     Hamburger menu on desktop — sidebar nav for dashboard, top nav for marketing
|
|  PRE-DELIVERY CHECKLIST:
|     [x] No emojis as icons (use Lucide React)
|     [x] cursor-pointer on all clickable elements
|     [x] Hover states with smooth transitions (150-200ms)
|     [x] Dark mode contrast 7:1 minimum (terminal green on dark bg)
|     [x] Focus states visible for keyboard navigation (2px azure ring)
|     [x] prefers-reduced-motion respected for animations
|     [x] Responsive: 375px, 768px, 1024px, 1440px breakpoints
|     [x] No broken z-index / stacking context issues
|     [x] Consistent border-radius (4px, 6px, 8px) and spacing scale (4px base)
|
+----------------------------------------------------------------------------------------+
