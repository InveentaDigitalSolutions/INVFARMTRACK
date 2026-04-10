# Broton Verde — Corporate Identity & Design System

**Brand:** Broton Verde — The Green Heritage Company
**Product:** FarmTrack — Digital Farm Tracking
**Version:** 1.0
**Date:** 2026-04-10

---

## Brand Identity

- **Company:** Broton Verde (subsidiary of AGRIGENTUM S.A.)
- **Tagline:** The Green Heritage Company
- **Logo:** Dark variant preferred (navy background, white "Broton", lime "Verde", leaf icon)
- **Industry:** Ornamental plant nursery, export of unrooted cuttings

---

## Color Palette

### Primary — Navy

The foundation for text, sidebar, and structural elements.

| Token | Hex | Usage |
|---|---|---|
| `navy-950` | `#0e1520` | Deepest backgrounds |
| `navy-900` | `#151f2d` | Primary text, headings |
| `navy-800` | `#1b2838` | Sidebar background, page icons |
| `navy-700` | `#1f2f42` | Sidebar hover, secondary buttons, toggle active |
| `navy-600` | `#2c3e55` | Sidebar active background |
| `navy-500` | `#3a506b` | Secondary text, subtitles |
| `navy-400` | `#566d8a` | Muted text, labels, timestamps |
| `navy-300` | `#7e92ab` | Placeholder text, disabled states |
| `navy-200` | `#b0becf` | Borders on dark surfaces |
| `navy-100` | `#d8dfe8` | Light backgrounds on navy elements |
| `navy-50`  | `#f0f3f7` | Subtle tinted backgrounds |

### Accent — Lime

The signature Broton Verde highlight. Used sparingly for impact.

| Token | Hex | Usage |
|---|---|---|
| `lime-400` | `#c4d93e` | **Primary accent** — CTA buttons, active indicators, nav dots |
| `lime-300` | `#c8e35a` | Hover state for accent elements |
| `lime-200` | `#ddef8e` | Light accent backgrounds |
| `lime-100` | `#eef7c4` | Badge backgrounds, count pills |
| `lime-50`  | `#f8fce8` | Subtle accent tint for hover states |
| `lime-500` | `#a3b835` | Accent text on light backgrounds |
| `lime-600` | `#7f9228` | Accent text, links |
| `lime-700` | `#5f6e20` | Badge text on lime backgrounds |

### Surface — Sand

Warm neutral backgrounds that avoid cold white.

| Token | Hex | Usage |
|---|---|---|
| `sand-50`  | `#fafaf8` | Page background (`body`) |
| `sand-100` | `#f4f3f0` | Tab bar background, alternate rows |
| `sand-200` | `#eae8e3` | Borders, dividers, input borders |
| `sand-300` | `#d6d3cc` | Scrollbar thumb, heavy borders |

### Semantic — Status Colors

Used for badges, alerts, and status indicators. Not part of brand identity.

| Color | 50 (bg) | 500 (icon) | 600 (text) | Usage |
|---|---|---|---|---|
| Green | `#f0f7f1` | `#3d8b40` | `#2d6e30` | Success, active, completed, good quality |
| Blue | `#eff6ff` | `#3b82f6` | `#2563eb` | Info, irrigation, in-progress |
| Amber | `#fffbeb` | `#f59e0b` | `#d97706` | Warning, pending, treatments |
| Red | `#fef2f2` | `#ef4444` | `#dc2626` | Error, overdue, urgent, poor quality |

---

## Typography

### Font

**Inter** — with OpenType features `cv02`, `cv03`, `cv04`, `cv11` for refined character shapes.

```
font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
font-feature-settings: "cv02", "cv03", "cv04", "cv11";
```

### Scale

| Element | Size | Weight | Tracking | Case |
|---|---|---|---|---|
| Page title | `18-20px` | Bold (700) | Tight | Sentence |
| Section heading | `13px` | Semibold (600) | Normal | Sentence |
| Body text | `13px` | Regular (400) | Normal | Sentence |
| Table header | `10px` | Semibold (600) | `0.08em` | UPPERCASE |
| Label | `11px` | Medium (500) | `0.1em` | UPPERCASE |
| Badge | `11px` | Semibold (600) | Wide | UPPERCASE |
| Caption / timestamp | `11px` | Medium (500) | Normal | Sentence |
| Sidebar nav | `13px` | Medium (500) | Normal | Sentence |
| Sidebar brand | `13px` / `9px` | Bold / Regular | Wide / `0.15em` | Sentence / UPPERCASE |

