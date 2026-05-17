// ─────────────────────────────────────────────────────────────
// app-handlers.js — Loftin Method App-Level UI Handlers
// Weekly grid (iPad landscape), Recipes page, Dinner theme UI.
// Previously lived as an inline <script> in app.html.
// Load order: last — after all other modules.
// Depends on: engine.js (getActivePlan, getSlotCalorieTargets)
//             meals.js (getResolvedDinner, getMealInstructions, eggsGtoCount)
//             state.js (currentPlan, mealPrefs, drinkingDays, dinnerTheme)
//             swap-options.js (DINNER_THEME_FAMILIES, SWAP_OPTIONS)
// ─────────────────────────────────────────────────────────────

// ── DEVICE FLAG ───────────────────────────────────────────────
// Set once at boot. All iPad-specific logic checks window.FFT_IS_IPAD.
// Avoids calling isIpad() repeatedly and gives a single place to override.
window.FFT_IS_IPAD = false; // default — overwritten below after isIpad() is defined

// ── WEEKLY GRID — iPad landscape overlay ──────────────────────

var _wgSwapDayIdx = null;

function isIpad() {
  // Covers modern iPadOS (reports as Mac in some browsers) and classic iPad UA
  var ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;
  // iPadOS 13+ with desktop UA — detect via touch + large screen
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true;
  return false;
}

function isLandscape() {
  if (screen.orientation && screen.orientation.type) {
    return screen.orientation.type.indexOf('landscape') >= 0;
  }
  // Fallback for older iOS
  return window.innerWidth > window.innerHeight;
}

function checkWeeklyGrid() {
  if (!isIpad()) return;
  if (isLandscape()) {
    openWeeklyGrid();
  } else {
    closeWeeklyGrid();
  }
}

