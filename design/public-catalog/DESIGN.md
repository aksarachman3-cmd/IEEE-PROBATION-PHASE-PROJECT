---
name: Event Ops Console
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadad9'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f3'
  surface-container: '#eeeeed'
  surface-container-high: '#e8e8e7'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#554434'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f0'
  outline: '#887361'
  outline-variant: '#dbc2ad'
  surface-tint: '#8a5100'
  primary: '#8a5100'
  on-primary: '#ffffff'
  primary-container: '#ff9900'
  on-primary-container: '#653a00'
  inverse-primary: '#ffb86f'
  secondary: '#535f70'
  on-secondary: '#ffffff'
  secondary-container: '#d4e1f5'
  on-secondary-container: '#576474'
  tertiary: '#595f68'
  on-tertiary: '#ffffff'
  tertiary-container: '#acb2bd'
  on-tertiary-container: '#3f454e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcbd'
  primary-fixed-dim: '#ffb86f'
  on-primary-fixed: '#2c1600'
  on-primary-fixed-variant: '#693c00'
  secondary-fixed: '#d7e3f7'
  secondary-fixed-dim: '#bbc7db'
  on-secondary-fixed: '#101c2b'
  on-secondary-fixed-variant: '#3c4858'
  tertiary-fixed: '#dde3ee'
  tertiary-fixed-dim: '#c1c7d2'
  on-tertiary-fixed: '#161c24'
  on-tertiary-fixed-variant: '#414750'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: '0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system channels an enterprise-grade, utilitarian commerce aesthetic engineered for high transactional confidence and information density. It serves dual roles: public-facing high-conversion event discovery/ticketing and high-throughput administrative console operations (ticketing inventory, session scheduling, credential verification, and analytics).

The visual language is grounded in pragmatic clarity:
- **Tone:** Methodical, industrious, reliable, and functional.
- **Aesthetic Movement:** Modern Utilitarian / Functional Commerce. Form follows strict structural logic. Visual flourishes are traded for compact information density, high-contrast feedback states, and zero-latency readability.
- **Experience Goals:** Eliminate friction across high-volume workflows, convey rigorous platform stability during ticket drops, and provide clear operational feedback for backend conference managers.

## Colors

The palette employs a high-contrast division between operational framing and primary actions:

- **Primary Accent (`#FF9900`):** Reserved strictly for primary transactional drivers (e.g., "Register Now", "Issue Tickets", "Publish Schedule"). Interactive hover state shifts to `#E88B00`; active/pressed shifts to `#D67F00`.
- **Secondary Surface (`#232F3E`):** Used for global utility banners, navigation sub-headers, and operational toolbar surfaces.
- **Tertiary Surface (`#131921`):** Deep squid ink navy, applied to root application navigation, persistent sidebar shells, and command docks.
- **Neutrals & Surfaces:**
  - Base Page Canvas: `#F3F3F3`
  - Container / Card Surface: `#FFFFFF`
  - Subtle Borders & Dividers: `#D5D9D9`
  - Hover / Interactive Border: `#888C8C`
  - Primary Text: `#0F1111`
  - Secondary / Meta Text: `#565959`
- **Semantic Feedback:**
  - Success: `#067D62` (Text/Icon on `#E7F4F0` fill)
  - Destructive / Alert: `#BA0933` (Text/Icon on `#FCEDEF` fill)
  - Warning / Hold: `#B86B00` (Text/Icon on `#FFF7E6` fill)
  - Informational: `#007185` (Text/Icon on `#EBF5F7` fill)

## Typography

Typography focuses on high legibility at micro scales for dense administrative grids while retaining clean punch for event headings.

- **Type Scale Execution:**
  - `Inter` provides neutral, grotesque geometry capable of rendering tightly packed metrics, dates, and currency values with absolute legibility.
  - `JetBrains Mono` handles alphanumeric tokens, RFID badge codes, order IDs, and webhook payloads.
- **Hierarchy Rules:**
  - Section titles within data boards use `headline-sm` with uppercase treatment only when paired with `label-sm` metadata chips.
  - Monetary values and remaining ticket counts in tables leverage `headline-sm` with tabular lining numbers (`font-variant-numeric: tabular-nums`).

## Layout & Spacing

The layout model favors dense modular dashboards with strict geometric rhythm:

- **Grid Systems:**
  - **Public Discovery:** 12-column fluid grid, maximum content width `1360px`, `gutter-lg` (24px) gutters, and `margin-lg` (32px) margins on screens > 1024px.
  - **Admin Ops Console:** Persistent 240px left-hand navigation (`#131921`), fixed 48px utility header (`#232F3E`), and a full-bleed 12-column workspace using `gutter` (16px) and `margin-md` (24px).
