# Loftin Method

A structured nutrition and meal planning PWA built around the Loftin Method — a precision intermittent fasting system for sustainable fat loss, lean gaining, and long-term maintenance.

**Status:** Live — subscription active  
**Live URL:** https://fitforthem.app/app.html  
**Staging URL:** https://staging--fitforthem.netlify.app/app.html  
**Owner:** David Parmer / Loftin Method LLC  
**Contact:** david@fitforthem.app

---

## What This App Does

The Loftin Method app is a decision engine for real-life eating. It does not ask users to log food manually. Instead it tells them exactly what to eat, how much, when, and what to order at any restaurant — all calculated from their personal biometrics.

**Core features:**
- Personalized calorie, protein, and step targets (Mifflin-St Jeor + Hybrid Bridge method)
- 7-day structured meal plan with First Meal, Main Meal, and Final Meal
- Per-slot calorie scaling — swapped meals always inherit the correct calorie budget
- Macro bar on every meal card, normalized to displayed slot calories
- Drinking day adjustments (Light / Regular / Big Night) with meal and step recalibration
- Restaurant finder — slot-aware, maximizes calories to budget, side recommendations
- Fridge builder — builds a meal from available ingredients scaled to the slot target
- Carb Lookup — instant USDA nutrition data for any ingredient
- Grocery list generator
- Weight and progress tracking
- Device linking — syncs data across phone, tablet, and desktop (iPad read-only weekly grid)
- PWA — installable on iOS and Android

**Supported lanes:**
- `men_deficit` — Men, fat loss
- `women_deficit` — Women, fat loss
- `men_surplus` — Men, lean gain
- `women_surplus` — Women, lean gain

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript (no framework), HTML, CSS |
| Fonts | Playfair Display, DM Sans (Google Fonts) |
| Hosting | Netlify Pro |
| Backend | Netlify Functions (Node.js) |
| Database | Netlify Blobs (key-value, device-ID based) |
| Payments | Stripe (live subscription — $9.99/month) |
| AI | Anthropic Claude API (restaurant finder, fridge builder, carb lookup) |
| PWA | Service Worker (`sw.js`) — network-first for HTML/JS, cache-first for assets |

---

## Repository Structure

```
/
├── app.html                    # Single-page app — all HTML and CSS
├── index.html                  # Public landing page
├── sw.js                       # Service worker — caching and offline support
├── manifest.json               # PWA manifest
├── DESIGN.md                   # Full design system — read before any visual changes
├── README.md                   # This file
│
├── js/                         # Client-side JavaScript modules (load order matters — see below)
│   ├── migrate.js              # Silent plan migration on boot — runs first
│   ├── state.js                # Global state declarations — runs second
│   ├── macros.js               # Macro calculation engine and display components
│   ├── mealdb.js               # Meal database (Meal Explorer — future feature)
│   ├── savedmeals.js           # Saved meal preferences persistence
│   ├── devicelink.js           # Device linking UI (6-digit code system)
│   ├── carblookup.js           # Carb and macro lookup tool
│   ├── sync.js                 # Server sync via Netlify Blobs
│   ├── lane-profiles.js        # Lane definitions (men/women, deficit/surplus)
│   ├── plan-templates.js       # 7-day meal template arrays for all four lanes
│   ├── swap-options.js         # SWAP_OPTIONS data, MEAL_INSTRUCTIONS, getMealInstructions()
│   ├── engine.js               # Calorie and plan calculation engine (pure math)
│   ├── meals.js                # Meal rendering, dashboard, swap system, macro normalization
│   ├── stripe.js               # Auth, subscription check, and app boot sequence
│   ├── grocery.js              # Grocery list generator
│   ├── progress.js             # Weight logging and progress charts
│   ├── restaurants.js          # Restaurant finder — slot-aware, side recommendations
│   ├── fridge.js               # Fridge meal builder — scales to slot calorie target
│   ├── history.js              # Meal history tracking
│   ├── ui.js                   # Navigation, mobile menu, light mode, tooltips
│   └── app-handlers.js         # iPad weekly grid, boot handlers, orientation management
│
└── netlify/
    └── functions/              # Netlify Functions (Node.js)
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
<script src="js/migrate.js"></script>        <!-- Must be first — migrates plan before anything renders -->
<script src="js/state.js"></script>          <!-- Global state declarations -->
<script src="js/macros.js"></script>         <!-- Macro engine — used by meals, restaurants, fridge -->
<script src="js/mealdb.js"></script>         <!-- Meal database (future Meal Explorer) -->
<script src="js/savedmeals.js"></script>     <!-- Saved meal prefs -->
<script src="js/devicelink.js"></script>     <!-- Device linking UI -->
<script src="js/carblookup.js"></script>     <!-- Carb lookup tool -->
<script src="js/sync.js"></script>           <!-- Data sync -->
<script src="js/lane-profiles.js"></script>  <!-- Lane definitions -->
<script src="js/plan-templates.js"></script> <!-- Meal template arrays -->
<script src="js/swap-options.js"></script>   <!-- SWAP_OPTIONS, MEAL_INSTRUCTIONS -->
<script src="js/engine.js"></script>         <!-- Calorie engine -->
<script src="js/meals.js"></script>          <!-- Meal rendering and swap system -->
<script src="js/stripe.js"></script>         <!-- Boot sequence — subscription check -->
<script src="js/grocery.js"></script>
<script src="js/progress.js"></script>
<script src="js/restaurants.js"></script>
<script src="js/fridge.js"></script>
<script src="js/history.js"></script>
<script src="js/ui.js"></script>             <!-- Navigation — loads before app-handlers -->
<script src="js/app-handlers.js"></script>   <!-- Must be last -->
```

