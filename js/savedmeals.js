// ─────────────────────────────────────────────────────────────
// savedmeals.js — Loftin Method Personal Meal Library
// Translates dynamic tool results (restaurant, fridge) into
// mealdb.js schema entries and saves them to the user's personal
// meal library. This is the "save boundary" — the bridge between
// ephemeral generated results and the canonical meal database.
//
// Globals used: currentPlan, userName
// Depends on: sync.js (saveAllData), mealdb.js (MEAL_DB schema)
// ─────────────────────────────────────────────────────────────

var savedMeals = [];

// ── LOAD ON BOOT ──────────────────────────────────────────────
try {
  savedMeals = JSON.parse(localStorage.getItem('fft_saved_meals') || '[]');
} catch(e) { savedMeals = []; }

// ── PERSIST ───────────────────────────────────────────────────
function persistSavedMeals() {
  try { localStorage.setItem('fft_saved_meals', JSON.stringify(savedMeals)); } catch(e) {}
  saveAllData();
}

// ── TRANSLATOR: Restaurant result → mealdb.js entry ──────────
function translateRestaurantMeal(item, restaurant, slot) {
  var id = 'saved-restaurant-' + Date.now();
  var culturalTag = inferCulturalTag(restaurant);

  return {
    id: id,
    family: 'saved-restaurant',
    name: item.name,
    meal_type: slot || 'dinner',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: item.protein === 'other' ? [] : ['high-protein'],
      cultural: culturalTag ? [culturalTag] : ['american'],
      budget: 'moderate',
      family_friendly: false,
      medical: inferMedicalTags(item),
      prep: 'restaurant'
    },
    base_servings: 1,
    ingredients: item.meal && item.meal.length
      ? item.meal.map(function(m) {
          var parts = m.match(/^(.*?)\s*~?(\d+)\s*cal$/);
          return {
            item: parts ? parts[1].trim() : m,
            amount: null,
            unit: null,
            role: 'component',
            cal_estimate: parts ? parseInt(parts[2]) : null
          };
        })
      : [],
    macros_per_serving: {
      cal:   item.cal   || 0,
      pro:   item.pro   || 0,
      carb:  item.carb  || 0,
      fat:   item.fat   || 0,
      fiber: item.fiber || 0,
      sugar: item.sugar || 0
    },
    scaling: { light: 0.85, medium: 1.00, large: 1.15 },
    modifiers: {},
    instructions: item.ordering_notes && item.ordering_notes.length
      ? item.ordering_notes
      : ['Order as described'],
    swap_options: [],
    image: proteinImage(item.protein),
    loftin_plan: false,
    // Saved meal metadata
    _saved: true,
    _source: 'restaurant',
    _restaurant: restaurant || '',
    _savedAt: new Date().toISOString(),
    _exactness: 'estimated'
  };
}

// ── TRANSLATOR: Fridge result → mealdb.js entry ──────────────
function translateFridgeMeal(meal, slot) {
  var id = 'saved-fridge-' + Date.now();

  // Infer diet tags from ingredients
  var dietTags = ['high-protein'];
  var ingNames = (meal.ingredients || []).map(function(i) {
    return (i.item || '').toLowerCase();
  });
  var hasMeat = ingNames.some(function(n) {
    return n.indexOf('chicken') >= 0 || n.indexOf('beef') >= 0 ||
           n.indexOf('salmon') >= 0 || n.indexOf('turkey') >= 0 ||
           n.indexOf('shrimp') >= 0;
  });
  if (!hasMeat) dietTags.push('vegetarian');

  return {
    id: id,
    family: 'saved-fridge',
    name: meal.name || meal.meal || meal.title || 'My Fridge Meal',
    meal_type: slot || 'dinner',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: dietTags,
      cultural: ['american'],
      budget: 'low',
      family_friendly: false,
      medical: inferMedicalTagsFromMacros(meal.totalCal, meal.totalCarb, meal.totalPro),
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: (meal.ingredients || []).map(function(ing) {
      var amountMatch = (ing.amount || '').match(/^([\d.]+)\s*(g|oz|cups?|tbsp|tsp)?/i);
      return {
        item: ing.item || '',
        amount: amountMatch ? parseFloat(amountMatch[1]) : null,
        unit: amountMatch && amountMatch[2] ? amountMatch[2].toLowerCase() : 'g',
        role: inferIngredientRole(ing.item || ''),
        cal: ing.cal || null,
        pro: ing.pro || null
      };
    }),
    macros_per_serving: {
      cal:   meal.totalCal  || 0,
      pro:   meal.totalPro  || 0,
      carb:  meal.totalCarb || 0,
      fat:   meal.totalFat  || 0,
      fiber: 0,
      sugar: 0
    },
    scaling: { light: 0.85, medium: 1.00, large: 1.15 },
    modifiers: {},
    instructions: meal.instructions || [],
    swap_options: [],
    image: inferImageFromIngredients(ingNames),
    loftin_plan: false,
    _saved: true,
    _source: 'fridge',
    _savedAt: new Date().toISOString(),
    _exactness: 'calculated',
    _tip: meal.tip || ''
  };
}

