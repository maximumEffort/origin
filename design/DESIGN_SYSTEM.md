# Origin — Design System Rules

> Generated from codebase analysis. Use this document to set up the Figma file.
> Last updated: March 2026

---

## 1. Brand Identity

**Company:** Origin  
**Tagline:** Environmental Protection Starts With Us  
**Positioning:** Premium Chinese car leasing in Dubai. Clean, modern, trustworthy — not cheap.

---

## 2. Colour Palette

### Primary — Brand Navy
| Token | Hex | Usage |
|---|---|---|
| `brand` | `#163478` | Primary buttons, links, active states, logo wordmark |
| `brand-dark` | `#0E2356` | Button hover states, pressed states |
| `brand-light` | `#E6EEF8` | Icon backgrounds, tinted surfaces |

### Accent — Gold
| Token | Hex | Usage |
|---|---|---|
| `gold` | `#C8920A` | Swoosh accent, price highlights, icons |
| `gold-bright` | `#F5C200` | Sun in logo, star ratings, premium badges |
| `gold-light` | `#FDF3DC` | Flexible terms card background |

### Neutral
| Token | Hex | Usage |
|---|---|---|
| `neutral-50` | `#FAFAFA` | Page backgrounds, section alternates |
| `neutral-100` | `#F5F5F5` | Card backgrounds, input fills |
| `neutral-400` | `#A3A3A3` | Secondary text, subtitles |
| `neutral-500` | `#737373` | Body text, descriptions |
| `neutral-900` | `#111111` | Headings, primary text |
| `white` | `#FFFFFF` | Cards, navbar, footer content |

### Semantic
| Token | Hex | Usage |
|---|---|---|
| `green-50` | `#F0FDF4` | Available badge background |
| `green-700` | `#15803D` | Available badge text |
| `purple-50` | `#FAF5FF` | Delivery card background |
| `purple-600` | `#9333EA` | Delivery card icon |

### Dark Surfaces
| Token | Hex | Usage |
|---|---|---|
| `neutral-800` | `#262626` | Hero gradient mid |
| `neutral-900` | `#111111` | Hero background, footer background |

---

## 3. Typography

### Font Families
| Language | Font | Stack |
|---|---|---|
| English / Chinese | **Inter** | `Inter, system-ui, sans-serif` |
| Arabic | **Noto Sans Arabic** | `Noto Sans Arabic, system-ui, sans-serif` |
| Chinese (decorative) | **Noto Sans SC** | Loaded conditionally on `zh` locale |
| Logo wordmark | **Georgia / Times New Roman** | Italic bold serif (SVG rendered) |

### Type Scale
| Role | Size | Weight | Colour | Notes |
|---|---|---|---|---|
| Display / Hero H1 | `text-4xl` → `text-6xl` | `font-bold` (700) | `text-white` | Responsive: 36px → 60px |
| Section Heading H2 | `text-2xl` → `text-3xl` | `font-bold` (700) | `text-neutral-900` | 24px → 30px |
| Card Title H3 | `text-base` / `text-sm` | `font-semibold` (600) | `text-neutral-900` | 16px or 14px |
| Body | `text-base` | `font-normal` (400) | `text-neutral-500` | 16px, `leading-relaxed` |
| Small / Caption | `text-sm` | `font-normal` (400) | `text-neutral-400` | 14px |
| XSmall / Labels | `text-xs` | `font-medium` (500) | varies | 12px, often uppercase + tracking |
| Nav links | `text-sm` | `font-normal` (400) | `text-neutral-600` | Hover: `text-brand` |
| Brand label (car card) | `text-xs` | `font-medium` (500) | `text-brand` | `uppercase tracking-wide` |

---

## 4. Spacing & Layout

### Page Container
```
max-width: 1280px (max-w-7xl)
padding: 16px (mobile) → 24px (sm) → 32px (lg)
```

