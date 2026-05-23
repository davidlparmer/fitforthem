// ─────────────────────────────────────────────────────────────
// restaurants.js — Loftin Method Restaurant & Drink Search
// Nearby restaurant finder, meal search, drink/food/store lookup.
// Globals used: currentPlan, eoMealType, eoDrinking, drinkingDays,
//               DRINK_RESERVES, storeMode, workMode (all in app.html)
// Depends on: engine.js (buildRotation), sync.js (getDeviceId)
// ─────────────────────────────────────────────────────────────

var RESTAURANT_QUALITY={
  excellent:['texas roadhouse','outback','longhorn','ruth chris','flemings','chilis','applebees','olive garden','red lobster','cheesecake factory','bonefish','logans','cracker barrel','ihop','dennys','perkins'],
  good:['mcdonalds','burger king','wendys','chick-fil-a','chickfila','popeyes','raising canes','in-n-out','five guys','shake shack','culvers','whataburger','sonic','steak n shake','waffle house','panera','chipotle','panda express','subway','jersey mikes'],
};

// ── RESTAURANT REALISM LAYER ─────────────────────────────────────────────────
// Three-tier deterministic safety net that runs BEFORE rendering:
//   1. Chain bias   — known heavy-pour chains inflate all estimates
//   2. Keyword inflation — high-risk modifiers inflate the estimate
//   3. Category floors — hard minimums for impossible outputs
// To expand any tier: add a row to the relevant config object below.

// Tier 1: Chains known to pour oils, butter, and oversized portions.
// Multiplier applied to Claude's raw estimate before anything else.
var RESTAURANT_CHAIN_BIAS = {
  'five guys':           1.50,
  'cheesecake factory':  1.45,
  'buffalo wild wings':  1.35,
  'texas roadhouse':     1.30,
  'olive garden':        1.25,
  "applebee's":          1.20,
  'applebees':           1.20,
  "chili's":             1.20,
  'chilis':              1.20,
  'outback':             1.25,
  'longhorn':            1.25,
  'red lobster':         1.20,
  'ihop':                1.20,
  'dennys':              1.15,
};

// Tier 2: Keywords in the item name that signal hidden calories.
// inflate = fraction added to estimate (0.35 = add 35%).
// Only the highest-matching inflate value is applied per item.
var RESTAURANT_KEYWORD_INFLATION = [
  { keywords: ['alfredo','carbonara','creamy','cream sauce','cream-based'], inflate: 0.45 },
  { keywords: ['fried','crispy','battered','breaded','deep fried'],         inflate: 0.40 },
  { keywords: ['loaded','queso','bacon','ranch','aioli','cheese sauce'],    inflate: 0.35 },
  { keywords: ['large','double','combo','riblets','triple'],                inflate: 0.30 },
  { keywords: ['cajun','buttery','butter sauce','glazed','smothered'],      inflate: 0.25 },
];

// Tier 3: Hard calorie floors. Nothing in these categories can display below floor.
// Listed most-specific first — first match wins.
var RESTAURANT_CAL_FLOORS = [
  { keywords: ['large cajun fries','large fries','large french fries'],     floor: 700,  label: 'large fries'      },
  { keywords: ['fries','french fries','onion rings','tots'],                floor: 400,  label: 'fried side'       },
  { keywords: ['loaded mashed','loaded potato','loaded baked'],             floor: 550,  label: 'loaded potato'    },
  { keywords: ['mashed potato','mashed potatoes'],                          floor: 320,  label: 'mashed potatoes'  },
  { keywords: ['baked potato'],                                             floor: 250,  label: 'baked potato'     },
  { keywords: ['breadstick','bread stick'],                                 floor: 130,  label: 'breadstick'       },
  { keywords: ['pasta','alfredo','carbonara','linguine','spaghetti',
               'fettuccine','penne','rigatoni','lasagna','tortellini'],     floor: 900,  label: 'pasta entrée'     },
  { keywords: ['burrito','quesadilla'],                                     floor: 700,  label: 'burrito'          },
  { keywords: ['wrap'],                                                     floor: 500,  label: 'wrap'             },
  { keywords: ['burger','cheeseburger','hamburger','bacon burger',
               'double burger'],                                            floor: 700,  label: 'burger'           },
  { keywords: ['ribeye','prime rib','porterhouse','t-bone'],               floor: 900,  label: 'fatty steak'      },
  { keywords: ['nachos'],                                                   floor: 800,  label: 'nachos'           },
  { keywords: ['cheesesteak','philly'],                                     floor: 650,  label: 'cheesesteak'      },
  { keywords: ['fish and chips','fish & chips'],                            floor: 750,  label: 'fish and chips'   },
  { keywords: ['wings','riblets','boneless wings'],                         floor: 700,  label: 'wings'            },
  { keywords: ['pizza'],                                                    floor: 250,  label: 'pizza slice'      },
  { keywords: ['cheesecake','chocolate cake','lava cake'],                  floor: 450,  label: 'dessert'          },
];

// Absolute minimum — no restaurant item can display below this
var RESTAURANT_ITEM_MINIMUM = 150;

// Round to nearest 50 — restaurants don't warrant fake precision
function _roundToFifty(n) { return Math.round(n / 50) * 50; }