// ── SAVE MEAL ─────────────────────────────────────────────────
function saveMealToLibrary(entry) {
  // Prevent duplicates by name + source
  var exists = savedMeals.some(function(m) {
    return m.name === entry.name &&
           m._source === entry._source &&
           (m._restaurant || '') === (entry._restaurant || '');
  });
  if (exists) {
    showSaveBanner('"' + entry.name + '" is already in your meal library.', false);
    return;
  }
  savedMeals.unshift(entry);
  persistSavedMeals();
  showSaveBanner('"' + entry.name + '" saved to your meal library.', true);
}

function removeSavedMeal(id) {
  savedMeals = savedMeals.filter(function(m) { return m.id !== id; });
  persistSavedMeals();
  renderSavedMealsPage();
}

// ── SAVE BANNER ───────────────────────────────────────────────
function showSaveBanner(msg, success) {
  // Try dashboard banner first
  var el = document.getElementById('dash-loss');
  if (el) {
    el.className = 'adj-banner ' + (success ? 'good' : '');
    el.innerHTML = '<strong>' + (success ? '✓ Saved' : 'Note') + '</strong> — ' + msg;
    el.classList.remove('hidden');
    setTimeout(function() { el.classList.add('hidden'); el.innerHTML = ''; }, 4000);
    return;
  }
  // Fall back to a floating toast notification that works on any page
  var toast = document.getElementById('fft-save-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'fft-save-toast';
    toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
      'background:' + (success ? 'var(--s2)' : 'var(--s2)') + ';' +
      'border:1px solid ' + (success ? 'rgba(184,150,60,.5)' : 'rgba(184,150,60,.3)') + ';' +
      'border-radius:10px;padding:12px 20px;font-size:.82rem;font-weight:600;' +
      'color:' + (success ? 'var(--gold-light)' : 'var(--t2)') + ';' +
      'z-index:9999;white-space:nowrap;box-shadow:0 8px 32px rgba(0,0,0,.5);' +
      'max-width:90vw;text-align:center';
    document.body.appendChild(toast);
  }
  toast.textContent = (success ? '⭐ ' : '· ') + msg;
  toast.style.display = 'block';
  setTimeout(function() { if(toast) toast.style.display = 'none'; }, 3500);
}

// ── PENDING SAVE STORE ───────────────────────────────────────
// Instead of complex inline onclick strings, we store pending save
// data in globals and call simple named functions. This avoids
// quote-escaping bugs entirely.
var _pendingSaveRestaurant = null;
var _pendingSaveFridge = null;

function savePendingRestaurant() {
  if (!_pendingSaveRestaurant) return;
  saveMealToLibrary(translateRestaurantMeal(
    _pendingSaveRestaurant.item,
    _pendingSaveRestaurant.restaurant,
    _pendingSaveRestaurant.slot
  ));
}

// Called directly from restaurant card button via data-item-key attribute
// Avoids all string escaping issues by reading the key from the DOM element
function saveRestaurantItemToLibrary(btn) {
  var itemKey = btn.dataset.k || btn.getAttribute('data-item-key') || btn.getAttribute('data-k');
  if (!itemKey || !window.restaurantCardItems[itemKey]) {
    showSaveBanner('Could not save — try searching again.', false);
    return;
  }
  var stored = window.restaurantCardItems[itemKey];
  saveMealToLibrary(translateRestaurantMeal(
    stored.item,
    stored.restaurant,
    eoMealType
  ));
}

