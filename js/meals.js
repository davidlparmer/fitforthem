// ─────────────────────────────────────────────────────────────
// meals.js — Loftin Method Meal System
// Meal rendering, scaling, swap system, dashboard day tabs.
// Globals used: currentPlan, customMeals, mealPrefs, proteinSwaps,
//               skippedMeals, currentDayIdx, drinkingDays, workMode,
//               COOK_STEPS, IF_PLAN_OFFICE, IF_PLAN_WFH, DAYS_FULL,
//               DAYS_SHORT (engine.js), DRINK_RESERVES (app.html)
// Depends on: engine.js (getActivePlan, getCookSteps, buildRotation)
// ─────────────────────────────────────────────────────────────

// Calculate current logging streak — consecutive days with a weight entry
function calcStreak(){
  if(!weightLog||!weightLog.length)return 0;
  var sorted=weightLog.slice().sort(function(a,b){return b.d.localeCompare(a.d);});
  var streak=0;
  var today=new Date();
  for(var i=0;i<sorted.length;i++){
    var entryDate=new Date(sorted[i].d+'T12:00:00');
    var diffDays=Math.round((today-entryDate)/(1000*60*60*24));
    if(diffDays===i||diffDays===i+1){
      streak++;
    } else {
      break;
    }
  }
  return streak;
}


// ── DRINK LEVEL ───────────────────────────────────────────────
// Saves to cookie (survives iOS kill), localStorage, and server.
// All drink toggles call this — never mutate drinkingDays directly.
function setDrinkLevel(dayIdx, level) {
  drinkingDays[dayIdx] = level;
  var dd = JSON.stringify(drinkingDays);
  try { localStorage.setItem('fft_drinking_days', dd); } catch(e) {}
  try {
    var exp = new Date();
    exp.setDate(exp.getDate() + 7);
    document.cookie = 'fft_drinks=' + encodeURIComponent(dd) + ';expires=' + exp.toUTCString() + ';path=/;SameSite=Lax';
  } catch(e) {}
  if (typeof saveAllData === 'function') saveAllData();
  // Immediately push to group sync so iPad sees drink change within seconds
  if (typeof syncGroupNow === 'function') syncGroupNow();
  refreshCurrentView(dayIdx);
  updateDashboard();
}

// Format ingredient with optional store unit conversion in parentheses
function eggsGtoCount(grams){
  var count=Math.max(1,Math.round(grams/50));
  return count===1?'1 egg':count+' eggs';
}

function formatIngredient(x){
  var m=x.match(/^(.*?)(\d+)(g)(.*)$/);
  if(!m)return x;
  var pre=m[1],grams=parseInt(m[2]),rest=m[4];
  var name=pre.toLowerCase().trim();
  // Whole eggs: always show as count — matches 'Eggs', 'Egg', 'Whole eggs', 'Whole egg'
  // Egg whites: stay in grams — explicitly excluded
  var isWholeEgg=(name==='eggs'||name==='egg'||name==='whole eggs'||name==='whole egg');
  var isEggWhite=(name.indexOf('white')>=0);
  if(isWholeEgg&&!isEggWhite){
    return eggsGtoCount(grams);
  }
  if(grams<30)return x;// too small to convert meaningfully
  var useLbs=['chicken','beef','sirloin','salmon','fish','potato','blueberries','banana'];
  var useOz=['cottage cheese','greek yogurt','yogurt','ricotta','sour cream','cheese','mozzarella','honey','oats'];
  var isLbs=useLbs.some(function(k){return name.indexOf(k)>=0;});
  var isOz=useOz.some(function(k){return name.indexOf(k)>=0;});
  var converted='';
  if(isLbs){var lbs=grams/453.6;converted=lbs>=1?parseFloat(lbs.toFixed(2))+' lbs':Math.round(lbs*16*10)/10+' oz';}
  else if(isOz){converted=parseFloat((grams/28.35).toFixed(1))+' oz';}
  else if(grams>=100){converted=parseFloat((grams/28.35).toFixed(1))+' oz';}
  if(!converted)return x;
  return pre+grams+'g'+rest+'<span style="color:var(--t2);font-size:.72rem;margin-left:4px;opacity:.7">('+converted+')</span>';
}

// Normalize macro totals so macro-implied calories match the displayed slot target.
// Preserves protein/carb/fat ratios. Guards against divide-by-zero.
// Used for template meal bars and day footer total.
function _normalizeMacros(macros, targetCal){
  var implied=macros.pro*4+macros.carb*4+macros.fat*9;
  if(!implied||!targetCal)return macros;
  var nf=targetCal/implied;
  return{pro:Math.round(macros.pro*nf*10)/10,carb:Math.round(macros.carb*nf*10)/10,fat:Math.round(macros.fat*nf*10)/10};
}