// Main realism function. Accepts restaurantName so chain bias can apply.
function _applyRestaurantFloors(item, restaurantName) {
  var name = (item.name||'').toLowerCase() + ' ' +
             (item.components||[]).map(function(c){return c.item||'';}).join(' ').toLowerCase();
  var cal = item.cal || 0;
  if (!cal) return item;
  item.warningFlags = item.warningFlags || [];

  // ── Tier 1: Chain bias ──────────────────────────────────────────────────
  var chainKey = (restaurantName||'').toLowerCase().replace(/[^a-z\s']/g,'').trim();
  var chainMult = 1;
  Object.keys(RESTAURANT_CHAIN_BIAS).forEach(function(chain) {
    if (chainKey.indexOf(chain) >= 0) chainMult = Math.max(chainMult, RESTAURANT_CHAIN_BIAS[chain]);
  });
  if (chainMult > 1) {
    cal = Math.round(cal * chainMult);
    item.warningFlags.push('Conservative estimate for ' + (restaurantName||'this chain'));
  }

  // ── Tier 2: Keyword inflation ────────────────────────────────────────────
  var maxInflate = 0;
  RESTAURANT_KEYWORD_INFLATION.forEach(function(rule) {
    rule.keywords.forEach(function(kw) {
      if (name.indexOf(kw) >= 0) maxInflate = Math.max(maxInflate, rule.inflate);
    });
  });
  if (maxInflate > 0) {
    cal = Math.round(cal * (1 + maxInflate));
    item.warningFlags.push('Hidden calories adjusted for sauces, oils, and preparation');
  }

  // ── Tier 3: Category floors ──────────────────────────────────────────────
  var hit = null;
  RESTAURANT_CAL_FLOORS.forEach(function(rule) {
    rule.keywords.forEach(function(kw) {
      if (!hit && name.indexOf(kw) >= 0 && cal < rule.floor) hit = rule;
    });
  });
  if (hit) {
    cal = hit.floor;
    item.warningFlags.push(hit.label + ' — minimum ' + hit.floor + ' cal floor applied');
  }

  // ── Oz-aware steak floor (80 cal/oz — restaurant steaks run 85-100/oz) ──
  var ozMatch = name.match(/(\d+)\s*oz/);
  if (ozMatch) {
    var oz = parseInt(ozMatch[1]);
    var isSteak = /steak|ribeye|sirloin|filet|strip|porterhouse|prime rib|t-bone/.test(name);
    if (isSteak && oz >= 4) {
      var steakFloor = oz * 80;
      if (cal < steakFloor) {
        cal = steakFloor;
        item.warningFlags.push(oz + 'oz steak — ' + steakFloor + ' cal minimum (80 cal/oz restaurant floor)');
      }
    }
  }

  // ── Absolute minimum ────────────────────────────────────────────────────
  if (cal < RESTAURANT_ITEM_MINIMUM) {
    cal = RESTAURANT_ITEM_MINIMUM;
    item.warningFlags.push('Calorie estimate adjusted to restaurant minimum');
  }

  // ── Apply adjusted cal, sync macros, build range ────────────────────────
  var originalCal = item.cal || cal;
  item.cal    = _roundToFifty(cal);
  item.calLow = item.cal;

  // Sync macros proportionally to the inflation ratio.
  // Without this: macros add up to 1,132 cal but total displays 2,150 — breaks trust.
  var inflationRatio = originalCal > 0 ? (item.cal / originalCal) : 1;
  if (inflationRatio > 1.05 && (item.pro || item.carb || item.fat)) {
    item.pro  = Math.round((item.pro  || 0) * inflationRatio);
    item.carb = Math.round((item.carb || 0) * inflationRatio);
    item.fat  = Math.round((item.fat  || 0) * inflationRatio);
  }

  // Surface the inflation as a visible component so users understand why total > line items.
  var prepAdjustment = item.cal - originalCal;
  if (prepAdjustment > 100) {
    item.components = item.components || [];
    item.components.push({
      item: 'Restaurant preparation (oils, butter, portion size)',
      cal:  Math.round(prepAdjustment)
    });
  }

  // Range: variance based on confidence — low confidence = wider range
  var conf = item.confidence || 'medium';
  var spreadPct = conf === 'high' ? 0.20 : conf === 'low' ? 0.55 : 0.35;
  item.calHigh = _roundToFifty(Math.round(item.cal * (1 + spreadPct)));

  // Deduplicate flags
  item.warningFlags = item.warningFlags.filter(function(f, i, arr) {
    return arr.indexOf(f) === i;
  });

  return item;
}
// ── END RESTAURANT REALISM LAYER ──────────────────────────────────────────────

function getRestaurantQuality(name){
  var n=name.toLowerCase().replace(/[^a-z]/g,'');
  for(var r of RESTAURANT_QUALITY.excellent){if(n.includes(r.replace(/[^a-z]/g,'')))return 'green';}
  for(var r of RESTAURANT_QUALITY.good){if(n.includes(r.replace(/[^a-z]/g,'')))return 'yellow';}
  return 'gray';
}

var nearbyRestaurants=[];
var userLocation=null;

async function findNearbyRestaurants(){
  var statusEl=document.getElementById('nearby-status');
  var listEl=document.getElementById('nearby-list');
  var mapEl=document.getElementById('nearby-map');
  var legendEl=document.getElementById('nearby-legend');

  statusEl.textContent='📍 Getting your location...';
  statusEl.classList.remove('hidden');
  listEl.innerHTML='';

  if(!navigator.geolocation){
    statusEl.textContent='⚠️ Location not supported on this browser. Use the manual search below.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async function(pos){
      userLocation={lat:pos.coords.latitude,lng:pos.coords.longitude};
      statusEl.textContent='🔍 Finding restaurants near you...';

      try{
        var res=await fetch('/.netlify/functions/claude',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'nearby',lat:userLocation.lat,lng:userLocation.lng,radius:2500})
        });
        var data=await res.json();

        if(!data.restaurants||!data.restaurants.length){
          statusEl.textContent='No restaurants found nearby. Try the manual search below.';
          return;
        }

        nearbyRestaurants=data.restaurants;
        statusEl.classList.add('hidden');
        mapEl.classList.remove('hidden');
        legendEl.classList.remove('hidden');
        renderNearbyMap();
        renderNearbyList();

      }catch(err){
        statusEl.textContent='⚠️ Could not load nearby restaurants. Try the manual search below.';
      }
    },
    function(err){
      statusEl.textContent='📍 Location access denied. Use the manual search below to find your restaurant.';
    },
    {timeout:10000,maximumAge:60000}
  );
}