### Section Spacing
| Context | Value |
|---|---|
| Section vertical padding | `py-16` (64px) |
| Section heading bottom margin | `mb-12` (48px) |
| Heading + subtitle gap | `mb-3` (12px) |
| CTA buttons below hero copy | `mb-12` (48px) |
| Hero top padding (under fixed nav) | `pt-24` (96px) |

### Component Spacing
| Component | Padding |
|---|---|
| Card (standard) | `p-6` (24px) |
| Card (compact / car card) | `p-4` (16px) |
| Button (standard) | `px-6 py-3` (24px / 12px) |
| Button (small) | `px-4 py-2` (16px / 8px) |
| Navbar height | `h-16` (64px) |
| Icon container | `w-12 h-12` (48px) |

### Grid System
| Breakpoint | Columns |
|---|---|
| Mobile (default) | 1 column |
| `sm` (640px+) | 2 columns |
| `lg` (1024px+) | 4 columns |

---

## 5. Border Radius
| Usage | Value | Class |
|---|---|---|
| Cards | 12px | `rounded-xl` |
| Buttons | 8px | `rounded-lg` |
| Badges / pills | 9999px | `rounded-full` |
| Icon containers | 12px | `rounded-xl` |
| Logo square | 4px | `rounded-sm` |
| Inputs | 8px | `rounded-lg` |

---

## 6. Elevation / Shadow
| Level | Class | Usage |
|---|---|---|
| Resting | `shadow-sm` | Cards default state |
| Hover | `shadow-md` | Card hover, dropdowns |
| None | — | Sections, hero backgrounds |

Transition: `transition-shadow duration-200` on interactive cards.

---

## 7. Components

### Navbar
- Fixed, `z-50`, `bg-white/95 backdrop-blur`
- Border bottom: `border-neutral-100`
- Height: `h-16` (64px)
- Logo: Origin SVG wordmark (navy + gold sun)
- Nav links: `text-sm text-neutral-600`, hover `text-brand`
- Primary CTA button (Sign In): `bg-brand`, `rounded-lg`, hidden on mobile
- Language switcher dropdown: end-aligned, `rounded-lg shadow-lg`

### Footer
- Background: `bg-neutral-900`
- Text: `text-neutral-400`
- Logo: white variant of Origin SVG
- Eco tagline: gold italic (`text-gold italic`)
- 4-column grid on desktop, 1-column on mobile
- Bottom bar: `border-neutral-800`, copyright left / RTA badge right

### Primary Button
```
bg-brand text-white font-semibold rounded-lg px-6 py-3
hover:bg-brand-dark transition-colors
```

### Secondary Button (Ghost)
```
bg-white/10 text-white font-semibold rounded-lg px-6 py-3
border border-white/20 hover:bg-white/20 transition-colors
```

### Outline Button
```
border border-neutral-200 text-neutral-700 rounded-lg px-4 py-2
hover:bg-neutral-50 transition-colors
```

### Car Card
- Background: `bg-neutral-50`, `rounded-xl`, `border border-neutral-100`
- Hover: `shadow-md border-brand/20`
- Image: `aspect-[4/3]`, `object-cover`, scale on hover
- Brand label: `text-xs font-medium text-brand uppercase tracking-wide`
- Availability badge: green (available) or neutral (leased), `rounded-full`
- Price: bold `text-neutral-900`, small prefix/suffix in `text-neutral-400`

### Trust Card
- Background: `bg-white`, `rounded-xl p-6 shadow-sm border border-neutral-100`
- Icon container: `w-12 h-12 rounded-xl` — tinted background per card type
- Title: `font-semibold text-neutral-900 text-sm`
- Description: `text-sm text-neutral-500 leading-relaxed`

### Badge / Pill
- Hero badge: `bg-brand/20 text-brand border border-brand/30 rounded-full px-3 py-1 text-xs font-medium`
- Status (available): `bg-green-50 text-green-700 rounded-full px-2 py-0.5 text-xs`
- Status (leased): `bg-neutral-100 text-neutral-500 rounded-full px-2 py-0.5 text-xs`