function buildDayHTML(i,plan,showSwap){
  var cal=plan.cal,mealTimes=plan.mealTimes,phase=plan.phase,rotation=plan.rotation;
  var isWknd=true; // drinking selector available every day
  var isDrinking=drinkingDays[i]||false;
  var daySteps=plan.steps;
  if(isDrinking==='light')daySteps=plan.wStepsLight||plan.wSteps||plan.steps;
  else if(isDrinking==='regular')daySteps=plan.wSteps||plan.steps;
  else if(isDrinking==='big')daySteps=plan.wStepsBig||plan.wSteps||plan.steps;
  // tp (protein rotation icon) removed — meal identity now comes from getResolvedDinner() / buildRotation()
  var html='';
  var todayIdx=new Date().getDay()===0?6:new Date().getDay()-1;
  var dow=new Date().getDay(); // 0=Sun, 5=Fri, 6=Sat
  html+='<div class="section-divider">'+DAYS_FULL[i].toUpperCase()+(i===todayIdx?' — TODAY':'')+'</div>';

  if(i===todayIdx){
    var coachMsg='Follow the plan. The results are already decided.';
    var coachStyle='font-size:.78rem;color:var(--t2);font-style:italic;margin-bottom:14px;padding:10px 14px;border-left:1px solid var(--gold-line);letter-spacing:.01em;line-height:1.6';

    if(dow===5){// Friday
      coachMsg='Your plan is already adjusted for tonight. Enjoy it.';
      coachStyle='font-size:.78rem;color:var(--t2);font-style:italic;margin-bottom:14px;padding:10px 14px;border-left:1px solid var(--gold-line);letter-spacing:.01em;line-height:1.6';
    } else if(dow===6){// Saturday
      coachMsg='Still on track. The weekend is part of the system.';
      coachStyle='font-size:.78rem;color:var(--t2);font-style:italic;margin-bottom:14px;padding:10px 14px;border-left:1px solid var(--gold-line);letter-spacing:.01em;line-height:1.6';
    } else if(dow===0){// Sunday
      coachMsg='Reset day. One clean finish before the week begins.';
      coachStyle='font-size:.78rem;color:var(--t2);font-style:italic;margin-bottom:14px;padding:10px 14px;border-left:1px solid var(--gold-line);letter-spacing:.01em;line-height:1.6';
    } else {
      var streak=calcStreak();
      var weekday=dow;
      var confidenceMsgs=[
        'Follow the plan. The results are already decided.',
        'You\'re exactly where you should be.',
        'This is working — don\'t change anything.',
        'Consistency is the only variable that matters.',
        'You\'re doing this right.',
        'This is how people get lean — one day at a time.',
      ];
      if(streak>=7){
        confidenceMsgs=[''+streak+' days in. Most people never get here.','The system is working. Keep going.','Consistency is your edge right now.'];
      } else if(streak>=3){
        confidenceMsgs=[''+streak+' days strong. This is where habits form.','You\'re building something real.','The streak is real. Protect it.'];
      }
      coachMsg=confidenceMsgs[weekday%confidenceMsgs.length];
    }
    html+='<div style="'+coachStyle+'">'+coachMsg+'</div>';
  }

  var isDrinking=drinkingDays[i]&&drinkingDays[i]!==false;
  var drinkLevel=drinkingDays[i]||false;
  var drinkReserve=drinkLevel?DRINK_RESERVES[drinkLevel]:0;
  if(isWknd){
    var drinkLabels={light:'Light (~200 cal)',regular:'Regular (~450 cal)',big:'Big Night (~700 cal)'};
    html+='<div style="background:var(--s1);border-radius:12px;padding:16px 18px;margin-bottom:16px;border:1px solid var(--gold-line)">'+
      '<div style="font-size:.58rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:12px;font-family:var(--font-body)">Tonight\'s Decision</div>'+
      '<div class="tog-row" style="margin-bottom:'+(isDrinking?'12':'0')+'px">'+
        '<div class="tog'+(!isDrinking?' active':'')+'" onclick="setDrinkLevel('+i+',false)" style="flex:1;padding:10px;font-size:.68rem">Not Drinking</div>'+
        '<div class="tog'+(drinkLevel==='light'?' active':'')+'" onclick="setDrinkLevel('+i+',\'light\')" style="flex:1;padding:10px;font-size:.68rem">Light Night</div>'+
        '<div class="tog'+(drinkLevel==='regular'?' active':'')+'" onclick="setDrinkLevel('+i+',\'regular\')" style="flex:1;padding:10px;font-size:.68rem">Regular</div>'+
        '<div class="tog'+(drinkLevel==='big'?' active':'')+'" onclick="setDrinkLevel('+i+',\'big\')" style="flex:1;padding:10px;font-size:.68rem">Big Night</div>'+
      '</div>'+
      (isDrinking?'<div style="font-size:.75rem;color:var(--t2);line-height:1.6;letter-spacing:.01em;font-style:italic">Meals adjusted · Steps increased · Drink budget: <strong style="color:var(--gold-light);font-style:normal">~'+drinkReserve+' cal</strong></div>':'')+
    '</div>';
  }

  var day=getActivePlan()[i];

  // Apply permanent meal prefs and dinner resolution FIRST — before any scale math.
  // baseTotal must reflect the actual swapped meal calories, not the template defaults.
  // Without this order, swapped meals with different cal values produce a wrong effectiveScale.
  var dayPrefs=mealPrefs[i]||{};
  if(dayPrefs.first){day={...day,first:{n:dayPrefs.first.name||day.first.n,k:dayPrefs.first.key||day.first.k,i:dayPrefs.first.items,c:dayPrefs.first.cal}};}
  if(dayPrefs.dessert){day={...day,dessert:{n:dayPrefs.dessert.name||day.dessert.n,k:dayPrefs.dessert.key||day.dessert.k,i:dayPrefs.dessert.items,c:dayPrefs.dessert.cal}};}
  // Dinner resolved via shared helper — render-only local variable, never written back to plan.
  // Priority: customMeals → mealPrefs → template
  var _rd=getResolvedDinner(i);
  var _resolvedDinner=_rd?{n:_rd.n,k:_rd.k,i:_rd.i,c:_rd.c,_swapOpt:_rd._swapOpt||null}:day.dinner;
  day={...day,dinner:_resolvedDinner};

  // Lane-aware slot calorie budgets — use locked ratios from lane-profiles.js
  var planSex=plan.sex||'male';
  var planMode=plan.phase;
  // Determine gain vs deficit from phase name
  var isGainMode=(planMode==='moderate_gain'||planMode==='mild_gain'||planMode==='landing_gain');
  var laneMode=isGainMode?'gain':'cut';
  // ⚠️ SYNC DEPENDENCY — see HANDOFF.md section 1
  // If you change this calculation, update app-handlers.js renderWeeklyGrid to match.
  var laneRatios=(typeof getLaneRatios==='function')?getLaneRatios(planSex,laneMode):{first:0.275,dinner:0.525,dessert:0.200};
  var foodCal=isWknd&&isDrinking?cal-drinkReserve:cal;
  var targetFirstCal=Math.round(foodCal*laneRatios.first);
  var targetDinnerCal=Math.round(foodCal*laneRatios.dinner);
  var targetDessertCal=foodCal-targetFirstCal-targetDinnerCal;

  // drinkScale: used for restaurant/quick-log cal display on drink nights
  var drinkScale=isWknd&&isDrinking?(cal-drinkReserve)/cal:1.0;

  // ── PER-SLOT INGREDIENT SCALES ────────────────────────────
  // Each slot scales independently: targetSlotCal / slotBaseCal.
  // Ingredient grams always match the displayed slot header regardless of
  // whether the slot is template, permanent pref, or a just-today swap.
  // targetSlotCal already incorporates the drink reserve via foodCal.
  var firstIngScale  = day.first.c  > 0 ? targetFirstCal  / day.first.c  : 1;
  var dinnerIngScale = day.dinner.c > 0 ? targetDinnerCal / day.dinner.c : 1;
  var dessertIngScale= day.dessert.c > 0 ? targetDessertCal / day.dessert.c : 1;

  // scaleItems now takes an explicit ingScale parameter so each slot can use its own value
  var scaleItems=function(items, ingScale){return items.map(function(item){
    // Handle legacy count format: 'Whole eggs 4 (200g)' → scale the gram value in parens
    var legacyM=item.match(/^(.*?\s)\d+\s*\((\d+)g\)$/);
    if(legacyM)return legacyM[1].trimRight()+' '+Math.round(parseInt(legacyM[2])*ingScale)+'g';
    // Standard format: 'Item Xg'
    var m=item.match(/^(.*?)(\d+)(g)$/);
    return m?m[1]+Math.round(parseInt(m[2])*ingScale)+'g':item;
  });};

  var firstItems=scaleItems(day.first.i,firstIngScale).map(function(item){
    // Convert whole egg gram amounts to count display — 'Eggs Xg' or 'Whole eggs Xg'
    // Egg whites stay as grams — they don't have a natural count unit
    var wholeEggM=item.match(/^(Whole\s+eggs?\s*)(\d+)(g)$/i)||item.match(/^(Eggs?\s*)(\d+)(g)$/i);
    if(wholeEggM)return eggsGtoCount(parseInt(wholeEggM[2]));
    return item;
  });
  // Apply mashed potato ratio rule to first meal if it has potatoes
  var firstPotatoG=0;
  firstItems.forEach(function(item){var m=item.match(/^(.*?)(\d+)(g)$/);if(m&&m[1].toLowerCase().indexOf('potato')>=0)firstPotatoG=parseInt(m[2]);});
  if(firstPotatoG>0){
    firstItems=firstItems.map(function(item){
      var m=item.match(/^(.*?)(\d+)(g)$/);if(!m)return item;
      var name=m[1].toLowerCase();
      if(name.indexOf('sour')>=0)return m[1]+Math.round(firstPotatoG*0.12)+'g';
      if(name.indexOf('cheese')>=0||name.indexOf('mozz')>=0)return m[1]+Math.round(firstPotatoG*0.09)+'g';
      return item;
    });
  }

  // Dinner: scale then cap honey (42g max) and soy sauce (36g max)
  // Also enforce mashed potato ratio: sourCream = potato*0.12, cheese = potato*0.09
  var dinnerItems=scaleItems(day.dinner.i,dinnerIngScale).map(function(item){
    var m=item.match(/^(.*?)(\d+)(g)$/);
    if(!m)return item;
    var name=m[1].toLowerCase();
    var grams=parseInt(m[2]);
    if(name.indexOf('honey')>=0&&grams>42)return m[1]+'42g';
    if(name.indexOf('soy')>=0&&grams>36)return m[1]+'36g';
    return item;
  });
  // Apply mashed potato ratio rule to dinner
  var dinnerPotatoG=0;
  dinnerItems.forEach(function(item){var m=item.match(/^(.*?)(\d+)(g)$/);if(m&&m[1].toLowerCase().indexOf('potato')>=0)dinnerPotatoG=parseInt(m[2]);});
  if(dinnerPotatoG>0){
    dinnerItems=dinnerItems.map(function(item){
      var m=item.match(/^(.*?)(\d+)(g)$/);if(!m)return item;
      var name=m[1].toLowerCase();
      if(name.indexOf('sour')>=0)return m[1]+Math.round(dinnerPotatoG*0.12)+'g';
      if(name.indexOf('cheese')>=0||name.indexOf('mozz')>=0)return m[1]+Math.round(dinnerPotatoG*0.09)+'g';
      return item;
    });
  }

  var BASE_YOGURT_G=280, BASE_HONEY_G=30, BASE_COOKIE_COUNT=2, CAL_PER_COOKIE=37.5;
  var isDrinkingNight=isWknd&&isDrinking;
  var dessertItems=day.dessert.i.map(function(item){
    var mCookie=item.match(/^(Biscoff cookies)\s+(\d+(?:\.\d+)?)$/i);
    if(mCookie){
      var scaledCount=Math.round(BASE_COOKIE_COUNT*dessertIngScale*2)/2;
      scaledCount=Math.max(0.5,scaledCount);
      return 'Biscoff cookies '+scaledCount;
    }
    var m=item.match(/^(.*?)(\d+)(g)$/);
    if(!m)return item;
    var name=m[1].toLowerCase();
    var baseG=parseInt(m[2]);
    if(name.indexOf('yogurt')>=0||name.indexOf('greek')>=0){
      var scaledYogurt=Math.round(baseG*dessertIngScale);
      return m[1]+scaledYogurt+'g';
    }
    if(name.indexOf('honey')>=0){
      var scaledYogurtG=Math.round(BASE_YOGURT_G*dessertIngScale);
      var yogurtIncrease=scaledYogurtG-BASE_YOGURT_G;
      var honeyIncrease=Math.round((yogurtIncrease/50)*5);
      var honeyG=BASE_HONEY_G+honeyIncrease;
      if(isDrinkingNight){honeyG=25;}
      return m[1]+honeyG+'g';
    }
    // Default: scale generic gram-based items proportionally to the dessert slot target
    var scaledG=Math.round(baseG*dessertIngScale);
    return m[1]+scaledG+'g';
  });

  // Use lane-aware target cals for each slot.
  // mealPrefs.cal is a base reference only — always use the lane-aware target
  // so calories scale correctly to the user's actual plan regardless of which meal is active.
  var firstCal=targetFirstCal;
  var dinnerCal=targetDinnerCal;
  var dessertCal=targetDessertCal;

  // Apply any ingredient swaps saved for this day
  if(!window.ingredientSwaps)window.ingredientSwaps={};
  ['first','dinner','dessert'].forEach(function(slot){
    var items=slot==='first'?firstItems:slot==='dinner'?dinnerItems:dessertItems;
    for(var idx=0;idx<items.length;idx++){
      var key='fft_ingswap_'+i+'_'+slot+'_'+idx;
      var saved=window.ingredientSwaps[key];
      if(!saved){
        try{var raw=localStorage.getItem(key);if(raw)saved=JSON.parse(raw);}catch(e){}
      }
      if(saved){
        items[idx]=saved.ingredient;
        // Update cal for this slot
        if(slot==='first')firstCal=Math.max(50,firstCal+(saved.cal-Math.round(day.first.c*firstIngScale/day.first.i.length)));
        if(slot==='dinner')dinnerCal=Math.max(50,dinnerCal+(saved.cal-Math.round(day.dinner.c*dinnerIngScale/day.dinner.i.length)));
        if(slot==='dessert')dessertCal=Math.max(50,dessertCal+(saved.cal-Math.round(day.dessert.c*dessertIngScale/day.dessert.i.length)));
      }
    }
  });
  var alcCal=isWknd&&isDrinking?drinkReserve:0;
  var totalFoodCal=firstCal+dinnerCal+dessertCal;

  // Apply skip adjustments BEFORE rendering so all totals are correct
  var firstSkipped=isMealSkipped(i,'first');
  var dinnerSkipped=isMealSkipped(i,'dinner');
  var dessertSkipped=isMealSkipped(i,'dessert');
  if(firstSkipped)totalFoodCal-=firstCal;
  if(dinnerSkipped)totalFoodCal-=dinnerCal;
  if(dessertSkipped)totalFoodCal-=dessertCal;

  var firstKey=day.first.i[0].toLowerCase();
  var firstSwapKey=day.first.k||'';
  // Prefer the template name (day.first.n) or pref name — fnDetected is last-resort fallback only
  var fnDetected=firstKey.indexOf('cottage')>=0?'Cottage Cheese Bowl':
    firstKey.indexOf('yogurt')>=0||firstKey.indexOf('greek')>=0?'Greek Yogurt Bowl':
    firstKey.indexOf('oat')>=0?'Oatmeal Bowl':
    firstSwapKey.indexOf('loaded')>=0?'Loaded Egg & Potato Skillet':
    firstSwapKey.indexOf('salsa')>=0?'Salsa Egg & Potato Skillet':
    'Egg & Potato Skillet';
  var fn=day.first.n||fnDetected;
  var fTag=firstKey.indexOf('egg')>=0?'<span class="badge home">Home</span>':'<span class="badge work">Work</span>';
  var dessertKey=dessertItems[0].toLowerCase();
  var dessertNameDetected=dessertKey.indexOf('yogurt')>=0||dessertKey.indexOf('greek')>=0?'Yogurt Dessert Bowl':dessertKey.indexOf('ricotta')>=0?'Ricotta Bowl':dessertKey.indexOf('cookie')>=0?'Cookies':'Chocolate Bar';
  var dessertName=dayPrefs.dessert&&dayPrefs.dessert.name?dayPrefs.dessert.name:day.dessert.n||dessertNameDetected;


  // Declare custom meal replacements BEFORE rendering meal cards
  var dayCustom=customMeals.filter(function(m){return m.day===i;});
  var customFirst=dayCustom.filter(function(m){return m.slot==='first';})[0]||null;
  var customDinner=dayCustom.filter(function(m){return m.slot==='dinner';})[0]||null;
  var customDessert=dayCustom.filter(function(m){return m.slot==='dessert';})[0]||null;
  var customOther=dayCustom.filter(function(m){return m.slot!=='first'&&m.slot!=='dinner'&&m.slot!=='dessert';});

  // ── RENDER CUSTOM MEAL ────────────────────────────────────
  // renderCustomMeal handles: just-today meal library swaps, restaurant meals,
  // fridge-built meals, and quick-logged meals.
  //
  // CALORIE ACCURACY RULES:
  //   Built-in swap (from SWAP_OPTIONS meal library, has mealKey):
  //     - displayCal = lane-aware slot target (not the SWAP_OPTIONS base cal)
  //     - ingredients scale by targetSlotCal / m.cal (slot-specific, drink-adjusted)
  //     - contributes targetSlotCal to the day total (keeps total inside plan range)
  //   Restaurant / quick-log (no mealKey, or notes contains 'Eating out'):
  //     - displayCal = m.cal * drinkScale (as entered, user owns this)
  //     - no ingredient scaling (exact amounts)
  //     - contributes actual cal to day total
  function renderCustomMeal(m,slotLabel){
    // Is this a built-in swap from the SWAP_OPTIONS meal library?
    var isBuiltInSwap=!!(m.mealKey&&(!m.notes||m.notes.indexOf('Eating out')!==0));

    // Lane-aware slot target cal (drink reserve already applied via foodCal)
    var slotTargetCal=slotLabel==='First Meal'?targetFirstCal
                     :slotLabel==='Main Meal'?targetDinnerCal
                     :slotLabel==='Final Meal'?targetDessertCal
                     :null;

    // For built-in swaps: show the plan target so it matches the user's calorie budget.
    // For restaurant / quick-log: apply drinkScale to the actual recorded cal.
    var displayCal=isBuiltInSwap&&slotTargetCal!=null
        ?slotTargetCal
        :(isDrinking?Math.round(m.cal*drinkScale):m.cal);

    var customBody='';
    if(m.ingredients&&m.ingredients.length){
      // For built-in swaps: scale ingredients to hit slotTargetCal.
      //   ingScale = targetSlotCal / swapBaseCal
      //   targetSlotCal is already drink-adjusted, so this produces the correct amounts.
      // For restaurant / manual meals: no scaling (exact amounts the user recorded).
      var ingScale=isBuiltInSwap&&slotTargetCal!=null&&m.cal>0
          ?slotTargetCal/m.cal
          :1;
      var scaledIngredients=m.ingredients.map(function(ing){
        var item=ing.item||'';
        if(ingScale!==1){
          var gm=item.match(/^(.*?)(\d+)(g)$/);
          if(gm)item=gm[1]+Math.round(parseInt(gm[2])*ingScale)+'g';
        }
        return {item:item,amount:ing.amount||''};
      });
      customBody+='<ul>'+scaledIngredients.map(function(ing){return '<li>'+ing.item+(ing.amount?' — '+ing.amount:'')+'</li>';}).join('')+'</ul>';
    }
    if(m.tip){customBody+='<div class="coach-note" style="margin-top:8px">'+m.tip+'</div>';}
    if(!customBody){customBody='<p>'+displayCal+' cal</p>';}
    var mealStr=(m.name||'').toLowerCase()+' '+(m.ingredients||[]).map(function(x){return x.item||'';}).join(' ').toLowerCase();
    var isRestaurant=m.notes&&m.notes.indexOf('Eating out')===0;
    var isFridgeMeal=m.notes&&m.notes.indexOf('Built from fridge')===0;
    // Fridge meals carry Claude-generated instructions — use those directly.
    // Built-in swaps and restaurant meals fall through to getMealInstructions lookup.
    var swapCookSteps='';
    if(isFridgeMeal&&m.instructions&&m.instructions.length){
      swapCookSteps='<div style="margin-top:10px"><div style="font-size:.58rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);margin-bottom:6px">How to cook</div>'+
        m.instructions.map(function(s,idx){return '<div style="display:flex;gap:8px;padding:4px 0;font-size:.82rem;color:var(--t2)"><span style="color:var(--gold);font-weight:700;min-width:16px">'+(idx+1)+'.</span><span>'+s+'</span></div>';}).join('')+'</div>';
    } else if(!isRestaurant&&typeof getMealInstructions==='function'){
      swapCookSteps=getMealInstructions(m.mealKey||null,mealStr);
    }
    if(swapCookSteps){customBody+=swapCookSteps;}
    if(typeof renderMacroBar==='function'){
      var mPro=0,mCarb=0,mFat=0;
      if(isBuiltInSwap&&scaledIngredients&&scaledIngredients.length&&typeof calcMealMacros==='function'){
        // Built-in swap: always recalculate from scaled ingredient grams so macros match the scaled amounts
        var _scaledStrs=scaledIngredients.map(function(x){return x.item||'';}).filter(Boolean);
        var _calc=calcMealMacros(_scaledStrs);
        mPro=_calc.pro;mCarb=_calc.carb;mFat=_calc.fat;
      } else {
        // Restaurant / quick-log: use stored macros if provided, else calculate from original amounts
        mPro=m.pro||0;mCarb=m.carb||0;mFat=m.fat||0;
        if(!mPro&&!mCarb&&!mFat&&m.ingredients&&m.ingredients.length&&typeof calcMealMacros==='function'){
          var _ingStrs=m.ingredients.map(function(x){return x.item||'';}).filter(Boolean);
          var _calc2=calcMealMacros(_ingStrs);
          mPro=_calc2.pro;mCarb=_calc2.carb;mFat=_calc2.fat;
        }
      }
      // Normalize macro-implied calories to match displayed slot calories.
      // Root cause: ingredient strings use raw grams but MACRO_TABLE uses cooked values,
      // causing systematic over-estimation (~20-30%). Ratios (pro/carb/fat) are preserved.
      if(isBuiltInSwap&&slotTargetCal&&slotTargetCal>0){
        var _macroImplied=mPro*4+mCarb*4+mFat*9;
        if(_macroImplied>0){
          var _nf=slotTargetCal/_macroImplied;
          mPro=Math.round(mPro*_nf*10)/10;
          mCarb=Math.round(mCarb*_nf*10)/10;
          mFat=Math.round(mFat*_nf*10)/10;
        }
      }
      if(mPro||mCarb||mFat){customBody+=renderMacroBar({pro:mPro,carb:mCarb,fat:mFat},'bar');}
    }
    customBody+='<div style="display:flex;gap:8px;margin-top:12px">'+
      '<button onclick="showEditMeal('+m.id+','+i+')" style="background:none;border:1px solid var(--gold-line);color:var(--gold);border-radius:6px;padding:6px 14px;font-size:.68rem;cursor:pointer;font-weight:600;letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-body)">Edit</button>'+
      '<button onclick="removeCustomMealDash('+m.id+','+i+')" style="background:none;border:1px solid rgba(192,57,43,.3);color:var(--red);border-radius:6px;padding:6px 14px;font-size:.68rem;cursor:pointer;font-weight:600;letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-body)">Remove</button>'+
    '</div>';
    return mealCard('custom','From '+m.notes,slotLabel,m.name,customBody,displayCal,true);
  }

  var firstMealKey=(dayPrefs.first&&dayPrefs.first.key)||day.first.k||null;
  var firstCookSteps=getMealInstructions(firstMealKey, day.first.i[0]);
  // Detect protein from actual dinner ingredients for accurate cooking instructions
  var dinnerIngStr=dinnerItems.join(' ').toLowerCase();
  var actualDinnerProtein='chicken';
  if(dinnerIngStr.indexOf('salmon')>=0)actualDinnerProtein='salmon';
  else if(dinnerIngStr.indexOf('fish')>=0)actualDinnerProtein='salmon';
  else if(dinnerIngStr.indexOf('beef')>=0||dinnerIngStr.indexOf('sirloin')>=0||dinnerIngStr.indexOf('steak')>=0)actualDinnerProtein='beef';
  // Dinner key and display come from getResolvedDinner() via day.dinner (set above)
  var dinnerMealKey=day.dinner.k||null;
  var dinnerCookSteps=getMealInstructions(dinnerMealKey, actualDinnerProtein);
  var dinnerTitleProtein=actualDinnerProtein;
  // Title: resolver already set day.dinner.n via full priority chain
  var dinnerTitleDisplay=day.dinner.n||dinnerTitleProtein;
  // Theme badge — shown when family rotation is active for this day

  var dessertMealKey=(dayPrefs.dessert&&dayPrefs.dessert.key)||day.dessert.k||null;
  var dessertCookSteps=getMealInstructions(dessertMealKey, dessertItems[0]);

  var skipBtn=function(slot){
    return '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">'+
      '<button onclick="showMealSwap('+i+',\''+slot+'\')" style="background:none;border:1px solid var(--gold-line);color:var(--gold);border-radius:8px;padding:6px 14px;font-size:.78rem;cursor:pointer;font-weight:600">Swap Meal</button>'+
      '<button onclick="skipMeal('+i+',\''+slot+'\')" style="background:none;border:1px solid var(--muted);color:var(--muted);border-radius:8px;padding:6px 14px;font-size:.78rem;cursor:pointer;font-weight:600">Skip</button>'+
      '<button onclick="showQuickLog('+i+',\''+slot+'\')" style="background:none;border:1px solid var(--warm);color:var(--warm);border-radius:8px;padding:6px 14px;font-size:.78rem;cursor:pointer;font-weight:600">Ate something else?</button>'+
    '</div>';
  };

  if(firstSkipped){
    html+='<div style="padding:12px 15px;background:var(--cream);border-radius:12px;margin-bottom:10px;border:1px dashed var(--border);display:flex;justify-content:space-between;align-items:center"><span style="font-size:.84rem;color:var(--muted)">First Meal skipped today</span><button onclick="restoreMeal('+i+',\'first\')" style="background:none;border:1px solid var(--warm);color:var(--warm);border-radius:8px;padding:5px 12px;font-size:.75rem;cursor:pointer;font-weight:600">Restore</button></div>';
  } else if(customFirst){
    html+=renderCustomMeal(customFirst,'First Meal');
  } else {
    var hasFirstSwap=Object.keys(window.ingredientSwaps||{}).some(function(k){return k.startsWith('fft_ingswap_'+i+'_first_');});
    var firstCustomBadge=hasFirstSwap?'<span class="badge custom" style="margin-left:6px">Custom</span>':'';
    html+=mealCard('','','First Meal · Break your fast when ready',fn+fTag+firstCustomBadge,
      '<ul>'+firstItems.map(function(x,idx){
        var gramsMatch=x.match(/(\d+)g/);
        var grams=gramsMatch?parseInt(gramsMatch[1]):100;
        // Eggs are displayed as count — detect and convert back to gram equivalent for swap calorie calc
        var eggMatch=x.match(/^(\d+)\s*eggs?$/i);
        if(eggMatch){grams=parseInt(eggMatch[1])*50;}
        var name=x.replace(/\d+g/,'').replace(/^\d+\s*eggs?$/i,'Eggs').trim();
        return '<li style="display:flex;justify-content:space-between;align-items:center">'+
          '<span>'+formatIngredient(x)+'</span>'+
          '<button onclick="showIngredientSwap('+i+',\'first\','+idx+',\''+x.replace(/\x27/g,"\\'")+'\',\''+name.replace(/\x27/g,"\\'")+'\','+grams+')" style="background:none;border:none;color:var(--warm);font-size:.72rem;cursor:pointer;padding:2px 6px;font-weight:600;white-space:nowrap">swap</button>'+
        '</li>';
      }).join('')+'</ul>'+renderMacroBar(_normalizeMacros(calcMealMacros(firstItems),firstCal),'bar')+firstCookSteps+skipBtn('first'),firstCal,true);
  }

  if(dinnerSkipped){
    html+='<div style="padding:12px 15px;background:var(--cream);border-radius:12px;margin-bottom:10px;border:1px dashed var(--border);display:flex;justify-content:space-between;align-items:center"><span style="font-size:.84rem;color:var(--muted)">Main Meal skipped today</span><button onclick="restoreMeal('+i+',\'dinner\')" style="background:none;border:1px solid var(--warm);color:var(--warm);border-radius:8px;padding:5px 12px;font-size:.75rem;cursor:pointer;font-weight:600">Restore</button></div>';
  } else if(customDinner){
    var isRestaurantMeal=customDinner.notes&&customDinner.notes.indexOf('Eating out')===0;
    var overBudgetWarning='';
    if(isRestaurantMeal&&isDrinking&&customDinner.cal>dinnerCal){
      var overBy=customDinner.cal-dinnerCal;
      overBudgetWarning='<div style="margin:0 0 8px 0;padding:10px 14px;background:rgba(192,57,43,.12);border:1px solid rgba(192,57,43,.35);border-radius:10px;font-size:.78rem;color:var(--t1);line-height:1.5">'+
        'Over budget with drinks by '+overBy+' calories. Keep it or find a lighter option.'+
        '<div style="display:flex;gap:8px;margin-top:8px">'+
          '<button onclick="this.closest(\'div\').parentNode.removeChild(this.closest(\'div\'))" '+
            'style="background:none;border:1px solid var(--gold-line);color:var(--gold);border-radius:6px;padding:5px 12px;font-size:.72rem;font-weight:600;cursor:pointer;font-family:var(--font-body)">Keep it</button>'+
          '<button onclick="showPage(\'eatout\')" '+
            'style="background:none;border:1px solid var(--gold-line);color:var(--gold);border-radius:6px;padding:5px 12px;font-size:.72rem;font-weight:600;cursor:pointer;font-family:var(--font-body)">Find a lighter option</button>'+
        '</div>'+
      '</div>';
    }
    html+=overBudgetWarning+renderCustomMeal(customDinner,'Main Meal');
  } else {
    var hasDinnerSwap=Object.keys(window.ingredientSwaps||{}).some(function(k){return k.startsWith('fft_ingswap_'+i+'_dinner_');});
    var dinnerCustomBadge=hasDinnerSwap?'<span class="badge custom" style="margin-left:6px">Custom</span>':'';
    html+=mealCard('alt','4–6 hrs after first meal · make this','Main Meal',dinnerTitleDisplay+dinnerCustomBadge,
      '<ul>'+dinnerItems.map(function(x,idx){
        var gramsMatch=x.match(/(\d+)g/);
        var grams=gramsMatch?parseInt(gramsMatch[1]):100;
        var name=x.replace(/\d+g/,'').trim();
        return '<li style="display:flex;justify-content:space-between;align-items:center">'+
          '<span>'+formatIngredient(x)+'</span>'+
          '<button onclick="showIngredientSwap('+i+',\'dinner\','+idx+',\''+x.replace(/\x27/g,"\\'")+'\',\''+name.replace(/\x27/g,"\\'")+'\','+grams+')" style="background:none;border:none;color:var(--warm);font-size:.72rem;cursor:pointer;padding:2px 6px;font-weight:600;white-space:nowrap">swap</button>'+
        '</li>';
      }).join('')+'</ul>'+renderMacroBar(_normalizeMacros(calcMealMacros(dinnerItems),dinnerCal),'bar')+dinnerCookSteps+skipBtn('dinner'),dinnerCal,true);
  }

  if(dessertSkipped){
    html+='<div style="padding:12px 15px;background:var(--cream);border-radius:12px;margin-bottom:10px;border:1px dashed var(--border);display:flex;justify-content:space-between;align-items:center"><span style="font-size:.84rem;color:var(--muted)">Final Meal skipped today</span><button onclick="restoreMeal('+i+',\'dessert\')" style="background:none;border:1px solid var(--warm);color:var(--warm);border-radius:8px;padding:5px 12px;font-size:.75rem;cursor:pointer;font-weight:600">Restore</button></div>';
  } else if(customDessert){
    html+=renderCustomMeal(customDessert,'Final Meal');
  } else {
    var hasDessertSwap=Object.keys(window.ingredientSwaps||{}).some(function(k){return k.startsWith('fft_ingswap_'+i+'_dessert_');});
    var dessertCustomBadge=hasDessertSwap?'<span class="badge custom" style="margin-left:6px">Custom</span>':'';
    html+=mealCard('dessert','1–2 hrs after dinner · make this','Final Meal',dessertName+dessertCustomBadge,
      '<ul>'+dessertItems.map(function(x,idx){
        var gramsMatch=x.match(/(\d+)g/);
        var grams=gramsMatch?parseInt(gramsMatch[1]):100;
        var name=x.replace(/\d+g/,'').trim();
        return '<li style="display:flex;justify-content:space-between;align-items:center">'+
          '<span>'+formatIngredient(x)+'</span>'+
          '<button onclick="showIngredientSwap('+i+',\'dessert\','+idx+',\''+x.replace(/\x27/g,"\\'")+'\',\''+name.replace(/\x27/g,"\\'")+'\','+grams+')" style="background:none;border:none;color:var(--warm);font-size:.72rem;cursor:pointer;padding:2px 6px;font-weight:600;white-space:nowrap">swap</button>'+
        '</li>';
      }).join('')+'</ul>'+renderMacroBar(_normalizeMacros(calcMealMacros(dessertItems),dessertCal),'bar')+dessertCookSteps+skipBtn('dessert'),dessertCal,true);
  }

  // Any other custom meals (not replacing a slot)
  customOther.forEach(function(m){html+=renderCustomMeal(m,'Extra');});

  if(isWknd&&isDrinking){
    html+='<div class="wknd-banner" style="margin-top:4px">Meals scaled down · Drink budget: <strong>~'+drinkReserve+' cal</strong>. Food: '+totalFoodCal+' cal. Total: ~'+(totalFoodCal+alcCal)+' cal.</div>';
  }

  // ── TOTAL FOOD CAL ADJUSTMENT ─────────────────────────────
  // For built-in swaps (from SWAP_OPTIONS meal library, has mealKey):
  //   Contribute the lane-aware slot target to the total — keeps day total inside
  //   the plan's calorie range regardless of the swap option's base cal.
  // For restaurant / quick-log meals:
  //   Contribute the actual recorded cal (drink-adjusted where appropriate).
  var customCal=0;
  if(customFirst){
    var _firstBuiltIn=!!(customFirst.mealKey&&(!customFirst.notes||customFirst.notes.indexOf('Eating out')!==0));
    var _effFirstCal=_firstBuiltIn?targetFirstCal:(isDrinking?Math.round(customFirst.cal*drinkScale):customFirst.cal);
    customCal+=_effFirstCal;
    if(!firstSkipped)totalFoodCal=totalFoodCal-firstCal+_effFirstCal;
  }
  if(customDinner){
    var _dinnerBuiltIn=!!(customDinner.mealKey&&(!customDinner.notes||customDinner.notes.indexOf('Eating out')!==0));
    var _effDinnerCal=_dinnerBuiltIn?targetDinnerCal:(isDrinking?Math.round(customDinner.cal*drinkScale):customDinner.cal);
    customCal+=_effDinnerCal;
    if(!dinnerSkipped)totalFoodCal=totalFoodCal-dinnerCal+_effDinnerCal;
  }
  if(customDessert){
    var _dessertBuiltIn=!!(customDessert.mealKey&&(!customDessert.notes||customDessert.notes.indexOf('Eating out')!==0));
    var _effDessertCal=_dessertBuiltIn?targetDessertCal:(isDrinking?Math.round(customDessert.cal*drinkScale):customDessert.cal);
    customCal+=_effDessertCal;
    if(!dessertSkipped)totalFoodCal=totalFoodCal-dessertCal+_effDessertCal;
  }
  customOther.forEach(function(m){customCal+=m.cal;totalFoodCal+=m.cal;});

  // ── DAY MACRO TOTAL ──────────────────────────────────────────
  // Footer macros must match visible card macros exactly.
  // Built-in swaps: normalize base ingredients to slot target (matches renderCustomMeal output).
  // Restaurant/fridge: use stored normalized macros.
  // Template: use normalized scaled ingredients.
  var _dPro=0,_dCarb=0,_dFat=0;
  function _addMacros(m){_dPro+=m.pro||0;_dCarb+=m.carb||0;_dFat+=m.fat||0;}
  function _isBuiltInSwap(m){return !!(m&&m.mealKey&&(!m.notes||m.notes.indexOf('Eating out')!==0)&&m.notes!=='Built from fridge');}
  function _customSlotMacros(cm,slotCal){
    if(!cm)return null;
    if(_isBuiltInSwap(cm)){
      // Built-in swap: base ingredients + normalize to slot cal — identical to card display
      var _ings=cm.ingredients.map(function(x){return x.item||'';}).filter(Boolean);
      return _normalizeMacros(calcMealMacros(_ings),slotCal);
    }
    if(cm.pro||cm.carb||cm.fat)return{pro:cm.pro||0,carb:cm.carb||0,fat:cm.fat||0}; // fridge/restaurant stored
    if(cm.ingredients&&cm.ingredients.length){
      var _ings=cm.ingredients.map(function(x){return x.item||'';}).filter(Boolean);
      return calcMealMacros(_ings);
    }
    return null;
  }
  // Per-slot protein tracking — identifies the weakest meal by name
  var _slotProData=[];
  if(!firstSkipped){
    var _fm=customFirst?_customSlotMacros(customFirst,firstCal):_normalizeMacros(calcMealMacros(firstItems),firstCal);
    if(_fm){_addMacros(_fm);_slotProData.push({label:'First Meal',name:customFirst?customFirst.name:day.first.n,pro:_fm.pro||0});}
  }
  if(!dinnerSkipped){
    var _dm=customDinner?_customSlotMacros(customDinner,dinnerCal):_normalizeMacros(calcMealMacros(dinnerItems),dinnerCal);
    if(_dm){_addMacros(_dm);_slotProData.push({label:'Main Meal',name:customDinner?customDinner.name:dinnerTitleDisplay,pro:_dm.pro||0});}
  }
  if(!dessertSkipped){
    var _xm=customDessert?_customSlotMacros(customDessert,dessertCal):_normalizeMacros(calcMealMacros(dessertItems),dessertCal);
    if(_xm){_addMacros(_xm);_slotProData.push({label:'Final Meal',name:customDessert?customDessert.name:day.dessert.n,pro:_xm.pro||0});}
  }
  customOther.forEach(function(m){_addMacros(m);});
  _dPro=Math.round(_dPro);_dCarb=Math.round(_dCarb);_dFat=Math.round(_dFat);
  var _macroSummary=(_dPro||_dCarb||_dFat)
    ?'<span style="color:var(--gold-line)">·</span><span>'+_dPro+'g protein · '+_dCarb+'g carbs · '+_dFat+'g fat</span>'
    :'';

  // Protein floor warning — 0.45g per lb body weight, minimum floor of 75g
  var _planWeight=S.wLbs||currentPlan.wLbs||0;
  var _proFloor=_planWeight?Math.round(_planWeight*0.45):75;
  _proFloor=Math.max(_proFloor,75);
  var _proWarning='';
  if(_dPro>0&&_dPro<_proFloor){
    // Find the lowest-protein meal to give a specific suggestion
    // Skipped meals are the primary cause — check those first
    var _skippedLabels=[];
    if(firstSkipped)_skippedLabels.push('First Meal');
    if(dinnerSkipped)_skippedLabels.push('Main Meal');
    if(dessertSkipped)_skippedLabels.push('Final Meal');
    var _proTip;
    if(_skippedLabels.length>0){
      _proTip='You skipped your '+_skippedLabels.join(' and ')+' — that\'s where most of your protein comes from. Try eating it or logging an alternative.';
    } else {
      var _weakest=_slotProData.length?_slotProData.slice().sort(function(a,b){return a.pro-b.pro;})[0]:null;
      _proTip=_weakest
        ?'Your '+_weakest.label+' ('+_weakest.name+') is your lowest-protein meal — consider swapping it for a higher-protein option.'
        :'Consider a higher-protein swap or add egg whites to a meal.';
    }
    _proWarning='<div style="margin-top:8px;padding:8px 12px;background:rgba(192,100,60,.08);border-left:2px solid rgba(192,100,60,.5);border-radius:0 6px 6px 0;font-size:.7rem;color:rgba(210,130,90,.95);letter-spacing:.03em;font-family:var(--font-body);line-height:1.5">'+
      '⚠️ Today\'s protein is on the low side ('+_dPro+'g of '+_proFloor+'g+ recommended). '+_proTip+
    '</div>';
  }

  html+='<div style="font-size:.62rem;color:var(--t2);margin-top:12px;padding:10px 0;border-top:1px solid var(--gold-line);display:flex;gap:16px;letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-body);flex-wrap:wrap"><span>'+totalFoodCal+' cal'+(alcCal?' + '+alcCal+' drinks':'')+'</span><span style="color:var(--gold-line)">·</span><span>'+daySteps.toLocaleString()+' steps'+(S.walkType==='incline'?' · '+S.incline+'% / '+S.speed+' mph':'')+'</span>'+_macroSummary+'</div>'+_proWarning;

  // Invisible coaching — completion state for today
  if(i===todayIdx){
    html+='<div style="margin-top:14px;padding:16px 20px;background:linear-gradient(135deg,rgba(103,232,249,.06),rgba(103,232,249,.03));border:1px solid var(--gold-line);border-top:1px solid rgba(103,232,249,.25);border-radius:10px;font-size:.65rem;color:var(--gold-light);letter-spacing:.14em;text-transform:uppercase;font-family:var(--font-body);font-weight:600;text-align:center;line-height:2">'+
      'Eat these meals &nbsp;·&nbsp; Hit '+daySteps.toLocaleString()+' steps &nbsp;·&nbsp; Close the app &nbsp;·&nbsp; Live your life'+
    '</div>';
  }
  return html;
}