function renderNearbyMap(){
  var mapEl=document.getElementById('nearby-map');
  if(!nearbyRestaurants.length||!userLocation)return;

  // Calculate bounds
  var lats=nearbyRestaurants.map(function(r){return r.lat;}).concat([userLocation.lat]);
  var lngs=nearbyRestaurants.map(function(r){return r.lng;}).concat([userLocation.lng]);
  var minLat=Math.min.apply(null,lats)-0.002;
  var maxLat=Math.max.apply(null,lats)+0.002;
  var minLng=Math.min.apply(null,lngs)-0.002;
  var maxLng=Math.max.apply(null,lngs)+0.002;

  var w=mapEl.offsetWidth||340;
  var h=260;

  function toX(lng){return((lng-minLng)/(maxLng-minLng))*w;}
  function toY(lat){return h-((lat-minLat)/(maxLat-minLat))*h;}

  // Clear old pins
  mapEl.querySelectorAll('.restaurant-pin,.user-pin').forEach(function(el){el.remove();});

  // Map background
  mapEl.style.background='#E8F4E8';
  mapEl.style.position='relative';

  // Draw simple grid lines
  var canvas=document.getElementById('map-canvas');
  canvas.style.display='block';
  canvas.width=w;
  canvas.height=h;
  var ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,w,h);
  ctx.strokeStyle='rgba(255,255,255,0.6)';
  ctx.lineWidth=1;
  for(var i=0;i<w;i+=40){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,h);ctx.stroke();}
  for(var j=0;j<h;j+=40){ctx.beginPath();ctx.moveTo(0,j);ctx.lineTo(w,j);ctx.stroke();}

  // User location dot
  var userPin=document.createElement('div');
  userPin.className='user-pin';
  userPin.style.cssText='position:absolute;width:16px;height:16px;background:#2980B9;border:3px solid white;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 4px rgba(41,128,185,0.3);z-index:10;';
  userPin.style.left=toX(userLocation.lng)+'px';
  userPin.style.top=toY(userLocation.lat)+'px';
  userPin.title='You are here';
  mapEl.appendChild(userPin);

  // Restaurant pins
  nearbyRestaurants.slice(0,15).forEach(function(r,idx){
    var quality=getRestaurantQuality(r.name);
    var colors={green:'#4A7C59',yellow:'#F5A623',gray:'#8C7B6B'};
    var pin=document.createElement('div');
    pin.className='restaurant-pin';
    pin.style.left=toX(r.lng)+'px';
    pin.style.top=toY(r.lat)+'px';
    pin.style.zIndex=5;
    pin.innerHTML='<div class="pin-dot" style="background:'+colors[quality]+'">'+(idx+1)+'</div>';
    pin.title=r.name;
    pin.onclick=(function(restaurant){
      return function(){selectNearbyRestaurant(restaurant);}
    })(r);
    mapEl.appendChild(pin);
  });
}

function renderNearbyList(){
  var listEl=document.getElementById('nearby-list');
  if(!nearbyRestaurants.length){listEl.innerHTML='';return;}

  var html='<div class="section-title" style="margin-bottom:8px">'+nearbyRestaurants.length+' restaurants nearby — tap to find your best meal</div>';
  nearbyRestaurants.slice(0,15).forEach(function(r,idx){
    var quality=getRestaurantQuality(r.name);
    var openStatus=r.open_now===true?'<span class="nearby-badge open">Open</span>':r.open_now===false?'<span class="nearby-badge closed">Closed</span>':'';
    var rating=r.rating?'⭐ '+r.rating+' · ':'';
    html+='<div class="nearby-item" id="nearby-item-'+r.place_id+'" onclick="selectNearbyRestaurant('+JSON.stringify(r).replace(/\x22/g,"\x27")+')">'+
      '<span style="font-size:.78rem;font-weight:700;color:var(--muted);min-width:18px">'+(idx+1)+'</span>'+
      '<div class="nearby-dot '+quality+'"></div>'+
      '<div style="flex:1;min-width:0">'+
        '<div class="nearby-name">'+r.name+'</div>'+
        '<div class="nearby-meta">'+rating+r.vicinity+'</div>'+
      '</div>'+
      openStatus+
    '</div>';
  });
  listEl.innerHTML=html;
}

function selectNearbyRestaurant(restaurant){
  // Highlight selected
  document.querySelectorAll('.nearby-item').forEach(function(el){el.classList.remove('selected');});
  var item=document.getElementById('nearby-item-'+restaurant.place_id);
  if(item){item.classList.add('selected');item.scrollIntoView({behavior:'smooth',block:'nearest'});}

  // Fill restaurant input and trigger search
  document.getElementById('restaurant-input').value=restaurant.name;
  searchRestaurant();

  // Scroll to results
  setTimeout(function(){
    var resultsEl=document.getElementById('restaurant-results');
    if(resultsEl)resultsEl.scrollIntoView({behavior:'smooth',block:'start'});
  },300);
}

function checkCalOverride(){var el=document.getElementById('eo-cal');var planCal=parseInt(el.dataset.planCal||0);var entered=parseInt(el.value||0);var isOverride=planCal>0&&entered!==planCal;el.style.color=isOverride?'var(--text)':'var(--muted)';el.style.fontStyle=isOverride?'normal':'italic';document.getElementById('cal-override-note').classList.toggle('hidden',!isOverride);}
function setMealType(t,el){eoMealType=t;document.querySelectorAll('[id^="mt-"]').forEach(function(b){b.classList.remove('active');});el.classList.add('active');}

// Auto-highlight the meal slot that matches current time of day when page opens.
// User can always override — this is just a starting suggestion.
function initEatOut(){
  if(eoMealType)return; // already selected from a previous visit
  var hour=new Date().getHours();
  var suggested=hour<12?'first':hour<20?'dinner':'dessert';
  var btn=document.getElementById('mt-'+suggested);
  if(btn)setMealType(suggested,btn);
}
var drinkingAgeConfirmed=false;
try{drinkingAgeConfirmed=localStorage.getItem('fft_drink_age')==='1';}catch(e){}

function setDrinking(val,el){
  if(val&&!drinkingAgeConfirmed){
    var confirmed=confirm('The drink budget feature is intended for users of legal drinking age.\n\nIn the United States that is 21 and older. Laws vary by country and region.\n\nBy continuing you confirm you are of legal drinking age where you live.');
    if(!confirmed)return;
    drinkingAgeConfirmed=true;
    try{localStorage.setItem('fft_drink_age','1');}catch(e){}
  }
  eoDrinking=val;
  document.querySelectorAll('[id^="drink-n"],[id^="drink-y"]').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  document.getElementById('drink-section').style.display=val?'block':'none';
  var dow=new Date().getDay();var isWknd=dow===0||dow===6;
  document.getElementById('special-occ').classList.toggle('hidden',isWknd||!val);
  if(val){var todayLevel=drinkingDays[new Date().getDay()===0?6:new Date().getDay()-1]||'regular';var budget=DRINK_RESERVES[todayLevel]||450;document.getElementById('drink-budget-info').innerHTML='Your drink budget tonight is <strong>~'+budget+' calories</strong>. Search any drink below to see how many fit.';}
}

