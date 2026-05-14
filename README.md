# Loftin Method: Eat Right, Anywhere

A structured nutrition and meal planning PWA built around the Loftin Method — a precision intermittent fasting system for sustainable fat loss, lean gaining, and long-term maintenance.

**Status:** Beta — pre-revenue, active development  
**Live URL:** https://fitforthem.app/app.html  
**Owner:** David Loftin / Loftin Method LLC  
**Contact:** david@fitforthem.app

---

## What This App Does

The Loftin Method app is a decision engine for real-life eating. It does not ask users to log food manually. Instead it tells them exactly what to eat, how much, when, and what to order at any restaurant — all calculated from their personal biometrics.

**Core features:**
- Personalized calorie, protein, and step targets (Mifflin-St Jeor + Hybrid Bridge method)
- 7-day structured meal plan with breakfast, dinner, and dessert
- Drinking day adjustments (Light / Regular / Big Night step targets)
- Macro display on every meal card (protein, carbs, fat)
- Restaurant finder — exact meal recommendations at any restaurant
- Fridge builder — build a meal from whatever ingredients you have
- Carb Lookup — instant USDA nutrition data for any ingredient
- Grocery list generator
- Weight and progress tracking
- Device linking — sync data across phone, tablet, and computer
- PWA — installable on iOS, Android, and desktop

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript (no framework), HTML, CSS |
| Fonts | Playfair Display, DM Sans (Google Fonts) |
| Hosting | Netlify Pro |
| Backend | Netlify Functions (Node.js) |
| Database | Netlify Blobs (key-value, device-ID based) |
| Payments | Stripe (test keys active, paywall bypassed for beta) |
| AI | Anthropic Claude API (restaurant search, fridge builder, carb lookup) |
| PWA | Service Worker (`sw.js`) — network-first for HTML/JS, cache-first for assets |

---

## Repository Structure

```
/
├── app.html                    # Single-page app — all HTML and CSS
├── sw.js                       # Service worker — caching and offline support
├── manifest.json               # PWA manifest
├── DESIGN.md                   # Full design system — read before any visual changes
├── README.md                   # This file
│
├── js/                         # Client-side JavaScript modules
│   ├── migrate.js              # Silent plan migration on boot (run first)
│   ├── macros.js               # Macro calculation engine and display components
│   ├── mealdb.js               # Master meal database and filter engine
│   ├── devicelink.js           # Device linking UI (6-digit code system)
│   ├── carblookup.js           # Carb and macro lookup tool
│   ├── sync.js                 # Server sync via Netlify Blobs
│   ├── engine.js               # Calorie and plan calculation engine (pure math)
│   ├── meals.js                # Meal rendering, dashboard day tabs, meal swap system
│   ├── stripe.js               # Auth, subscription, and app boot sequence
│   ├── grocery.js              # Grocery list generator
│   ├── progress.js             # Weight logging and progress charts
│   ├── restaurants.js          # Restaurant finder, food search, drink calculator
│   ├── fridge.js               # Fridge meal builder and ingredient swap system
│   ├── history.js              # Meal history tracking
│   └── ui.js                   # Navigation, mobile menu, light mode, tooltips
│
└── netlify/
    └── functions/              # Server-side Netlify Functions (Node.js)
        ├── saveData.js         # Save user data to Netlify Blobs
        ├── loadData.js         # Load user data from Netlify Blobs
        ├── linkDevice.js       # Device linking — generate and claim 6-digit codes
        ├── claude.js           # Claude API proxy
        ├── check-subscription.js
        ├── create-checkout.js
        └── create-portal.js
```

---

## JavaScript Module Load Order

Modules must load in this exact order in `app.html`. Each module depends on globals declared by modules above it.