function skipMeal(dayIdx, slot){
  if(!skippedMeals[dayIdx])skippedMeals[dayIdx]=[];
  if(skippedMeals[dayIdx].indexOf(slot)<0)skippedMeals[dayIdx].push(slot);
  try{localStorage.setItem('fft_skipped',JSON.stringify(skippedMeals));}catch(e){}
  refreshCurrentView(dayIdx);
  buildDashDayTabs();
}
function restoreMeal(dayIdx, slot){
  if(!skippedMeals[dayIdx])return;
  skippedMeals[dayIdx]=skippedMeals[dayIdx].filter(function(s){return s!==slot;});
  try{localStorage.setItem('fft_skipped',JSON.stringify(skippedMeals));}catch(e){}
  refreshCurrentView(dayIdx);
  buildDashDayTabs();
}
function isMealSkipped(dayIdx, slot){
  return skippedMeals[dayIdx]&&skippedMeals[dayIdx].indexOf(slot)>=0;
}

// ── DINNER RESOLVER ──────────────────────────────────────────
// Single shared resolution path for "what is the active Main Meal for dayIdx?"
// Priority: customMeals → mealPrefs → template
//
// All consumers — buildDayHTML, renderWeeklyGrid, generateGroceryList — use this.

function getResolvedDinner(dayIdx) {
  var plan = getActivePlan();
  var templateDinner = plan[dayIdx] ? plan[dayIdx].dinner : null;

  // 1. Just-today custom meal swap
  var dayCustom = (customMeals || []).filter(function(m) {
    return m.day === dayIdx && m.slot === 'dinner';
  });
  if (dayCustom.length) {
    var m = dayCustom[0];
    return {
      n: m.name,
      k: m.mealKey || null,
      i: m.ingredients ? m.ingredients.map(function(x) { return x.item || ''; }) : [],
      c: m.cal,
      source: 'custom'
    };
  }

  // 2. Permanent mealPrefs swap
  var pref = mealPrefs[dayIdx] && mealPrefs[dayIdx].dinner;
  if (pref) {
    return {
      n: pref.name || pref.key,
      k: pref.key,
      i: pref.items || [],
      c: pref.cal,
      source: 'pref'
    };
  }

  // 3. Template fallback
  if (templateDinner) {
    return {
      n: templateDinner.n,
      k: templateDinner.k,
      i: templateDinner.i,
      c: templateDinner.c,
      source: 'template'
    };
  }

  return null;
}