- **Responsive Adaptations:**
  - **Mobile (< 768px):** 4-column layout; gutter drops to 8px; margins drop to 16px. Side navigation collapses into an off-canvas drawer. Data tables fold into keyed linear attribute stacks.
  - **Tablet (768px - 1023px):** 8-column layout; navigation collapses to an icon rail (64px width); cards split across 2 columns.
  - **Desktop (1024px+):** Full 12-column structure with secondary flyout sidebars for quick-access operational filters and drawer actions.

## Elevation & Depth

This design system intentionally minimizes deep spatial abstraction in favor of precise boundaries:

- **Border-First Structure:** Hierarchy is established through 1px solid lines using `#D5D9D9` rather than ambient dropshadows.
- **Elevation Steps:**
  - **Level 0 (Canvas):** Flat `#F3F3F3` background.
  - **Level 1 (Card & Content Blocks):** Pure `#FFFFFF` surface with a `1px solid #D5D9D9` border. No shadow in resting state.
  - **Level 2 (Hover & Active Blocks):** Border color darkens to `#888C8C` with an engineered utilitarian shadow: `0 2px 5px rgba(15, 17, 17, 0.15)`.
  - **Level 3 (Dropdowns & Popovers):** `#FFFFFF` surface with border `#D5D9D9` and shadow `0 4px 12px rgba(15, 17, 17, 0.15)`.
  - **Level 4 (Modals & Slide-over Drawers):** Backdrop overlay `#0F1111` at 60% opacity with a solid white panel supported by `0 8px 24px rgba(15, 17, 17, 0.2)`.

## Shapes

The design uses tight, controlled corners to maximize interior screen real estate and retain a dependable business feel:

- **Base Corner Radius (4px / 0.25rem):** Standard interactive elements—form inputs, checkboxes, table cells, secondary buttons, tags, and small toolbars.
- **Container Radius (8px / 0.5rem):** Larger surfaces—content cards, operational dashboards, modal windows, and pricing tier containers.
- **Pill Exception (9999px):** Applied exclusively to compact operational badges (e.g., "Sold Out", "Live", "Checked In") to differentiate status metadata from actionable rectangular triggers.

## Components

### Buttons
- **Primary CTA:** Surface `#FF9900`, text `#0F1111`, font weight 600, border `1px solid #D67F00`, 4px radius, subtle bottom edge accent `box-shadow: 0 1px 0 rgba(255,255,255,0.4) inset`. Hover: `#E88B00`. Focus: 3px dual-ring outline (`#FFFFFF` interior, `#007185` exterior).
- **Secondary Neutral:** Surface `#FFFFFF`, text `#0F1111`, border `1px solid #D5D9D9`. Hover: background `#F7FAFA`, border `#888C8C`.
- **Tertiary / Action Link:** Clean `#007185` text with no background. Underlines only on hover.

### Inputs & Form Controls
- **Text Inputs:** Height 36px (compact administrative), border `1px solid #888C8C`, background `#FFFFFF`, text `#0F1111`. Focus: border `#007185`, glow ring `0 0 0 3px rgba(0, 113, 133, 0.2)`.
- **Checkboxes & Radios:** 18px square/circle, border `1.5px solid #565959`. Selected state: `#007185` background with crisp white icon checkmark.

### Data Tables
- **Grid Density:** Compact 40px row height; header row styled in `#F3F3F3` with `label-sm` tracking and a sticky `border-bottom: 2px solid #D5D9D9`.
- **Zebra & Hover:** Alternating row highlights disabled. Row hover activates `#F7FAFA` background with an instant cursor trigger.
- **Monetary & Counts:** Right-aligned with tabular numerals in `JetBrains Mono` or tabular `Inter`.

### Status Badges & Chips
- **Success ("Active / Paid"):** Background `#E7F4F0`, border `1px solid #067D62`, text `#067D62`, bold 11px uppercase.
- **Critical ("Cancelled / Sold Out"):** Background `#FCEDEF`, border `1px solid #BA0933`, text `#BA0933`.
- **Pending ("Draft / Reserved"):** Background `#FFF7E6`, border `1px solid #B86B00`, text `#B86B00`.

### Cards & Ticket Modules
- **Event Card:** Border `1px solid #D5D9D9`, background `#FFFFFF`. Distinct header metadata band separated by an interior rule.
- **Perforated Ticket Stub:** Public confirmation cards feature a dashed `1.5px #D5D9D9` divider separating the barcode/QR block from attendee credentials.