// ─────────────────────────────────────────────────────────────
// carblookup.js — Loftin Method Carb & Macro Lookup
// Fast ingredient-by-ingredient nutrition lookup.
// Designed for diabetics and anyone counting carbs precisely.
// Globals used: none
// Depends on: macros.js (lookupMacros, renderMacroBar)
// ─────────────────────────────────────────────────────────────

var _carbLookupHistory = []; // session history of lookups

function openCarbLookup() {
  var modal = document.getElementById('carb-lookup-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(function() {
    var input = document.getElementById('cl-ingredient-input');
    if (input) input.focus();
  }, 200);
}

function closeCarbLookup() {
  var modal = document.getElementById('carb-lookup-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function carbLookupKeydown(e) {
  if (e.key === 'Enter') carbLookupSearch();
}

async function carbLookupSearch() {
  var input = document.getElementById('cl-ingredient-input');
  var amountInput = document.getElementById('cl-amount-input');
  var results = document.getElementById('cl-results');
  if (!input || !results) return;

  var ingredient = input.value.trim();
  if (!ingredient) { input.focus(); return; }

  var amount = parseInt(amountInput ? amountInput.value : 100) || 100;
  var unit = document.getElementById('cl-unit-select') ? document.getElementById('cl-unit-select').value : 'g';

  // Convert to grams
  var grams = amount;
  if (unit === 'oz') grams = Math.round(amount * 28.35);
  if (unit === 'cup') grams = Math.round(amount * 240);
  if (unit === 'tbsp') grams = Math.round(amount * 15);
  if (unit === 'tsp') grams = Math.round(amount * 5);

  results.innerHTML = '<div style="text-align:center;padding:24px;color:var(--t2);font-size:.85rem">Looking up <strong style="color:var(--t1)">' + ingredient + '</strong>…</div>';

  // Try local MACRO_TABLE first — instant, no API call needed
  var local = lookupMacros(ingredient);
  if (local) {
    var scale = grams / 100;
    var result = {
      name: ingredient,
      grams: grams,
      cal:  Math.round(local.cal  * scale),
      pro:  Math.round(local.pro  * scale * 10) / 10,
      carb: Math.round(local.carb * scale * 10) / 10,
      fat:  Math.round(local.fat  * scale * 10) / 10,
      source: 'USDA'
    };
    renderCarbResult(result, ingredient, amount, unit);
    return;
  }

  // Fall back to Claude API for anything not in local table
  try {
    var data = await askClaude(
      'USDA nutrition data for ' + ingredient + ' at ' + grams + 'g. ' +
      'Return ONLY this JSON with no other text: ' +
      '{"name":"' + ingredient + '","grams":' + grams + ',"cal":0,"pro":0,"carb":0,"fat":0,"fiber":0,"sugar":0,"serving_note":"brief note on typical serving"}'
    );

    var result = {
      name: data.name || ingredient,
      grams: grams,
      cal:  data.cal  || 0,
      pro:  data.pro  || 0,
      carb: data.carb || 0,
      fat:  data.fat  || 0,
      fiber: data.fiber || 0,
      sugar: data.sugar || 0,
      note: data.serving_note || '',
      source: 'USDA via AI'
    };
    renderCarbResult(result, ingredient, amount, unit);
  } catch(err) {
    results.innerHTML = '<div style="padding:16px;font-size:.84rem;color:var(--red)">⚠️ Could not look up that ingredient. Check your connection and try again.</div>';
  }
}

function renderCarbResult(result, rawIngredient, amount, unit) {
  var results = document.getElementById('cl-results');
  if (!results) return;

  // Net carbs = carbs - fiber
  var netCarb = result.fiber ? Math.round((result.carb - result.fiber) * 10) / 10 : null;

  var html =
    '<div style="background:linear-gradient(170deg,var(--s2),var(--s1));border:1px solid rgba(184,150,60,.35);border-top:2px solid rgba(184,150,60,.6);border-radius:14px;padding:20px;margin-bottom:12px">' +

      // Header
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">' +
        '<div style="font-size:1rem;font-weight:700;color:var(--t1);font-family:var(--font-display);flex:1">' + result.name + '</div>' +
        '<div style="font-size:.75rem;color:var(--t3);white-space:nowrap;margin-left:8px;padding-top:3px">' + result.grams + 'g</div>' +
      '</div>' +

      // Calories prominent
      '<div style="font-size:1.6rem;font-weight:700;color:var(--gold-light);margin-bottom:16px;font-family:var(--font-display)">' +
        result.cal + ' <span style="font-size:.8rem;font-weight:400;color:var(--t2)">cal</span>' +
      '</div>' +

      // Macro pills — carbs first for diabetic use case
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:' + (netCarb !== null ? '10' : '16') + 'px">' +
        _carbPill(result.carb + 'g', 'Total Carbs', 'rgba(74,144,184,.2)', '#7AB8D4', true) +
        _carbPill(result.pro  + 'g', 'Protein',     'rgba(184,150,60,.15)', 'var(--gold-light)', false) +
        _carbPill(result.fat  + 'g', 'Fat',          'rgba(180,100,60,.15)', '#C8785A', false) +
      '</div>' +

      // Net carbs — highlighted separately, critical for diabetics
      (netCarb !== null ?
        '<div style="background:rgba(74,144,184,.1);border:1px solid rgba(74,144,184,.3);border-radius:10px;padding:10px 14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<div style="font-size:.78rem;font-weight:700;color:#7AB8D4">Net Carbs</div>' +
            '<div style="font-size:.68rem;color:var(--t3);margin-top:2px">Total carbs minus fiber</div>' +
          '</div>' +
          '<div style="font-size:1.4rem;font-weight:700;color:#7AB8D4">' + netCarb + 'g</div>' +
        '</div>'
      : '') +

      // Fiber and sugar if available
      (result.fiber || result.sugar ?
        '<div style="display:flex;gap:16px;margin-bottom:14px;padding:10px 14px;background:rgba(0,0,0,.2);border-radius:8px">' +
          (result.fiber ? '<div><div style="font-size:.88rem;font-weight:600;color:var(--t2)">' + result.fiber + 'g</div><div style="font-size:.6rem;color:var(--t3);text-transform:uppercase;letter-spacing:.08em">Fiber</div></div>' : '') +
          (result.sugar ? '<div><div style="font-size:.88rem;font-weight:600;color:var(--t2)">' + result.sugar + 'g</div><div style="font-size:.6rem;color:var(--t3);text-transform:uppercase;letter-spacing:.08em">Sugar</div></div>' : '') +
        '</div>'
      : '') +

      // Serving note
      (result.note ?
        '<div style="font-size:.75rem;color:var(--t3);font-style:italic;margin-bottom:14px">' + result.note + '</div>'
      : '') +

      // Try different amount
      '<div style="font-size:.68rem;color:var(--t3);text-align:right">Source: ' + result.source + '</div>' +

    '</div>';

  // Add to session history
  _carbLookupHistory.unshift({ ingredient: rawIngredient, amount: amount, unit: unit, result: result });
  if (_carbLookupHistory.length > 10) _carbLookupHistory.pop();

  results.innerHTML = html + _renderCarbHistory();
}

function _carbPill(value, label, bg, color, large) {
  return '<div style="background:' + bg + ';border-radius:12px;padding:' + (large ? '10px 16px' : '8px 12px') + ';flex:1;min-width:80px;text-align:center">' +
    '<div style="font-size:' + (large ? '1.2rem' : '1rem') + ';font-weight:700;color:' + color + '">' + value + '</div>' +
    '<div style="font-size:.58rem;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:.08em;margin-top:2px">' + label + '</div>' +
  '</div>';
}

function _renderCarbHistory() {
  if (_carbLookupHistory.length <= 1) return '';
  var html = '<div style="margin-top:8px">' +
    '<div style="font-size:.6rem;font-weight:700;color:var(--t3);letter-spacing:.16em;text-transform:uppercase;font-family:var(--font-body);margin-bottom:10px">This Session</div>';

  _carbLookupHistory.slice(1).forEach(function(entry) {
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--s2);border:1px solid var(--gold-line);border-radius:10px;margin-bottom:8px;cursor:pointer" ' +
      'onclick="document.getElementById(\'cl-ingredient-input\').value=\'' + entry.ingredient.replace(/'/g, "\\'") + '\';' +
      'document.getElementById(\'cl-amount-input\').value=\'' + entry.amount + '\';carbLookupSearch()">' +
      '<div>' +
        '<div style="font-size:.88rem;font-weight:600;color:var(--t1)">' + entry.ingredient + '</div>' +
        '<div style="font-size:.72rem;color:var(--t2)">' + entry.amount + entry.unit + ' · ' + entry.result.cal + ' cal</div>' +
      '</div>' +
      '<div style="text-align:right">' +
        '<div style="font-size:.88rem;font-weight:700;color:#7AB8D4">' + entry.result.carb + 'g carbs</div>' +
        (entry.result.fiber ? '<div style="font-size:.68rem;color:var(--t3)">' + Math.round((entry.result.carb - entry.result.fiber) * 10) / 10 + 'g net</div>' : '') +
      '</div>' +
    '</div>';
  });

  html += '</div>';
  return html;
}