// Set or clear the weekly dinner theme. Stores family key, not meal key.


// ── MEAL SWAP SYSTEM ──────────────────────────────────────────
var swapModalCtx={dayIdx:null,slot:null};

// ── LANE-AWARE MEAL LIBRARY ───────────────────────────────────
// Keyed by lane: men_deficit | women_deficit | men_surplus | women_surplus
// Each lane has three slot arrays: first | dinner | dessert
//
// RULES:
// - A meal only appears in the lanes where you add it
// - Surplus-only meals must NOT appear in deficit lanes
// - Women's meals must NOT appear in men's lanes
// - cal values are base reference calories at the gram amounts listed
// - The engine scales ingredients automatically to the user's actual targets
// - keys must be unique within a lane+slot combination
//
// STATUS:
//   ✅ men_deficit     — locked, production ready
//   ✅ women_deficit   — production ready
//   🔶 men_surplus     — provisional, partial coverage
//   ✅ women_surplus   — production ready, full family coverage
//
// IMAGE FILES NEEDED (add to project root as you build meals):
//   Existing: food-cottage.png, food-yogurt.png, food-eggs.png,
//             food-oats.png, food-chicken.png, food-beef.png,
//             food-salmon.png, food-turkey.png, food-shrimp.png,
//             food-ricotta.png, food-cookies.png
//   Add new images as new meal families are introduced.
//   Use 'food-placeholder.png' temporarily for any missing images.

