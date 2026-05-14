# DESIGN.md — Loftin Method
## Design System Reference Document

> This document is the authoritative source of truth for all UI decisions in the Loftin Method application. Read this before making any visual change. Do not deviate from it without a documented reason.

---

## 1. Design Philosophy

Loftin Method is a precision nutrition and movement system for men who take their results seriously. The product does not entertain. It does not gamify. It does not reward engagement for its own sake.

The visual language reflects the method itself — structured, disciplined, and quietly confident. Every design decision should reinforce one idea:

**"Quiet system. Visible standard."**

The emotional register is that of a well-made object: a leather-bound journal, a precision instrument, a dark wood desk with nothing unnecessary on it. The user should feel that the app knows what it's doing and doesn't need to prove it.

This is not a wellness app. It is not motivational. It is a tool built for men who follow through.

---

## 2. Core Design Principles

### Restraint Over Decoration
Every decorative element must justify its presence. If removing it doesn't break the communication, remove it. The default answer to "should I add this?" is no.

### Structure Over Clutter
Hierarchy is created through spacing, weight, and scale — not color, borders, or background fills. When a layout feels cluttered, the solution is removal, not reorganization.

### Material Realism Over Flat UI
Surfaces have depth. Cards are slightly raised. Backgrounds have texture. The app should feel like it has physical weight, not like a generic SaaS interface. This is achieved through subtle gradients, layered surfaces, and restrained use of shadow — not through heavy neumorphism or exaggerated effects.

### Readability Over Style
If a typographic or color choice makes text harder to read, it is wrong regardless of how good it looks in isolation. Mobile readability is non-negotiable.

### Consistency Over Creativity
Do not introduce new patterns when an existing one works. Consistency across the app builds user trust and signals craftsmanship. Every deviation from this document creates design debt.

---

## 3. Color System

### Philosophy
The palette is built on dark, warm neutrals anchored by a single precious metal accent. Gold is earned — it marks only what matters most. Everything else lives in the shadow.

### Dark Theme (Primary Experience)

```
--bg-app:           #0C0B09   /* Espresso — deepest background */
--bg-card:          #141210   /* Dark leather — card surface */
--bg-card-raised:   #1A1814   /* Slightly elevated card */
--bg-card-deep:     #222018   /* Tertiary surface */

--text-primary:     #EDE0C8   /* Warm off-white — all primary copy */
--text-secondary:   #8A7A5A   /* Muted warm — supporting text */
--text-tertiary:    #3A3020   /* Very muted — metadata, placeholders */
--text-muted:       #6B5D42   /* Labels, inactive states */

--gold-bright:      #D4AF6A   /* Active states, key numbers, CTA labels */
--gold-main:        #C8A04A   /* Borders, icons, primary emphasis */
--gold-line:        rgba(200,160,74,.13)   /* Dividers, subtle borders */
--gold-glow:        rgba(200,160,74,.06)   /* Ambient fill, hover background */
--gold-dim:         rgba(200,160,74,.20)   /* Medium emphasis borders */

--status-success:   #3D7A52   /* Progress, positive change */
--status-warning:   #E8845A   /* Restaurants, actions, warnings */
--status-error:     #C0392B   /* Over budget, errors */
--status-activity:  #F0A500   /* Steps, movement */
--status-neutral:   #8B6914   /* Neutral accent */
```

### Light Theme (Warm Editorial Version)

The light theme is not a brightness inversion. It is a completely different material — warm parchment and aged paper, not white and grey. Every surface should feel like it belongs in an antique book, not a modern web app.

