// ─────────────────────────────────────────────────────────────
// migrate.js — Loftin Method Silent Plan Migration
// Runs on every boot, BEFORE any rendering or engine logic.
// Fills in missing currentPlan fields without touching existing data.
// Load order: FIRST — before engine.js, sync.js, and all other modules.
// ─────────────────────────────────────────────────────────────

// Current schema version. Bump this whenever you add new fields.
var PLAN_SCHEMA_VERSION = 4;

// ── PLAN DEFAULTS ────────────────────────────────────────────
// Every field that currentPlan can contain, with a safe default.
// Defaults for derived fields (wStepsLight, wStepsBig, etc.) are
// computed relative to existing values where possible — see
// applySmartDefaults() below.
var PLAN_FIELD_DEFAULTS = {
  // Core biometrics
  hIn:           0,
  wLbs:          0,
  age:           30,
  goalWeight:    0,

  // Target zone object — {low, mid, high}
  tz:            null,

  // Bridge reference — {bridge, ref}
  bridge:        null,

  // Calorie engine
  maintenance:   0,
  calLow:        0,
  cal:           0,
  calHigh:       0,
  protein:       0,

  // Phase
  phase:         'moderate',
  phaseLabel:    '',
  phaseMsg:      '',

  // Steps — regular day
  steps:         0,

  // Steps — drinking day variants (added in schema v2)
  wStepsLight:   0,
  wSteps:        0,
  wStepsBig:     0,

  // Burn targets used to calculate each step count (added in schema v2)
  burnNormal:    500,
  burnLight:     650,
  burnDrink:     750,
  burnBig:       900,

  // Meal times — {first, second, last}
  mealTimes:     null,

  // Weekly rotation array
  rotation:      null,

  // Weekly loss estimate object
  lossData:      null,

  // Temporary milestone weight
  tmp:           0,

  // Work mode string — 'office' | 'wfh'
  workMode:      'office',

  // Sex — 'male' | 'female' — added in schema v4
  sex:           'male',

  // Lane — derived from sex + phase mode — added in schema v4
  lane:          'men_deficit',

  // Schema version stamp — added in schema v3
  _schemaVersion: PLAN_SCHEMA_VERSION
};

// ── SMART DEFAULTS ────────────────────────────────────────────
// For fields that can be derived from existing plan data,
// compute them rather than using a dumb fallback.
// This runs AFTER the basic field fill so we can read existing values.
function applySmartDefaults(plan) {

  // wSteps, wStepsLight, wStepsBig — derive from steps if missing OR zero
  // Zero values indicate a corrupted merge — treat them the same as missing.
  if ((!plan.wSteps || plan.wSteps === 0) && plan.steps) {
    // Use the same ratios generatePlan() uses:
    // burnLight = burnNormal + 150
    // burnDrink = burnNormal + 250
    // burnBig   = burnNormal + 400
    // We can't re-run calcSteps() at migration time (no weight/height
    // guarantee that engine is loaded), so we scale proportionally.
    var ratio = plan.steps > 0 ? plan.steps : 1;
    var burnN = plan.burnNormal || 500;

    // Approximate step deltas using the same linear proportion
    // calcSteps uses burn / (MET * ...) — so steps scale with burn.
    plan.wStepsLight = Math.round((ratio * (burnN + 150) / burnN) / 500) * 500;
    plan.wSteps      = Math.round((ratio * (burnN + 250) / burnN) / 500) * 500;
    plan.wStepsBig   = Math.round((ratio * (burnN + 400) / burnN) / 500) * 500;
  }

  // burnLight / burnDrink / burnBig — derive from burnNormal if missing or zero
  if ((!plan.burnLight || plan.burnLight === 0) && plan.burnNormal) {
    plan.burnLight = plan.burnNormal + 150;
    plan.burnDrink = plan.burnNormal + 250;
    plan.burnBig   = plan.burnNormal + 400;
  }

  // tmp — derive as (wLbs - 10) if missing
  if (!plan.tmp && plan.wLbs) {
    plan.tmp = plan.wLbs - 10;
  }

  // workMode — fall back to stored workmode key if missing on plan
  if (!plan.workMode) {
    try {
      var stored = localStorage.getItem('fft_workmode');
      plan.workMode = stored || 'office';
    } catch(e) {
      plan.workMode = 'office';
    }
  }

  // sex — default to 'male' for all existing plans (backward compat)
  if (!plan.sex) {
    plan.sex = 'male';
  }

  // lane — derive from sex + phase mode if missing
  if (!plan.lane) {
    var phaseName = plan.phase || 'moderate';
    var isGain = phaseName === 'moderate_gain' || phaseName === 'mild_gain' || phaseName === 'landing_gain';
    var laneMode = isGain ? 'surplus' : 'deficit';
    var laneSex = plan.sex === 'female' ? 'women' : 'men';
    plan.lane = laneSex + '_' + laneMode;
  }

  return plan;
}

// ── CORE MIGRATION FUNCTION ───────────────────────────────────
// Call this immediately after reading currentPlan from localStorage.
// Returns the (possibly updated) plan. Always safe to call — it is
// a no-op if the plan is already on the current schema version.
function migratePlan(plan) {
  if (!plan || typeof plan !== 'object') return plan;

  var previousVersion = plan._schemaVersion || 1;
  var fieldsAdded = [];
  var needsSave = false;

  // Always run smart defaults — catches zero values from corrupted merges
  // regardless of schema version stamp.
  plan = applySmartDefaults(plan);

  // If already on current schema version and smart defaults made no changes,
  // we still stamp and save if fields were zeroed out (detected above).
  if (plan._schemaVersion === PLAN_SCHEMA_VERSION && previousVersion === PLAN_SCHEMA_VERSION) {
    // Check if smart defaults actually fixed anything by re-reading step values
    // If wSteps is now non-zero but wasn't before, we need to persist
    needsSave = (plan.wSteps > 0 || plan.wStepsLight > 0 || plan.wStepsBig > 0);
    if (!needsSave) return plan; // Truly current — nothing to do
  }

  // Fill in any missing fields with defaults
  Object.keys(PLAN_FIELD_DEFAULTS).forEach(function(key) {
    if (plan[key] === undefined || plan[key] === null) {
      var def = PLAN_FIELD_DEFAULTS[key];
      if (def !== null) {
        plan[key] = def;
        fieldsAdded.push(key);
      }
    }
  });

  // Stamp the schema version
  plan._schemaVersion = PLAN_SCHEMA_VERSION;

  // 4. Persist the migrated plan silently
  try {
    localStorage.setItem('fft_plan', JSON.stringify(plan));
  } catch(e) {}

  // 5. Dev log — one line, silent in spirit, useful for debugging
  console.log('[FFT-MIGRATE] Plan migrated from schema v' + previousVersion +
    ' → v' + PLAN_SCHEMA_VERSION +
    (fieldsAdded.length ? ' | Added: ' + fieldsAdded.join(', ') : ''));

  return plan;
}

// ── BOOT HOOK ─────────────────────────────────────────────────
// Reads currentPlan from localStorage, migrates it, and sets the
// global. Call this once on boot before any other module runs.
// Safe to call even if no plan exists yet (new user).
function runPlanMigration() {
  try {
    var raw = localStorage.getItem('fft_plan');
    if (!raw) return; // New user — no plan to migrate
    var plan = JSON.parse(raw);
    currentPlan = migratePlan(plan);
  } catch(e) {
    // Corrupt plan — leave it alone, generatePlan() will overwrite
    console.warn('[FFT-MIGRATE] Could not parse stored plan:', e);
  }
}