async function searchRestaurant(){
  var restaurant=document.getElementById('restaurant-input').value.trim();
  if(!restaurant){alert('Please enter a restaurant name.');return;}
  if(!currentPlan.cal){alert('Build your plan first.');return;}
  if(!eoMealType){alert('Please select a meal slot — First Meal, Main Meal, or Final Meal.');return;}

  // System context — know exactly what meal slot we're replacing
  var slot=eoMealType;
  var drinkReserve=eoDrinking?(DRINK_RESERVES[drinkingDays[new Date().getDay()===0?6:new Date().getDay()-1]]||450):0;
  var slotTargets=getSlotCalorieTargets(currentPlan, drinkReserve);
  var mealBudget=slotTargets[slot]||slotTargets.dinner;
  var foodBudget=mealBudget; // already drink-adjusted

  // Today's protein intent — declare dayIdx FIRST so drinkReserve can use it
  var dow=new Date().getDay();var dayIdx=dow===0?6:dow-1;

  var rotation=buildRotation();
  var todayProtein=proteinSwaps[dayIdx]?{protein:proteinSwaps[dayIdx]}:rotation[dayIdx];
  var proteinName=todayProtein.protein;
  var dayName=DAYS_FULL[dayIdx];
  var slotLabel=getSlotDisplayLabel(slot);

  // Lane context for prompt
  var planMode=getPlanMode(currentPlan);
  var planSex=(currentPlan&&currentPlan.sex)?currentPlan.sex:'male';
  var planLane=(currentPlan&&currentPlan.lane)?currentPlan.lane:'men_deficit';

  var el=document.getElementById('restaurant-results');
  el.innerHTML='<div class="loading"><div class="spinner"></div>Finding your best option at '+restaurant+'...</div>';
  window.restaurantCardItems={};

  // Update info bar
  var infoEl=document.getElementById('eatout-targets');
  infoEl.innerHTML='<strong>Replacing '+slotLabel+' — '+proteinName+' day.</strong> Food budget: '+foodBudget+' cal'+(eoDrinking?' + '+drinkReserve+' cal drinks':'')+'.';
  infoEl.classList.remove('hidden');

  try{
    var prompt=
      'You are a physique nutrition coach at '+restaurant+'. Your job has TWO phases. Complete them in order.\n\n'+

      '── PHASE 1: REALISTIC ESTIMATION (ignore the calorie budget completely) ──\n'+
      'Estimate what these restaurant meals actually contain. Do NOT look at the calorie budget yet.\n'+
      'Nutrition databases undercount restaurant calories by 20–50%. Apply these realities:\n'+
      '- Every grilled or sautéed item: add 80–150 cal for cooking oil and butter\n'+
      '- Every sauce, glaze, or dressing: add 80–200 cal\n'+
      '- Restaurant portions are 30–60% larger than home portions\n'+
      '- Known heavy-pour chains:\n'+
      '    Five Guys: all estimates ×1.5 (oil-soaked buns, massive patties, enormous fries)\n'+
      '    Cheesecake Factory: ×1.45 (extreme portions, heavy sauces)\n'+
      '    Buffalo Wild Wings, Texas Roadhouse, Olive Garden: ×1.25–1.35\n'+
      '- Category minimums (never go below these):\n'+
      '    Burger + large fries combo: 1,400–2,200 cal\n'+
      '    Bacon cheeseburger alone: 850–1,200 cal\n'+
      '    Large fries at Five Guys, BWW, Chilis: 750–950 cal\n'+
      '    Pasta entrée: 950–1,600 cal\n'+
      '    Wings 10-count sauced: 900–1,400 cal\n'+
      '    Loaded or smothered anything: add 350–550 cal\n'+
      '    Olive Garden breadstick: 140 cal each\n'+
      '    12oz ribeye at steakhouse: 950–1,250 cal\n\n'+
      'Return a calLow and calHigh RANGE. Never a single exact number. Round to nearest 50.\n\n'+

      '── PHASE 2: SMART RECOMMENDATION (use the budget here) ──\n'+
      'User\'s '+slotLabel+' budget: '+foodBudget+' cal.\n\n'+
      'PRIMARY GOAL: Find the most satisfying meal that realistically fits within '+foodBudget+' cal.\n'+
      'The app is a nutrition coach — prioritize realistic adherence over maximum indulgence.\n\n'+
      'RECOMMENDATION PRIORITY ORDER:\n'+
      '1. Find the best realistic meal UNDER the budget\n'+
      '2. If nothing fits cleanly, find the lightest realistic option with a clear modification strategy\n'+
      '3. Only recommend an over-budget meal as a last resort, with explicit guidance\n\n'+
      'CHAIN-SPECIFIC PIVOTS — apply these defaults before recommending anything:\n'+
      '- Five Guys: prefer single patty + small/shared fries over double + large fries\n'+
      '- Texas Roadhouse: prefer 6oz cuts over 12–16oz; plain potato over loaded\n'+
      '- Olive Garden: prefer grilled salmon, herb chicken, or soup+salad over creamy pasta\n'+
      '- Buffalo Wild Wings: prefer dry-rub smaller count over sauced platters\n'+
      '- Cheesecake Factory: aggressively prefer grilled proteins and simple sides\n'+
      '- Applebee\'s/Chili\'s: prefer grilled proteins, avoid loaded/smothered options by default\n\n'+
      'budgetStatus classification:\n'+
      '  "fits"           — within 15% of budget\n'+
      '  "slightly_above" — 15–40% over\n'+
      '  "above"          — 40–80% over\n'+
      '  "well_above"     — more than 80% over\n'+
      'budgetAdvice — specific and actionable:\n'+
      '  fits:            "Good choice. Order as described."\n'+
      '  slightly_above:  "Sauce on the side, skip loaded toppings — keeps you closer to target."\n'+
      '  above:           "Heavy meal. Box half immediately. Lighten your Final Meal tonight."\n'+
      '  well_above:      "Well above budget. Split this or choose a lighter option from alternates."\n'+
      'IMPORTANT: Never adjust the calorie estimate to make a meal appear to fit. Honesty builds trust.\n\n'+

      'System context:\n'+
      '- Today\'s protein: '+proteinName+'\n'+
      '- Plan mode: '+planMode+'\n'+
      '- User sex: '+planSex+'\n\n'+

      'Rules:\n'+
      '1. Show ONE Best Match — best realistic option that fits or comes closest to budget with '+proteinName+'. Prefer lighter configurations over indulgent ones when both are genuine options.\n'+
      '2. Show up to 2 Alternates — lighter genuine alternatives, not just the same meal with a sauce swap\n'+
      '3. Each component needs its own calorie estimate\n'+
      '4. Include pro, carb, fat in grams\n'+
      '5. Do not invent items not on the menu\n'+
      '6. confidence: "high" = simple grilled protein, "medium" = standard item, "low" = fried/loaded/sauced\n'+
      '7. ordering_notes: practical tips like "sauce on the side" or "ask for no butter"\n\n'+

      'JSON format (return ONLY this JSON):\n'+
      '{"restaurant":"name","items":[{'+
      '"rank":"best",'+
      '"name":"full meal name",'+
      '"protein":"chicken|steak|fish|other",'+
      '"cal":0,'+
      '"calLow":0,'+
      '"calHigh":0,'+
      '"confidence":"medium",'+
      '"pro":0,"carb":0,"fat":0,'+
      '"components":[{"item":"item name","cal":0}],'+
      '"budgetStatus":"fits|slightly_above|above|well_above",'+
      '"budgetAdvice":"specific actionable recommendation",'+
      '"ordering_notes":["sauce on the side"],'+
      '"why":"one sentence on why this is the best pick"'+
      '}]}';

    var data=await askClaude(prompt);
    if(!data.items||!data.items.length){el.innerHTML='<div class="empty">No results found. Try a different spelling.</div>';return;}
    // Apply deterministic calorie floors before rendering
    var _rName=restaurant;
    data.items=data.items.map(function(item){return _applyRestaurantFloors(item,_rName);});

    var html='';
    var bestItems=data.items.filter(function(i){return i.rank==='best';});
    var altItems=data.items.filter(function(i){return i.rank==='alternate';});

    function budgetBadge(itemCal, side, budget){ return ''; } // handled by trustBadges in renderFoodCard

    // Best Match
    bestItems.forEach(function(item){
      var itemKey='ri'+Date.now()+Math.random();
      var side=item.side_recommendation&&item.side_recommendation.item?item.side_recommendation:null;
      var totalCal=(item.combined_cal>0?item.combined_cal:0)||(side?((item.cal||0)+(side.cal||0)):(item.cal||0));
      if(!totalCal)totalCal=item.cal||0; // null guard — prevents Sonic-style zero-cal display
      window.restaurantCardItems[itemKey]={
        item:{name:item.name,cal:totalCal,pro:item.pro||0,carb:item.carb||0,fat:item.fat||0,
          meal:item.components?item.components.map(function(c){return c.item+' ~'+c.cal+' cal'}):[],
          protein:item.protein},
        restaurant:data.restaurant||restaurant
      };
      html+='<div style="background:linear-gradient(170deg,var(--s2),var(--s1));border:1px solid rgba(184,150,60,.35);border-top:2px solid rgba(184,150,60,.6);border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 16px 48px rgba(0,0,0,.55)">';
      html+='<div style="font-size:.6rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:12px;font-family:var(--font-body)">Best Match — Order This</div>';
      html+='<div style="font-size:1.1rem;font-weight:700;color:var(--t1);font-family:var(--font-display);margin-bottom:4px">'+item.name+'</div>';

      // Component breakdown
      if(item.components&&item.components.length){
        html+='<div style="margin:12px 0;padding:10px 12px;background:rgba(0,0,0,.2);border-radius:8px;border:1px solid var(--gold-line)">';
        html+='<div style="font-size:.58rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);margin-bottom:8px">Your Complete Order</div>';
        item.components.forEach(function(c){
          html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(184,150,60,.08);font-size:.84rem">'+
            '<span style="color:var(--t1)">→ '+c.item+'</span>'+
            '<span style="color:var(--gold-light);font-weight:600">~'+c.cal+' cal</span>'+
          '</div>';
        });

        // Side recommendation — shown inside the order breakdown
        if(side){
          html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(184,150,60,.08);font-size:.84rem">'+
            '<span style="color:#7ec99a">+ '+side.item+' <span style="font-size:.7rem;color:var(--t3)">(recommended side)</span></span>'+
            '<span style="color:#7ec99a;font-weight:600">~'+side.cal+' cal</span>'+
          '</div>';
        }

        html+='<div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;font-size:.88rem;font-weight:700">'+
          '<span style="color:var(--t2)">Total</span>'+
          '<span style="color:var(--gold-light)">~'+totalCal+' cal</span>'+
        '</div>';
        html+='</div>';
      }

      // Side rationale (if included)
      if(side&&side.why){
        html+='<div style="font-size:.76rem;color:#7ec99a;margin:8px 0;padding:6px 10px;background:rgba(61,122,82,.08);border-radius:6px;border-left:2px solid rgba(61,122,82,.4)">'+
          '💡 '+side.why+'</div>';
      }

      // Budget badge + protein tag
      html+='<div style="display:flex;gap:8px;margin:10px 0;flex-wrap:wrap">';
      html+='<span style="background:rgba(184,150,60,.12);color:var(--gold-light);border-radius:20px;padding:3px 10px;font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase">'+item.protein+'</span>';
      html+=budgetBadge(item.cal, side, foodBudget);
      html+='</div>';

      // Modification note if over by more than 50
      if(item.over_budget&&item.modification){
        html+='<div style="font-size:.78rem;color:var(--t2);padding:8px 12px;background:rgba(192,57,43,.08);border-radius:6px;margin-bottom:8px;border-left:2px solid rgba(192,57,43,.3)">✂️ To stay on budget: '+item.modification+'</div>';
      }

      // Macro bar
      if(item.pro||item.carb||item.fat){html+=renderMacroBar({pro:item.pro||0,carb:item.carb||0,fat:item.fat||0},'row');}

      // Ordering notes
      if(item.ordering_notes&&item.ordering_notes.length){
        html+='<div style="margin-top:10px;padding:10px 12px;background:rgba(184,150,60,.04);border-left:2px solid rgba(184,150,60,.3);border-radius:0 6px 6px 0">';
        html+='<div style="font-size:.62rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);margin-bottom:6px">How to Order</div>';
        item.ordering_notes.forEach(function(note){
          html+='<div style="font-size:.82rem;color:var(--t2);padding:2px 0">· '+note+'</div>';
        });
        html+='</div>';
      }
      if(item.why){html+='<div style="font-size:.78rem;color:var(--t2);font-style:italic;margin-top:10px">'+item.why+'</div>';}

      html+='<button onclick="_pendingSaveRestaurant={item:window.restaurantCardItems[this.dataset.k]&&window.restaurantCardItems[this.dataset.k].item,restaurant:window.restaurantCardItems[this.dataset.k]&&window.restaurantCardItems[this.dataset.k].restaurant,slot:eoMealType};savePendingRestaurant()" data-k=\''+itemKey+'\' style="width:100%;padding:10px;margin-top:14px;background:none;border:1px solid rgba(184,150,60,.4);border-radius:8px;color:var(--gold);font-size:.72rem;font-weight:700;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-body)">⭐ Save to My Meals</button>';
      html+='<button onclick="window.addMealToDay(\''+itemKey+'\')" style="width:100%;padding:12px;margin-top:8px;background:var(--cream-bg);color:var(--cream-text);border:1px solid var(--cream-border);border-radius:10px;font-size:.75rem;font-weight:700;cursor:pointer;letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-body)">I\'m ordering this — add to my day</button>';
      html+='</div>';
    });

    // Alternates
    if(altItems.length){
      html+='<div style="font-size:.6rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--t3);margin:20px 0 12px;font-family:var(--font-body);padding-top:16px;border-top:1px solid var(--gold-line)">Alternates</div>';
      altItems.slice(0,2).forEach(function(item){
        var itemKey='ri'+Date.now()+Math.random();
        var side=item.side_recommendation&&item.side_recommendation.item?item.side_recommendation:null;
        var totalCal=(item.combined_cal>0?item.combined_cal:0)||(side?((item.cal||0)+(side.cal||0)):(item.cal||0));
        if(!totalCal)totalCal=item.cal||0;
        window.restaurantCardItems[itemKey]={
          item:{name:item.name,cal:totalCal,pro:item.pro||0,carb:item.carb||0,fat:item.fat||0,
            meal:item.components?item.components.map(function(c){return c.item+' ~'+c.cal+' cal'}):[],
            protein:item.protein},
          restaurant:data.restaurant||restaurant
        };
        html+='<div style="background:var(--card);border:1px solid var(--gold-line);border-radius:10px;padding:16px 18px;margin-bottom:10px">';
        html+='<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">';
        html+='<div style="font-family:var(--font-display);font-size:.95rem;font-weight:600;color:var(--t1);line-height:1.2;flex:1;padding-right:12px">'+item.name+'</div>';
        html+='<div style="font-size:.85rem;font-weight:700;color:var(--gold-light);white-space:nowrap">~'+totalCal+' cal</div>';
        html+='</div>';
        if(item.components&&item.components.length){
          html+='<div style="margin-bottom:10px;padding:10px 12px;background:rgba(0,0,0,.25);border-radius:6px">';
          item.components.forEach(function(c){
            html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(200,160,74,.07)">';
            html+='<div style="font-size:.8rem;color:var(--t2)"><span style="color:var(--t3);margin-right:6px">&rarr;</span>'+c.item+'</div>';
            html+='<div style="font-size:.78rem;color:var(--t3)">~'+c.cal+' cal</div>';
            html+='</div>';
          });
          if(side){
            html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">';
            html+='<div style="font-size:.8rem;color:#7ec99a">+ '+side.item+'</div>';
            html+='<div style="font-size:.78rem;color:#7ec99a">~'+side.cal+' cal</div>';
            html+='</div>';
          }
          html+='</div>';
        }
        html+=budgetBadge(item.cal, side, foodBudget);
        if(item.pro||item.carb||item.fat){html+=renderMacroBar({pro:item.pro||0,carb:item.carb||0,fat:item.fat||0},'row');}
        if(item.ordering_notes&&item.ordering_notes.length){
          html+='<div style="margin-bottom:10px">';
          item.ordering_notes.slice(0,3).forEach(function(note){
            html+='<div style="font-size:.76rem;color:var(--t3);padding:2px 0">&middot; '+note+'</div>';
          });
          html+='</div>';
        }
        html+='<button onclick="window.addMealToDay(\''+itemKey+'\')" style="width:100%;padding:9px;margin-top:10px;background:none;border:1px solid var(--gold-line);color:var(--gold-light);border-radius:8px;font-size:.72rem;font-weight:700;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-body)">Add to my day</button>';
        html+='<button onclick="_pendingSaveRestaurant={item:window.restaurantCardItems[this.dataset.k]&&window.restaurantCardItems[this.dataset.k].item,restaurant:window.restaurantCardItems[this.dataset.k]&&window.restaurantCardItems[this.dataset.k].restaurant,slot:eoMealType};savePendingRestaurant()" data-k=\''+itemKey+'\' style="width:100%;padding:10px;margin-top:8px;background:none;border:1px solid rgba(184,150,60,.4);border-radius:8px;color:var(--gold);font-size:.72rem;font-weight:700;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-body)">⭐ Save to My Meals</button>';
        html+='</div>';
      });
    }

    el.innerHTML=html;
  }catch(err){el.innerHTML='<div class="error-box">⚠️ Something went wrong. Try again. <span onclick="location.reload()" style="color:var(--gold);cursor:pointer;font-weight:600">Reload app</span></div>';}
}

