// ─────────────────────────────────────────────────────────────
// macros.js — Loftin Method Macro Engine
// Calculates and renders carbs, fat, protein for all meal surfaces.
// Used by: meals.js (meal cards), restaurants.js, fridge.js
// No DOM dependencies at load time — pure calculation + HTML generation.
// ─────────────────────────────────────────────────────────────

// ── USDA MACRO TABLE ─────────────────────────────────────────
// Macros per 100g. Values are cooked/as-served where applicable.
// Sources: USDA FoodData Central.
var MACRO_TABLE = {
  // Proteins
  'chicken':        { cal: 165, pro: 31.0, carb: 0.0,  fat: 3.6  },
  'beef':           { cal: 207, pro: 26.0, carb: 0.0,  fat: 11.0 },
  'sirloin':        { cal: 207, pro: 26.0, carb: 0.0,  fat: 11.0 },
  'salmon':         { cal: 208, pro: 20.0, carb: 0.0,  fat: 13.0 },
  'fish':           { cal: 208, pro: 20.0, carb: 0.0,  fat: 13.0 },
  'shrimp':         { cal: 99,  pro: 24.0, carb: 0.0,  fat: 0.3  },
  'turkey':         { cal: 189, pro: 29.0, carb: 0.0,  fat: 7.0  },
  'eggs':           { cal: 143, pro: 13.0, carb: 1.0,  fat: 10.0 },
  'egg whites':     { cal: 52,  pro: 11.0, carb: 0.7,  fat: 0.2  },
  'egg white':      { cal: 52,  pro: 11.0, carb: 0.7,  fat: 0.2  },
  'egg':            { cal: 143, pro: 13.0, carb: 1.0,  fat: 10.0 },
  // Raw proteins — used when ingredient strings carry raw gram weights (templates, SWAP_OPTIONS)
  // Values: USDA FoodData Central, raw/uncooked per 100g.
  // Longer keys beat shorter ones in lookupMacros, so these correctly override
  // 'chicken', 'beef', 'salmon', 'turkey' for specifically-named template ingredients.
  'chicken breast':  { cal: 120, pro: 22.5, carb: 0.0, fat: 2.6  },
  'beef sirloin':    { cal: 143, pro: 20.7, carb: 0.0, fat: 5.8  },
  'salmon fillet':   { cal: 142, pro: 19.8, carb: 0.0, fat: 6.3  },
  'turkey breast':   { cal: 119, pro: 17.4, carb: 0.0, fat: 5.0  },

  // Dairy
  'cottage cheese': { cal: 98,  pro: 11.0, carb: 3.4,  fat: 4.3  },
  'cottage':        { cal: 98,  pro: 11.0, carb: 3.4,  fat: 4.3  },
  'greek yogurt':   { cal: 73,  pro: 6.0,  carb: 6.0,  fat: 2.0  },
  'nonfat greek yogurt': { cal: 59, pro: 10.0, carb: 3.6, fat: 0.4 },
  'nonfat yogurt':  { cal: 59,  pro: 10.0, carb: 3.6,  fat: 0.4  },
  '2% greek yogurt':{ cal: 73,  pro: 9.0,  carb: 5.0,  fat: 2.0  },
  'yogurt':         { cal: 73,  pro: 6.0,  carb: 6.0,  fat: 2.0  },
  'ricotta':        { cal: 174, pro: 11.0, carb: 3.0,  fat: 13.0 },
  'cheese':         { cal: 402, pro: 25.0, carb: 1.3,  fat: 33.0 },
  'parmesan':       { cal: 431, pro: 38.0, carb: 4.0,  fat: 29.0 },
  'sour cream':     { cal: 193, pro: 2.0,  carb: 4.0,  fat: 19.0 },
  'sour':           { cal: 193, pro: 2.0,  carb: 4.0,  fat: 19.0 },
  // Carbs — cooked values
  'potato':         { cal: 77,  pro: 2.0,  carb: 17.0, fat: 0.1  },
  'potatoes':       { cal: 77,  pro: 2.0,  carb: 17.0, fat: 0.1  },
  'oats':           { cal: 389, pro: 17.0, carb: 66.0, fat: 7.0  },
  'oat':            { cal: 389, pro: 17.0, carb: 66.0, fat: 7.0  },
  'banana':         { cal: 89,  pro: 1.1,  carb: 23.0, fat: 0.3  },
  'blueberries':    { cal: 57,  pro: 0.7,  carb: 14.0, fat: 0.3  },
  'blueberry':      { cal: 57,  pro: 0.7,  carb: 14.0, fat: 0.3  },
  'chia':           { cal: 486, pro: 17.0, carb: 42.0, fat: 31.0 },
  'rice':           { cal: 130, pro: 2.7,  carb: 28.0, fat: 0.3  }, // cooked — backward compat
  'white rice':     { cal: 365, pro: 7.0,  carb: 80.0, fat: 0.7  }, // dry grams — new meals use this
  'pasta':          { cal: 371, pro: 13.0, carb: 75.0, fat: 1.5  }, // dry grams
  'black beans':    { cal: 91,  pro: 6.0,  carb: 16.0, fat: 0.5  },
  // Fats / nuts
  'peanut butter':  { cal: 588, pro: 25.0, carb: 20.0, fat: 50.0 },
  'olive oil':      { cal: 884, pro: 0.0,  carb: 0.0,  fat: 100.0},
  'butter':         { cal: 717, pro: 0.9,  carb: 0.1,  fat: 81.0 },
  // Condiments / sauces
  'honey':          { cal: 304, pro: 0.3,  carb: 82.0, fat: 0.0  },
  'soy sauce':      { cal: 53,  pro: 8.0,  carb: 5.0,  fat: 0.0  },
  'soy':            { cal: 53,  pro: 8.0,  carb: 5.0,  fat: 0.0  },
  'salsa':          { cal: 36,  pro: 1.5,  carb: 7.0,  fat: 0.3  },
  'red sauce':      { cal: 72,  pro: 2.0,  carb: 11.0, fat: 2.5  },
  'marinara':       { cal: 72,  pro: 2.0,  carb: 11.0, fat: 2.5  },
  'creamy sauce':   { cal: 90,  pro: 3.0,  carb: 6.0,  fat: 6.0  },
  'taco seasoning': { cal: 290, pro: 11.0, carb: 54.0, fat: 7.0  },
  'italian seasoning': { cal: 260, pro: 9.0, carb: 46.0, fat: 7.0 },
  'ketchup':        { cal: 112, pro: 1.3,  carb: 27.0, fat: 0.1  },
  'mustard':        { cal: 66,  pro: 4.4,  carb: 6.0,  fat: 3.3  },
  'pickles':        { cal: 11,  pro: 0.3,  carb: 2.3,  fat: 0.2  },
  'pickle':         { cal: 11,  pro: 0.3,  carb: 2.3,  fat: 0.2  },
  'onion':          { cal: 40,  pro: 1.1,  carb: 9.0,  fat: 0.1  },
  // Cookies / sweets
  'biscoff':        { cal: 488, pro: 5.0,  carb: 67.0, fat: 22.0 },
  'cookie':         { cal: 488, pro: 5.0,  carb: 67.0, fat: 22.0 },
  'cookies':        { cal: 488, pro: 5.0,  carb: 67.0, fat: 22.0 },
  // Chocolate — raw/as-eaten values per 100g (USDA FoodData Central)
  'dark chocolate':  { cal: 598, pro: 7.8,  carb: 45.9, fat: 42.6 },
  'chocolate bar':   { cal: 535, pro: 7.6,  carb: 59.0, fat: 29.7 },
  'chocolate':       { cal: 535, pro: 7.6,  carb: 59.0, fat: 29.7 },
};