```html
<script src="js/migrate.js"></script>      <!-- Must be first — migrates plan before anything renders -->
<script src="js/macros.js"></script>       <!-- Macro engine — used by meals, restaurants, fridge -->
<script src="js/mealdb.js"></script>       <!-- Meal database — used by Meal Explorer (coming soon) -->
<script src="js/devicelink.js"></script>   <!-- Device linking UI -->
<script src="js/carblookup.js"></script>   <!-- Carb lookup tool -->
<script src="js/sync.js"></script>         <!-- Data sync — used by stripe.js boot sequence -->
<script src="js/engine.js"></script>       <!-- Calorie engine — used by meals.js -->
<script src="js/meals.js"></script>        <!-- Meal rendering -->
<script src="js/stripe.js"></script>       <!-- Boot sequence — runs last critical init -->
<script src="js/grocery.js"></script>
<script src="js/progress.js"></script>
<script src="js/restaurants.js"></script>
<script src="js/fridge.js"></script>
<script src="js/history.js"></script>
<script src="js/ui.js"></script>           <!-- Must be last — wires up all navigation -->
```

---

## Key Global Variables

These are declared in `ui.js` and used across all modules. Do not redeclare them.

| Variable | Type | Description |
|----------|------|-------------|
| `currentPlan` | Object | The user's active nutrition plan |
| `userName` | String | User's first name |
| `workMode` | String | `'office'` or `'wfh'` |
| `weightLog` | Array | Array of `{d: 'YYYY-MM-DD', w: number}` entries |
| `mealPrefs` | Object | Permanent meal swaps by day and slot |
| `proteinSwaps` | Object | Protein rotation overrides by day index |
| `skippedMeals` | Object | Skipped meals by day index |
| `customMeals` | Array | Restaurant and fridge meals added to the plan |
| `drinkingDays` | Object | Drinking level by day index (`false`, `'light'`, `'regular'`, `'big'`) |
| `currentDayIdx` | Number | Currently viewed day (0=Mon, 6=Sun) |
| `S` | Object | Plan settings (walkType, speed, incline, wakeTime, bedTime, proteins) |

---

## Data Persistence

User data is stored in two places:

**localStorage** (primary, fast)
All user data lives in localStorage under these keys:

| Key | Contents |
|-----|----------|
| `fft_plan` | Current nutrition plan (JSON) |
| `fft_name` | User's first name |
| `fft_workmode` | `'office'` or `'wfh'` |
| `fft_age` | User's age |
| `fft_log` | Weight log array (JSON) |
| `fft_meal_prefs` | Permanent meal swap preferences (JSON) |
| `fft_swaps` | Protein rotation swaps (JSON) |
| `fft_skipped` | Skipped meals (JSON) |
| `fft_custom` | Custom/restaurant meals (JSON) |
| `fft_milestones` | Milestone tracking (JSON) |
| `fft_summary_dismissed` | Dismissed UI banners |

**Netlify Blobs** (server backup)
iOS aggressively clears localStorage when a PWA is killed. All data is backed up to Netlify Blobs on every save, keyed by a device ID stored in a cookie (`fft_device`). On boot, the app restores from the server if localStorage is empty.

Device linking (`linkDevice.js` / `netlify/functions/linkDevice.js`) allows multiple devices to share the same data by mapping their device IDs to the same server blob.

---

## Plan Schema

`currentPlan` is the central data object. All fields and their types:

```javascript
{
  // Biometrics
  hIn: Number,          // Height in inches
  wLbs: Number,         // Weight in pounds
  age: Number,          // Age in years
  goalWeight: Number,   // User-set goal weight (0 if not set)

  // Target zone (BMI 24.0–25.0)
  tz: { low: Number, mid: Number, high: Number },

  // Bridge reference weight
  bridge: { bridge: Number, ref: Number },

  // Calorie targets
  maintenance: Number,  // TDEE
  calLow: Number,       // Lower bound of calorie window
  cal: Number,          // Target calories (center)
  calHigh: Number,      // Upper bound of calorie window
  protein: Number,      // Daily protein target in grams

  // Phase
  phase: String,        // 'aggressive' | 'moderate' | 'mild' | 'landing' | 'maintenance' | 'moderate_gain' | 'mild_gain' | 'landing_gain'
  phaseLabel: String,
  phaseMsg: String,

  // Step targets
  steps: Number,        // Regular day steps
  wStepsLight: Number,  // Light drinking night steps
  wSteps: Number,       // Regular drinking night steps
  wStepsBig: Number,    // Big night steps
  burnNormal: Number,   // Calorie burn target for regular day
  burnLight: Number,    // Calorie burn target for light night
  burnDrink: Number,    // Calorie burn target for regular drinking night
  burnBig: Number,      // Calorie burn target for big night

  // Meal timing
  mealTimes: { first: String, second: String, last: String },

  // Protein rotation
  rotation: Array,      // 7-item array of { protein, icon }

  // Progress
  lossData: Object,     // Weekly loss/gain estimate
  tmp: Number,          // Next milestone weight

  // Settings
  workMode: String,     // 'office' | 'wfh'

  // Schema version (for migration)
  _schemaVersion: Number  // Current: 3
}
```

