// ─────────────────────────────────────────────────────────────
// lane-profiles.js — Loftin Method Four-Lane Nutrition Profiles
// Pure data. No DOM. No side effects. No dependencies.
// Load order: after migrate.js, before engine.js
//
// Four lanes:
//   men_deficit    — male, cutting
//   women_deficit  — female, cutting
//   men_surplus    — male, gaining
//   women_surplus  — female, gaining
//
// Meal ratios are LOCKED. Do not change without a product decision.
// ─────────────────────────────────────────────────────────────

var LANE_PROFILES = {

  men_deficit: {
    id:   'men_deficit',
    sex:  'male',
    mode: 'deficit',
    // Locked slot ratios — must sum to 1.0
    ratios: {
      first:   0.275,  // First Meal  — 27.5%
      dinner:  0.525,  // Main Meal   — 52.5%
      dessert: 0.200   // Final Meal  — 20.0%
    },
    // Meal composition bias — used by Meal Explorer and future Claude prompts
    bias: {
      protein:  'high',
      carb:     'moderate',
      fat:      'moderate',
      volume:   'high',       // large food volume for satiety
      texture:  'savory',
      dessert:  'yogurt-based'
    }
  },

  women_deficit: {
    id:   'women_deficit',
    sex:  'female',
    mode: 'deficit',
    // Same locked deficit ratios
    ratios: {
      first:   0.275,
      dinner:  0.525,
      dessert: 0.200
    },
    bias: {
      protein:  'high',
      carb:     'moderate',
      fat:      'moderate',
      volume:   'moderate',   // slightly less brute volume than men
      texture:  'varied',     // bowls, wraps, lighter savory
      dessert:  'yogurt-based'
    }
  },

  men_surplus: {
    id:   'men_surplus',
    sex:  'male',
    mode: 'surplus',
    // Locked gain ratios
    ratios: {
      first:   0.300,  // First Meal  — 30%
      dinner:  0.400,  // Main Meal   — 40%
      dessert: 0.300   // Final Meal  — 30%
    },
    bias: {
      protein:  'high',
      carb:     'high',       // bigger carb loads for surplus
      fat:      'moderate',
      volume:   'high',
      texture:  'dense',      // rice, pasta, burgers, energy-dense dinners
      dessert:  'calorie-dense'
    }
  },

  women_surplus: {
    id:   'women_surplus',
    sex:  'female',
    mode: 'surplus',
    // Same gain ratios
    ratios: {
      first:   0.300,
      dinner:  0.400,
      dessert: 0.300
    },
    bias: {
      protein:  'high',
      carb:     'moderate-high',
      fat:      'moderate',
      volume:   'moderate',   // calorie-dense but not overwhelming
      texture:  'varied',     // bowls, wraps, pasta, softer textures
      dessert:  'palatable'   // repeatable and appetite-friendly
    }
  }

};

// ── HELPERS ───────────────────────────────────────────────────

// Derive lane id from sex string and phase mode string
// sex: 'male' | 'female'
// mode: 'cut' | 'gain' | 'maintenance'
function getLaneId(sex, mode) {
  var s = (sex === 'female') ? 'women' : 'men';
  // maintenance uses deficit ratios — treat as deficit lane
  var m = (mode === 'gain') ? 'surplus' : 'deficit';
  return s + '_' + m;
}

// Get the full lane profile object
function getLaneProfile(sex, mode) {
  var id = getLaneId(sex, mode);
  return LANE_PROFILES[id] || LANE_PROFILES.men_deficit;
}

// Get locked slot ratios for current plan
// Returns {first, dinner, dessert} summing to 1.0
function getLaneRatios(sex, mode) {
  return getLaneProfile(sex, mode).ratios;
}
