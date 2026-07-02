---
name: Aether Fitness System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#d9b9ff'
  on-secondary: '#401c6b'
  secondary-container: '#583584'
  on-secondary-container: '#cba4fb'
  tertiary: '#e7ffda'
  on-tertiary: '#033900'
  tertiary-container: '#51fb37'
  on-tertiary-container: '#0d7000'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#eedcff'
  secondary-fixed-dim: '#d9b9ff'
  on-secondary-fixed: '#2a0054'
  on-secondary-fixed-variant: '#583584'
  tertiary-fixed: '#78ff5d'
  tertiary-fixed-dim: '#36e51c'
  on-tertiary-fixed: '#012200'
  on-tertiary-fixed-variant: '#075300'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-hero:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.05em
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  container-padding: 24px
---

## Brand & Style

This design system is engineered for elite performance tracking, positioning the user at the center of a high-tech "body cockpit." The aesthetic is rooted in **Futuristic Minimalism** with a heavy influence from **Glassmorphism** and HUD (Heads-Up Display) interfaces. 

The experience should feel technical, precise, and immersive. By utilizing deep obsidian surfaces and electric cyan highlights, the UI recedes into the background, allowing vital progression data and interactive 3D avatars to emerge as the primary focus. It is a system designed for clarity under physical duress—sharp, high-contrast, and hyper-functional.

## Colors

The palette is strictly high-contrast to ensure maximum legibility in low-light gym environments, utilizing a sophisticated synthetic color range.

- **Primary (Electric Cyan):** Reserved for critical actions, active states, and data peaks. It should be used sparingly to maintain its impact.
- **Secondary (Soft Lavender):** Used for auxiliary data, recovery metrics, and secondary progression indicators, providing a cool-toned counterpoint to the primary cyan.
- **Tertiary (Neon Green):** Represents peak performance, success milestones, and high-vitality metrics. It provides a sharp, energetic accent for positive reinforcement.
- **Neutrals:** The background uses a pure Deep Charcoal (`#0A0A0A`), while elevated containers use Obsidian (`#121212`). 
- **The Glow:** Interactive elements should utilize a cyan or neon green outer glow (`0px 0px 12px neon-glow`) to simulate a light-emitting interface.

## Typography

The typography strategy pairs a technical Sans-Serif with a high-precision Monospace font.

- **Space Grotesk:** Used for all display headings and labels. Its geometric, slightly unconventional apertures reinforce the futuristic theme.
- **JetBrains Mono:** Used for all numerical data, exercise metrics, and body text. The monospaced nature ensures that fluctuating numbers (like weights or timers) do not cause layout shifts and maintain a "terminal" aesthetic.
- **Styling:** Headings should use tight letter spacing, while labels and data points should be slightly tracked out for a technical, mapped-out look.

## Layout & Spacing

This design system uses a **Fixed-Fluid Hybrid Grid**. On desktop, the central 3D avatar occupies a fixed central pillar, while data widgets dock to the left and right margins. On mobile, the layout reflows into a vertical stack with the avatar pinned to the upper third.

- **The HUD Model:** Components are treated as floating widgets.
- **Rhythm:** An 8px linear scale is used for all padding and margins. 
- **Density:** High information density is encouraged, provided that elements are separated by clear structural containers or glassmorphic boundaries.

## Elevation & Depth

Depth is conveyed through transparency and luminosity rather than traditional shadows.

- **Surface Layers:** The base is `#0A0A0A`. Elevated containers use `#121212` with a `backdrop-filter: blur(12px)` and a `1px` semi-transparent border (`glass-stroke`).
- **Glow Hierarchy:** The most important data point on a screen receives a subtle inner or outer glow.
- **Z-Axis:** 3D avatars inhabit the deepest layer of the UI, with HUD elements appearing to float on a "glass" pane closer to the user.

## Shapes

The shape language is "Soft-Tech." While the design is sharp and professional, a slight radius prevents the UI from feeling aggressive or dated.

- **Base Radius:** 4px for small components (chips, input fields).
- **Large Radius:** 12px for primary cards and status containers.
- **Gradients:** Use subtle linear gradients on borders (from `glass-stroke` to `transparent`) to simulate light hitting the edge of a glass panel.

## Components

- **Primary Button:** Solid `Electric Cyan` background, black text (`Space Grotesk Bold`). On hover, the button gains a cyan outer glow and the text slightly tracks out.
- **Success Action:** Components using `Neon Green` for completion states or achievement badges.
- **Status Cards:** Use a `1px` border. The top-left corner should include a small "Status Indicator" (a 4px square of color) to categorize the data (e.g., Lavender for recovery, Cyan for active session, Green for performance peaks).
- **Data Visualizations:** Line charts use a 2px stroke of `Electric Cyan` or `Neon Green` with a fading gradient fill below the line. Grid lines should be barely visible at 5% white opacity.
- **Interactive 3D Containers:** These should have no visible background until hovered, at which point a subtle `Obsidian` glass panel fades in behind the model.
- **Input Fields:** Bottom-border only, or a very subtle ghost-outline. Focus state triggers a full `Electric Cyan` border and a soft glow.
- **Progress Bars:** Dual-layered. A dark track with a glowing leading edge on the progress indicator.