async function searchDrinks(){
  var q=document.getElementById('drink-input').value.trim();
  if(!q){alert('Please enter a drink.');return;}
  var el=document.getElementById('drink-results');
  el.innerHTML='<div class="loading"><div class="spinner"></div>Looking up "'+q+'"...</div>';
  // Use the actual drink reserve from dashboard — light/regular/big — not a hardcoded value
  var todayIdx=new Date().getDay()===0?6:new Date().getDay()-1;
  var todayLevel=drinkingDays[todayIdx]||'regular';
  var drinkBudget=DRINK_RESERVES[todayLevel]||450;
  try{
    var data=await askClaude('Calorie data for alcoholic drink: '+q+'. 3 variations. JSON: {"drink":"'+q+'","items":[{"name":"variation","serving":"size","cal":0,"notes":"note"}]}');
    var html='<div class="section-title">Drink options — budget: ~'+drinkBudget+' cal</div>';
    data.items.forEach(function(d){
      var fits=d.cal<=drinkBudget;
      var n=d.cal>0?Math.floor(drinkBudget/d.cal):0;
      html+='<div class="drink-card"><div><div class="drink-name">'+d.name+'</div><div class="drink-cal">'+d.cal+' cal · '+d.serving+(d.notes?' · '+d.notes:'')+'</div></div><div style="text-align:right"><div style="font-size:.85rem;font-weight:700;color:'+(fits?'var(--green)':'var(--red)')+'">'+( fits?'✅ '+n+' fit':'⚠️ Over budget')+'</div></div></div>';
    });
    el.innerHTML=html;
  }catch(err){el.innerHTML='<div class="error-box">⚠️ Something went wrong. Try again. <span onclick="location.reload()" style="color:var(--gold);cursor:pointer;font-weight:600">Reload app</span></div>';}
}

