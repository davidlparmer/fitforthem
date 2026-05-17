// ─────────────────────────────────────────────────────────────
// app-handlers.js — Loftin Method App-Level UI Handlers
// Weekly grid (iPad landscape), Recipes page, Dinner theme UI.
// Load order: last — after all other modules.
// ─────────────────────────────────────────────────────────────

// ── DEVICE FLAG ───────────────────────────────────────────────
window.FFT_IS_IPAD = false; // overwritten below after isIpad() is defined

// ── WEEKLY GRID — iPad landscape overlay ──────────────────────

var _wgSwapDayIdx = null;

function isIpad() {
  var ua = navigator.userAgent;
  if (/iPad/.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true;
  return false;
}

function isLandscape() {
  if (screen.orientation && screen.orientation.type) {
    return screen.orientation.type.indexOf('landscape') >= 0;
  }
  return window.innerWidth > window.innerHeight;
}

// ── PORTRAIT GUARD ────────────────────────────────────────────
function _showPortraitGuard() {
  var guard = document.getElementById('ipad-portrait-guard');
  if (!guard) {
    guard = document.createElement('div');
    guard.id = 'ipad-portrait-guard';
    guard.style.cssText = [
      'position:fixed;top:0;left:0;width:100%;height:100%',
      'display:flex;flex-direction:column;align-items:center;justify-content:center',
      'background:var(--bg,#111)',
      'z-index:10000'
    ].join(';');
    guard.innerHTML =
      '<div style="font-size:3rem;margin-bottom:20px;opacity:.7">&#8635;</div>' +
      '<div style="font-size:1rem;font-weight:700;color:var(--gold-light,#d4b86a);' +
        'letter-spacing:.12em;text-transform:uppercase;font-family:var(--font-body,' +
        '\'IBM Plex Sans\',sans-serif);margin-bottom:10px">Rotate to Landscape</div>' +
      '<div style="font-size:.82rem;color:var(--t2,#888)">Loftin Method weekly meal planner</div>';
    document.body.appendChild(guard);
  }
  guard.style.display = 'flex';
}

function _hidePortraitGuard() {
  var guard = document.getElementById('ipad-portrait-guard');
  if (guard) guard.style.display = 'none';
}

function checkWeeklyGrid() {
  if (!isIpad()) return;
  if (isLandscape()) {
    _hidePortraitGuard();
    openWeeklyGrid();
  } else {
    closeWeeklyGrid();
    _showPortraitGuard();
  }
}

function openWeeklyGrid() {
  if (!currentPlan || !currentPlan.cal) return;
  renderWeeklyGrid();
  var overlay = document.getElementById('weekly-grid-overlay');
  overlay.style.display = 'block';
  document.body.style.overflow = 'hidden';

  // ── iPAD: clean up phone-only UI ────────────────────────────
  if (window.FFT_IS_IPAD) {
    // Item 3: Hide the Close button — iPad has no dashboard to return to.
    // Item 1: After hiding it, switch the header from space-between → center
    //         so the plan name is genuinely centered in the bar.
    var closeBtn = overlay.querySelector('button[onclick*="closeWeeklyGrid"]');
    if (closeBtn) {
      closeBtn.style.display = 'none';
      // closeBtn.parentElement is the flex header bar
      var headerBar = closeBtn.parentElement;
      if (headerBar) headerBar.style.justifyContent = 'center';
    }

    // Item 5: Hide instruction text via text-node matching.
    // Already working from previous round — kept here for resilience.
    var walker = document.createTreeWalker(
      overlay, NodeFilter.SHOW_TEXT, null, false
    );
    var node;
    while ((node = walker.nextNode())) {
      var txt = node.textContent.toUpperCase().replace(/\s+/g, ' ').trim();
      if (txt.indexOf('TAP ANY MAIN MEAL') >= 0 ||
          txt.indexOf('ROTATE TO PORTRAIT') >= 0) {
        if (node.parentElement) node.parentElement.style.display = 'none';
      }
    }
  }
}

function closeWeeklyGrid() {
  document.getElementById('weekly-grid-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

// ── INGREDIENT SCALING HELPER ─────────────────────────────────
// Mirrors the essential scaling logic from buildDayHTML (meals.js).
// Applied per-day using the precomputed effectiveScale for that column.
function _scaleGridIngredients(items, effectiveScale) {
  return items.map(function(item) {
    // Biscoff cookies — count format, scale to nearest 0.5
    var mCookie = item.match(/^(Biscoff cookies)\s+(\d+(?:\.\d+)?)$/i);
    if (mCookie) {
      var baseCount = parseFloat(mCookie[2]);
      var scaledCount = Math.round(baseCount * effectiveScale * 2) / 2;
      return 'Biscoff cookies ' + Math.max(0.5, scaledCount);
    }
    // Standard gram format
    var m = item.match(/^(.*?)(\d+)(g)$/);
    if (!m) return item;
    var name = m[1].toLowerCase().trim();
    var scaledG = Math.round(parseInt(m[2]) * effectiveScale);
    // Whole eggs → count display
    var isWholeEgg = (name === 'eggs' || name === 'egg' ||
                      name === 'whole eggs' || name === 'whole egg');
    var isEggWhite = name.indexOf('white') >= 0;
    if (isWholeEgg && !isEggWhite && typeof eggsGtoCount === 'function') {
      return eggsGtoCount(scaledG);
    }
    // Condiment caps
    if (name.indexOf('honey') >= 0 && scaledG > 42) scaledG = 42;
    if (name.indexOf('soy')   >= 0 && scaledG > 36) scaledG = 36;
    return m[1] + scaledG + 'g';
  });
}

function renderWeeklyGrid() {
  var plan = getActivePlan();
  if (!plan || !plan.length) return;

  var planCal = currentPlan && currentPlan.cal ? currentPlan.cal : 0;
  if (!planCal) return;

  // ── PLAN NAME — centered, personalised ──────────────────────
  var displayName = (typeof userName !== 'undefined' && userName)
    ? userName
    : (localStorage.getItem('fft_name') || '');
  var planTitle = displayName
    ? displayName + '\u2019s Weekly Meal Plan'
    : 'Weekly Meal Plan';
  var planNameEl = document.getElementById('wg-plan-name');
  if (planNameEl) {
    planNameEl.textContent = planTitle;
    planNameEl.style.textAlign = 'center';
    planNameEl.style.width = '100%';
  }

  // ── PRECOMPUTE effectiveScale PER DAY ────────────────────────
  var dayScales = plan.map(function(dayPlan, dIdx) {
    var firstC = (mealPrefs && mealPrefs[dIdx] && mealPrefs[dIdx].first)
      ? (mealPrefs[dIdx].first.cal || 0)
      : ((dayPlan.first && dayPlan.first.c) || 0);
    var dessertC = (mealPrefs && mealPrefs[dIdx] && mealPrefs[dIdx].dessert)
      ? (mealPrefs[dIdx].dessert.cal || 0)
      : ((dayPlan.dessert && dayPlan.dessert.c) || 0);
    var dinnerC = (dayPlan.dinner && dayPlan.dinner.c) || 0;
    if (typeof getResolvedDinner === 'function') {
      var rd = getResolvedDinner(dIdx);
      if (rd && rd.c) dinnerC = rd.c;
    }
    var baseTotal = firstC + dinnerC + dessertC;
    var scale = baseTotal > 0 ? planCal / baseTotal : 1;
    var isWknd = dIdx >= 4;
    var drinkLevel = drinkingDays && drinkingDays[dIdx];
    var isDrinking = isWknd && drinkLevel && drinkLevel !== false;
    var drinkReserve = 0;
    if (isDrinking && typeof DRINK_RESERVES !== 'undefined') {
      drinkReserve = DRINK_RESERVES[drinkLevel] || 0;
    }
    var drinkScale = isDrinking ? (planCal - drinkReserve) / planCal : 1;
    return scale * drinkScale;
  });

  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var slots = [
    { key: 'first',   label: 'First Meal' },
    { key: 'dinner',  label: 'Main Meal'  },
    { key: 'dessert', label: 'Final Meal' }
  ];

  // ── HEADER ROW ──────────────────────────────────────────────
  var headHTML = '<tr>';
  headHTML += '<th style="' + thBase() + 'width:90px;text-align:left;color:var(--t3);' +
    'font-size:.65rem;letter-spacing:.1em;text-transform:uppercase">Meal</th>';
  days.forEach(function(day, idx) {
    var dayPlan = plan[idx] || {};
    var activeDrink = drinkingDays && drinkingDays[idx];
    var staticDrink = dayPlan.drinks;
    var _dlabels = { light: 'Light Night', regular: 'Regular', big: 'Big Night' };
    var drinkText = activeDrink
      ? (_dlabels[activeDrink] || '')
      : (staticDrink ? 'Drinks' : '');
    var drinkColor = activeDrink ? 'var(--gold)' : 'var(--t3)';
    headHTML += '<th style="' + thBase() + 'text-align:center;color:var(--gold-light);' +
      'font-size:.78rem;font-weight:700">' +
      day +
      '<div style="font-size:.6rem;color:' + drinkColor + ';margin-top:3px;' +
        'font-weight:500;min-height:14px">' + drinkText + '</div>' +
    '</th>';
  });
  headHTML += '</tr>';
  document.getElementById('weekly-grid-head').innerHTML = headHTML;

  // ── BODY ROWS ───────────────────────────────────────────────
  var bodyHTML = '';
  slots.forEach(function(slot, sIdx) {
    var isMain = slot.key === 'dinner';
    var rowBg = sIdx % 2 === 0
      ? 'background:rgba(255,255,255,.02)'
      : 'background:rgba(0,0,0,.08)';
    bodyHTML += '<tr>';

    bodyHTML += '<td style="' + tdBase() + rowBg + ';color:var(--gold);font-size:.72rem;' +
      'font-weight:700;font-family:var(--font-body);letter-spacing:.04em;' +
      'vertical-align:top;padding-top:14px">' + slot.label + '</td>';

    days.forEach(function(day, dIdx) {
      var dayPlan = plan[dIdx] || {};
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

      var rawIngredients = slotData.i || [];
      var scaledIngredients = _scaleGridIngredients(rawIngredients, dayScales[dIdx]);

      var isSwapped = !!permPref && !isMain;
      var cellContent = scaledIngredients.map(function(ing) {
        return '<div style="font-size:.72rem;color:var(--t1);padding:1px 0;line-height:1.4">' +
          ing + '</div>';
      }).join('');

      if (isSwapped) {
        cellContent += '<div style="font-size:.55rem;color:var(--gold);margin-top:4px;' +
          'letter-spacing:.06em;text-transform:uppercase;opacity:.7">Custom</div>';
      }
      if (isThemed) {
        cellContent += '<div style="font-size:.55rem;color:var(--gold);margin-top:4px;' +
          'letter-spacing:.06em;text-transform:uppercase;opacity:.8">Dinner Family</div>';
      }

      var cellStyle = tdBase() + rowBg + ';vertical-align:top';
      var innerStyle = 'padding:10px 8px;border-radius:8px;min-height:80px';

      if (isMain) {
        // iPad: display-only — no swap tap, no cursor, no label
        if (window.FFT_IS_IPAD) {
          bodyHTML += '<td style="' + cellStyle + '">' +
            '<div style="' + innerStyle + '">' + cellContent + '</div>' +
            '</td>';
        } else {
          cellStyle += ';cursor:pointer';
          innerStyle += ';border:1px solid transparent;transition:border-color .15s';
          bodyHTML += '<td style="' + cellStyle + '" onclick="showMealSwap(' + dIdx + ',\'dinner\')">' +
            '<div style="' + innerStyle + '" class="wg-dinner-cell">' +
            cellContent +
            '<div style="font-size:.58rem;color:var(--t3);margin-top:6px;' +
              'letter-spacing:.06em;text-transform:uppercase">Tap to swap</div>' +
            '</div></td>';
        }
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

var _wgDinnerOverrides = {};


// ── RECIPES PAGE ─────────────────────────────────────────────

function renderRecipesPage() {
  var el = document.getElementById('recipes-content');
  if (!el) return;

  if (!currentPlan || !currentPlan.cal) {
    el.innerHTML = '<div style="font-size:.85rem;color:var(--t2);padding:8px 0">' +
      'Build your plan first to see your personalized recipes.</div>';
    return;
  }

  var plan = getActivePlan();
  var calTargets = getSlotCalorieTargets(currentPlan);
  var slots = ['first','dinner','dessert'];
  var slotLabels = { first:'First Meals', dinner:'Main Meal Recipes', dessert:'Final Meal Recipes' };
  var slotCardClass = { first:'', dinner:'alt', dessert:'dessert' };
  var seen = { first:{}, dinner:{}, dessert:{} };

  function scaleIngredients(items, templateCal, slot) {
    var targetCal = calTargets[slot] || templateCal || 1;
    var scale = templateCal > 0 ? targetCal / templateCal : 1;
    return (items || []).map(function(ing) {
      var m = ing.match(/^(.*?)(\d+)(g)$/);
      if (!m) return ing;
      return m[1] + Math.round(parseInt(m[2]) * scale) + 'g';
    });
  }

  plan.forEach(function(day) {
    slots.forEach(function(slot) {
      var meal = day[slot];
      if (!meal || !meal.k || seen[slot][meal.k]) return;
      seen[slot][meal.k] = {
        name: meal.n, k: meal.k,
        i: scaleIngredients(meal.i, meal.c, slot),
        cal: Math.round(calTargets[slot] || meal.c)
      };
    });
  });

  if (typeof mealPrefs !== 'undefined' && mealPrefs) {
    Object.keys(mealPrefs).forEach(function(dayIdx) {
      var dayPrefs = mealPrefs[dayIdx];
      if (!dayPrefs) return;
      slots.forEach(function(slot) {
        var pref = dayPrefs[slot];
        if (!pref || !pref.key || seen[slot][pref.key]) return;
        seen[slot][pref.key] = {
          name: pref.name || pref.key, k: pref.key,
          i: scaleIngredients(pref.items, pref.cal, slot),
          cal: Math.round(calTargets[slot] || pref.cal),
          isPref: true
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
        ? getMealInstructions(meal.k, meal.i[0] || '') : '';
      var ingList = meal.i.map(function(ing) {
        var eggM = ing.match(/^(Whole\s+)?Eggs?\s*(\d+)(g)$/i);
        var isEggWhite = /white/i.test(ing);
        if (eggM && !isEggWhite && typeof eggsGtoCount === 'function') {
          return '<li>' + eggsGtoCount(parseInt(eggM[2])) + '</li>';
        }
        return '<li>' + ing + '</li>';
      }).join('');
      var prefBadge = meal.isPref
        ? ' <span style="font-size:.58rem;font-weight:700;color:var(--gold);' +
          'letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-body);' +
          'opacity:.8">Your Default</span>'
        : '';
      html += '<div class="meal-card ' + slotCardClass[slot] + '">' +
        '<div class="meal-header" onclick="toggleMeal(this)">' +
          '<div><div class="meal-title">' + meal.name + prefBadge + '</div>' +
          '<div class="meal-subtitle">~' + meal.cal.toLocaleString() +
            ' cal · your plan</div></div>' +
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
  return 'padding:6px 8px;border-bottom:1px solid rgba(184,150,60,.08);' +
         'border-right:1px solid rgba(184,150,60,.06);';
}


// ── DINNER THEME UI ──────────────────────────────────────────
function buildDinnerThemeUI() {
  return; // hidden for v1
}


// ── BOOT ─────────────────────────────────────────────────────
window.FFT_IS_IPAD = isIpad();

if (window.FFT_IS_IPAD) {
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', checkWeeklyGrid);
  }
  window.addEventListener('orientationchange', checkWeeklyGrid);
  window.addEventListener('resize', function() {
    clearTimeout(window._wgResizeTimer);
    window._wgResizeTimer = setTimeout(checkWeeklyGrid, 150);
  });
  window.addEventListener('load', function() {
    setTimeout(checkWeeklyGrid, 300);
  });
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && typeof pullGroupData === 'function') {
      pullGroupData(function() {});
    }
  });
}