---

## Calorie Engine Architecture

### Lanes and Slot Ratios

Every user is assigned to one of four lanes based on sex and goal:

| Lane | First Meal | Main Meal | Final Meal |
|------|-----------|-----------|------------|
| `men_deficit` | 27.5% | 52.5% | 20.0% |
| `women_deficit` | 27.5% | 52.5% | 20.0% |
| `men_surplus` | 30.0% | 40.0% | 30.0% |
| `women_surplus` | 30.0% | 40.0% | 30.0% |

### Meal Slot Scaling

Every meal slot has a calorie budget derived from the user's daily plan:

```javascript
targetFirstCal  = round(foodCal * laneRatios.first)
targetDinnerCal = round(foodCal * laneRatios.dinner)
targetDessertCal = foodCal - targetFirstCal - targetDinnerCal
```

`foodCal` is the daily calorie target minus any drink reserve (for drinking nights).

**Per-slot ingredient scaling:** Each slot scales independently. `ingScale = targetSlotCal / slotBaseCal`. This ensures swapped meals always inherit the correct calorie budget regardless of their base calories.

**Macro normalization:** After calculating macros from ingredient amounts, they are normalized so macro-implied calories (pro×4 + carb×4 + fat×9) match the displayed slot calorie. This keeps the macro bar consistent with what the user sees.

### Drink Reserve

| Level | Reserve |
|-------|---------|
| Light | 200 cal |
| Regular | 450 cal |
| Big | 700 cal |

### Meal Resolution Priority (per slot)

```
customMeals (just-today swap) → mealPrefs (permanent swap) → template
```

---

## Key Global Variables

Declared in `state.js`. Do not redeclare in other modules.

| Variable | Type | Description |
|----------|------|-------------|
| `currentPlan` | Object | The user's active nutrition plan |
| `userName` | String | User's first name |
| `workMode` | String | `'office'` or `'wfh'` |
| `weightLog` | Array | `[{d: 'YYYY-MM-DD', w: number}]` |
| `mealPrefs` | Object | Permanent meal swaps by day and slot |
| `proteinSwaps` | Object | Protein rotation overrides by day index |
| `skippedMeals` | Object | Skipped meals by day index |
| `customMeals` | Array | Restaurant, fridge, and just-today swap meals |
| `drinkingDays` | Object | Drinking level by day (`false`, `'light'`, `'regular'`, `'big'`) |
| `currentDayIdx` | Number | Currently viewed day (0=Mon, 6=Sun) |
| `eoMealType` | String | Selected slot in restaurant feature (`'first'`, `'dinner'`, `'dessert'`) |

---

## Data Persistence

**localStorage** (primary, fast)