async function searchFood(){var q=document.getElementById('food-input').value.trim();if(!q){alert('Please enter a food.');return;}var el=document.getElementById('food-results');el.innerHTML='<div class="loading"><div class="spinner"></div>Looking up "'+q+'"...</div>';try{var data=await askClaude('USDA nutritional data for: '+q+'. 3 serving sizes. JSON: {"food":"'+q+'","items":[{"name":"preparation","serving":"size","cal":0,"pro":0,"carb":0,"fat":0}]}');var html='<div class="section-title">Nutrition — "'+q+'"</div>';data.items.forEach(function(item,i){html+=renderFoodCard(item,i===0,0,false);});el.innerHTML=html;}catch(err){el.innerHTML='<div class="error-box">⚠️ Something went wrong. Try again. <span onclick="location.reload()" style="color:var(--gold);cursor:pointer;font-weight:600">Reload app</span></div>';}}

async function searchStore(){var store=document.getElementById('store-input').value.trim();if(!store){alert('Please enter a store name.');return;}var eoCal=parseInt(document.getElementById('eo-cal').value)||currentPlan.cal||1800;var dow=new Date().getDay();var dayIdx=dow===0?6:dow-1;var rotation=buildRotation();var todayProtein=rotation[dayIdx].protein;var el=document.getElementById('store-results');el.innerHTML='<div class="loading"><div class="spinner"></div>Finding products at '+store+'...</div>';var prompt='';if(storeMode==='protein')prompt='Find 3 specific branded products for '+todayProtein+' at '+store+'. Real whole food. JSON: {"store":"'+store+'","items":[{"name":"brand+product","size":"size","cal":0,"pro":0,"carb":0,"fat":0,"price":"~$X","tip":"tip"}]}';else if(storeMode==='day')prompt='Full day IF meals from '+store+' for '+eoCal+' cal plan. JSON: {"store":"'+store+'","meals":[{"meal":"First Meal|Dinner|Dessert","items":[{"name":"product","cal":0,"pro":0}],"totalCal":0}]}';else prompt='Best brands for these ingredients at '+store+': chicken, salmon, beef, potatoes, eggs, cottage cheese, Greek yogurt, honey, soy sauce. JSON: {"store":"'+store+'","items":[{"ingredient":"name","brand":"brand","product":"product","size":"size","price":"~$X","tip":"why"}]}';try{var data=await askClaude(prompt);var html='';if(storeMode==='day'&&data.meals){data.meals.forEach(function(meal){html+='<div class="food-card"><div class="food-name">'+meal.meal+'</div><div style="margin:8px 0">'+meal.items.map(function(i){return '<div style="font-size:.84rem;padding:3px 0;border-bottom:1px solid var(--border)"><span style="color:var(--warm)">→</span> '+i.name+' ('+i.cal+' cal)</div>';}).join('')+'</div><div style="font-size:.82rem;font-weight:700;color:var(--warm)">Total: '+meal.totalCal+' cal</div></div>';});}else if(storeMode==='recipe'&&data.items){data.items.forEach(function(item){html+='<div class="food-card"><div class="food-name">'+item.ingredient+'</div><div class="food-desc">'+item.brand+' — '+item.product+' ('+item.size+') · '+item.price+'</div><div class="coach-note" style="margin-top:8px">'+item.tip+'</div></div>';});}else if(data.items){data.items.forEach(function(item,i){html+='<div class="food-card'+(i===0?' best':'')+'">'+( i===0?'<div class="best-badge top">Best Pick</div>':'')+' <div class="food-name">'+item.name+'</div><div class="food-desc">'+item.size+(item.price?' · '+item.price:'')+'</div><div class="food-macros"><div class="macro"><div class="mv">'+item.cal+'</div><div class="ml">Cal</div></div><div class="macro"><div class="mv">'+item.pro+'g</div><div class="ml">Protein</div></div></div>'+(item.tip?'<div class="coach-note" style="margin-top:8px">'+item.tip+'</div>':'')+'</div>';});}el.innerHTML=html||'<div class="empty">No results.</div>';}catch(err){el.innerHTML='<div class="error-box">⚠️ Something went wrong. Try again. <span onclick="location.reload()" style="color:var(--gold);cursor:pointer;font-weight:600">Reload app</span></div>';}}