function openWeeklyGrid() {
  if (!currentPlan || !currentPlan.cal) return; // no plan built yet — don't show
  renderWeeklyGrid();
  document.getElementById('weekly-grid-overlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeWeeklyGrid() {
  document.getElementById('weekly-grid-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

function renderWeeklyGrid() {
  var plan = getActivePlan();
  if (!plan || !plan.length) return;

  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var slots = [
    { key: 'first',   label: 'First Meal' },
    { key: 'dinner',  label: 'Main Meal'  },
    { key: 'dessert', label: 'Final Meal' }
  ];

  // Plan name header
  var sex = (currentPlan && currentPlan.sex) ? currentPlan.sex : 'male';
  document.getElementById('wg-plan-name').textContent = sex === 'female' ? 'Her Weekly Meal Plan' : 'Weekly Meal Plan';

  // ── HEADER ROW ──────────────────────────────────────────────
  var headHTML = '<tr>';
  headHTML += '<th style="'+thBase()+'width:90px;text-align:left;color:var(--t3);font-size:.65rem;letter-spacing:.1em;text-transform:uppercase">Meal</th>';
  days.forEach(function(day, idx) {
    var dayPlan = plan[idx] || {};
    var activeDrink = drinkingDays && drinkingDays[idx];
    var staticDrink = dayPlan.drinks;
    var _dlabels = { light: 'Light Night', regular: 'Regular', big: 'Big Night' };
    var drinkText = activeDrink ? (_dlabels[activeDrink] || '') : staticDrink ? 'Drinks' : '';
    var drinkColor = activeDrink ? 'var(--gold)' : 'var(--t3)';
    headHTML += '<th style="'+thBase()+'text-align:center;color:var(--gold-light);font-size:.78rem;font-weight:700">' +
      day +
      '<div style="font-size:.6rem;color:' + drinkColor + ';margin-top:3px;font-weight:500;min-height:14px">' + drinkText + '</div>' +
    '</th>';
  });
  headHTML += '</tr>';
  document.getElementById('weekly-grid-head').innerHTML = headHTML;

  // ── BODY ROWS ───────────────────────────────────────────────
  var bodyHTML = '';
  slots.forEach(function(slot, sIdx) {
    var isMain = slot.key === 'dinner';
    var rowBg = sIdx % 2 === 0 ? 'background:rgba(255,255,255,.02)' : 'background:rgba(0,0,0,.08)';
    bodyHTML += '<tr>';

    // Row label cell
    bodyHTML += '<td style="'+tdBase()+rowBg+';color:var(--gold);font-size:.72rem;font-weight:700;font-family:var(--font-body);letter-spacing:.04em;vertical-align:top;padding-top:14px">' + slot.label + '</td>';

    // Day cells
    days.forEach(function(day, dIdx) {
      var dayPlan = plan[dIdx] || {};

      // Resolve slot data — dinner uses shared getResolvedDinner() for full priority chain
      var permPref = !isMain && mealPrefs && mealPrefs[dIdx] && mealPrefs[dIdx][slot.key];
      var slotData;
      var isThemed = false;
      if (isMain && typeof getResolvedDinner === 'function') {
        var rd = getResolvedDinner(dIdx);
        slotData = rd ? { i: rd.i, c: rd.c } : (dayPlan[slot.key] || {});
        isThemed = rd && rd.source === 'theme';
      } else if (permPref) {
        slotData = { i: permPref.items, c: permPref.cal };
      } else {
        slotData = dayPlan[slot.key] || {};
      }

      var ingredients = slotData.i || [];
      var isSwapped = !!permPref && !isMain;
      var cellContent = ingredients.map(function(ing) {
        var eggM = ing.match(/^(Whole\s+)?Eggs?\s*(\d+)(g)$/i);
        var isEggWhite = /white/i.test(ing);
        var displayIng = (eggM && !isEggWhite) ? eggsGtoCount(parseInt(eggM[2])) : ing;
        return '<div style="font-size:.72rem;color:var(--t1);padding:1px 0;line-height:1.4">' + displayIng + '</div>';
      }).join('');
      // Subtle indicator when a permanent swap is active
      if (isSwapped) {
        cellContent += '<div style="font-size:.55rem;color:var(--gold);margin-top:4px;letter-spacing:.06em;text-transform:uppercase;opacity:.7">Custom</div>';
      }
      if (isThemed) {
        cellContent += '<div style="font-size:.55rem;color:var(--gold);margin-top:4px;letter-spacing:.06em;text-transform:uppercase;opacity:.8">Dinner Family</div>';
      }
      var cellDrink = drinkingDays && drinkingDays[dIdx];
      if (cellDrink) {
        cellContent += '<div style="font-size:.55rem;color:var(--gold);margin-top:4px;letter-spacing:.04em;opacity:.8">Scaled on dashboard</div>';
      }

      var cellStyle = tdBase() + rowBg + ';vertical-align:top';
      var innerStyle = 'padding:10px 8px;border-radius:8px;min-height:80px';

      if (isMain) {
        // Tappable — Main Meal swap
        cellStyle += ';cursor:pointer';
        innerStyle += ';border:1px solid transparent;transition:border-color .15s';
        bodyHTML += '<td style="' + cellStyle + '" onclick="showMealSwap(' + dIdx + ',\'dinner\')">' +
          '<div style="' + innerStyle + '" class="wg-dinner-cell">' +
          cellContent +
          '<div style="font-size:.58rem;color:var(--t3);margin-top:6px;letter-spacing:.06em;text-transform:uppercase">Tap to swap</div>' +
          '</div></td>';
      } else {
        bodyHTML += '<td style="' + cellStyle + '">' +
          '<div style="' + innerStyle + '">' + cellContent + '</div>' +
          '</td>';
      }
    });

    bodyHTML += '</tr>';
  });
  document.getElementById('weekly-grid-body').innerHTML = bodyHTML;
}

// Weekly grid dinner swap routes through showMealSwap() in meals.js
// _wgDinnerOverrides retained as empty stub — no longer used
var _wgDinnerOverrides = {};


// ── RECIPES PAGE ─────────────────────────────────────────────
// Lane-aware, scale-aware reference view of the user's actual weekly meals.
// Deduplicates by swap key so each unique recipe appears once per slot.
// Scales ingredient amounts to the user's personal calorie targets.

function renderRecipesPage() {
  var el = document.getElementById('recipes-content');
  if (!el) return;

  if (!currentPlan || !currentPlan.cal) {
    el.innerHTML = '<div style="font-size:.85rem;color:var(--t2);padding:8px 0">Build your plan first to see your personalized recipes.</div>';
    return;
  }

  var plan = getActivePlan();
  var calTargets = getSlotCalorieTargets(currentPlan);

  // Collect unique meals per slot across the 7-day plan
  // Key: slot → map of swap-key → {name, k, i, cal}
  var slots = ['first','dinner','dessert'];
  var slotLabels = {first:'First Meals', dinner:'Main Meal Recipes', dessert:'Final Meal Recipes'};
  var slotCardClass = {first:'', dinner:'alt', dessert:'dessert'};

  var seen = {first:{}, dinner:{}, dessert:{}};

  // Helper: scale ingredient gram amounts to user's slot calorie target
  function scaleIngredients(items, templateCal, slot) {
    var targetCal = calTargets[slot] || templateCal || 1;
    var scale = templateCal > 0 ? targetCal / templateCal : 1;
    return (items || []).map(function(ing) {
      var m = ing.match(/^(.*?)(\d+)(g)$/);
      if (!m) return ing;
      return m[1] + Math.round(parseInt(m[2]) * scale) + 'g';
    });
  }

  // Pass 1: collect unique meals from the 7-day template plan
  plan.forEach(function(day) {
    slots.forEach(function(slot) {
      var meal = day[slot];
      if (!meal || !meal.k || seen[slot][meal.k]) return;
      seen[slot][meal.k] = {
        name: meal.n,
        k: meal.k,
        i: scaleIngredients(meal.i, meal.c, slot),
        cal: Math.round(calTargets[slot] || meal.c)
      };
    });
  });

  // Pass 2: augment with permanent mealPrefs (recurring day defaults).
  // These reflect what the user actually cooks on that day every week —
  // not transient today-only swaps, not dinner family day-rotation variants.
  // Only add meals not already in the seen set for that slot.
  if (typeof mealPrefs !== 'undefined' && mealPrefs) {
    var lane = (currentPlan && currentPlan.lane) ? currentPlan.lane : 'men_deficit';
    Object.keys(mealPrefs).forEach(function(dayIdx) {
      var dayPrefs = mealPrefs[dayIdx];
      if (!dayPrefs) return;
      slots.forEach(function(slot) {
        var pref = dayPrefs[slot];
        if (!pref || !pref.key || seen[slot][pref.key]) return;
        // pref.items are already serialized ingredient strings at base cal
        // pref.cal is the base cal from SWAP_OPTIONS at time of swap
        seen[slot][pref.key] = {
          name: pref.name || pref.key,
          k: pref.key,
          i: scaleIngredients(pref.items, pref.cal, slot),
          cal: Math.round(calTargets[slot] || pref.cal),
          isPref: true // marker: came from permanent pref, not template
        };
      });
    });
  }

  var html = '';

  slots.forEach(function(slot) {
    var meals = Object.values(seen[slot]);
    if (!meals.length) return;
    html += '<div class="recipe-section"><h3>' + slotLabels[slot] + '</h3>';
    meals.forEach(function(meal) {
      var instructions = typeof getMealInstructions === 'function'
        ? getMealInstructions(meal.k, meal.i[0] || '')
        : '';
      var ingList = meal.i.map(function(ing) {
        var eggM = ing.match(/^(Whole\s+)?Eggs?\s*(\d+)(g)$/i);
        var isEggWhite = /white/i.test(ing);
        if (eggM && !isEggWhite && typeof eggsGtoCount === 'function') {
          return '<li>' + eggsGtoCount(parseInt(eggM[2])) + '</li>';
        }
        return '<li>' + ing + '</li>';
      }).join('');
      var prefBadge = meal.isPref
        ? ' <span style="font-size:.58rem;font-weight:700;color:var(--gold);letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-body);opacity:.8">Your Default</span>'
        : '';

      html += '<div class="meal-card ' + slotCardClass[slot] + '">' +
        '<div class="meal-header" onclick="toggleMeal(this)">' +
          '<div><div class="meal-title">' + meal.name + prefBadge + '</div>' +
          '<div class="meal-subtitle">~' + meal.cal.toLocaleString() + ' cal · your plan</div></div>' +
          '<span class="meal-expand">▼</span>' +
        '</div>' +
        '<div class="meal-body"><ul>' + ingList + '</ul>' + instructions + '</div>' +
      '</div>';
    });
    html += '</div>';
  });

  el.innerHTML = html;
}


function thBase() {
  return 'padding:10px 8px;border-bottom:1px solid var(--gold-line);';
}
function tdBase() {
  return 'padding:6px 8px;border-bottom:1px solid rgba(184,150,60,.08);border-right:1px solid rgba(184,150,60,.06);';
}


// ── DINNER THEME UI ─────────────────────────────────────────
// Builds the weekly dinner theme selector on the dashboard.
// Iterates DINNER_THEME_FAMILIES — skips families where lane is null or uiVisible:false.
// Called by updateDashboard() and setDinnerTheme()/clearDinnerTheme().

function buildDinnerThemeUI() {
  return; // hidden for v1 — re-enable after first paying customers

  if (!currentPlan || !currentPlan.cal) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  var lane = (currentPlan && currentPlan.lane) ? currentPlan.lane : 'men_deficit';

  // Active theme display
  var activeName = '';
  if (dinnerTheme && typeof DINNER_THEME_FAMILIES !== 'undefined' && DINNER_THEME_FAMILIES[dinnerTheme]) {
    activeName = DINNER_THEME_FAMILIES[dinnerTheme].name;
  }
  if (activeName) {
    activeEl.style.display = 'block';
    activeEl.textContent = activeName;
    clearBtn.style.display = 'block';
  } else {
    activeEl.style.display = 'none';
    clearBtn.style.display = 'none';
  }

  // Build family option list — only uiVisible:true families valid for this lane
  if (typeof DINNER_THEME_FAMILIES === 'undefined') {
    optionsEl.innerHTML = '<div style="font-size:.78rem;color:var(--t3);font-style:italic">Dinner families not loaded.</div>';
    return;
  }

  var html = '';
  var anyVisible = false;
  Object.keys(DINNER_THEME_FAMILIES).forEach(function(familyKey) {
    var family = DINNER_THEME_FAMILIES[familyKey];
    if (!family.uiVisible) return;
    var variants = family.lanes[lane];
    if (!variants) return; // null = not valid for this lane

    anyVisible = true;
    var isActive = dinnerTheme === familyKey;

    // Find a representative image from the first variant in this lane
    var repImg = family.img;
    if (typeof SWAP_OPTIONS !== 'undefined') {
      var laneOpts = (SWAP_OPTIONS[lane] || SWAP_OPTIONS['men_deficit']).dinner || [];
      var firstVariant = laneOpts.filter(function(o) { return o.key === variants[0]; })[0];
      if (firstVariant) repImg = firstVariant.img;
    }

    // Show variant names as a preview line
    var variantNames = '';
    if (typeof SWAP_OPTIONS !== 'undefined') {
      var laneOpts2 = (SWAP_OPTIONS[lane] || SWAP_OPTIONS['men_deficit']).dinner || [];
      variantNames = variants.map(function(vk) {
        var v = laneOpts2.filter(function(o) { return o.key === vk; })[0];
        return v ? v.name : vk;
      }).join(' · ');
    }

    html += '<button onclick="setDinnerTheme(\'' + familyKey + '\')" style="' +
      'display:flex;align-items:center;gap:12px;width:100%;text-align:left;' +
      'padding:11px 14px;border-radius:10px;cursor:pointer;font-family:var(--font-body);' +
      'background:' + (isActive ? 'rgba(184,150,60,.12)' : 'var(--s2)') + ';' +
      'border:1px solid ' + (isActive ? 'rgba(184,150,60,.55)' : 'var(--gold-line)') + ';' +
      'transition:all .2s">' +
      '<img src="' + repImg + '" style="width:40px;height:40px;object-fit:cover;border-radius:8px;flex-shrink:0">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:.88rem;font-weight:700;color:' + (isActive ? 'var(--gold-light)' : 'var(--t1)') + ';font-family:var(--font-display)">' +
          family.name +
          (isActive ? ' <span style="font-size:.6rem;font-weight:700;color:var(--gold);letter-spacing:.1em;text-transform:uppercase;font-family:var(--font-body)">Active</span>' : '') +
        '</div>' +
        '<div style="font-size:.68rem;color:var(--t2);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + variantNames + '</div>' +
      '</div>' +
    '</button>';
  });

  if (!anyVisible) {
    html = '<div style="font-size:.78rem;color:var(--t3);font-style:italic">No dinner families available for your current plan.</div>';
  }
  optionsEl.innerHTML = html;
}

// ── ORIENTATION LISTENER ─────────────────────────────────────
// Set the boot flag now that isIpad() is defined
window.FFT_IS_IPAD = isIpad();

if (window.FFT_IS_IPAD) {
  // Modern API
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', checkWeeklyGrid);
  }
  // Legacy iOS fallback
  window.addEventListener('orientationchange', checkWeeklyGrid);
  window.addEventListener('resize', function() {
    // Debounce resize — resize fires during rotation animation
    clearTimeout(window._wgResizeTimer);
    window._wgResizeTimer = setTimeout(checkWeeklyGrid, 150);
  });
  // Check on load in case iPad is already in landscape
  window.addEventListener('load', function() {
    setTimeout(checkWeeklyGrid, 300);
  });
}