// ── INGREDIENT FORMAT ─────────────────────────────────────────
// Each ingredient uses the object format:
// { item, basis, grams, cooked_grams }
//
// basis values:
//   'raw'  — proteins and potatoes — grams = raw weight
//   'dry'  — rice and pasta       — grams = dry/uncooked weight
//   'same' — sauces, dairy, honey, condiments — no conversion needed
//
// cooked_grams is pre-calculated using locked conversion factors:
//   Chicken/beef/sirloin: raw × 0.75
//   Turkey: raw × 0.78
//   Salmon: raw × 0.85
//   Potatoes: raw × 0.85
//   Rice: dry × 3.0
//   Pasta: dry × 2.3
//   Whole eggs: raw × 0.90
//   Egg whites: raw × 0.92
//   basis:'same' items: cooked_grams === grams
//
// Grocery list always uses grams (raw/dry).
// Display toggle reads grams (raw/dry) or cooked_grams depending on mode.
// count field is optional — used for whole eggs to show "2 eggs" alongside grams.

// ── INGREDIENT SERIALIZER ─────────────────────────────────────
// Converts an ingredient object to a display string.
// Used when feeding into the rendering pipeline (scaleItems, mealPrefs, customMeals).
// mode: 'raw' (default) | 'cooked'
function ingredientToString(ing, mode) {
  if (typeof ing === 'string') return ing; // backward compat — plain strings pass through
  var g = (mode === 'cooked') ? ing.cooked_grams : ing.grams;
  // Always serialize as 'Item Xg' — never include count in storage strings.
  // Count display is handled at render time by eggsGtoCount().
  // The count-in-parentheses format 'Whole eggs 4 (200g)' breaks scaleItems() regex.
  return ing.item + ' ' + g + 'g';
}