### Input / Form Field
```
border border-neutral-300 rounded-lg px-4 py-2.5 text-sm
focus:ring-2 focus:ring-brand/30 focus:border-brand
placeholder:text-neutral-400
```

### WhatsApp FAB
- Fixed bottom-right, `z-50`
- `bg-[#25D366]` (WhatsApp green)
- `rounded-full w-14 h-14 shadow-lg`
- Tooltip on hover

---

## 8. Iconography

**Library:** `lucide-react` v0.383.0  
**Default size:** `size={16}` inline, `size={20}` nav, `size={22}` feature cards  
**RTL flip:** Arrow icons get `.rtl-flip` (`transform: scaleX(-1)`) in Arabic locale

Key icons in use:
- `Car` — RTA / fleet
- `ShieldCheck` — insurance
- `Clock` — flexible terms
- `Truck` — delivery
- `CheckCircle` — trust badges in hero
- `ArrowRight` — CTAs (flipped in RTL)
- `Menu / X` — mobile nav
- `ChevronDown` — dropdowns
- `MessageCircle` — WhatsApp

---

## 9. Motion & Interaction

| Interaction | Transition |
|---|---|
| Buttons | `transition-colors` (150ms default) |
| Cards | `transition-all duration-200` |
| Card image zoom | `group-hover:scale-105 transition-transform duration-300` |
| Shadow | `transition-shadow duration-200` |
| Page scroll | `scroll-behavior: smooth` |

---

## 10. RTL / Arabic Rules

- Plugin: `tailwindcss-rtl` — use `ps-`, `pe-`, `start-`, `end-` utilities for RTL-aware spacing
- Font: Noto Sans Arabic, loaded only on `ar` locale
- `dir="rtl"` set on `<html>` via `next-intl`
- Arrow icons: add `rtl-flip` class (`transform: scaleX(-1)` via `.rtl-flip` utility)
- Language switcher dropdown: `end-0` (not `right-0`) so it works in both directions
- Text alignment: do NOT hardcode `text-left` — let RTL handle it

---

## 11. Pages & Routes

| Route | Description |
|---|---|
| `/[locale]` | Homepage — Hero, Fleet preview, Trust section |
| `/[locale]/cars` | Full car catalogue with filters |
| `/[locale]/cars/[id]` | Car detail page |
| `/[locale]/calculator` | Lease calculator |
| `/[locale]/booking` | 4-step booking flow |
| `/[locale]/about` | About Origin |
| `/[locale]/contact` | Contact + WhatsApp |
| `/[locale]/privacy` | Privacy policy (stub) |
| `/[locale]/terms` | Terms & conditions (stub) |
| `/[locale]/rta` | RTA compliance (stub) |

---

## 12. What to Build in Figma

Priority order for designer:

1. **Design tokens** — set up colour styles and text styles matching section 2 & 3 above exactly
2. **Component library:**
   - Origin logo (navy + white variants)
   - Primary / Secondary / Outline buttons
   - Car card
   - Trust card
   - Badge / pill variants
   - Input field
   - Navbar (desktop + mobile)
   - Footer
   - WhatsApp FAB
3. **Page frames (mobile-first, then desktop):**
   - Homepage
   - Car catalogue
   - Car detail
   - Booking flow (4 steps)
   - Contact page
4. **RTL variant** — duplicate key screens and test Arabic layout

---

## 13. Handoff Notes

- All measurements are in Tailwind units (1 unit = 4px). `p-6` = 24px, `py-16` = 64px, etc.
- Use `8px` grid for spacing alignment
- Minimum touch target: `44×44px` (mobile)
- Images use `aspect-[4/3]` ratio for car photos
- Do not design with placeholder grey boxes — use real car images from Zigwheels CDN or supply actual Origin fleet photography
- Once Figma file exists: open Figma Desktop → Preferences → Enable Dev Mode MCP Server → I can then read designs directly and generate component code