```
--bg-app:           #F0E8D4   /* Aged parchment */
--bg-card:          #EDE5D0   /* Warm cream card surface */
--bg-card-raised:   #E8DFC8   /* Slightly cooler card */
--bg-card-deep:     #E0D5BC   /* Deeper surface */

--text-primary:     #2C2416   /* Dark espresso — readable on parchment */
--text-secondary:   #6B5D42   /* Mid-warm — supporting text */
--text-tertiary:    #9A8A6A   /* Muted — metadata */
--text-muted:       #B09878   /* Placeholder, inactive */

--gold-bright:      #B8902A   /* Darker gold reads better on light */
--gold-main:        #A07828   /* Main accent on light surfaces */
--gold-line:        rgba(140,110,60,.20)
--gold-glow:        rgba(140,110,60,.08)
--gold-dim:         rgba(140,110,60,.25)
```

### Semantic Color Roles

| Role | Dark | Light | Use |
|------|------|-------|-----|
| Page background | `#0C0B09` | `#F0E8D4` | App root only |
| Card default | `#141210` | `#EDE5D0` | All card components |
| Card elevated | `#1A1814` | `#E8DFC8` | Nested, raised cards |
| Primary text | `#EDE0C8` | `#2C2416` | Headings, body copy |
| Supporting text | `#8A7A5A` | `#6B5D42` | Labels, subtitles |
| Active accent | `#D4AF6A` | `#B8902A` | CTAs, active states, numbers |
| Structural border | gold-line | gold-line | Dividers, card outlines |

### Absolute Color Rules
- Never use pure white (`#FFFFFF`) or pure black (`#000000`)
- Never introduce a color not defined in this system
- Never use blue, purple, teal, or any cool-spectrum accent
- The warm neutrals are not grey — they are brown-tinted

---

## 4. Typography System

### Font Pairing

```
--font-display:  'Playfair Display', Georgia, serif
--font-body:     'DM Sans', 'Segoe UI', system-ui, sans-serif
```

Playfair Display carries the identity. It is used for anything that matters — names, meal titles, key numbers, hero headings. It reads as editorial, authoritative, and premium.

DM Sans handles all functional UI — labels, instructions, buttons, metadata. It is clean and neutral without feeling generic.

### Type Scale

| Role | Font | Size | Weight | Tracking |
|------|------|------|--------|----------|
| Hero name | Playfair | 2.0–2.4rem | 700 | normal |
| Section heading | Playfair | 1.05–1.1rem | 600 | normal |
| Stat number | Playfair | 1.6–2.0rem | 700 | normal |
| Meal title | Playfair | 1.0rem | 600 | normal |
| Eyebrow label | DM Sans | .58–.65rem | 700 | .18–.24em |
| Body copy | DM Sans | .84–.92rem | 300–400 | .01em |
| Button text | DM Sans | .74–.82rem | 700 | .10–.14em |
| Metadata | DM Sans | .68–.75rem | 400 | .06em |
| Micro label | DM Sans | .58–.62rem | 600 | .20–.26em |

### Typography Rules

**Uppercase usage:** Reserved strictly for eyebrow labels, section markers, and button text. Never used for body copy or meal titles. Uppercase is a structural signal, not a decorative one.

**Serif usage:** Playfair Display for names, meal titles, primary numbers, and headings. Never for labels, buttons, instructions, or metadata.

**Weight usage:** Body copy is 300–400 weight — light and readable. Bold (600–700) is reserved for headings, numbers, and active states. Do not bold body copy for emphasis; use color or size instead.

**Line height:** Body copy at 1.65–1.75. Headings at 1.05–1.15. Tight line height on headings prevents them from looking loose.

**Letter spacing:** Eyebrow labels at .18–.24em uppercase. Body copy near-zero. Wide tracking is a signal — overuse destroys it.

---

## 5. Layout & Spacing System

### Philosophy
The layout breathes. Crowded UI is a sign of unclear thinking. White space is not wasted space — it is what makes the content feel premium.

### Spacing Scale (8pt base)

```
--space-xs:   4px
--space-sm:   8px
--space-md:   14px
--space-lg:   18px
--space-xl:   24px
--space-2xl:  32px
--space-3xl:  48px
```

### Layout Rules

**Max content width:** 480px, centered. This is a mobile-first single-column app. Do not create multi-column layouts within pages.