| Key | Contents |
|-----|----------|
| `fft_plan` | Current nutrition plan (JSON) |
| `fft_name` | User's first name |
| `fft_workmode` | `'office'` or `'wfh'` |
| `fft_log` | Weight log array (JSON) |
| `fft_meal_prefs` | Permanent meal swap preferences (JSON) |
| `fft_swaps` | Protein rotation swaps (JSON) |
| `fft_skipped` | Skipped meals (JSON) |
| `fft_custom` | Custom/restaurant/fridge meals (JSON) |
| `fft_group_id` | Device group ID for multi-device sync |

**Netlify Blobs** (server backup)

iOS aggressively clears localStorage. All data is backed up to Netlify Blobs on every save, keyed by device ID (cookie `fft_device`). On boot, `restoreFromServer()` restores from the server if localStorage is empty.

Device linking maps multiple device IDs to the same server blob, enabling cross-device sync. iPad devices are read-only — they pull data but never push.

---

## Deployment

**Branch strategy:**
- `staging` branch → `staging--fitforthem.netlify.app` — test everything here first
- `main` branch → `fitforthem.app` — production, only merge when staging passes

**Workflow:**
```bash
# Make changes, test on staging first
git add js/filename.js
git commit -m "description"
git pull origin staging
git push origin main:staging   # pushes local main to remote staging

# When staging passes, merge to main
git push origin main
```

**Deploy checklist:**
1. Bump `CACHE_VERSION` in `sw.js` if any JS file changed
2. Syntax check: `node --check js/filename.js`
3. Test on iPhone at staging URL before merging to main

---

## Pricing

- **Price:** $9.99/month
- **Stripe:** Live keys active
- **Whitelisted devices:** Can bypass paywall for testing (see `stripe.js`)

---

## Environment Variables

Set in Netlify dashboard → Site Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `NETLIFY_TOKEN` | Netlify API token for Blobs access |
| `ANTHROPIC_API_KEY` | Claude API key |
| `STRIPE_SECRET_KEY` | Stripe secret key (live) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Stripe price ID (`price_1TXUcP7SIAqrERB3dFl78QEU`) |

---

## Known Technical Debt

1. **Two meal systems** — `plan-templates.js` (active plan engine) and `mealdb.js` (future Meal Explorer) run in parallel. Unification planned post-launch.
2. **No local dev environment** — all testing happens on deployed Netlify staging branch.
3. **Single-file PWA** — `app.html` contains all HTML and CSS. CSS extraction planned post-launch.
4. **No automated tests** — all testing is manual. Unit tests for `engine.js` and `macros.js` would be high value.
5. **Women's deficit content gap** — women's lane has fewer meal varieties than men's. Ongoing improvement.
6. **Raw-vs-cooked macro mismatch on template meals** — partially addressed via macro normalization. Full resolution requires updating `c:` base values in `plan-templates.js` to match MACRO_TABLE.

---

## Roadmap

**Active (pre-main merge):**
- [x] Per-slot calorie scaling for meal swaps
- [x] Macro normalization on all meal surfaces
- [x] Restaurant feature — slot-aware, maximizes budget, side recommendations
- [x] Fridge builder — slot-aware, practical meal names, macro reconciliation
- [x] iPad weekly grid (read-only, pulls from phone via group sync)
- [x] Meal card open-state persistence on re-renders
- [x] Footer day macro totals
- [x] Women's deficit Final Meal fix
- [x] MACRO_TABLE expanded (raw proteins, vegetables, dark chocolate)

**Planned (post-main):**
- [ ] Women's deficit lane content expansion (more meal varieties)
- [ ] Light theme (wife-requested)
- [ ] Emoji cleanup pass across all pages
- [ ] Protein floor warning when daily protein drops too low
- [ ] Slot swapping (e.g. larger lunch, lighter dinner)
- [ ] Maintenance Day toggle
- [ ] Meal Explorer UI (powered by `mealdb.js`)
- [ ] Unified meal engine (single source of truth for all meal surfaces)
- [ ] Lazy loading for JS modules
- [ ] Automated tests for `engine.js` and `macros.js`

---

## Design System

All visual decisions are documented in `DESIGN.md`. **Read it before making any visual change.**

Short version: dark warm neutrals, single gold accent (`--gold`), Playfair Display for headings, DM Sans for body. Restraint over decoration. The app should feel like a precision instrument, not a wellness product.

---

## Contact

**David Parmer**  
Loftin Method LLC  
david@fitforthem.app  
https://fitforthem.app