// Converts a meal's items array to strings for pipeline compatibility
function mealItemsToStrings(items, mode) {
  return (items || []).map(function(x) { return ingredientToString(x, mode); });
}

function showMealSwap(dayIdx, slot){
  swapModalCtx={dayIdx:dayIdx, slot:slot};
  var modal=document.getElementById('meal-swap-modal');
  // Lane-aware — route to correct meal library for this user's plan
  var lane=(currentPlan&&currentPlan.lane)?currentPlan.lane:'men_deficit';
  var laneOptions=SWAP_OPTIONS[lane]||SWAP_OPTIONS['men_deficit'];
  var opts=laneOptions[slot]||[];
  var slotLabel=getSlotDisplayLabel(slot);
  var dayLabel=DAYS_FULL[dayIdx];
  document.getElementById('msm-title').textContent='Swap '+slotLabel+' — '+dayLabel;
  document.getElementById('msm-subtitle').textContent='Pick a replacement. The rest of your day will recalculate automatically.';
  var html='';
  if(!opts.length){
    html='<div style="text-align:center;padding:24px 0;color:var(--t3);font-size:.85rem">More meal options coming soon for your plan.</div>';
    document.getElementById('msm-options').innerHTML=html;
    modal.style.display='block';
    document.body.style.overflow='hidden';
    return;
  }
  opts.forEach(function(opt){
    var hasPref=mealPrefs[dayIdx]&&mealPrefs[dayIdx][slot]&&mealPrefs[dayIdx][slot].key===opt.key;
    html+='<div onclick="confirmMealSwap(\''+opt.key+'\')" style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:'+(hasPref?'rgba(103,232,249,.08)':'var(--s2)')+';border:1px solid '+(hasPref?'rgba(103,232,249,.4)':'var(--gold-line)')+';border-radius:12px;cursor:pointer;margin-bottom:10px;transition:all .2s">'+

      '<div style="flex:1"><div style="font-size:.95rem;font-weight:700;color:var(--t1);font-family:var(--font-display)">'+opt.name+(hasPref?' <span style="font-size:.65rem;font-weight:700;color:var(--gold);letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-body)">Current Default</span>':'')+'</div>'+
      '<div style="font-size:.75rem;color:var(--t2);margin-top:3px">'+opt.cal+' cal base</div></div>'+
      '<div style="color:var(--gold);font-size:1rem">→</div>'+
    '</div>';
  });
  // Show clear pref option if one is saved
  if(mealPrefs[dayIdx]&&mealPrefs[dayIdx][slot]){
    html+='<button onclick="clearMealPref('+dayIdx+',\''+slot+'\')" style="width:100%;padding:10px;background:none;border:1px solid rgba(192,57,43,.3);color:var(--red);border-radius:8px;font-size:.78rem;cursor:pointer;font-weight:600;margin-top:4px">Reset to Plan Default</button>';
  }
  document.getElementById('msm-options').innerHTML=html;
  modal.style.display='block';
  document.body.style.overflow='hidden';
}