**Page padding:** 16px horizontal. Consistent across all pages.

**Card gap:** 14px between sibling cards. Never less. Never more than 18px.

**Card internal padding:** 18–20px. Hero card may use 20–24px.

**Section separation:** 24–32px between major sections within a page.

**Vertical rhythm:** Every spacing decision should relate to the 8pt scale. If a measurement doesn't land on 4, 8, 12, 14, 16, 18, 20, 24, 32 — question it.

### Alignment Rules
- All text left-aligned except centered instructions and centered stat tiles
- Numbers and their labels share the same center axis within stat tiles
- Card content never bleeds to the edge — always respect internal padding

---

## 6. Background & Texture

### Dark Theme
The app background is `#0C0B09` — a very dark espresso brown. It should feel like dark-stained wood or aged leather in shadow. A subtle grain texture (`texture-bg.png`) is overlaid at low opacity to prevent the flat void of a pure dark background.

**Texture rules:**
- Texture must be subtle — barely perceptible at a glance
- Noise overlay at 3–5% opacity maximum
- Never use a pattern that tiles visibly
- The texture should add material warmth, not visual complexity

### Light Theme
The light background is `#F0E8D4` — warm aged parchment. It must never look like white or light grey. The warmth of the paper is what defines the light mode character.

**Light mode rules:**
- Cream, not white
- Warm tint, not cool
- Cards should be slightly darker than the page (not lighter as in most apps)
- The texture should suggest age and quality, not sterility

### Overlay Layers
A semi-transparent dark overlay (`rgba(10,9,7,.74)`) sits above the background texture in dark mode, softening it. A subtle noise filter adds grain without visible patterning.

---

## 7. Component System

### Hero Card (Dashboard Greeting)
The hero card is the most premium surface in the app. It carries the user's name, the date, the tagline, and the key plan stats. It is the one place where additional material depth is justified.

**Styling:**
```css
background: linear-gradient(160deg, var(--bg-card-raised), var(--bg-card));
border: 1px solid var(--gold-line);
border-top: 2px solid var(--gold-main);
border-radius: 16px;
padding: 20px;
```

**Rules:**
- Top border may be gold-main (the one exception to the border rule)
- May include a subtle radial glow behind the name
- Stat tiles sit inside the hero card
- Tagline "Quiet system. Visible standard." in Playfair italic, `--text-secondary`
- No badge icons, no achievement displays, no gamified elements

---

### Stat Tiles (Calories, Steps, Target)
Stat tiles read like precision instruments — clean, structured, slightly raised. They display a single number with a label beneath it.

**Styling:**
```css
background: linear-gradient(170deg, var(--bg-card-raised), var(--bg-card));
border: 1px solid rgba(184,150,60,.18);
border-top: 1px solid rgba(184,150,60,.42);
border-radius: 12px;
padding: 14px 12px;
text-align: center;
```

**Rules:**
- Number in Playfair Display, `--gold-bright`, 1.6–2.0rem
- Label in DM Sans, uppercase, `--text-muted`, .58rem, .20em tracking
- Subtext (calorie range, burn note) in DM Sans, `--text-tertiary`, .68rem
- Three tiles displayed in equal-width grid
- No icons inside stat tiles

---

### Progress Bar
The progress bar shows distance to target weight zone. It is a single line — no animation, no gradient pulse, no percentage label unless space allows.

**Styling:**
```css
height: 2px;
background: var(--gold-line);  /* Track */
border-radius: 1px;

/* Fill */
background: linear-gradient(90deg, var(--gold-main), var(--gold-bright));
border-radius: 1px;
```

**Rules:**
- Track is `--gold-line` (very subtle)
- Fill is a quiet gold gradient
- Label text sits above-right: "X lbs to go" in DM Sans, `--text-tertiary`
- Never use green, blue, or any non-gold color for the fill
- No animated pulse or shimmer

---