// Store last selected restaurant meal for adding to dashboard
var lastRestaurantMeal=null;
// Global store for restaurant card items — keyed by unique ID
window.restaurantCardItems={};


window.pickRestaurantSlot=function(itemKey){window.addMealToDay(itemKey);};

function pickRestaurantSlot(itemKey){window.pickRestaurantSlot(itemKey);}
function showRestaurantSlotPicker(item,restaurant){window.showRestaurantSlotPicker(item,restaurant);}


function renderFoodCard(item,isBest,calBudget,isToday,restaurant){
  var pct=calBudget?Math.min(Math.round((item.cal/calBudget)*100),150):0;
  var diff=Math.abs(item.cal-calBudget);

  // Budget status badge — driven by AI's budgetStatus field, not a percentage calculation
  var _bs = item.budgetStatus || '';
  var _ba = item.budgetAdvice || '';
  var trustBadges = _bs ? (function(){
    var color = _bs==='fits'
      ? 'background:rgba(0,180,80,.12);color:rgba(0,210,100,.9);border:1px solid rgba(0,180,80,.2)'
      : _bs==='slightly_above'
      ? 'background:rgba(184,150,60,.12);color:var(--gold-light);border:1px solid rgba(184,150,60,.2)'
      : _bs==='above'
      ? 'background:rgba(249,115,22,.12);color:rgba(249,150,50,.9);border:1px solid rgba(249,115,22,.2)'
      : 'background:rgba(192,57,43,.12);color:#e07b6a;border:1px solid rgba(192,57,43,.2)';
    var label = _bs==='fits' ? '✓ Fits your budget'
      : _bs==='slightly_above' ? '⚠ Slightly over budget'
      : _bs==='above' ? '⚠ Above budget'
      : '🔴 Well above budget';
    return '<div style="margin:8px 0">'+
      '<span style="font-size:.68rem;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:.04em;'+color+'">'+label+'</span>'+
      (_ba?'<div style="font-size:.75rem;color:var(--t2);margin-top:6px;line-height:1.5;font-style:italic">'+_ba+'</div>':'')+
    '</div>';
  }()) : '';

  var mealBreakdown=item.meal&&item.meal.length?
    '<div style="margin:10px 0;padding:10px 12px;background:rgba(0,0,0,.2);border-radius:8px;border:1px solid var(--gold-line)">'+
      '<div style="font-size:.58rem;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.14em;margin-bottom:6px">Your Complete Order</div>'+
      item.meal.map(function(m){return '<div style="font-size:.82rem;color:var(--t1);padding:4px 0;border-bottom:1px solid rgba(184,150,60,.06)"><span style="color:var(--gold)">→</span> '+m+'</div>';}).join('')+
    '</div>':'';

  var addBtn='';
  if(restaurant){
    var itemKey='ri'+Date.now();
    window.restaurantCardItems[itemKey]={item:item,restaurant:restaurant};
    addBtn='<button onclick="window.addMealToDay(\''+itemKey+'\')" style="width:100%;padding:11px;margin-top:10px;background:var(--cream-bg);color:var(--cream-text);border:1px solid var(--cream-border);border-radius:10px;font-size:.75rem;font-weight:700;cursor:pointer;letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-body)">I\'m ordering this — add to my day</button>';
  }

  var cardBg=isToday||isBest?
    'background:linear-gradient(170deg,var(--s2),var(--s1));border:1px solid rgba(184,150,60,.35);border-top:2px solid rgba(184,150,60,.6)':
    'background:linear-gradient(170deg,#252118,#1C1915);border:1px solid var(--gold-line)';

  var badge=isToday?
    '<div style="font-size:.6rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;font-family:var(--font-body)">Best Match — Order This</div>':
    isBest?'<div style="font-size:.6rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;font-family:var(--font-body)">Best Match</div>':'';

  // Macro display — use returned values, or estimate from cal/pro if model skipped them
  var macroPro  = item.pro  || 0;
  var macroCarb = item.carb || 0;
  var macroFat  = item.fat  || 0;
  if (!macroCarb && !macroFat && item.cal && macroPro) {
    var remainCal = item.cal - (macroPro * 4);
    macroCarb = Math.round((remainCal * 0.55) / 4);
    macroFat  = Math.round((remainCal * 0.45) / 9);
  }
  var macroHTML = (macroPro || macroCarb || macroFat)
    ? renderMacroBar({pro: macroPro, carb: macroCarb, fat: macroFat}, 'row')
    : '';

  return '<div style="'+cardBg+';border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 8px 32px rgba(0,0,0,.4)">'+
    badge+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">'+
      '<div style="font-size:.98rem;font-weight:700;color:var(--t1);font-family:var(--font-display)">'+item.name+'</div>'+
      '<div style="font-size:.9rem;font-weight:700;color:var(--gold-light);white-space:nowrap;margin-left:10px">'+(
        (item.calLow&&item.calHigh&&item.calLow!==item.calHigh)
          ? (item.calLow+'–'+item.calHigh+' cal')
          : (item.cal+' cal')
      )+'</div>'+
    '</div>'+
    (item.description||item.serving?'<div style="font-size:.78rem;color:var(--t2);margin-bottom:8px">'+(item.description||item.serving||'')+'</div>':'')+
    macroHTML+
    trustBadges+
    (item.confidence||item.calLow?
      '<div style="margin:8px 0 4px 0;display:flex;align-items:center;gap:8px">'+
        '<span style="font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 9px;border-radius:20px;'+
          (item.confidence==='high'
            ?'background:rgba(0,180,80,.12);color:rgba(0,200,90,.9)'
            :item.confidence==='low'
            ?'background:rgba(249,115,22,.12);color:rgba(249,150,50,.9)'
            :'background:rgba(184,150,60,.12);color:var(--gold-light)')+'">'+
          (item.confidence==='high'?'Conservative Estimate':item.confidence==='low'?'High Variance':'Conservative Estimate')+
        '</span>'+
      '</div>'+
      '<div style="font-size:.67rem;color:var(--t3);margin-bottom:6px;font-style:italic">Restaurant portions and preparation vary. Loftin Method uses conservative estimates.</div>'
    :'')+
    mealBreakdown+
    addBtn+
  '</div>';
}