function confirmMealSwap(optKey){
  var dayIdx=swapModalCtx.dayIdx;
  var slot=swapModalCtx.slot;
  var lane=(currentPlan&&currentPlan.lane)?currentPlan.lane:'men_deficit';
  var laneOptions=SWAP_OPTIONS[lane]||SWAP_OPTIONS['men_deficit'];
  var opts=laneOptions[slot]||[];
  var chosen=opts.filter(function(o){return o.key===optKey;})[0];
  if(!chosen)return;

  // Apply just for today first — update display
  refreshCurrentView(dayIdx);
  buildDashDayTabs();

  // Ask: just today or permanent?
  var dayLabel=DAYS_FULL[dayIdx];
  document.getElementById('msm-options').innerHTML=
    '<div style="text-align:center;padding:10px 0 20px">'+

      '<div style="font-size:1.1rem;font-weight:700;color:var(--t1);font-family:var(--font-display);margin-bottom:6px">'+chosen.name+'</div>'+
      '<div style="font-size:.82rem;color:var(--t2);margin-bottom:24px">Make this your permanent '+slot+' on '+dayLabel+'s?</div>'+
      '<div style="display:flex;flex-direction:column;gap:10px">'+
        '<button onclick="applyMealSwap(\''+optKey+'\',true)" style="width:100%;padding:14px;background:linear-gradient(135deg,var(--s3),var(--s2));border:1px solid var(--gold-line);border-top:1px solid rgba(103,232,249,.3);border-radius:12px;color:var(--gold-light);font-size:.88rem;font-weight:700;cursor:pointer;font-family:var(--font-body)">Yes — Every '+dayLabel+' from now on</button>'+
        '<button onclick="applyMealSwap(\''+optKey+'\',false)" style="width:100%;padding:14px;background:none;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:var(--t2);font-size:.88rem;font-weight:600;cursor:pointer;font-family:var(--font-body)">Just today</button>'+
        '<button onclick="closeMealSwap()" style="width:100%;padding:10px;background:none;border:none;color:var(--muted);font-size:.82rem;cursor:pointer">Cancel</button>'+
      '</div>'+
    '</div>';
  // Store chosen temporarily so applyMealSwap can access it
  swapModalCtx.chosenKey=optKey;
}

function applyMealSwap(optKey, permanent){
  var dayIdx=swapModalCtx.dayIdx;
  var slot=swapModalCtx.slot;
  var lane=(currentPlan&&currentPlan.lane)?currentPlan.lane:'men_deficit';
  var laneOptions=SWAP_OPTIONS[lane]||SWAP_OPTIONS['men_deficit'];
  var opts=laneOptions[slot]||[];
  var chosen=opts.filter(function(o){return o.key===optKey;})[0];
  if(!chosen)return;

  if(permanent){
    // Save to mealPrefs — serialize items to strings for rendering pipeline
    if(!mealPrefs[dayIdx])mealPrefs[dayIdx]={};
    mealPrefs[dayIdx][slot]={key:chosen.key,name:chosen.name,items:mealItemsToStrings(chosen.items,'raw'),cal:chosen.cal};
    try{localStorage.setItem('fft_meal_prefs',JSON.stringify(mealPrefs));}catch(e){}
  } else {
    // Just today — use customMeals slot replacement
    customMeals=customMeals.filter(function(m){return!(m.day===dayIdx&&m.slot===slot);});
    customMeals.push({day:dayIdx,name:chosen.name,cal:chosen.cal,slot:slot,notes:'Swapped meal',id:Date.now(),mealKey:chosen.key,ingredients:mealItemsToStrings(chosen.items,'raw').map(function(x){return{item:x,amount:''};})});
    try{localStorage.setItem('fft_custom',JSON.stringify(customMeals));}catch(e){}
  }
  // Push to server and group slot so linked devices (iPad) see the swap immediately
  if(typeof saveAllData==='function')saveAllData();

  closeMealSwap();
  refreshCurrentView(dayIdx);
  buildDashDayTabs();

  // Show confirmation banner
  var el=document.getElementById('dash-loss');
  if(el){
    el.className='adj-banner good';
    el.innerHTML='<strong>Swapped!</strong> '+chosen.name+' is now your '+slot+(permanent?' every '+DAYS_FULL[dayIdx]:' today')+'.';
    el.classList.remove('hidden');
    setTimeout(function(){el.classList.add('hidden');el.innerHTML='';},4000);
  }
}

function clearMealPref(dayIdx, slot){
  if(mealPrefs[dayIdx])delete mealPrefs[dayIdx][slot];
  try{localStorage.setItem('fft_meal_prefs',JSON.stringify(mealPrefs));}catch(e){}
  // Push removal to server and group slot so iPad reflects it immediately
  if(typeof saveAllData==='function')saveAllData();
  closeMealSwap();
  refreshCurrentView(dayIdx);
  buildDashDayTabs();
}

function closeMealSwap(){
  document.getElementById('meal-swap-modal').style.display='none';
  document.body.style.overflow='';
}
// ── END MEAL SWAP ─────────────────────────────────────────────

function removeCustomMealDash(id,dayIdx){
  customMeals=customMeals.filter(function(m){return m.id!==id;});
  try{localStorage.setItem('fft_custom',JSON.stringify(customMeals));}catch(e){}
  // Push removal to server and group slot so iPad reflects it immediately
  if(typeof saveAllData==='function')saveAllData();
  renderDashDay(dayIdx);
  buildDashDayTabs();
}

function refreshCurrentView(i){
  if(document.getElementById('page-dashboard').classList.contains('active')){
    var openTitles=[];
    var dayEl=document.getElementById('dash-day-content');
    if(dayEl){
      dayEl.querySelectorAll('.meal-body.open').forEach(function(body){
        var header=body.previousElementSibling;
        var titleEl=header?header.querySelector('.meal-title'):null;
        if(titleEl)openTitles.push(titleEl.textContent.trim());
      });
    }
    renderDashDay(i);
    if(openTitles.length){
      dayEl=document.getElementById('dash-day-content');
      if(dayEl){
        dayEl.querySelectorAll('.meal-header').forEach(function(header){
          var titleEl=header.querySelector('.meal-title');
          if(!titleEl)return;
          if(openTitles.indexOf(titleEl.textContent.trim())>=0){
            var body=header.nextElementSibling;
            var arrow=header.querySelector('.meal-expand');
            if(body)body.classList.add('open');
            if(arrow)arrow.textContent='▲';
          }
        });
      }
    }
    updateDashboard();
  }
  if(document.getElementById('page-recipes').classList.contains('active')&&typeof renderRecipesPage==='function'){renderRecipesPage();}
  var wgOverlay=document.getElementById('weekly-grid-overlay');
  if(wgOverlay&&wgOverlay.style.display!=='none'&&typeof renderWeeklyGrid==='function'){renderWeeklyGrid();}
}

function mealCard(cls,time,label,name,desc,cal,isList){
  return '<div class="meal-card '+cls+'"><div class="meal-header" onclick="toggleMeal(this)"><div style="display:flex;align-items:center;flex:1;min-width:0"><div style="min-width:0"><div class="meal-title" style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">'+name+'</div><div class="meal-subtitle">'+label+(time?'<span style="font-size:.72rem;color:var(--muted);opacity:.8"> · '+time+'</span>':'')+'</div></div></div><div style="display:flex;align-items:center;gap:5px;white-space:nowrap;flex-shrink:0"><span class="meal-cal">'+cal+' cal</span><span class="meal-expand">▼</span></div></div><div class="meal-body">'+(isList?desc:'<p>'+desc+'</p>')+'</div></div>';
}
function toggleMeal(h){var b=h.nextElementSibling;var a=h.querySelector('.meal-expand');b.classList.toggle('open');if(a)a.textContent=b.classList.contains('open')?'▲':'▼';}