### Action Card (Log Today's Weight)
A persistent nudge card that appears when the user hasn't logged today's weight. It should feel like a calm reminder, not an urgent alert.

**Styling:**
```css
background: var(--bg-card);
border: 1px solid var(--gold-line);
border-radius: 12px;
padding: 14px 16px;
display: flex;
align-items: center;
justify-content: space-between;
```

**Rules:**
- Icon left, text center-left, arrow right
- Title in DM Sans 600, `--text-primary`
- Subtitle in DM Sans 300, `--text-secondary`, italic
- Arrow in `--gold-main`
- No background color, no fill, no emphasis beyond the border

---

### Day Selector Pills
The day tabs sit above the meal cards and allow navigation between days of the week.

**Styling — Inactive:**
```css
border: 1px solid var(--gold-line);
border-radius: 20px;
color: var(--text-secondary);
font-family: var(--font-body);
font-size: .72rem;
font-weight: 600;
padding: 6px 12px;
background: transparent;
```

**Styling — Active:**
```css
border: 1px solid var(--gold-main);
background: transparent;
color: var(--gold-bright);
font-weight: 700;
```

**Rules:**
- Active day shows a dot indicator (●) after the label
- Never use a filled background for active state
- Never remove the border from either state
- Today's pill is always the default selected state

---

### Section Headers
Section headers separate content regions within a page. They establish editorial hierarchy.

**Pattern:**
```
EYEBROW LABEL          (DM Sans, uppercase, .60rem, .22em, --gold-main)
Primary Heading        (Playfair Display, 1.05rem, 600, --text-primary)
Supporting line        (DM Sans, .84rem, 300, --text-secondary, italic)
```

**Rules:**
- Eyebrow always uppercase, always DM Sans, always --gold-main
- Heading always Playfair
- Supporting line optional, never more than one sentence
- No decorative rules or dividers beneath section headers

---

### Meal Cards
Meal cards are the primary working surface of the app. They must be clean and highly readable. They are less decorated than the hero card — utility first.

**Styling:**
```css
background: var(--bg-card);
border: 1px solid var(--gold-line);
border-left: 2px solid [meal-type-color];
border-radius: 12px;
padding: 0;  /* Header and body handle internal padding */
```

**Left border by meal type:**
- First meal: `rgba(200,160,74,.4)` (muted gold)
- Dinner: `var(--gold-main)` (full gold — most important meal)
- Dessert: `var(--status-neutral)` (earth tone)

**Rules:**
- Meal image 52×52px, rounded 8px, left of title
- Title in Playfair, 1.0rem, 600, `--text-primary`
- Cal count in Playfair, .9rem, 700, `--gold-bright`, right-aligned
- Meal type label in DM Sans, uppercase, .62rem, `--text-tertiary`
- Expand arrow in `--text-tertiary`, transitions to `--gold-main` when open
- Ingredient list in DM Sans, .84rem, 300, `--text-secondary`
- No background fill on expanded state
- No badge icons on meal cards

---

### Instruction Banner
The instruction banner sits at the bottom of the meal section. It delivers the daily operating instruction in plain language.

**Styling:**
```css
text-align: center;
font-family: var(--font-body);
font-size: .62rem;
font-weight: 600;
letter-spacing: .16em;
text-transform: uppercase;
color: var(--text-tertiary);
padding: 12px 0;
```

**Content format:**
`EAT THESE MEALS · HIT X,XXX STEPS · CLOSE THE APP · LIVE YOUR LIFE`

**Rules:**
- Always centered
- Always uppercase DM Sans
- Always `--text-tertiary` — it is ambient, not prominent
- Dots (·) as separators, not pipes or dashes
- Content must be direct and non-motivational

---

### Utility Cards (Restaurants, My Fridge, Extra Cal?)
Three equal-width action cards sitting in a row. They are the primary navigation to the AI-powered features.

**Styling:**
```css
background: var(--bg-card-raised);
border: 1px solid var(--gold-line);
border-radius: 12px;
padding: 14px 12px;
text-align: center;
flex: 1;
```