function savePendingFridge() {
  if (!_pendingSaveFridge) return;
  saveMealToLibrary(translateFridgeMeal(
    _pendingSaveFridge.meal,
    _pendingSaveFridge.slot
  ));
}

// ── SAVE BUTTON HTML ──────────────────────────────────────────
// Uses named wrapper functions — no complex inline onclick data.
function saveMealButton(pendingKey) {
  var fn = pendingKey === 'restaurant' ? 'savePendingRestaurant()' : 'savePendingFridge()';
  return '<button onclick="' + fn + '" ' +
    'style="width:100%;padding:10px;margin-top:8px;background:none;' +
    'border:1px solid rgba(184,150,60,.4);border-radius:8px;' +
    'color:var(--gold);font-size:.72rem;font-weight:700;cursor:pointer;' +
    'letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-body)">' +
    '⭐ Save to My Meals' +
  '</button>';
}

// ── SAVED MEALS PAGE ──────────────────────────────────────────
function openSavedMeals() {
  var modal = document.getElementById('saved-meals-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  renderSavedMealsPage();
}

function closeSavedMeals() {
  var modal = document.getElementById('saved-meals-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function renderSavedMealsPage() {
  var content = document.getElementById('saved-meals-content');
  if (!content) return;

  if (!savedMeals.length) {
    content.innerHTML =
      '<div style="text-align:center;padding:40px 20px">' +
        '<div style="font-size:2rem;margin-bottom:16px">⭐</div>' +
        '<div style="font-size:.95rem;font-weight:600;color:var(--t1);margin-bottom:8px">No saved meals yet</div>' +
        '<p style="font-size:.82rem;color:var(--t2);line-height:1.65">' +
          'When you find a great restaurant meal or build something in the fridge tool, ' +
          'tap <strong style="color:var(--gold)">Save to My Meals</strong> to keep it here.' +
        '</p>' +
      '</div>';
    return;
  }

  var html = '';
  var sources = { restaurant: [], fridge: [] };
  savedMeals.forEach(function(m) {
    if (m._source === 'restaurant') sources.restaurant.push(m);
    else if (m._source === 'fridge') sources.fridge.push(m);
  });

  function renderSection(title, meals) {
    if (!meals.length) return '';
    var s = '<div style="font-size:.6rem;font-weight:700;color:var(--t3);letter-spacing:.16em;' +
      'text-transform:uppercase;font-family:var(--font-body);margin-bottom:12px">' + title + '</div>';
    meals.forEach(function(meal) {
      s += '<div style="background:var(--s2);border:1px solid var(--gold-line);border-radius:12px;' +
        'padding:16px;margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">' +
          '<div style="font-size:.95rem;font-weight:700;color:var(--t1);font-family:var(--font-display);' +
            'flex:1;padding-right:12px">' + meal.name + '</div>' +
          '<button onclick="removeSavedMeal(\'' + meal.id + '\')" ' +
            'style="background:none;border:none;color:var(--t3);font-size:.8rem;cursor:pointer;' +
            'padding:2px 6px;flex-shrink:0">✕</button>' +
        '</div>' +
        (meal._restaurant ?
          '<div style="font-size:.72rem;color:var(--t3);margin-bottom:8px">📍 ' + meal._restaurant + '</div>' : '') +
        renderMacroBar({
          pro:  meal.macros_per_serving.pro,
          carb: meal.macros_per_serving.carb,
          fat:  meal.macros_per_serving.fat
        }, 'row') +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">' +
          '<div style="font-size:.78rem;color:var(--t2)">' +
            meal.macros_per_serving.cal + ' cal' +
          '</div>' +
          '<div style="font-size:.65rem;color:var(--t3);font-style:italic">' +
            (meal._exactness === 'calculated' ? 'Calculated macros' : 'Estimated macros') +
          '</div>' +
        '</div>' +
        // Add to today button
        '<button onclick="event.stopPropagation();addSavedMealToDay(\'' + meal.id + '\')" ' +
          'style="width:100%;padding:9px;margin-top:10px;background:none;border:1px solid var(--gold-line);' +
          'color:var(--gold-light);border-radius:8px;font-size:.72rem;font-weight:700;cursor:pointer;' +
          'letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-body)">' +
          'Add to Today →' +
        '</button>' +
      '</div>';
    });
    return s;
  }

  html += renderSection('Restaurant Meals', sources.restaurant);
  html += renderSection('My Fridge Creations', sources.fridge);
  content.innerHTML = html;
}

// ── ADD SAVED MEAL TO TODAY ───────────────────────────────────
function addSavedMealToDay(id) {
  var meal = savedMeals.find(function(m) { return m.id === id; });
  if (!meal) return;
  closeSavedMeals();
  // Capture meal data before any async work
  var pendingName = meal.name || 'Saved Meal';
  var pendingCal = meal.macros_per_serving.cal;
  var pendingPro = meal.macros_per_serving.pro || 0;
  var pendingCarb = meal.macros_per_serving.carb || 0;
  var pendingFat = meal.macros_per_serving.fat || 0;
  var pendingMeal = meal.ingredients.map(function(i) {
    return i.item + (i.amount ? ' ' + i.amount + (i.unit || 'g') : '');
  });
  var pendingRestaurant = meal._restaurant || meal._source;
  // Delay slot picker open so modal close event fully completes first
  setTimeout(function() {
    window._pendingRestaurantMeal = {
      name: pendingName,
      cal: pendingCal,
      pro: pendingPro,
      carb: pendingCarb,
      fat: pendingFat,
      meal: pendingMeal,
      restaurant: pendingRestaurant
    };
    document.getElementById('rsp-meal-name').textContent =
      pendingName + ' (' + pendingCal + ' cal)';
    var picker = document.getElementById('restaurant-slot-picker');
    picker.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;' +
      'z-index:9999;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.5)';
    document.body.style.overflow = 'hidden';
  }, 50);
}

// ── HELPER FUNCTIONS ──────────────────────────────────────────
function inferCulturalTag(restaurant) {
  if (!restaurant) return null;
  var r = restaurant.toLowerCase();
  if (r.match(/taco|chipotle|qdoba|mexican|cantina|burrito/)) return 'mexican-inspired';
  if (r.match(/olive garden|carrabba|italian|pasta/)) return 'mediterranean';
  if (r.match(/panda|hibachi|sushi|asian|chinese|thai|japanese/)) return 'asian-inspired';
  if (r.match(/cracker barrel|waffle house|southern/)) return 'southern';
  if (r.match(/mediterranean|greek|hummus/)) return 'mediterranean';
  return 'american';
}

function inferMedicalTags(item) {
  var tags = [];
  if (item.carb && item.carb < 30) tags.push('carb-conscious');
  if (item.fat && item.fat < 10) tags.push('lower-fat');
  return tags;
}

function inferMedicalTagsFromMacros(cal, carb, pro) {
  var tags = [];
  if (carb && carb < 30) tags.push('carb-conscious');
  if (pro && cal && (pro * 4 / cal) > 0.35) tags.push('high-protein');
  return tags;
}

function inferIngredientRole(name) {
  var n = name.toLowerCase();
  if (n.match(/chicken|beef|salmon|turkey|shrimp|egg|tofu|tuna|pork/)) return 'protein';
  if (n.match(/rice|potato|oat|bread|pasta|bean|corn|tortilla/)) return 'carb';
  if (n.match(/oil|butter|cheese|cream|avocado|nut/)) return 'fat';
  if (n.match(/salt|pepper|seasoning|spice|sauce|garlic|onion|herb/)) return 'seasoning';
  return 'other';
}

function inferImageFromIngredients(ingNames) {
  if (ingNames.some(function(n) { return n.indexOf('chicken') >= 0; })) return 'food-chicken.png';
  if (ingNames.some(function(n) { return n.indexOf('beef') >= 0 || n.indexOf('steak') >= 0; })) return 'food-beef.png';
  if (ingNames.some(function(n) { return n.indexOf('salmon') >= 0 || n.indexOf('fish') >= 0; })) return 'food-salmon.png';
  if (ingNames.some(function(n) { return n.indexOf('egg') >= 0; })) return 'food-eggs.png';
  if (ingNames.some(function(n) { return n.indexOf('yogurt') >= 0; })) return 'food-yogurt.png';
  if (ingNames.some(function(n) { return n.indexOf('cottage') >= 0; })) return 'food-cottage.png';
  return 'food-chicken.png';
}

function proteinImage(protein) {
  var map = { chicken: 'food-chicken.png', steak: 'food-beef.png', fish: 'food-salmon.png' };
  return map[protein] || 'food-chicken.png';
}