function updateDashboard(){
  // Self-heal: if JS state was wiped by iOS, reload from localStorage
  if(!currentPlan.cal){
    try{var _sp=localStorage.getItem('fft_plan');if(_sp)currentPlan=JSON.parse(_sp);}catch(e){}
    if(!userName)userName=localStorage.getItem('fft_name')||'';
    if(!workMode){workMode=localStorage.getItem('fft_workmode')||'wfh';}
  }
  if(!currentPlan.cal)return;
  var h=new Date().getHours();
  var greeting=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  document.getElementById('dash-time').textContent=greeting+',';
  if(!userName)userName=localStorage.getItem('fft_name')||'';
  document.getElementById('dash-name').textContent=userName;
  var days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var now=new Date();
  document.getElementById('dash-date').textContent=days[now.getDay()]+', '+months[now.getMonth()]+' '+now.getDate();
  document.getElementById('ds-cal').textContent=currentPlan.cal.toLocaleString();
  var todayIsWeekend=now.getDay()===0||now.getDay()===6;
  var todayIdx=now.getDay()===0?6:now.getDay()-1;
  var todayIsDrinking=drinkingDays[todayIdx]&&drinkingDays[todayIdx]!==false;
  var drinkLevel=drinkingDays[todayIdx]||false;
  var todaySteps=currentPlan.steps;
  if(drinkLevel==='light')todaySteps=currentPlan.wStepsLight||currentPlan.wSteps||currentPlan.steps;
  else if(drinkLevel==='regular')todaySteps=currentPlan.wSteps||currentPlan.steps;
  else if(drinkLevel==='big')todaySteps=currentPlan.wStepsBig||currentPlan.wSteps||currentPlan.steps;
  document.getElementById('ds-steps').textContent=todaySteps.toLocaleString();
  var drinkLabels={light:'Steps (Light Night)',regular:'Steps (Drinking Night)',big:'Steps (Big Night)'};
  document.getElementById('ds-steps-label').textContent=drinkLevel?drinkLabels[drinkLevel]:todayIsWeekend?'Steps (Weekend)':'Steps';
  // Show calorie burn target under steps
  var burnEl=document.getElementById('ds-steps-burn');
  if(burnEl){
    var planBurnNormal=currentPlan.burnNormal||500;
    var planBurnDrink=currentPlan.burnDrink||750;
    var planBurnLight=currentPlan.burnLight||planBurnNormal+150;
    var planBurnBig=currentPlan.burnBig||planBurnNormal+400;
    var burnTarget=planBurnNormal;
    if(drinkLevel==='light')burnTarget=planBurnLight;
    else if(drinkLevel==='regular')burnTarget=planBurnDrink;
    else if(drinkLevel==='big')burnTarget=planBurnBig;
    burnEl.textContent='walk target: ~'+burnTarget+' cal';
    burnEl.style.display='block';
  }
  var displayGoal=currentPlan.goalWeight||currentPlan.tmp||Math.round(currentPlan.tz&&currentPlan.tz.mid||0);
  document.getElementById('ds-goal').textContent=displayGoal+' lbs';
  // Calorie range — always show
  var dsRange=document.getElementById('ds-range');
  if(currentPlan.calLow&&currentPlan.calHigh){
    dsRange.textContent=currentPlan.calLow.toLocaleString()+'–'+currentPlan.calHigh.toLocaleString();
    dsRange.style.display='block';
  } else {
    dsRange.style.display='none';
  }
  // Progress line
  var progLine=document.getElementById('ds-progress-line');
  var progFill=document.getElementById('ds-progress-fill');
  var progTxt=document.getElementById('ds-progress-txt');
  if(progLine&&currentPlan.tz&&currentPlan.wLbs){
    var tzHigh=Math.round(currentPlan.tz.high);
    var tzLow=Math.round(currentPlan.tz.low);
    var wLbs=currentPlan.wLbs;
    if(wLbs<=tzHigh){
      progTxt.textContent='Target zone reached!';
      progFill.style.width='100%';
    } else {
      var lbsToGo=wLbs-tzHigh;
      var startW=currentPlan.startWeight||wLbs;
      var totalJ=Math.max(startW-tzHigh,1);
      var done=Math.max(0,startW-wLbs);
      var pct=Math.min(100,Math.max(2,Math.round((done/totalJ)*100)));
      progFill.style.width=pct+'%';
      progTxt.textContent=parseFloat(lbsToGo.toFixed(1))+' lbs to next milestone ('+tzHigh+' lbs)';
    }
    progLine.style.display='block';
  } else if(progLine){
    progLine.style.display='none';
  }
  var phaseObj={name:currentPlan.phase};
  // weekly loss display removed
  document.getElementById('dash-no-plan').classList.add('hidden');
  document.getElementById('dash-plan').classList.remove('hidden');
  // Build dinner theme selector UI whenever dashboard updates

  // Nudge — show only if today's weight hasn't been logged
  var nudgeEl=document.getElementById('log-nudge');
  if(nudgeEl){
    var todayStr=new Date().toISOString().split('T')[0];
    var currentLog=weightLog;
    try{var stored=localStorage.getItem('fft_log');if(stored)currentLog=JSON.parse(stored);}catch(e){}
    var loggedToday=currentLog&&currentLog.some(function(e){return e.d===todayStr;});
    nudgeEl.style.display=loggedToday?'none':'flex';
  }
}

function updateDashGreeting(){
  if(!userName)userName=localStorage.getItem('fft_name')||'';
  var h=new Date().getHours();
  var greeting=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  var el=document.getElementById('dash-time');var en=document.getElementById('dash-name');var ed=document.getElementById('dash-date');
  if(el)el.textContent=greeting+',';
  if(en)en.textContent=userName;
  var days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  var now=new Date();
  if(ed)ed.textContent=days[now.getDay()]+', '+months[now.getMonth()]+' '+now.getDate();
}

// ── MEALPREFS MIGRATION ───────────────────────────────────────
// Backfills old mealPrefs entries that are missing name or key.
// Old format: { key, items, cal }
// Current format: { key, name, items, cal }
// Runs once per session on first buildDashDayTabs call.
var _mealPrefsMigrated=false;
function migrateMealPrefs(){
  if(_mealPrefsMigrated)return;
  _mealPrefsMigrated=true;
  if(!mealPrefs||typeof mealPrefs!=='object')return;
  var lane=(currentPlan&&currentPlan.lane)?currentPlan.lane:'men_deficit';
  var laneOptions=SWAP_OPTIONS[lane]||SWAP_OPTIONS['men_deficit'];
  var dirty=false;
  var slots=['first','dinner','dessert'];
  Object.keys(mealPrefs).forEach(function(dayIdx){
    var dayEntry=mealPrefs[dayIdx];
    if(!dayEntry||typeof dayEntry!=='object')return;
    slots.forEach(function(slot){
      var pref=dayEntry[slot];
      if(!pref)return;
      // Only migrate if name or key is missing
      if(pref.name&&pref.key)return;
      // Look up by key in SWAP_OPTIONS for this lane+slot
      var slotOpts=laneOptions[slot]||[];
      var match=slotOpts.filter(function(o){return o.key===pref.key;})[0];
      if(!match)return;// key not found — leave as-is, don't corrupt
      if(!pref.name){pref.name=match.name;dirty=true;}
      if(!pref.key){pref.key=match.key;dirty=true;}// defensive — key was used to find match, but normalize shape
    });
  });
  if(dirty){
    try{localStorage.setItem('fft_meal_prefs',JSON.stringify(mealPrefs));}catch(e){}
  }
}

function buildDashDayTabs(){
  // Self-heal: reload from localStorage if JS state was wiped
  if(!currentPlan.cal){
    try{var _sp=localStorage.getItem('fft_plan');if(_sp)currentPlan=JSON.parse(_sp);}catch(e){}
    if(!workMode)workMode=localStorage.getItem('fft_workmode')||'wfh';
  }
  migrateMealPrefs();
  var el=document.getElementById('dash-day-tabs');if(!el)return;
  el.innerHTML='';
  var todayIdx=new Date().getDay()===0?6:new Date().getDay()-1;
  DAYS_SHORT.forEach(function(_,i){
    var b=document.createElement('div');
    var cls='day-tab';
    if(i===todayIdx)cls+=' today';
    if(i>=4)cls+=' weekend';
    if(i===currentDayIdx)cls+=' active';
    b.className=cls;
    b.textContent=i===todayIdx?DAYS_SHORT[i]+' ●':DAYS_SHORT[i];
    b.onclick=(function(idx){return function(){currentDayIdx=idx;document.querySelectorAll('#dash-day-tabs .day-tab').forEach(function(t){t.classList.remove('active');});b.classList.add('active');renderDashDay(idx);};})(i);
    el.appendChild(b);
  });
  renderDashDay(currentDayIdx);
}



function renderDashDay(i){
  var el=document.getElementById('dash-day-content');if(!el||!currentPlan.cal)return;
  // Capture which meal cards are open before re-render
  var openSlots=[];
  el.querySelectorAll('.meal-card').forEach(function(card){
    var body=card.querySelector('.meal-body');
    if(body&&body.classList.contains('open')){
      openSlots.push(card.getAttribute('data-slotlabel'));
    }
  });
  el.innerHTML=buildDayHTML(i,currentPlan,false);
  // Restore open state after re-render
  if(openSlots.length){
    el.querySelectorAll('.meal-card').forEach(function(card){
      var label=card.getAttribute('data-slotlabel');
      if(openSlots.indexOf(label)>=0){
        var body=card.querySelector('.meal-body');
        var arrow=card.querySelector('.meal-expand');
        if(body){body.classList.add('open');if(arrow)arrow.textContent='▲';}
      }
    });
  }
  document.querySelectorAll('#dash-day-content .meal-header').forEach(function(h){h.onclick=function(){toggleMeal(h);};});
}


function renderCustomMealsList(i){
  var el=document.getElementById('custom-meals-list');if(!el)return;
  var dayCustom=customMeals.filter(function(m){return m.day===i;});
  if(!dayCustom.length){el.innerHTML='';return;}
  var html='<div class="section-title">Custom meals added for '+DAYS_FULL[i]+'</div>';
  dayCustom.forEach(function(m){
    html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 13px;background:var(--cream);border-radius:8px;margin-bottom:6px;border:1px solid var(--border)">'+
      '<div><div style="font-size:.88rem;font-weight:600;color:var(--text)">'+m.name+'</div><div style="font-size:.75rem;color:var(--muted)">'+m.slot+' · '+m.cal+' cal'+(m.notes?' · '+m.notes:'')+'</div></div>'+
      '<button onclick="removeCustomMeal('+m.id+')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:.85rem">✕</button>'+
    '</div>';
  });
  el.innerHTML=html;
}

function removeCustomMeal(id){
  customMeals=customMeals.filter(function(m){return m.id!==id;});
  try{localStorage.setItem('fft_custom',JSON.stringify(customMeals));}catch(e){}
  renderRecipeDay(recipeDayIdx);
  buildDashDayTabs();
}