**Rules:**
- Icon in `--gold-main`, .9rem
- Label in DM Sans, .72rem, 600, `--text-secondary`
- All three cards identical in size and treatment
- No background color differences between the three
- Tap state: `border-color: var(--gold-main)`, subtle scale .98

---

### Bottom Navigation
The bottom nav is the sole navigation method. It is minimal and always present.

**Styling — Inactive:**
```css
color: var(--text-muted);
font-family: var(--font-body);
font-size: .62rem;
font-weight: 500;
```

**Styling — Active:**
```css
color: var(--gold-bright);
border-top: 1.5px solid var(--gold-main);
font-weight: 700;
```

**Rules:**
- Active tab gets gold text AND a gold top border — both required
- Icons are simple, single-weight line icons
- Labels always visible — never icon-only
- Background: `var(--bg-app)` with top border `var(--gold-line)`
- No background fill on active tab — border and color are sufficient

---

## 8. Elevation & Depth

The app uses a three-level elevation system. Each level is defined by subtle gradient, border opacity, and optional inner glow.

### Level 0 — App Background
Flat. `--bg-app`. No border, no shadow.

### Level 1 — Card Surface
```css
background: var(--bg-card);
border: 1px solid var(--gold-line);
box-shadow: 0 1px 4px rgba(0,0,0,.25);
```

### Level 2 — Raised Card
```css
background: var(--bg-card-raised);
border: 1px solid var(--gold-dim);
box-shadow: 0 2px 8px rgba(0,0,0,.35);
```

### Level 3 — Hero / Modal
```css
background: linear-gradient(160deg, var(--bg-card-raised), var(--bg-card));
border: 1px solid var(--gold-line);
border-top: 2px solid var(--gold-main);
box-shadow: 0 4px 16px rgba(0,0,0,.4);
```

### Rules
- Never stack more than one box-shadow on a component
- Inner glow (`inset 0 1px 0 rgba(200,160,74,.06)`) allowed on Level 3 only
- No drop shadows on text
- No neumorphic double-shadow effects

---

## 9. Interaction & Motion

### Tap / Hover States
```css
/* Card tap */
transform: scale(.99);
transition: transform .15s ease;

/* Button hover */
transform: translateY(-1px);
box-shadow: 0 4px 12px rgba(0,0,0,.35);
transition: all .2s ease;

/* Border highlight */
border-color: var(--gold-dim);
transition: border-color .2s ease;
```