// ── LOOKUP ────────────────────────────────────────────────────
// Match an ingredient string to a macro entry.
// Tries longest match first so "sour cream" beats "sour".
function lookupMacros(ingredientName) {
  var n = ingredientName.toLowerCase();
  var keys = Object.keys(MACRO_TABLE).sort(function(a, b) {
    return b.length - a.length; // longest key first
  });
  for (var i = 0; i < keys.length; i++) {
    if (n.indexOf(keys[i]) >= 0) return MACRO_TABLE[keys[i]];
  }
  return null;
}

// ── PARSE INGREDIENT STRING ───────────────────────────────────
// Accepts strings like "Chicken 227g", "Honey 40g", "Biscoff cookies 2"
// Returns { name, grams, macros } or null if can't parse.
function parseMacroIngredient(ingredientStr) {
  // Match "4 eggs" or "4 egg" — number-first egg format from eggsGtoCount()
  var mEgg = ingredientStr.match(/^(\d+)\s*eggs?$/i);
  if (mEgg) {
    var count = parseInt(mEgg[1]);
    var totalG = count * 50; // ~50g per large egg (USDA)
    var macros = MACRO_TABLE['eggs'];
    var scale = totalG / 100;
    return {
      name: 'eggs',
      grams: totalG,
      cal:  Math.round(macros.cal  * scale),
      pro:  Math.round(macros.pro  * scale * 10) / 10,
      carb: Math.round(macros.carb * scale * 10) / 10,
      fat:  Math.round(macros.fat  * scale * 10) / 10,
    };
  }

  // Match "Name Xg" format
  var mGrams = ingredientStr.match(/^(.*?)(\d+)g\s*$/i);
  if (mGrams) {
    var name = mGrams[1].trim();
    var grams = parseInt(mGrams[2]);
    var macros = lookupMacros(name);
    if (!macros) return null;
    var scale = grams / 100;
    return {
      name: name,
      grams: grams,
      cal:  Math.round(macros.cal  * scale),
      pro:  Math.round(macros.pro  * scale * 10) / 10,
      carb: Math.round(macros.carb * scale * 10) / 10,
      fat:  Math.round(macros.fat  * scale * 10) / 10,
    };
  }

  // Match "Biscoff cookies 2" — count-based items
  var mCount = ingredientStr.match(/^(.*?)\s+(\d+)\s*$/);
  if (mCount) {
    var name = mCount[1].trim();
    var count = parseInt(mCount[2]);
    var macros = lookupMacros(name);
    if (!macros) return null;
    // Biscoff cookie ~8g each
    var gEach = name.toLowerCase().indexOf('cookie') >= 0 ? 8 : 50;
    var totalG = count * gEach;
    var scale = totalG / 100;
    return {
      name: name,
      grams: totalG,
      cal:  Math.round(macros.cal  * scale),
      pro:  Math.round(macros.pro  * scale * 10) / 10,
      carb: Math.round(macros.carb * scale * 10) / 10,
      fat:  Math.round(macros.fat  * scale * 10) / 10,
    };
  }

  return null;
}

