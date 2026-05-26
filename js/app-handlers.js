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
  // On iPad, use the planId stored in currentPlan (set by the phone at generation time).
  // This means the iPad NEVER independently decides which plan to use —
  // it uses exactly the same plan the phone used, regardless of local workMode/sex state.
  var _planMap = {
    'WFH_M':  typeof IF_PLAN_WFH              !== 'undefined' ? IF_PLAN_WFH              : null,
    'OFF_M':  typeof IF_PLAN_OFFICE            !== 'undefined' ? IF_PLAN_OFFICE            : null,
    'WFH_F':  typeof IF_PLAN_WFH_WOMEN         !== 'undefined' ? IF_PLAN_WFH_WOMEN         : null,
    'OFF_F':  typeof IF_PLAN_OFFICE_WOMEN      !== 'undefined' ? IF_PLAN_OFFICE_WOMEN      : null,
    'WFH_M+': typeof IF_PLAN_WFH_MEN_SURPLUS   !== 'undefined' ? IF_PLAN_WFH_MEN_SURPLUS   : null,
    'OFF_M+': typeof IF_PLAN_OFFICE_MEN_SURPLUS !== 'undefined' ? IF_PLAN_OFFICE_MEN_SURPLUS: null,
    'WFH_F+': typeof IF_PLAN_WFH_WOMEN_SURPLUS !== 'undefined' ? IF_PLAN_WFH_WOMEN_SURPLUS : null,
    'OFF_F+': typeof IF_PLAN_OFFICE_WOMEN_SURPLUS !== 'undefined' ? IF_PLAN_OFFICE_WOMEN_SURPLUS: null
  };
  var _planId = currentPlan && currentPlan.planId;
  var plan = (window.FFT_IS_IPAD && _planId && _planMap[_planId])
             ? _planMap[_planId]
             : getActivePlan();
  if (!plan || !plan.length) return;

  var planCal = currentPlan && currentPlan.cal ? currentPlan.cal : 0;
  if (!planCal) return;

  // Update sync indicator with week date
  try {
    var _syncEl = document.getElementById('ipad-sync-time');
    if (_syncEl) {
      var _now = new Date();
      var _offset = _now.getDay() === 0 ? -6 : 1 - _now.getDay();
      var _mon = new Date(_now); _mon.setDate(_now.getDate() + _offset);
      var _months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var _weekStr = _months[_mon.getMonth()] + ' ' + _mon.getDate();
      var _chkSvg = '<svg width="13" height="13" viewBox="0 0 14 14" ' +
        'style="vertical-align:middle;margin-right:5px;position:relative;top:-1px">' +
        '<circle cx="7" cy="7" r="7" fill="#22C55E"/>' +
        '<polyline points="3.5,7 5.8,9.5 10.5,4.5" fill="none" stroke="white" ' +
        'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>';
      _syncEl.style.color = '#A9B8C8';
      _syncEl.innerHTML = _chkSvg + 'Synced from iPhone&nbsp;&nbsp;&middot;&nbsp;&nbsp;Week of ' + _weekStr;
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

  // ── PREMIUM COLOR SYSTEM ──────────────────────────────────────
  var _C = {
    bgA:     '#0B223B',            // row 1
    bgB:     '#102947',            // row 2 (alt)
    div:     'rgba(140,180,220,.16)', // internal dividers
    tPri:    '#F4F7FB',            // primary text
    tSec:    '#A9B8C8',            // secondary text
    tMuted:  '#90A1B4',            // muted helper
    cyan:    '#35C8FF',            // main accent
    cyanSft: '#69D7FF',            // softer cyan
    col:     '100px repeat(7,1fr)' // grid template
  };

  // ── ICONS (cyan family, consistent 1.5 stroke) ────────────────
  function _ico(stroke, pathData) {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" ' +
      'stroke="' + stroke + '" stroke-width="1.5" stroke-linecap="round" ' +
      'stroke-linejoin="round">' + pathData + '</svg>';
  }
  var _icons = {
    first: _ico(_C.cyan,
      '<circle cx="12" cy="12" r="4"/>' +
      '<line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>' +
      '<line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>' +
      '<line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/>' +
      '<line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>' +
      '<line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>' +
      '<line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/>'),
    dinner: _ico(_C.cyan,
      '<path d="M3 17h18"/><path d="M12 3C7.5 3 4 8 4 13h16c0-5-3.5-10-8-10z"/>'),
    dessert: _ico(_C.cyan,
      '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')
  };

  // ── HEADER ROW (inside outer card, above the grid lines) ──────
  var _tdow = new Date().getDay();
  var _tpIdx = _tdow === 0 ? 6 : _tdow - 1;

  var headHTML =
    '<div style="display:grid;grid-template-columns:' + _C.col + ';' +
    'padding:14px 0 12px;border-bottom:1px solid rgba(140,180,220,.15)">';

  // Empty corner cell (aligns with label column)
  headHTML += '<div></div>';

  days.forEach(function(day, idx) {
    var isToday   = idx === _tpIdx;
    var drinkLvl  = drinkingDays && drinkingDays[idx];
    var dayClr    = isToday ? _C.cyanSft : _C.tPri;

    // Today indicator dot
    var dot = isToday
      ? '<div style="width:4px;height:4px;border-radius:50%;background:' + _C.cyanSft +
          ';margin:0 auto 6px"></div>'
      : '<div style="height:10px"></div>';

    // Drinks pill — ONLY on drinking days, one uniform style
    var pill = drinkLvl
      ? '<div style="margin-top:7px">' +
          '<span style="padding:3px 12px;border-radius:20px;font-size:.58rem;' +
          'font-weight:600;letter-spacing:.06em;background:rgba(53,200,255,.10);' +
          'border:1px solid rgba(53,200,255,.26);color:#69D7FF">' +
          'Drinks</span></div>'
      : '<div style="height:24px;margin-top:7px"></div>';

    headHTML +=
      '<div style="text-align:center;padding:0 4px">' +
      dot +
      '<div style="font-size:.84rem;font-weight:700;color:' + dayClr + '">' + day + '</div>' +
      pill +
      '</div>';
  });
  headHTML += '</div>';
  document.getElementById('weekly-grid-head').innerHTML = headHTML;

  // ── MEAL ROWS (CSS grid, starts below the header band) ────────
  var bodyHTML = '';

  slots.forEach(function(slot, sIdx) {
    var isMain    = slot.key === 'dinner';
    var rowBg     = sIdx % 2 === 0 ? _C.bgA : _C.bgB;
    var isLastRow = sIdx === slots.length - 1;

    var rowHTML =
      '<div style="display:grid;grid-template-columns:' + _C.col + ';background:' + rowBg + '">';

    // ── Label cell ──────────────────────────────────────────────
    rowHTML +=
      '<div style="text-align:center;padding:20px 8px;' +
      'border-right:1px solid ' + _C.div + ';' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px">' +
      (_icons[slot.key] || '') +
      '<div style="font-size:.7rem;font-weight:700;color:' + _C.tPri + ';' +
      'letter-spacing:.04em;line-height:1.2">' + slot.label + '</div>' +
      '</div>';

    // ── Day cells ───────────────────────────────────────────────
    days.forEach(function(day, dIdx) {
      var isLastCol = dIdx === days.length - 1;
      var dayPlan   = plan[dIdx] || {};
      var permPref  = !isMain && mealPrefs && mealPrefs[dIdx] && mealPrefs[dIdx][slot.key];
      var slotData;
      var isThemed = false;
      var slotCustom;

      if (isMain && typeof getResolvedDinner === 'function') {
        var rd = getResolvedDinner(dIdx);
        slotData = rd ? { i: rd.i, c: rd.c } : (dayPlan[slot.key] || {});
        isThemed = rd && rd.source === 'theme';
      } else {
        slotCustom = (customMeals || []).filter(function(m) {
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

      var rawIngredients    = slotData.i || [];
      var scaledIngredients = _scaleGridIngredients(rawIngredients, daySlotScales[dIdx][slot.key]);
      var isSwapped         = !!permPref && !!permPref.cal && !isMain;

      var cellContent = scaledIngredients.map(function(ing) {
        return '<div style="display:flex;align-items:baseline;gap:5px;padding:2px 0">' +
          '<span style="color:rgba(53,200,255,.28);font-size:.58rem;flex-shrink:0">&bull;</span>' +
          '<span style="font-size:.76rem;color:' + _C.tPri + ';line-height:1.45">' + ing + '</span>' +
          '</div>';
      }).join('');

      if (isSwapped) {
        cellContent +=
          '<div style="font-size:.55rem;color:' + _C.cyan + ';margin-top:4px;' +
          'letter-spacing:.06em;text-transform:uppercase;opacity:.7">Custom</div>';
      }
      if (isThemed) {
        cellContent +=
          '<div style="font-size:.55rem;color:' + _C.cyan + ';margin-top:4px;' +
          'letter-spacing:.06em;text-transform:uppercase;opacity:.8">Dinner Family</div>';
      }

      var bdrRight = isLastCol ? '' : 'border-right:1px solid ' + _C.div + ';';
      var cellPad  = 'padding:12px 10px;vertical-align:top;';

      if (window.FFT_IS_IPAD) {
        var _rk = '', _rn = '';
        if (isMain) {
          _rk = (mealPrefs&&mealPrefs[dIdx]&&mealPrefs[dIdx].dinner&&mealPrefs[dIdx].dinner.key)
                ? mealPrefs[dIdx].dinner.key
                : (dayPlan.dinner&&dayPlan.dinner.k ? dayPlan.dinner.k : '');
          _rn = (mealPrefs&&mealPrefs[dIdx]&&mealPrefs[dIdx].dinner&&mealPrefs[dIdx].dinner.name)
                ? mealPrefs[dIdx].dinner.name
                : (dayPlan.dinner&&dayPlan.dinner.n ? dayPlan.dinner.n : 'Main Meal');
        } else {
          _rk = slotCustom ? (slotCustom.mealKey || slotCustom.key || '')
              : permPref   ? (permPref.key || '')
              : (dayPlan[slot.key] && dayPlan[slot.key].k || '');
          _rn = slotCustom ? (slotCustom.name || slot.label)
              : permPref   ? (permPref.name || slot.label)
              : (dayPlan[slot.key] && dayPlan[slot.key].n || slot.label);
        }
        rowHTML +=
          '<div style="' + cellPad + bdrRight + 'cursor:pointer" ' +
          'data-recipe-key="' + _rk + '" ' +
          'data-recipe-name="' + _rn.replace(/"/g,"'") + '" ' +
          'onclick="openMealRecipe(this)">' + cellContent + '</div>';
      } else {
        if (isMain) {
          rowHTML +=
            '<div style="' + cellPad + bdrRight + 'cursor:pointer" ' +
            'onclick="showMealSwap(' + dIdx + ',\'dinner\')">' +
            '<div class="wg-dinner-cell">' + cellContent +
            '<div style="font-size:.58rem;color:' + _C.tMuted + ';margin-top:6px;' +
            'letter-spacing:.06em;text-transform:uppercase">Tap to swap</div>' +
            '</div></div>';
        } else {
          rowHTML += '<div style="' + cellPad + bdrRight + '">' + cellContent + '</div>';
        }
      }
    });

    rowHTML += '</div>';
    if (!isLastRow) {
      rowHTML += '<div style="height:1px;background:' + _C.div + '"></div>';
    }
    bodyHTML += rowHTML;
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
  return 'padding:14px 10px 10px;border-bottom:1px solid rgba(103,232,249,.12);';
}
function tdBase() {
  return 'padding:10px 10px;border-bottom:1px solid rgba(103,232,249,.07);' +
         'border-right:1px solid rgba(103,232,249,.06);';
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


// ══════════════════════════════════════════════════════════════
// iPAD RECIPE PANEL
// openMealRecipe(el) — called when user taps a meal cell on iPad.
// el = the inner div of the tapped cell (has data-recipe-key/name).
// closeRecipePanel() — closes and resets the panel.
// ══════════════════════════════════════════════════════════════

function openMealRecipe(el) {
  if (!el) return;
  var key  = el.getAttribute('data-recipe-key')  || '';
  var name = el.getAttribute('data-recipe-name') || '';

  // Read scaled ingredient strings directly from the cell's child elements.
  // Filter out badge lines (Custom, Dinner Family) by exact text match.
  var _badges = ['custom', 'dinner family'];
  var ings = [];
  Array.prototype.forEach.call(el.children, function(child) {
    var text = (child.textContent || '').trim();
    if (text && _badges.indexOf(text.toLowerCase()) < 0) {
      ings.push(text);
    }
  });

  // Look up instructions from MEAL_INSTRUCTIONS_MAP (swap-options.js)
  var instr = (typeof MEAL_INSTRUCTIONS_MAP !== 'undefined') ? MEAL_INSTRUCTIONS_MAP[key] : null;
  var steps = instr && instr.how_to_make && instr.how_to_make.length ? instr.how_to_make : null;
  var tip   = instr ? (instr.pro_tip || instr.batch_note || null) : null;

  // ── Populate panel elements ──────────────────────────────────
  var nameEl  = document.getElementById('recipe-name');
  var ingsEl  = document.getElementById('recipe-ingredients');
  var stepsEl = document.getElementById('recipe-steps');
  var tipEl   = document.getElementById('recipe-tip');
  var tipWrap = document.getElementById('recipe-tip-wrap');

  if (nameEl) nameEl.textContent = name;

  if (ingsEl) {
    ingsEl.innerHTML = ings.length
      ? ings.map(function(ing) {
          return '<div style="display:flex;align-items:baseline;gap:8px;' +
            'padding:7px 0;border-bottom:1px solid rgba(103,232,249,.06)">' +
            '<span style="color:rgba(0,212,255,.4);font-size:.65rem;flex-shrink:0">•</span>' +
            '<span style="font-size:.82rem;color:var(--t1);line-height:1.4">' + ing + '</span>' +
            '</div>';
        }).join('')
      : '<div style="font-size:.8rem;color:var(--t3);font-style:italic">Ingredients shown on the grid.</div>';
  }

  if (stepsEl) {
    stepsEl.innerHTML = steps
      ? steps.map(function(step, i) {
          return '<div style="display:flex;gap:12px;padding:9px 0;' +
            'border-bottom:1px solid rgba(103,232,249,.06)">' +
            '<div style="flex-shrink:0;width:22px;height:22px;border-radius:50%;' +
            'background:rgba(0,212,255,.06);border:1px solid rgba(103,232,249,.2);' +
            'display:flex;align-items:center;justify-content:center;' +
            'font-size:.6rem;font-weight:700;color:var(--gold-light)">' + (i + 1) + '</div>' +
            '<span style="font-size:.82rem;color:var(--t2);line-height:1.65">' + step + '</span>' +
            '</div>';
        }).join('')
      : '<div style="font-size:.8rem;color:var(--t3);font-style:italic;padding:8px 0">' +
        'No recipe available for this meal yet.</div>';
  }

  if (tipEl && tipWrap) {
    if (tip) {
      tipEl.textContent = tip;
      tipWrap.style.display = 'block';
    } else {
      tipWrap.style.display = 'none';
    }
  }

  // ── Show panel ───────────────────────────────────────────────
  var overlay = document.getElementById('recipe-overlay');
  var panel   = document.getElementById('recipe-panel');
  if (!overlay || !panel) return;
  overlay.style.display = 'block';
  panel.style.display   = 'flex';
  // Reset scroll before animating in
  var scrollEl = panel.querySelector('div[style*="overflow-y"]');
  if (scrollEl) scrollEl.scrollTop = 0;
  // Double rAF: ensures browser paints display:flex before transform fires,
  // which is required for CSS transitions to work on iOS Safari.
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      panel.style.transform = 'translateY(0)';
    });
  });
}

function closeRecipePanel() {
  var panel   = document.getElementById('recipe-panel');
  var overlay = document.getElementById('recipe-overlay');
  if (panel) panel.style.transform = 'translateY(100%)';
  setTimeout(function() {
    if (panel)   panel.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
  }, 340);
}

// ── End iPad Recipe Panel ─────────────────────────────────────