### Entrance Animation
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
animation: fadeUp .35s ease both;
```

Meal cards stagger at .05s intervals. Maximum stagger depth: 3 cards (.05s, .12s, .19s).

### Rules
- No bounce, spring, or overshoot easing
- No animations exceeding .4s duration
- No looping animations in the idle state
- No gamified motion — no confetti, no celebration particles, no streak flames
- Loading states use a simple spinner, not a skeleton or shimmer
- Page transitions are instant — no slide or fade between pages

---

## 10. Gold Usage Rules

Gold is the most powerful signal in this design system. Overuse destroys its meaning.

### Where Gold Is Allowed
| Use | Gold Token |
|-----|-----------|
| Active nav tab | `--gold-bright` text + `--gold-main` border |
| Active toggle button | `--gold-bright` text, transparent background |
| Stat tile numbers | `--gold-bright` |
| Meal calorie count | `--gold-bright` |
| Hero card top border | `--gold-main` |
| Stat tile top border | `rgba(184,150,60,.42)` |
| Card structural borders | `--gold-line` |
| Section eyebrow labels | `--gold-main` |
| CTA button background | `--gold-main` fill, `--bg-app` text |
| Primary arrow/chevron | `--gold-main` |
| Expanded meal icon | `--gold-main` |

### Where Gold Is NOT Allowed
- Body copy
- Paragraph text of any kind
- Card backgrounds or fills
- Section backgrounds
- Progress bar track
- Inactive states of any component
- Icon fills when inactive
- Coach notes or instruction banners
- Any use of gold as a background behind text (except the CTA button)

### The Fill Rule
`--gold-main` as a background fill is permitted ONLY on primary CTA buttons. Everywhere else, gold is a border, text color, or accent — never a fill.

---

## 11. Ornamentation Rules

### Where Ornamentation Is Permitted
- **Hero card only:** A subtle corner filigree or inner glow is acceptable on the hero card if it remains barely visible and does not compete with the content
- **Section dividers:** A thin `1px var(--gold-line)` horizontal rule between major sections
- **Progress bar:** The gold gradient fill is the only decorative treatment

### Where Ornamentation Is NOT Permitted
- Meal cards — no corner details, no decorative borders
- Utility cards — no icons beyond their functional icon
- Stat tiles — no ornament, no glow, no decoration beyond the top border
- Bottom navigation — no ornamentation of any kind
- Instruction banner — no decoration
- Modals — no ornamental headers

### The One-Layer Rule
Every component may have at most one decorative treatment. Choose one:
- Top border highlight **OR**
- Subtle background gradient **OR**
- Soft box shadow

Never combine all three on the same component.

---

## 12. Readability Standards

### Contrast Requirements
| Text role | Minimum contrast | Token |
|-----------|-----------------|-------|
| Primary body | 7:1 | `--text-primary` on `--bg-card` |
| Secondary body | 4.5:1 | `--text-secondary` on `--bg-card` |
| Tertiary / metadata | 3:1 | `--text-tertiary` on `--bg-card` |
| Active gold on dark | 4.5:1 | `--gold-bright` on `--bg-app` |

### Mobile Readability Rules
- Minimum body copy size: .84rem (≈13.4px)
- Minimum tap target: 44×44px for all interactive elements
- No text smaller than .58rem in any context
- Touch targets must not overlap
- Line length inside cards: maximum 52 characters per line on 375px viewport

### Light Mode Readability
- `--text-primary` on light must achieve same 7:1 contrast as dark
- Gold on parchment must darken to `--gold-main (light)` — bright gold is not readable on cream
- Never use `--text-tertiary` (dark) as a primary label in light mode

---

## 13. Implementation Guardrails

These rules apply to every developer and AI agent working on this codebase.

### Before Making Any UI Change
1. Read the relevant section of this document
2. Identify which component is being modified
3. Check that the change uses only defined color tokens
4. Verify the change does not violate the one-layer rule
5. Confirm the change does not introduce a new pattern

### Hard Rules — Never Violate
- **Do not introduce new colors.** If a color you need is not in the system, it does not belong in the app.
- **Do not change spacing arbitrarily.** All spacing must land on the 8pt scale values.
- **Do not replace typography.** Playfair Display and DM Sans are non-negotiable. No substitutions.
- **Do not use gold as a background fill** except on primary CTA buttons.
- **Do not add animations** beyond those defined in Section 9.
- **Do not add decorative elements** to meal cards, utility cards, or navigation.
- **Do not use pure white or pure black** anywhere in the interface.
- **Do not introduce cool-spectrum colors** (blue, purple, teal, green as accent).

### Code Conventions
- All colors referenced via CSS custom properties — never hardcoded hex values
- All new components must map to an existing component pattern in Section 7
- If a required component does not exist in Section 7, document it here before implementing
- Light mode overrides live in `app.html` under `body.light-mode` — never in separate files

### When in Doubt
Default to less. A simpler version of any component is always preferable to a more decorated one. The premium feel of this app comes from restraint, not from addition.

---

*Document status: Active*
*Last updated: Phase 3 modularization complete — app.html + 10 JS modules*
*Design direction: Dark leather / warm parchment — Harry Potter puzzle reference approved*

---

## 14. Feature & UX Backlog

This section tracks known improvements, UX issues, and feature ideas. Items here are not yet implemented. Reference this list when planning future sessions.

---

### Dashboard

**Weight log notification sync**
When a user logs their weight from the Progress page, the "Log today's weight" nudge card on the Dashboard should disappear immediately — it currently requires a page reload or manual refresh to clear. The weight log state should be shared across pages in real time.

**Landscape mode for Dashboard / Meals**
The Dashboard page (and specifically the meal cards) should support landscape orientation on mobile and iPad. This is a practical cooking feature — the user props their phone or iPad next to the stove and needs to read ingredient amounts while weighing food. All other pages should be locked to portrait. Landscape on the Dashboard should reflow the meal cards to be wider and more readable, not just rotate the portrait layout.

---

### Progress Page

**Chart design**
The weight chart is functional but visually plain. A future pass should refine it — smoother line, better axis labels, subtle area fill below the line in muted gold, better dot styling on data points. Low priority. Reference DESIGN.md Section 7 for tone — no bright gradients, no chart explosions.

---

### Recipe Reference Page

**Calorie-scaled ingredients**
The Recipe Reference page currently shows generic ingredient amounts from the base templates. It should reflect the user's actual scaled amounts based on their calorie target — the same scaling that the dashboard meal cards apply. A user on 1,963 cal/day should see their actual gram amounts in the recipe reference, not the unscaled 1,800 cal base amounts. This makes the page genuinely useful for grocery shopping and meal prep planning.

---

### Restaurant Page

**UI order adjustment**
"Meal Type" and "Drink Tonight" selectors should appear before the restaurant search input and the "Exactly What to Order" / "Search Any Restaurant" sections. Users need to set context (which meal slot, whether they're drinking) before searching — the current order asks them to search first and configure second. Moving the selectors to the top creates a more logical left-to-right, top-to-bottom flow.

---

### Future Feature Considerations

The following are ideas worth tracking. None are immediate priorities — the app should be stable and generating revenue before adding features.

**Custom recipes page**
A dedicated page for special occasion meals that don't belong in the weekly rotation — wife's homemade burgers, mother-in-law's carne asada tacos, holiday meals. User can store these with ingredients and cal counts and pull them into any day as a swap. This was discussed and deferred to post-Phase 3.

**Device linking** ✅ Complete
A 6-digit code system to sync a plan across devices. Built as `js/devicelink.js` and `netlify/functions/linkDevice.js`. Includes Reset & Resync for out-of-sync devices. Works across phone, computer, and iPad.

**Second dessert option**
The dessert is currently the same every day (yogurt bowl). A second option — ricotta bowl or similar — would add meaningful variety without adding complexity. Low effort relative to impact.

**Lazy loading for modules**
Now that the JS is modular, `restaurants.js`, `fridge.js`, and `history.js` could be loaded on demand rather than at boot. This would improve initial load time. Phase 4+ consideration.

**Nutritionix / USDA API for restaurant lookup**
Replacing Claude API calls for drink/food/store lookup with a dedicated nutrition database API (Nutritionix, Spoonacular, or USDA) would reduce response time from 2–5 seconds to near-instant for those features. Not worth building pre-revenue — Claude is sufficient at current scale.

**Apple Health integration**
Requires Mac Mini ($599), Apple Developer account ($99/yr), and native iOS app conversion. Deferred until the business generates revenue. PWA is sufficient for current stage.

---

### Comparison Notes — What Other Fitness Apps Do

*Referenced to ensure Loftin Method stays differentiated, not to copy.*

**MyFitnessPal:** Barcode scanning, massive food database, social features, calorie logging per item. Loftin Method intentionally does none of this — the system removes the decision burden rather than adding more inputs. MyFitnessPal requires the user to think. Loftin Method does the thinking.

**Cronometer:** Extremely detailed micronutrient tracking. Accurate but mentally expensive. Our user doesn't want to track molybdenum. They want to know what to cook tonight.

**Noom:** Psychology-based, color-coded food system, daily lessons, coach check-ins. Feels like a subscription to homework. Loftin Method has no lessons, no check-ins, no food colors.

**Lose It!:** Similar to MyFitnessPal — food logging, barcode scan, social. Same problem: the user does all the work.

**MacroFactor:** Most similar in philosophy — algorithm-driven, adjusts automatically, minimal manual input. Good competition. Differentiators for Loftin Method: meal plans with actual recipes, restaurant integration, family-friendly design, masculine identity, IF-specific structure.

**Whoop / Oura:** Hardware-dependent, recovery-focused, no meal planning. Different lane entirely.

**What Loftin Method does that none of them do:**
- Tells you exactly what to order at any restaurant
- Builds a meal from whatever is in your fridge
- Scales every ingredient to your exact calorie target
- Treats the weekend drinking budget as a first-class feature
- Designed specifically for men with families and real jobs
- Feels like a premium tool, not a consumer app

---

**Restaurant menu item lookup — "What does Caleb want?"**
A second mode on the restaurant page — toggle between "What should I order?" (current plan-matched recommendation) and "Look up a menu item" (specific dish nutrition lookup). Designed for the diabetic use case: grandfather types exactly what Caleb wants to order, gets carbs, protein, fat, and calories instantly. No plan matching, no recommendation — pure lookup. Infrastructure already in place (Claude API, macro display, renderFoodCard). Mostly a UI addition and a different prompt.

**Meal Explorer UI**
The meal database (`js/mealdb.js`) is built with 10 meal families, full tag and filter engine, and schema support for dietary restrictions, cultural lanes, budget tiers, and medical sensitivity tags. The UI layer — a browsable, filterable meal library — is the next step. Users should be able to filter by goal, diet, cultural preference, budget, and medical needs. This is the bridge between the structured Loftin plan and the broader audience.

**Meal flexibility — non-IF users**
Some users cannot or will not follow intermittent fasting. The plan engine should allow 3 or 4 meals per day as an option, distributing the same calorie target across more eating occasions. The `mealdb.js` schema already supports `meal_type: breakfast | lunch | dinner | snack`. Engine change required — post-launch priority.

**Dietary preferences screen**
Simple toggles in Plan Settings: no pork, no shellfish, vegetarian, dairy-free, gluten-conscious. The restaurant finder and fridge builder already use Claude — they can respect these constraints with minimal prompt changes. The core meal plan would need modifier logic from `mealdb.js` to adapt.

**Personal meal library** ✅ Complete
Users can save restaurant finds and fridge creations to a personal library via `js/savedmeals.js`. Translators convert dynamic Claude results into canonical `mealdb.js`-schema entries at save time. Accessible from More drawer as "My Saved Meals." Syncs across devices.

**Macros on all meal surfaces** ✅ Complete
Protein, carbs, and fat display on every meal card, restaurant result, and fridge-built meal. Powered by `js/macros.js` with USDA lookup table for fixed meals and Claude API for dynamic results. Carb Lookup tool (`js/carblookup.js`) added for ingredient-by-ingredient lookups — designed for diabetic use case.

**Maintenance Day toggle**
Wife calls David "Gus Gus." A toggle that switches the plan to maintenance calories for a single day — useful for rest days, travel, or deliberate refeeds. Low complexity, high delight for regular users.

**Progress chart redesign**
Current progress chart is functional but plain. Low priority — data integrity matters more than visual polish at this stage.

**Dashboard/Meals landscape mode**
iPad cooking use case — when the device is horizontal, the meal card should expand to show full ingredient list and cooking instructions without scrolling. Medium complexity.

**Lazy loading for modules** ✅ Partially addressed
SW now uses network-first for JS files, which eliminates stale cache issues. True lazy loading (on-demand module loading) is a Phase 4+ consideration once the module count grows further.

**Recipe Reference with calorie-scaled ingredients**
The recipe reference page should show ingredient amounts scaled to the user's actual calorie target, not the base template amounts. Currently shows unscaled amounts.

*Backlog last updated: April 2026*
