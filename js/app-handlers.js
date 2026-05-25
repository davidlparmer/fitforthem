// ─────────────────────────────────────────────────────────────
// iPad sync age display helper
var _ipadLastSync = Date.now();
function _ipadSyncAge() {
  var s = Math.round((Date.now() - _ipadLastSync) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return s + 's ago';
  return Math.round(s/60) + 'm ago';
}
// Called by pullGroupData callback to reset the clock
function _markIpadSynced() { _ipadLastSync = Date.now(); }
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

  if (window.FFT_IS_IPAD) {
    var closeBtn = overlay.querySelector('button[onclick*="closeWeeklyGrid"]');
    if (closeBtn) {
      closeBtn.style.display = 'none';
      var headerBar = closeBtn.parentElement;
      if (headerBar) headerBar.style.justifyContent = 'center';
    }
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
function _scaleGridIngredients(items, effectiveScale) {
  // Step 1: scale all ingredients linearly
  var scaled = items.map(function(item) {
    var mCookie = item.match(/^(Biscoff cookies)\s+(\d+(?:\.\d+)?)$/i);
    if (mCookie) {
      var baseCount = parseFloat(mCookie[2]);
      var scaledCount = Math.round(baseCount * effectiveScale * 2) / 2;
      return 'Biscoff cookies ' + Math.max(0.5, scaledCount);
    }
    var m = item.match(/^(.*?)(\d+)(g)$/);
    if (!m) return item;
    var name = m[1].toLowerCase().trim();
    var scaledG = Math.round(parseInt(m[2]) * effectiveScale);
    var isWholeEgg = (name === 'eggs' || name === 'egg' ||
                      name === 'whole eggs' || name === 'whole egg');
    var isEggWhite = name.indexOf('white') >= 0;
    if (isWholeEgg && !isEggWhite && typeof eggsGtoCount === 'function') {
      return eggsGtoCount(scaledG);
    }
    if (name.indexOf('honey') >= 0 && scaledG > 42) scaledG = 42;
    if (name.indexOf('soy')   >= 0 && scaledG > 36) scaledG = 36;
    return m[1] + scaledG + 'g';
  });
  // Step 2: potato-ratio override — mirrors meals.js buildDayHTML exactly
  // sour cream = potato * 0.12, cheese/mozz = potato * 0.09
  var potatoG = 0;
  scaled.forEach(function(item) {
    var m = item.match(/^(.*?)(\d+)(g)$/);
    if (m && m[1].toLowerCase().indexOf('potato') >= 0) potatoG = parseInt(m[2]);
  });
  if (potatoG > 0) {
    scaled = scaled.map(function(item) {
      var m = item.match(/^(.*?)(\d+)(g)$/);
      if (!m) return item;
      var n = m[1].toLowerCase();
      if (n.indexOf('sour') >= 0) return m[1] + Math.round(potatoG * 0.12) + 'g';
      if (n.indexOf('cheese') >= 0 || n.indexOf('mozz') >= 0) return m[1] + Math.round(potatoG * 0.09) + 'g';
      return item;
    });
  }
  return scaled;
}

function renderWeeklyGrid() {
  // On iPad, use the plan cached by pullGroupData() when phone data was fresh.
  // This prevents getActivePlan() from using stale sex/phase/workMode values
  // that might still be set from restoreFromServer() at render time.
  var plan = (window.FFT_IS_IPAD && window._ipadPlanCache) 
             ? window._ipadPlanCache 
             : getActivePlan();
  if (!plan || !plan.length) return;

  var planCal = currentPlan && currentPlan.cal ? currentPlan.cal : 0;
  if (!planCal) return;

  // Update last-synced time shown in grid header
  try {
    var syncEl = document.getElementById('ipad-sync-time');
    if (syncEl) {
      var _dbgPlan = window._ipadPlanCache || null;
      var _dbgMon = _dbgPlan && _dbgPlan[0] && _dbgPlan[0].first ? _dbgPlan[0].first.n : 'none';
      syncEl.textContent = 'Synced ' + _ipadSyncAge() + ' | sex:' + (currentPlan&&currentPlan.sex||'?') + ' | mon:' + _dbgMon;
    }
  } catch(e) {}

  // ── PLAN NAME ────────────────────────────────────────────────
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

  // ── SYNC DEPENDENCY — see HANDOFF.md section 1 ─────────────────
  // This calculation mirrors buildDayHTML in meals.js. Keep in sync.
  var planSex  = currentPlan.sex || 'male';
  var planMode = currentPlan.phase || '';
  var isGainMode = planMode === 'moderate_gain' || planMode === 'mild_gain' || planMode === 'landing_gain';
  var laneRatios = (typeof getLaneRatios === 'function')
    ? getLaneRatios(planSex, isGainMode ? 'gain' : 'cut')
    : { first: 0.275, dinner: 0.525, dessert: 0.200 };

  var daySlotScales = plan.map(function(dayPlan, dIdx) {
    var drinkLevel = drinkingDays && drinkingDays[dIdx];
    var isDrinking = drinkLevel && drinkLevel !== false;
    var drinkReserve = 0;
    if (isDrinking && typeof DRINK_RESERVES !== 'undefined') {
      drinkReserve = DRINK_RESERVES[drinkLevel] || 0;
    }
    var foodCal = isDrinking ? planCal - drinkReserve : planCal;
    var targetFirst   = Math.round(foodCal * laneRatios.first);
    var targetDinner  = Math.round(foodCal * laneRatios.dinner);
    var targetDessert = foodCal - targetFirst - targetDinner;

    // Resolve base cal per slot — mirrors phone's renderCustomMeal priority:
    // built-in today-swap cal → mealPref cal → template cal
    var _fp = mealPrefs && mealPrefs[dIdx] && mealPrefs[dIdx].first;
    var _dp = mealPrefs && mealPrefs[dIdx] && mealPrefs[dIdx].dessert;

    // Today-only swaps (built-in from SWAP_OPTIONS have mealKey, not restaurant/fridge)
    var _cFirst = (customMeals||[]).filter(function(m){return m.day===dIdx&&m.slot==='first';})[0];
    var _cDinner = (customMeals||[]).filter(function(m){return m.day===dIdx&&m.slot==='dinner';})[0];
    var _cDessert = (customMeals||[]).filter(function(m){return m.day===dIdx&&m.slot==='dessert';})[0];
    var _isBuiltIn = function(c){ return c && c.mealKey && (!c.notes || c.notes.indexOf('Eating out') !== 0); };

    var firstBase = _isBuiltIn(_cFirst) ? _cFirst.cal
      : ((_fp && _fp.cal) ? _fp.cal : ((dayPlan.first && dayPlan.first.c) || 0));
    var dessertBase = _isBuiltIn(_cDessert) ? _cDessert.cal
      : ((_dp && _dp.cal) ? _dp.cal : ((dayPlan.dessert && dayPlan.dessert.c) || 0));
    var dinnerBase = (dayPlan.dinner && dayPlan.dinner.c) || 0;
    if (_isBuiltIn(_cDinner)) {
      dinnerBase = _cDinner.cal;
    } else if (typeof getResolvedDinner === 'function') {
      var rd = getResolvedDinner(dIdx);
      if (rd && rd.c) dinnerBase = rd.c;
    }

    return {
      first:   firstBase   > 0 ? targetFirst   / firstBase   : 1,
      dinner:  dinnerBase  > 0 ? targetDinner  / dinnerBase  : 1,
      dessert: dessertBase > 0 ? targetDessert / dessertBase : 1
    };
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
    headHTML += '<th style="' + thBase() +
      'text-align:center;color:var(--gold-light);font-size:.78rem;font-weight:700">' +
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
      } else {
        // First/dessert: mirror getResolvedDinner's priority chain.
        // Check today-only customMeals first, then permanent mealPrefs, then template.
        // Previously only mealPrefs was checked — today-only swaps for first/dessert
        // went into customMeals and were never found, so the grid showed the template.
        var slotCustom = (customMeals || []).filter(function(m) {
          return m.day === dIdx && m.slot === slot.key;
        })[0];
        if (slotCustom) {
          slotData = {
            i: slotCustom.ingredients
              ? slotCustom.ingredients.map(function(x) { return x.item || ''; })
              : [],
            c: slotCustom.cal
          };
        } else if (permPref) {
          slotData = { i: permPref.items, c: permPref.cal };
        } else {
          slotData = dayPlan[slot.key] || {};
        }
      }

      var rawIngredients = slotData.i || [];
      var scaledIngredients = _scaleGridIngredients(rawIngredients, daySlotScales[dIdx][slot.key]);

      var isSwapped = !!permPref && !!permPref.cal && !isMain;
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


// ── WALK MODE SHEET ───────────────────────────────────────────────────────────
// Lets users change walk type, speed, and incline without rebuilding their plan.
// Steps update live on the hero card as they make selections.
// "Use Today" stores a dated override in localStorage (clears automatically tomorrow).
// "Set as Default" updates S + currentPlan step values and saves permanently.
// engine.js and state.js are never touched by this feature.

var _walkSheet = {
  open: false,
  type: 'flat',
  speed: 2.5,
  incline: 3,
  burnTarget: 500,     // today's correct burn (accounts for drinking night)
  origSteps: '',       // hero card value before sheet opened — restored on cancel
  origLabel: ''
};

function openWalkSheet() {
  if (!currentPlan || !currentPlan.cal || !currentPlan.wLbs || !currentPlan.hIn) return;

  // Store current hero display to restore on cancel
  var stepsEl = document.getElementById('ds-steps');
  var labelEl = document.getElementById('ds-steps-label');
  _walkSheet.origSteps = stepsEl ? stepsEl.textContent : '—';
  _walkSheet.origLabel = labelEl ? labelEl.textContent : 'Steps';

  // Determine today's correct burn target (drinking-aware)
  var todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  var drinkLevel = (typeof drinkingDays !== 'undefined') ? (drinkingDays[todayIdx] || false) : false;
  var bN = currentPlan.burnNormal || 500;
  var bL = currentPlan.burnLight  || bN + 150;
  var bD = currentPlan.burnDrink  || 750;
  var bB = currentPlan.burnBig    || bN + 400;
  _walkSheet.burnTarget = drinkLevel === 'light'   ? bL
                        : drinkLevel === 'regular' ? bD
                        : drinkLevel === 'big'     ? bB : bN;

  // Initialise sheet selections from current S settings
  _walkSheet.type    = (typeof S !== 'undefined' && S.walkType) ? S.walkType : 'flat';
  _walkSheet.speed   = (typeof S !== 'undefined' && S.speed)   ? S.speed   : 2.5;
  _walkSheet.incline = (typeof S !== 'undefined' && S.incline) ? S.incline : 3;

  // Also check for a today-only override already active
  try {
    var _wt = JSON.parse(localStorage.getItem('fft_walk_today') || 'null');
    var _td = new Date().toISOString().split('T')[0];
    if (_wt && _wt.date === _td) {
      _walkSheet.type    = _wt.walkType;
      _walkSheet.speed   = _wt.speed;
      _walkSheet.incline = _wt.incline;
    }
  } catch(e) {}

  // Show overlay + sheet
  document.getElementById('walk-sheet-overlay').style.display = 'block';
  var sheet = document.getElementById('walk-sheet');
  sheet.style.display = 'block';
  setTimeout(function(){ sheet.style.transform = 'translateY(0)'; }, 10);
  _walkSheet.open = true;

  _walkSheetRender();
  _walkSheetPreview();
}

function closeWalkSheet(cancelled) {
  var sheet = document.getElementById('walk-sheet');
  if (sheet) sheet.style.transform = 'translateY(100%)';
  setTimeout(function(){
    if (sheet) sheet.style.display = 'none';
    var overlay = document.getElementById('walk-sheet-overlay');
    if (overlay) overlay.style.display = 'none';
  }, 350);
  _walkSheet.open = false;

  if (cancelled) {
    // Restore original hero card display
    var stepsEl = document.getElementById('ds-steps');
    var labelEl = document.getElementById('ds-steps-label');
    if (stepsEl) stepsEl.textContent = _walkSheet.origSteps;
    if (labelEl) labelEl.textContent = _walkSheet.origLabel;
  }
}

function _walkSheetRender() {
  // Walk type buttons
  ['flat','treadmill','incline'].forEach(function(t){
    var btn = document.getElementById('wks-type-' + t);
    if (btn) btn.classList.toggle('active', _walkSheet.type === t);
  });
  // Speed row visibility
  var speedRow = document.getElementById('wks-speed-row');
  if (speedRow) speedRow.style.display = (_walkSheet.type !== 'flat') ? 'block' : 'none';
  // Incline row visibility
  var incRow = document.getElementById('wks-incline-row');
  if (incRow) incRow.style.display = (_walkSheet.type === 'incline') ? 'block' : 'none';
  // Speed button active states
  [2.0, 2.5, 3.0, 3.5].forEach(function(s){
    var btn = document.getElementById('wks-speed-' + Math.round(s * 10));
    if (btn) btn.classList.toggle('active', Math.abs(_walkSheet.speed - s) < 0.01);
  });
  // Incline button active states
  [0,1,2,3,4,5,6].forEach(function(inc){
    var btn = document.getElementById('wks-inc-' + inc);
    if (btn) btn.classList.toggle('active', _walkSheet.incline === inc);
  });
}

function _walkSheetPreview() {
  if (!currentPlan.wLbs || !currentPlan.hIn) return;
  var steps = calcSteps(
    currentPlan.wLbs,
    currentPlan.hIn,
    _walkSheet.burnTarget,
    _walkSheet.type,
    _walkSheet.speed,
    _walkSheet.incline
  );
  var stepsEl = document.getElementById('ds-steps');
  if (stepsEl) stepsEl.textContent = steps.toLocaleString();
  // Update label to reflect current mode preview
  var modeLabels = {flat:'Steps (Outdoor)',treadmill:'Steps (Treadmill)',incline:'Steps (Incline)'};
  var labelEl = document.getElementById('ds-steps-label');
  if (labelEl) labelEl.textContent = modeLabels[_walkSheet.type] || 'Steps';
}

function walkSheetSetType(type) {
  _walkSheet.type = type;
  _walkSheetRender();
  _walkSheetPreview();
}

function walkSheetSetSpeed(speed) {
  _walkSheet.speed = parseFloat(speed);
  _walkSheetRender();
  _walkSheetPreview();
}

function walkSheetSetIncline(inc) {
  _walkSheet.incline = parseInt(inc);
  _walkSheetRender();
  _walkSheetPreview();
}

function applyWalkToday() {
  var today = new Date().toISOString().split('T')[0];
  try {
    localStorage.setItem('fft_walk_today', JSON.stringify({
      walkType: _walkSheet.type,
      speed:    _walkSheet.speed,
      incline:  _walkSheet.incline,
      date:     today
    }));
  } catch(e) {}
  closeWalkSheet(false);
}

function applyWalkDefault() {
  // Update S settings (in-memory, used by silentRecalc and future plan builds)
  if (typeof S !== 'undefined') {
    S.walkType = _walkSheet.type;
    S.speed    = _walkSheet.speed;
    S.incline  = _walkSheet.incline;
  }
  // Recalculate all four step variants in currentPlan
  var w = currentPlan.wLbs, h = currentPlan.hIn;
  var bN = currentPlan.burnNormal || 500;
  var bL = currentPlan.burnLight  || bN + 150;
  var bD = currentPlan.burnDrink  || 750;
  var bB = currentPlan.burnBig    || bN + 400;
  currentPlan.steps       = calcSteps(w, h, bN, S.walkType, S.speed, S.incline);
  currentPlan.wStepsLight = calcSteps(w, h, bL, S.walkType, S.speed, S.incline);
  currentPlan.wSteps      = calcSteps(w, h, bD, S.walkType, S.speed, S.incline);
  currentPlan.wStepsBig   = calcSteps(w, h, bB, S.walkType, S.speed, S.incline);
  // Clear any today-only override since default now matches
  try { localStorage.removeItem('fft_walk_today'); } catch(e) {}
  // Persist and sync
  try { localStorage.setItem('fft_plan', JSON.stringify(currentPlan)); } catch(e) {}
  if (typeof saveAllData === 'function') saveAllData();
  closeWalkSheet(false);
}
// ── END WALK MODE SHEET ───────────────────────────────────────────────────────