// ── CALCULATE MEAL MACROS ─────────────────────────────────────
// Takes an array of ingredient strings (already scaled to final grams).
// Returns { cal, pro, carb, fat } totals.
function calcMealMacros(ingredients) {
  var totals = { cal: 0, pro: 0, carb: 0, fat: 0 };
  ingredients.forEach(function(ing) {
    // Strip HTML tags (formatIngredient adds spans)
    var clean = ing.replace(/<[^>]*>/g, '').trim();
    // Strip parenthetical unit conversions e.g. "(8.3 oz)" added by formatIngredient
    clean = clean.replace(/\s*\([^)]*\)\s*$/, '').trim();
    // Strip trailing store unit text e.g. "9.2 oz" that isn't in parens
    clean = clean.replace(/\s+[\d.]+\s*(oz|lbs?|kg)\s*$/i, '').trim();
    var parsed = parseMacroIngredient(clean);
    if (parsed) {
      totals.cal  += parsed.cal;
      totals.pro  += parsed.pro;
      totals.carb += parsed.carb;
      totals.fat  += parsed.fat;
    }
  });
  return {
    cal:  Math.round(totals.cal),
    pro:  Math.round(totals.pro * 10) / 10,
    carb: Math.round(totals.carb * 10) / 10,
    fat:  Math.round(totals.fat * 10) / 10,
  };
}

// ── RENDER MACRO BAR ──────────────────────────────────────────
// Returns HTML for a compact macro display.
// style: 'bar' (meal cards) | 'row' (restaurant/fridge cards)
function renderMacroBar(macros, style) {
  if (!macros || (!macros.pro && !macros.carb && !macros.fat)) return '';

  if (style === 'row') {
    // Horizontal pill row — used in restaurant and fridge cards
    return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
      _macroPill(macros.pro  + 'g', 'Protein', 'rgba(184,150,60,.15)',  'var(--gold-light)') +
      _macroPill(macros.carb + 'g', 'Carbs',   'rgba(74,144,184,.12)',  '#7AB8D4') +
      _macroPill(macros.fat  + 'g', 'Fat',      'rgba(180,100,60,.12)', '#C8785A') +
    '</div>';
  }

  // Compact inline bar — used inside meal cards
  return '<div style="display:flex;gap:6px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(184,150,60,.08)">' +
    _macroChip(macros.pro  + 'g', 'PRO', '#B8963C') +
    _macroChip(macros.carb + 'g', 'CARB', '#4A90B8') +
    _macroChip(macros.fat  + 'g', 'FAT', '#A0624A') +
  '</div>';
}

function _macroPill(value, label, bg, color) {
  return '<div style="background:' + bg + ';border-radius:20px;padding:5px 12px;display:flex;align-items:baseline;gap:4px">' +
    '<span style="font-size:.88rem;font-weight:700;color:' + color + '">' + value + '</span>' +
    '<span style="font-size:.6rem;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.08em">' + label + '</span>' +
  '</div>';
}

function _macroChip(value, label, color) {
  return '<div style="display:flex;align-items:baseline;gap:3px">' +
    '<span style="font-size:.8rem;font-weight:700;color:' + color + '">' + value + '</span>' +
    '<span style="font-size:.58rem;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">' + label + '</span>' +
  '</div>';
}