### Plan Migration

When new fields are added to `currentPlan`, existing users get them automatically on next boot via `migrate.js`. To add a new field:

1. Add it to `PLAN_FIELD_DEFAULTS` in `migrate.js`
2. Add smart derivation logic to `applySmartDefaults()` if the value can be calculated from existing fields
3. Bump `PLAN_SCHEMA_VERSION` by 1

---

## Meal Database (`mealdb.js`)

The meal database powers the Meal Explorer (coming soon). It is separate from the core Loftin Method plan engine — see Architecture note below.

### Meal Schema

```javascript
{
  id: String,             // Unique slug, kebab-case
  family: String,         // Meal family (groups related meals)
  name: String,           // Display name
  meal_type: String,      // 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'any'
  goals: Array,           // ['lose', 'maintain', 'gain']
  tags: {
    diet: Array,          // e.g. ['high-protein', 'vegetarian', 'dairy-free']
    cultural: Array,      // e.g. ['mexican-inspired', 'mediterranean']
    budget: String,       // 'low' | 'moderate' | 'premium'
    family_friendly: Boolean,
    medical: Array,       // e.g. ['carb-conscious', 'lower-sodium', 'heart-healthy']
    prep: String          // 'quick' | 'moderate' | 'batch'
  },
  base_servings: Number,
  ingredients: Array,     // [{ item, amount, unit, role }]
  macros_per_serving: {
    cal, pro, carb, fat, fiber, sugar
  },
  scaling: {
    light: Number,        // Multiplier for lighter serving
    medium: Number,       // 1.00 = base
    large: Number         // Multiplier for larger serving
  },
  modifiers: Object,      // Named transformations (budget, carb_conscious, family, etc.)
  instructions: Array,    // Cooking steps
  swap_options: Array,    // IDs of meals in same family
  image: String,          // Asset filename
  loftin_plan: Boolean    // true = core Loftin plan meal
}
```

### Filter Engine

```javascript
// Filter meals by any combination of tags
var results = filterMeals({
  goal: 'lose',
  diet: 'vegetarian',
  cultural: 'mexican-inspired',
  budget: 'low',
  family_friendly: true,
  medical: 'carb-conscious',
  meal_type: 'dinner'
});

// Get a single meal by ID
var meal = getMealById('chicken-taco-bowl');

// Get all meals in a family
var tacoFamily = getMealFamily('taco-bowl');
```

---

## Service Worker Strategy

`sw.js` uses different caching strategies by asset type:

| Asset type | Strategy | Reason |
|------------|----------|--------|
| HTML files | Network-first | Always get latest app shell |
| JS files (`/js/*.js`) | Network-first | Deploys are live on next refresh |
| Icons, manifest, images | Cache-first | Rarely change, fast from cache |
| API calls, POST requests | Not cached | Never intercept server calls |

**Bumping the SW version:** Every deploy that changes a JS file should bump `CACHE_VERSION` in `sw.js`. Format: `fft-vN`. Current version is tracked in the constant at the top of the file.

---

## Architecture Notes

### Option A — Two Meal Systems (Current)

The core Loftin Method meal plan (`IF_PLAN_OFFICE`, `IF_PLAN_WFH` in `engine.js`) and the new Meal Explorer (`mealdb.js`) run in parallel. This was a deliberate decision to avoid breaking existing users before launch.

**Core plan** — powers the dashboard, 7-day rotation, meal scaling, swap system. Stable.  
**Meal Explorer** — powered by `mealdb.js`, UI coming post-launch. Expandable.

