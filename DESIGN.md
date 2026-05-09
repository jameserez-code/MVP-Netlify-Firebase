---
title: Passport Agent MVP - Design System
description: Design tokens and design intent for the MVP-Netlify-Firebase project
version: 1.0
authors:
  - name: OpenCode
    role: Design Engineer
    contact: n/a
designTokens:
  colors:
    background:
      value: "#F7F7F7"
      type: "color"
    surface:
      value: "#FFFFFF"
      type: "color"
    text:
      value: "#1F2937"
      type: "color"
    textMuted:
      value: "#6B7280"
      type: "color"
    primary:
      value: "#1E88E5"
      type: "color"
    primaryOn:
      value: "#FFFFFF"
      type: "color"
    gateOverlay:
      value: "rgba(0,0,0,0.6)"
      type: "color"
  typography:
    fontFamily:
      value: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
      type: "fontFamily"
    fontSize:
      small:
        value: "12px"
        type: "fontSize"
      base:
        value: "16px"
        type: "fontSize"
      h1:
        value: "28px"
        type: "fontSize"
      h2:
        value: "22px"
        type: "fontSize"
      h3:
        value: "18px"
        type: "fontSize"
  spacing:
    scale:
      - value: "0px"
        type: "dimension"
      - value: "4px"
        type: "dimension"
      - value: "8px"
        type: "dimension"
      - value: "12px"
        type: "dimension"
      - value: "16px"
        type: "dimension"
      - value: "20px"
        type: "dimension"
      - value: "24px"
        type: "dimension"
      - value: "32px"
        type: "dimension"
      - value: "40px"
        type: "dimension"
      - value: "48px"
        type: "dimension"
      - value: "64px"
        type: "dimension"
  elevation:
    shadows:
      e1:
        value: "0 1px 2px rgba(0,0,0,.08)"
        type: "shadow"
      e2:
        value: "0 2px 6px rgba(0,0,0,.12)"
        type: "shadow"
      e3:
        value: "0 6px 18px rgba(0,0,0,.15)"
        type: "shadow"
  radii:
    small:
      value: "6px"
      type: "radius"
    medium:
      value: "8px"
      type: "radius"
    large:
      value: "12px"
      type: "radius"
  motion:
    duration:
      value: "180ms"
      type: "duration"
    easing:
      value: "cubic-bezier(.2,.8,.2,1)"
      type: "easing"
  breakpoints:
    mobile:
      value: 480
      type: "dimension"
    tablet:
      value: 768
      type: "dimension"
    desktop:
      value: 1024
      type: "dimension"
---

# Design Intent (free-form)

- The MVP presents a clean, accessible interface with a white surface and blue accents. Gate UX emphasizes privacy for the private demo surface.
- Typography emphasizes legibility with a restrained scale; spacing uses a clear rhythm for a calm, predictable UI.
- Elevation and shadows create depth for cards and modals without introducing visual noise.
- Motion is kept minimal to avoid motion fatigue while giving tactile feedback on interactions.
- Accessibility: high contrast text, keyboard navigability, and focus indicators are observed.

## Look & Feel (practical notes)
- Primary action color: #1E88E5; background is light; gate overlay is a semi-transparent black.
- Gate modal uses a white card with rounded corners to ensure readability on light surfaces.
- The endpoints list is presented plainly and remains accessible behind the gate.

## How to use this file
- This DESIGN.md is self-contained and describes tokens and intent for the MVP. Update tokens to reflect updated visuals.
- If you switch tech stacks, keep the same structure for tokens and narrative.