---

## Component Styles

### Cards

```
Background:    white
Border:        sand-200/80 (1px solid)
Border radius: 12px (rounded-xl)
Shadow:        none (hover: shadow-sm)
Padding:       16-20px
```

### Stat Cards

```
Icon container: 40x40px, rounded-xl, semantic color bg (green-50, blue-50, etc.)
                ring-1 with matching ring color
Label:          11px uppercase, navy-400, tracking-wider
Value:          20px bold, navy-900, tracking-tight
Trend:          11px semibold, green-500 (positive) / red-500 (negative)
```

### Badges

```
Padding:        2px 8px
Border radius:  6px (rounded-md)
Font:           11px semibold, tracking-wide
Border:         ring-1 with color-200/60
Variants:       green, blue, amber, red, gray, lime, navy
```

### Data Tables

```
Container:      white, rounded-xl, border sand-200/80, shadow-sm
Header row:     sand-50/50 background, 10px uppercase labels
Row hover:      lime-50/30
Row padding:    12px horizontal, 12px vertical
Toolbar:        search + filter + CTA (lime-400 bg, navy-900 text)
```

### Tab Bar

```
Container:      sand-100, rounded-lg, p-0.5
Inactive tab:   navy-400 text, hover navy-600
Active tab:     white bg, rounded-[7px], shadow-sm, ring-1 sand-200/50
                navy-900 text
Transition:     framer-motion layoutId animation (200ms)
```

### Buttons

| Type | Background | Text | Border | Hover |
|---|---|---|---|---|
| Primary CTA | `lime-400` | `navy-900` | none | `lime-300` |
| Secondary | `white` | `navy-700` | `sand-200` | `border-lime-300` |
| Toggle active | `navy-700` | `white` | `navy-700` | — |
| Toggle inactive | `white` | `navy-700` | `sand-200` | `border-lime-300` |
| Destructive | `red-50` | `red-600` | `red-200` | `red-100` |
| Ghost | transparent | `navy-500` | none | `text-navy-700` |

### Input Fields

```
Background:     white
Border:         sand-200 (1px solid)
Border radius:  8px (rounded-lg)
Padding:        10px 12px
Font:           13px, navy-900
Placeholder:    navy-300
Focus ring:     lime-400/40 (2px), border lime-400
```

---

## Sidebar

```
Background:     navy-800
Width:          220px expanded / 68px collapsed
Logo area:      leaf icon in lime-400/15 bg, brand text white + lime-400
Nav items:      navy-400 text, navy-500 icons
Active item:    lime-400/10 bg, lime-400 text + icon, lime-400 dot indicator
Hover:          navy-700/50 bg, white text
Dividers:       navy-700/40
Collapse btn:   navy-500, hover navy-300
```

---

## Page Layout

```
Page shell:     min-h-screen, p-24px (mobile) / p-32px (desktop)
Page icon:      40x40px navy-800 bg, ring-1 navy-700/50, lime-400 icon
Title:          18px bold navy-900
Subtitle:       13px navy-400
Content gap:    24-28px between sections
```

### Home Page — Split Layout

```
Left (2/5):     Stats grid (2x2) + module quick-access list
Right (3/5):    Nursery map (full height, min 320px)
Below:          Recent activity feed
```

---

## Iconography

**Library:** Lucide React
**Sizes:**
- Navigation: 18px
- Page headers: 18px
- Stat cards: 18px
- Inline / badges: 14px
- Activity feed: 14px

**Colors:** Follow the semantic or navy scale depending on context.

---

## Motion

**Library:** Framer Motion

| Animation | Duration | Easing |
|---|---|---|
| Page transition | 250ms | ease-out |
| Tab switch | 200ms | layoutId spring |
| Card hover | 150ms | ease-out, y: -2px |
| Sidebar expand | 200ms | easeInOut |
| Stagger children | 50ms delay | — |
| Progress bars | 500ms | spring |

---

## Accessibility

- All interactive elements have `cursor-pointer`
- Focus visible via `focus:ring-2 focus:ring-lime-400/50 focus:ring-offset-1`
- Text contrast meets WCAG AA on all combinations
- Semantic HTML structure (headings, tables, buttons vs. divs)

---

## File Structure (CSS)

All design tokens are defined in `src/index.css` using Tailwind CSS v4 `@theme` directive.
No external design token files — single source of truth.