Migration to Option B (unified engine) is planned post-launch when there is stable revenue and time to refactor carefully.

### Boot Sequence

1. `migrate.js` runs — silently fixes any missing plan fields
2. `stripe.js` IIFE runs — checks subscription, restores from server, calls `initApp()`
3. `initApp()` loads plan from localStorage, renders dashboard
4. `ui.js` wires navigation

### iOS Data Reliability

iOS aggressively kills PWA processes and wipes localStorage. The app handles this with:
- Server restore on every boot via `restoreFromServer()` in `sync.js`
- Silent retry on network failure (3-second delay, one attempt)
- `saveAllData()` called on `visibilitychange` (hidden) so data is saved before iOS kills the process
- `sendBeacon` used for saves — survives app termination

---

## Environment Variables

Set these in Netlify dashboard under Site Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `NETLIFY_TOKEN` | Netlify API token for Blobs access |
| `ANTHROPIC_API_KEY` | Claude API key for restaurant/fridge/carb features |
| `STRIPE_SECRET_KEY` | Stripe secret key (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Stripe price ID for subscription product |

---

## Deployment

This app deploys via Netlify's Git integration. Every push to `main` triggers a deploy.

**Deploy checklist:**
1. Bump `CACHE_VERSION` in `sw.js` if any JS file changed
2. Syntax check changed JS files: `node --check js/filename.js`
3. Verify new JS files are added to `STATIC_ASSETS` in `sw.js`
4. Verify new JS files have a `<script src="js/filename.js">` tag in `app.html` in the correct load order
5. Push to `main`

**There is no local dev server.** The app runs directly from the filesystem or from the Netlify CDN. For testing, deploy to a Netlify preview branch.

---

## Pricing

- **Target:** $19.99/month
- **Stripe:** Test keys active, paywall bypassed for beta
- **To go live:** Swap test Stripe keys for live keys in `stripe.js` and Netlify environment variables, then remove the paywall bypass in `stripe.js` `finishBoot()` and `startJourney()`

---

## Known Technical Debt

1. **Two meal systems** — `IF_PLAN_OFFICE`/`IF_PLAN_WFH` and `mealdb.js` run in parallel. Planned unification post-launch (Option B migration).
2. **No local dev environment** — all testing happens on deployed Netlify previews.
3. **Single-file PWA** — `app.html` contains all HTML and CSS. CSS should eventually be extracted to a separate file for maintainability.
4. **No automated tests** — all testing is manual. Unit tests for `engine.js` and `macros.js` would be high value.

---

## Roadmap

**Pre-launch (current sprint):**
- [x] Silent plan migration
- [x] iOS data reliability
- [x] Device linking
- [x] Macros on meal cards, restaurants, fridge
- [x] Carb Lookup tool
- [x] Meal database schema and filter engine
- [ ] Dietary preferences (vegetarian, dairy-free, no pork, etc.)
- [ ] Stripe live keys + paywall re-enable
- [ ] Second dessert option

**Post-launch:**
- [ ] Meal Explorer UI (powered by mealdb.js)
- [ ] Custom recipes page
- [ ] Maintenance Day toggle
- [ ] Recipe Reference with scaled ingredients
- [ ] Restaurant page meal type + drink selectors
- [ ] Device linking auto-sync (currently manual)
- [ ] Lazy loading for JS modules
- [ ] Progress chart redesign
- [ ] Dashboard/Meals landscape mode (iPad cooking)
- [ ] Unified meal engine (Option B migration)

---

## Design System

All visual decisions are documented in `DESIGN.md` in the repo root. **Read it before making any visual change.** It covers:

- Color system and CSS variables
- Typography scale
- Component patterns (cards, buttons, toggles, modals)
- Spacing and layout rules
- Animation guidelines
- Dark theme implementation
- UX principles

The short version: dark warm neutrals, single gold accent, Playfair Display for headings, DM Sans for everything else. Restraint over decoration.

---

## Contact

**David Loftin**  
Loftin Method LLC  
david@fitforthem.app  
https://fitforthem.app
