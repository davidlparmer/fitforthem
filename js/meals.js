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

function buildDayHTML(i,plan,showSwap){
  var cal=plan.cal,mealTimes=plan.mealTimes,phase=plan.phase,rotation=plan.rotation;
  var isWknd=i>=4;
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
    var coachStyle='font-size:.78rem;color:var(--t2);font-style:italic;margin-bottom:14px;padding:10px 14px;border-left:1px solid rgba(184,150,60,.25);letter-spacing:.01em;line-height:1.6';

    if(dow===5){// Friday
      coachMsg='Your plan is already adjusted for tonight. Enjoy it.';
      coachStyle='font-size:.78rem;color:var(--t2);font-style:italic;margin-bottom:14px;padding:10px 14px;border-left:1px solid rgba(184,150,60,.25);letter-spacing:.01em;line-height:1.6';
    } else if(dow===6){// Saturday
      coachMsg='Still on track. The weekend is part of the system.';
      coachStyle='font-size:.78rem;color:var(--t2);font-style:italic;margin-bottom:14px;padding:10px 14px;border-left:1px solid rgba(184,150,60,.25);letter-spacing:.01em;line-height:1.6';
    } else if(dow===0){// Sunday
      coachMsg='Reset day. One clean finish before the week begins.';
      coachStyle='font-size:.78rem;color:var(--t2);font-style:italic;margin-bottom:14px;padding:10px 14px;border-left:1px solid rgba(184,150,60,.25);letter-spacing:.01em;line-height:1.6';
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
  // Priority: customMeals → mealPrefs → dinnerTheme (family rotation) → template
  var _rd=getResolvedDinner(i);
  var _resolvedDinner=_rd?{n:_rd.n,k:_rd.k,i:_rd.i,c:_rd.c,_swapOpt:_rd._swapOpt||null}:day.dinner;
  day={...day,dinner:_resolvedDinner};

  // Lane-aware slot calorie budgets — use locked ratios from lane-profiles.js
  var planSex=plan.sex||'male';
  var planMode=plan.phase;
  // Determine gain vs deficit from phase name
  var isGainMode=(planMode==='moderate_gain'||planMode==='mild_gain'||planMode==='landing_gain');
  var laneMode=isGainMode?'gain':'cut';
  var laneRatios=(typeof getLaneRatios==='function')?getLaneRatios(planSex,laneMode):{first:0.275,dinner:0.525,dessert:0.200};

  // Apply drink reserve to food budget before splitting by ratio
  var foodCal=isWknd&&isDrinking?cal-drinkReserve:cal;
  var targetFirstCal=Math.round(foodCal*laneRatios.first);
  var targetDinnerCal=Math.round(foodCal*laneRatios.dinner);
  var targetDessertCal=foodCal-targetFirstCal-targetDinnerCal;// remainder avoids rounding drift

  // baseTotal now reflects actual active meals (after prefs/swap resolution above)
  var baseTotal=day.first.c+day.dinner.c+day.dessert.c;
  var scale=baseTotal>0?cal/baseTotal:1;
  var drinkScale=isWknd&&isDrinking?(cal-drinkReserve)/cal:1.0;
  var effectiveScale=scale*drinkScale;

  var scaleItems=function(items){return items.map(function(item){
    // Handle legacy count format: 'Whole eggs 4 (200g)' → scale the gram value in parens
    var legacyM=item.match(/^(.*?\s)\d+\s*\((\d+)g\)$/);
    if(legacyM)return legacyM[1].trimRight()+' '+Math.round(parseInt(legacyM[2])*effectiveScale)+'g';
    // Standard format: 'Item Xg'
    var m=item.match(/^(.*?)(\d+)(g)$/);
    return m?m[1]+Math.round(parseInt(m[2])*effectiveScale)+'g':item;
  });};

  var firstItems=scaleItems(day.first.i).map(function(item){
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
  var dinnerItems=scaleItems(day.dinner.i).map(function(item){
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
      var scaledCount=Math.round(BASE_COOKIE_COUNT*effectiveScale*2)/2;
      scaledCount=Math.max(0.5,scaledCount);
      return 'Biscoff cookies '+scaledCount;
    }
    var m=item.match(/^(.*?)(\d+)(g)$/);
    if(!m)return item;
    var name=m[1].toLowerCase();
    var baseG=parseInt(m[2]);
    if(name.indexOf('yogurt')>=0||name.indexOf('greek')>=0){
      var scaledYogurt=Math.round(baseG*effectiveScale);
      return m[1]+scaledYogurt+'g';
    }
    if(name.indexOf('honey')>=0){
      var scaledYogurtG=Math.round(BASE_YOGURT_G*effectiveScale);
      var yogurtIncrease=scaledYogurtG-BASE_YOGURT_G;
      var honeyIncrease=Math.round((yogurtIncrease/50)*5);
      var honeyG=BASE_HONEY_G+honeyIncrease;
      if(isDrinkingNight){honeyG=25;}
      return m[1]+honeyG+'g';
    }
    return item;
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
        if(slot==='first')firstCal=Math.max(50,firstCal+(saved.cal-Math.round(day.first.c*effectiveScale/day.first.i.length)));
        if(slot==='dinner')dinnerCal=Math.max(50,dinnerCal+(saved.cal-Math.round(day.dinner.c*effectiveScale/day.dinner.i.length)));
        if(slot==='dessert')dessertCal=Math.max(50,dessertCal+(saved.cal-Math.round(day.dessert.c*effectiveScale/day.dessert.i.length)));
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
  var FIRST_IMGS={cottage:'food-cottage.png',yogurt:'food-yogurt.png',greek:'food-yogurt.png',oat:'food-oats.png',egg:'food-eggs.png'};
  var firstImgKey=firstKey.indexOf('cottage')>=0?'cottage':firstKey.indexOf('yogurt')>=0||firstKey.indexOf('greek')>=0?'yogurt':firstKey.indexOf('oat')>=0?'oat':'egg';
  var firstThumbHTML='<img src="'+FIRST_IMGS[firstImgKey]+'" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px;margin-right:12px;flex-shrink:0;border:1px solid rgba(184,150,60,.22)">';
  var DESSERT_IMGS={yogurt:'food-yogurt.png',ricotta:'food-ricotta.png',cookie:'food-cookies.png',chocolate:'food-cookies.png'};
  var dessertImgKey=dessertKey.indexOf('yogurt')>=0||dessertKey.indexOf('greek')>=0?'yogurt':dessertKey.indexOf('ricotta')>=0?'ricotta':'cookie';
  var dessertThumbHTML='<img src="'+DESSERT_IMGS[dessertImgKey]+'" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px;margin-right:12px;flex-shrink:0;border:1px solid rgba(184,150,60,.22)">';

  // Declare custom meal replacements BEFORE rendering meal cards
  var dayCustom=customMeals.filter(function(m){return m.day===i;});
  var customFirst=dayCustom.filter(function(m){return m.slot==='first';})[0]||null;
  var customDinner=dayCustom.filter(function(m){return m.slot==='dinner';})[0]||null;
  var customDessert=dayCustom.filter(function(m){return m.slot==='dessert';})[0]||null;
  var customOther=dayCustom.filter(function(m){return m.slot!=='first'&&m.slot!=='dinner'&&m.slot!=='dessert';});

  function renderCustomMeal(m,slotLabel){
    var displayCal=isDrinking?Math.round(m.cal*drinkScale):m.cal;
    var customBody='';
    if(m.ingredients&&m.ingredients.length){
      var isBuiltIn=m.mealKey&&m.source!=='restaurant';
      var scaledIngredients=m.ingredients.map(function(ing){
        var item=ing.item||'';
        if(isBuiltIn&&effectiveScale!==1){
          var gm=item.match(/^(.*?)(\d+)(g)$/);
          if(gm)item=gm[1]+Math.round(parseInt(gm[2])*effectiveScale)+'g';
        }
        return {item:item,amount:ing.amount||''};
      });
      customBody+='<ul>'+scaledIngredients.map(function(ing){return '<li>'+ing.item+(ing.amount?' — '+ing.amount:'')+'</li>';}).join('')+'</ul>';
    }
    if(m.tip){customBody+='<div class="coach-note" style="margin-top:8px">'+m.tip+'</div>';}
    if(!customBody){customBody='<p>'+displayCal+' cal</p>';}
    var mealStr=(m.name||'').toLowerCase()+' '+(m.ingredients||[]).map(function(x){return x.item||'';}).join(' ').toLowerCase();
    var isRestaurant=m.notes&&m.notes.indexOf('Eating out')===0;
    var swapCookSteps=(!isRestaurant&&typeof getMealInstructions==='function')
      ?getMealInstructions(m.mealKey||null,mealStr):'';
    if(swapCookSteps){customBody+=swapCookSteps;}
    if(typeof renderMacroBar==='function'){
      var mPro=m.pro||0,mCarb=m.carb||0,mFat=m.fat||0;
      if(!mPro&&!mCarb&&!mFat&&m.ingredients&&m.ingredients.length&&typeof calcMealMacros==='function'){
        var ingStrings=m.ingredients.map(function(x){return x.item||'';}).filter(Boolean);
        var calc=calcMealMacros(ingStrings);
        mPro=calc.pro;mCarb=calc.carb;mFat=calc.fat;
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
  var isDinnerThemed=_rd&&_rd.source==='theme';
  var dinnerCookedDisplay=isDinnerThemed?renderCookedWeightDisplay(day.dinner._swapOpt,effectiveScale):'';
  var FOOD_IMGS={chicken:'food-chicken.png',beef:'food-beef.png',salmon:'food-salmon.png',fish:'food-salmon.png',turkey:'food-turkey.png'};
  var dinnerThumb=FOOD_IMGS[dinnerTitleProtein]||'food-chicken.png';
  var dinnerThumbHTML='<img src="'+dinnerThumb+'" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px;margin-right:12px;flex-shrink:0;border:1px solid rgba(184,150,60,.22)">';
  var dessertMealKey=(dayPrefs.dessert&&dayPrefs.dessert.key)||day.dessert.k||null;
  var dessertCookSteps=getMealInstructions(dessertMealKey, dessertItems[0]);

  var skipBtn=function(slot){
    return '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">'+
      '<button onclick="showMealSwap('+i+',\''+slot+'\')" style="background:none;border:1px solid rgba(184,150,60,.4);color:var(--gold);border-radius:8px;padding:6px 14px;font-size:.78rem;cursor:pointer;font-weight:600">Swap Meal</button>'+
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
    html+=mealCard('','','First Meal · Break your fast when ready',firstThumbHTML+fn+fTag+firstCustomBadge,
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
      }).join('')+'</ul>'+renderMacroBar(calcMealMacros(firstItems),'bar')+firstCookSteps+skipBtn('first'),firstCal,true);
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
    var dinnerThemeBadge=isDinnerThemed?'<span style="font-size:.58rem;font-weight:700;color:var(--gold);letter-spacing:.1em;text-transform:uppercase;font-family:var(--font-body);margin-left:6px;opacity:.8">🍲 Dinner Family</span>':'';
    html+=mealCard('alt','4–6 hrs after first meal · make this','Main Meal',dinnerThumbHTML+dinnerTitleDisplay+dinnerCustomBadge+dinnerThemeBadge,
      '<ul>'+dinnerItems.map(function(x,idx){
        var gramsMatch=x.match(/(\d+)g/);
        var grams=gramsMatch?parseInt(gramsMatch[1]):100;
        var name=x.replace(/\d+g/,'').trim();
        return '<li style="display:flex;justify-content:space-between;align-items:center">'+
          '<span>'+formatIngredient(x)+'</span>'+
          '<button onclick="showIngredientSwap('+i+',\'dinner\','+idx+',\''+x.replace(/\x27/g,"\\'")+'\',\''+name.replace(/\x27/g,"\\'")+'\','+grams+')" style="background:none;border:none;color:var(--warm);font-size:.72rem;cursor:pointer;padding:2px 6px;font-weight:600;white-space:nowrap">swap</button>'+
        '</li>';
      }).join('')+'</ul>'+renderMacroBar(calcMealMacros(dinnerItems),'bar')+dinnerCookSteps+dinnerCookedDisplay+skipBtn('dinner'),dinnerCal,true);
  }

  if(dessertSkipped){
    html+='<div style="padding:12px 15px;background:var(--cream);border-radius:12px;margin-bottom:10px;border:1px dashed var(--border);display:flex;justify-content:space-between;align-items:center"><span style="font-size:.84rem;color:var(--muted)">Final Meal skipped today</span><button onclick="restoreMeal('+i+',\'dessert\')" style="background:none;border:1px solid var(--warm);color:var(--warm);border-radius:8px;padding:5px 12px;font-size:.75rem;cursor:pointer;font-weight:600">Restore</button></div>';
  } else if(customDessert){
    html+=renderCustomMeal(customDessert,'Final Meal');
  } else {
    var hasDessertSwap=Object.keys(window.ingredientSwaps||{}).some(function(k){return k.startsWith('fft_ingswap_'+i+'_dessert_');});
    var dessertCustomBadge=hasDessertSwap?'<span class="badge custom" style="margin-left:6px">Custom</span>':'';
    html+=mealCard('dessert','1–2 hrs after dinner · make this','Final Meal',dessertThumbHTML+dessertName+dessertCustomBadge,
      '<ul>'+dessertItems.map(function(x,idx){
        var gramsMatch=x.match(/(\d+)g/);
        var grams=gramsMatch?parseInt(gramsMatch[1]):100;
        var name=x.replace(/\d+g/,'').trim();
        return '<li style="display:flex;justify-content:space-between;align-items:center">'+
          '<span>'+formatIngredient(x)+'</span>'+
          '<button onclick="showIngredientSwap('+i+',\'dessert\','+idx+',\''+x.replace(/\x27/g,"\\'")+'\',\''+name.replace(/\x27/g,"\\'")+'\','+grams+')" style="background:none;border:none;color:var(--warm);font-size:.72rem;cursor:pointer;padding:2px 6px;font-weight:600;white-space:nowrap">swap</button>'+
        '</li>';
      }).join('')+'</ul>'+renderMacroBar(calcMealMacros(dessertItems),'bar')+dessertCookSteps+skipBtn('dessert'),dessertCal,true);
  }

  // Any other custom meals (not replacing a slot)
  customOther.forEach(function(m){html+=renderCustomMeal(m,'Extra');});

  if(isWknd&&isDrinking){
    html+='<div class="wknd-banner" style="margin-top:4px">Meals scaled down · Drink budget: <strong>~'+drinkReserve+' cal</strong>. Food: '+totalFoodCal+' cal. Total: ~'+(totalFoodCal+alcCal)+' cal.</div>';
  }

  // Recalculate total with custom meals replacing slots
  var customCal=0;
  if(customFirst){customCal+=customFirst.cal;if(!firstSkipped)totalFoodCal=totalFoodCal-firstCal+customFirst.cal;}
  if(customDinner){customCal+=customDinner.cal;if(!dinnerSkipped)totalFoodCal=totalFoodCal-dinnerCal+customDinner.cal;}
  if(customDessert){customCal+=customDessert.cal;if(!dessertSkipped)totalFoodCal=totalFoodCal-dessertCal+customDessert.cal;}
  customOther.forEach(function(m){customCal+=m.cal;totalFoodCal+=m.cal;});

  html+='<div style="font-size:.62rem;color:rgba(154,138,106,.6);margin-top:12px;padding:10px 0;border-top:1px solid rgba(184,150,60,.08);display:flex;gap:16px;letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-body)"><span>'+totalFoodCal+' cal'+(alcCal?' + '+alcCal+' drinks':'')+'</span><span style="color:rgba(184,150,60,.2)">·</span><span>'+daySteps.toLocaleString()+' steps'+(S.walkType==='incline'?' · '+S.incline+'% / '+S.speed+' mph':'')+'</span></div>';

  // Invisible coaching — completion state for today
  if(i===todayIdx){
    html+='<div style="margin-top:14px;padding:16px 20px;background:linear-gradient(135deg,rgba(240,230,208,.09),rgba(240,230,208,.05));border:1px solid rgba(184,150,60,.25);border-top:1px solid rgba(184,150,60,.4);border-radius:10px;font-size:.65rem;color:rgba(212,175,106,.9);letter-spacing:.14em;text-transform:uppercase;font-family:var(--font-body);font-weight:600;text-align:center;line-height:2">'+
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

// ── DINNER THEME SYSTEM ───────────────────────────────────────
// Single shared resolution path for "what is the active Main Meal for dayIdx?"
// Priority: customMeals → mealPrefs → dinnerTheme (family rotation) → template
//
// dinnerTheme stores a FAMILY KEY (e.g. 'taco-bowl'), not a meal key.
// The resolver picks the correct variant for this dayIdx by rotating through
// the family's lane-aware variant list: variants[dayIdx % variants.length]
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

  // 3. Weekly dinner theme — family rotation
  if (dinnerTheme && DINNER_THEME_FAMILIES && DINNER_THEME_FAMILIES[dinnerTheme]) {
    var family = DINNER_THEME_FAMILIES[dinnerTheme];
    var lane = (currentPlan && currentPlan.lane) ? currentPlan.lane : 'men_deficit';
    var variants = family.lanes[lane];
    if (variants && variants.length) {
      // Rotate through variants by day index
      var variantKey = variants[dayIdx % variants.length];
      var laneOpts = (SWAP_OPTIONS[lane] || SWAP_OPTIONS['men_deficit']).dinner || [];
      var opt = laneOpts.filter(function(o) { return o.key === variantKey; })[0];
      if (opt) {
        return {
          n: opt.name,
          k: opt.key,
          i: mealItemsToStrings(opt.items, 'raw'),
          c: opt.cal,
          _swapOpt: opt,
          _familyName: family.name,
          source: 'theme'
        };
      }
    }
    // Family exists but null for this lane — fall through to template
  }

  // 4. Template fallback
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

// Renders cooked weight plating guide — only raw/dry basis items, only when theme active.
// Skips same-basis condiments (salsa, seasoning, cheese, sauces) — not meaningful for plating.
function renderCookedWeightDisplay(swapOpt, effectiveScale) {
  if (!swapOpt || !swapOpt.items) return '';
  var lines = [];
  swapOpt.items.forEach(function(ing) {
    if (typeof ing !== 'object') return;
    if (ing.basis === 'same') return;
    var cookedG = Math.round((ing.cooked_grams || ing.grams) * effectiveScale);
    var itemName = ing.item.toLowerCase();
    var isWholeEgg = (itemName === 'whole eggs' || itemName === 'whole egg' || itemName === 'eggs' || itemName === 'egg');
    var isEggWhite = itemName.indexOf('white') >= 0;
    if (isWholeEgg && !isEggWhite) {
      lines.push(eggsGtoCount(cookedG));
    } else {
      lines.push(ing.item + ' ' + cookedG + 'g');
    }
  });
  if (!lines.length) return '';
  return '<div style="margin-top:10px;padding:10px 14px;background:rgba(184,150,60,.06);border-left:2px solid rgba(184,150,60,.35);border-radius:0 8px 8px 0">' +
    '<div style="font-size:.58rem;font-weight:700;color:var(--gold);letter-spacing:.14em;text-transform:uppercase;margin-bottom:5px;font-family:var(--font-body)">Your plate (cooked)</div>' +
    '<div style="font-size:.8rem;color:var(--t1);line-height:1.7">' + lines.join(' · ') + '</div>' +
  '</div>';
}

// Set or clear the weekly dinner theme. Stores family key, not meal key.
function setDinnerTheme(familyKey) {
  dinnerTheme = familyKey || null;
  try { localStorage.setItem('fft_dinner_theme', familyKey || ''); } catch(e) {}
  buildDashDayTabs();
  if (typeof buildDinnerThemeUI === 'function') buildDinnerThemeUI();
  var wgOverlay = document.getElementById('weekly-grid-overlay');
  if (wgOverlay && wgOverlay.style.display !== 'none' && typeof renderWeeklyGrid === 'function') {
    renderWeeklyGrid();
  }
}

function clearDinnerTheme() {
  dinnerTheme = null;
  try { localStorage.removeItem('fft_dinner_theme'); } catch(e) {}
  buildDashDayTabs();
  if (typeof buildDinnerThemeUI === 'function') buildDinnerThemeUI();
  var wgOverlay = document.getElementById('weekly-grid-overlay');
  if (wgOverlay && wgOverlay.style.display !== 'none' && typeof renderWeeklyGrid === 'function') {
    renderWeeklyGrid();
  }
}

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

// ── MEAL INSTRUCTIONS ─────────────────────────────────────────
// Structured cooking instructions for all six meal families.
// how_to_make: displayed now. batch_note: data layer only, not surfaced yet.

var MEAL_INSTRUCTIONS = {
  greek_yogurt_bowl_family: {
    berry_chia_bowl: {
      how_to_make: ['Add Greek yogurt to a bowl.','Top with blueberries and chia.','Drizzle honey over the top.','Stir or leave layered and serve cold.'],
      batch_note: 'Best made fresh. Pre-portion yogurt and toppings separately if prepping ahead.'
    },
    oats_berry_bowl: {
      how_to_make: ['Add Greek yogurt to a bowl.','Add oats and blueberries.','Drizzle honey over the top.','Stir and let sit 2–3 minutes if you want the oats softer.'],
      batch_note: 'Can be pre-portioned for 1–2 days. Keep fruit and honey separate for best texture.'
    },
    banana_honey_bowl: {
      how_to_make: ['Add Greek yogurt to a bowl.','Slice banana over the top.','Add honey and any oats if included.','Stir gently and serve cold.'],
      batch_note: 'Best made fresh so the banana stays at its best.'
    },
    banana_oat_nut_butter_bowl: {
      how_to_make: ['Add Greek yogurt to a bowl.','Add oats and sliced banana.','Top with peanut butter and honey.','Stir lightly or leave layered and serve.'],
      batch_note: 'Best made fresh. Pre-measure oats and peanut butter ahead to make assembly fast.'
    }
  },
  egg_potato_skillet_family: {
    classic_egg_potato_skillet: {
      how_to_make: ['Cook potatoes in a skillet until browned and tender.','Season with salt, pepper, and any simple seasoning.','Add eggs and/or egg whites to the pan.','Cook until set and serve hot.'],
      batch_note: 'Batch-cook potatoes separately, then reheat portions and add fresh eggs when serving.'
    },
    cheesy_egg_potato_skillet: {
      how_to_make: ['Cook potatoes in a skillet until browned and tender.','Add eggs and/or egg whites and cook until almost set.','Sprinkle cheese over the top.','Finish with salsa or serve as-is.'],
      batch_note: 'For family use, batch-cook potatoes first. Cook egg portions fresh for best texture.'
    },
    salsa_egg_potato_skillet: {
      how_to_make: ['Cook potatoes until browned and tender.','Add eggs and/or egg whites and cook through.','Top with salsa.','Serve hot.'],
      batch_note: 'Potatoes can be batch-cooked ahead. Add salsa after plating.'
    },
    loaded_egg_potato_skillet: {
      how_to_make: ['Cook potatoes in a skillet until browned and tender.','Add eggs and/or egg whites and cook until set.','Top with cheese and let it melt.','Finish with sour cream or salsa and serve hot.'],
      batch_note: 'Batch-cook potatoes ahead. Keep cheese and sour cream for final plating.'
    }
  },
  protein_bowl_family: {
    honey_soy_chicken_potato: {
      how_to_make: ['Boil or air-fry potatoes until tender, then mash with cheese, sour cream, salt, and pepper.','Cube and season chicken with salt, pepper, and garlic powder.','Add to a hot pan, let sit 1 minute, then cook over medium heat until done.','Add honey and soy sauce, cook on low 2–3 minutes, then pour over the mashed potatoes.'],
      batch_note: 'Batch-cook potatoes and chicken separately. Portion by cooked weight and add sauce when serving.'
    },
    beef_and_potatoes: {
      how_to_make: ['Boil or air-fry potatoes until tender, then mash with cheese, sour cream, salt, and pepper.','Cube and season beef with salt, pepper, and garlic powder.','Add to a hot pan, let sit 1 minute, then cook over medium heat, stirring until done.','Pour beef over the mashed potatoes.'],
      batch_note: 'Batch-cook potatoes and beef separately. Portion by cooked weight.'
    },
    honey_soy_salmon_potato: {
      how_to_make: ['Boil or air-fry potatoes until tender, then mash with cheese, sour cream, salt, and pepper.','Cube and season salmon with salt, pepper, and garlic powder while partially frozen.','Add to a hot pan, let sit 1 minute, then cook over medium heat, stirring until done.','Add honey and soy sauce, cook on low 2–3 minutes, then pour over the mashed potatoes.'],
      batch_note: 'Best when salmon is cooked fresh. Potatoes can be batch-cooked and reheated.'
    },
    honey_soy_chicken_bowl: {
      how_to_make: ['Cook rice separately.','Cook chicken until done and season lightly.','Add soy sauce and honey to the pan and coat the chicken.','Serve chicken over rice with optional vegetables.'],
      batch_note: 'Excellent for batch cooking. Cook chicken and rice separately, then portion by weight.'
    },
    beef_rice_bowl: {
      how_to_make: ['Cook rice separately.','Cook beef in a skillet and season with garlic, onion, salt, and pepper.','Add any light sauce if using.','Serve beef over rice.'],
      batch_note: 'Batch-cook beef and rice separately for the easiest family portioning.'
    },
    salmon_rice_bowl: {
      how_to_make: ['Cook rice separately.','Cook salmon until just done.','Finish with soy sauce, lemon-style glaze, or light seasoning.','Serve salmon over rice with optional vegetables.'],
      batch_note: 'Best cooked fresh or in smaller batches. Rice can be batch-cooked ahead.'
    },
    turkey_rice_bowl: {
      how_to_make: ['Cook rice separately.','Cook ground turkey in a skillet with seasoning until fully done.','Add salsa or a simple light sauce if using.','Serve turkey over rice.'],
      batch_note: 'Very batch-friendly. Cook turkey and rice separately, then portion by cooked weight.'
    }
  },
  taco_bowl_family: {
    chicken_taco_bowl: {
      how_to_make: ['Cook rice separately.','Cook chicken with taco seasoning until done.','Warm the beans.','Build the bowl with rice, beans, chicken, salsa, and any cheese.'],
      batch_note: 'Excellent family meal. Batch-cook chicken, rice, and beans separately, then assemble.'
    },
    ground_beef_taco_bowl: {
      how_to_make: ['Cook rice separately.','Brown the beef and season with taco seasoning.','Warm the beans.','Build the bowl with rice, beans, beef, salsa, and optional cheese.'],
      batch_note: 'Very batch-friendly. Keep salsa, cheese, and sour cream for final plating.'
    },
    turkey_taco_bowl: {
      how_to_make: ['Cook rice separately.','Cook ground turkey with taco seasoning until fully done.','Warm the beans.','Build the bowl with rice, beans, turkey, salsa, and optional cheese.'],
      batch_note: 'Great for batch prep. Portion turkey, rice, and beans separately for easy scaling.'
    },
    loaded_taco_bowl: {
      how_to_make: ['Cook rice separately.','Cook the protein with taco seasoning.','Warm the beans.','Build the bowl with rice, beans, protein, cheese, salsa, and sour cream.'],
      batch_note: 'Batch the base components first. Add toppings after plating so texture stays better.'
    },
    beef_taco_bowl: {
      how_to_make: ['Cook rice separately.','Brown the beef and season with taco seasoning until fully cooked.','Warm the beans.','Build the bowl with rice, beans, beef, salsa, and cheese.'],
      batch_note: 'Very batch-friendly. Batch beef, rice, and beans separately. Add salsa and cheese at serving time.'
    }
  },
  burger_bowl_family: {
    classic_burger_bowl: {
      how_to_make: ['Cook potatoes until browned and tender.','Cook the beef and season like a burger.','Add pickles and onion to the bowl or plate.','Finish with mustard and ketchup.'],
      batch_note: 'Batch-cook potatoes and beef separately. Add pickles, onion, and sauces at serving time.'
    },
    cheeseburger_bowl: {
      how_to_make: ['Cook potatoes until browned and tender.','Cook the beef and season well.','Add cheese while the beef is still hot so it melts.','Serve with pickles, onion, mustard, and ketchup.'],
      batch_note: 'Very batch-friendly. Add cheese and sauces during plating for best texture.'
    },
    burger_plate: {
      how_to_make: ['Cook burger patties until done.','Cook potatoes separately until browned and tender.','Plate the patties with potatoes on the side.','Add simple toppings and condiments.'],
      batch_note: 'Best when patties and potatoes are cooked separately and portioned by cooked weight.'
    },
    loaded_burger_bowl: {
      how_to_make: ['Cook potatoes until browned and tender.','Cook the beef and season like a burger.','Add cheese while hot.','Finish with pickles, onion, mustard, ketchup, and any additional controlled toppings.'],
      batch_note: 'Batch the beef and potatoes first. Add sauces and toppings after plating.'
    },
    turkey_burger_bowl: {
      how_to_make: ['Cook potatoes until browned and tender.','Cook ground turkey in a skillet and season like a burger — salt, pepper, garlic powder.','Add cheese while the turkey is still hot.','Serve with pickles, onion, mustard, and ketchup.'],
      batch_note: 'Batch-cook turkey and potatoes separately. Add cheese and condiments at plating time.'
    }
  },
  pasta_bowl_family: {
    chicken_red_sauce_pasta_bowl: {
      how_to_make: ['Cook pasta and drain.','Cook chicken until done and season lightly.','Warm the red sauce.','Combine pasta, chicken, and sauce, then finish with parmesan if using.'],
      batch_note: 'Batch-cook pasta and chicken separately when possible. Add sauce during final assembly.'
    },
    beef_pasta_bowl: {
      how_to_make: ['Cook pasta and drain.','Cook beef with garlic, onion, salt, and pepper.','Warm the red sauce.','Combine pasta, beef, and sauce, then finish with parmesan.'],
      batch_note: 'Very batch-friendly. Keep beef, pasta, and sauce separate until portioning if possible.'
    },
    turkey_pasta_bowl: {
      how_to_make: ['Cook pasta and drain.','Cook turkey with simple seasoning until done.','Warm the red sauce.','Combine pasta, turkey, and sauce, then finish with parmesan if using.'],
      batch_note: 'Great for batch prep. Portion pasta and turkey separately, then add sauce when serving.'
    },
    creamy_chicken_pasta_bowl: {
      how_to_make: ['Cook pasta and drain.','Cook chicken until done and season lightly.','Warm the light creamy sauce.','Combine pasta, chicken, and sauce, then finish with parmesan.'],
      batch_note: 'Best when sauce is added closer to serving time so the texture stays smooth.'
    }
  }
};

// Flat key map — SWAP_OPTIONS key → instruction variant
var MEAL_INSTRUCTIONS_MAP = {
  'oats-berry-bowl':       MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.oats_berry_bowl,
  'berry-chia-bowl':       MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.berry_chia_bowl,
  'banana-honey-bowl':     MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.banana_honey_bowl,
  'banana-oat-pb-bowl':    MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.banana_oat_nut_butter_bowl,
  'cottage-bowl':          MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.berry_chia_bowl,
  'cheesy-egg-potato':     MEAL_INSTRUCTIONS.egg_potato_skillet_family.cheesy_egg_potato_skillet,
  'salsa-egg-potato':      MEAL_INSTRUCTIONS.egg_potato_skillet_family.salsa_egg_potato_skillet,
  'loaded-egg-potato':     MEAL_INSTRUCTIONS.egg_potato_skillet_family.loaded_egg_potato_skillet,
  // Original Loftin potato-based meals
  'honey-soy-chicken':     MEAL_INSTRUCTIONS.protein_bowl_family.honey_soy_chicken_potato,
  'beef-and-potatoes':     MEAL_INSTRUCTIONS.protein_bowl_family.beef_and_potatoes,
  'honey-soy-salmon':      MEAL_INSTRUCTIONS.protein_bowl_family.honey_soy_salmon_potato,
  // Protein Bowl Family
  'chicken-bowl':          MEAL_INSTRUCTIONS.protein_bowl_family.honey_soy_chicken_bowl,
  'salmon-bowl':           MEAL_INSTRUCTIONS.protein_bowl_family.salmon_rice_bowl,
  'salmon-rice-bowl':      MEAL_INSTRUCTIONS.protein_bowl_family.salmon_rice_bowl,
  'beef-rice-bowl':        MEAL_INSTRUCTIONS.protein_bowl_family.beef_rice_bowl,
  'chicken-taco-bowl':     MEAL_INSTRUCTIONS.taco_bowl_family.chicken_taco_bowl,
  'turkey-taco-bowl':      MEAL_INSTRUCTIONS.taco_bowl_family.turkey_taco_bowl,
  'loaded-beef-taco':      MEAL_INSTRUCTIONS.taco_bowl_family.loaded_taco_bowl,
  'cheeseburger-bowl':     MEAL_INSTRUCTIONS.burger_bowl_family.cheeseburger_bowl,
  'classic-burger-bowl':   MEAL_INSTRUCTIONS.burger_bowl_family.classic_burger_bowl,
  'loaded-burger-bowl':    MEAL_INSTRUCTIONS.burger_bowl_family.loaded_burger_bowl,
  'beef-taco-bowl':        MEAL_INSTRUCTIONS.taco_bowl_family.beef_taco_bowl,
  'turkey-burger-bowl':    MEAL_INSTRUCTIONS.burger_bowl_family.turkey_burger_bowl,
  'chicken-pasta':         MEAL_INSTRUCTIONS.pasta_bowl_family.chicken_red_sauce_pasta_bowl,
  'turkey-pasta':          MEAL_INSTRUCTIONS.pasta_bowl_family.turkey_pasta_bowl,
  'beef-pasta':            MEAL_INSTRUCTIONS.pasta_bowl_family.beef_pasta_bowl,
  'creamy-chicken-pasta':  MEAL_INSTRUCTIONS.pasta_bowl_family.creamy_chicken_pasta_bowl,
  'yogurt-honey-bowl':     MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.berry_chia_bowl,
  'ricotta-bowl':          null,
  'cookies':               null,
};

function renderHowToMake(variant) {
  if (!variant || !variant.how_to_make || !variant.how_to_make.length) return '';
  var inner = variant.how_to_make.map(function(step, idx) {
    return '<div style="display:flex;gap:10px;padding:4px 0;border-bottom:1px solid rgba(184,150,60,.06)">' +
      '<div style="font-size:.75rem;font-weight:700;color:var(--gold);min-width:16px;flex-shrink:0">' + (idx+1) + '.</div>' +
      '<div style="font-size:.80rem;color:var(--t2);line-height:1.5">' + step + '</div>' +
    '</div>';
  }).join('');
  return '<div class="coach-note" style="margin-top:8px"><strong>How to make:</strong><div style="margin-top:6px">' + inner + '</div></div>';
}

function getMealInstructions(mealKey, proteinFallback) {
  if (mealKey && MEAL_INSTRUCTIONS_MAP.hasOwnProperty(mealKey)) {
    var variant = MEAL_INSTRUCTIONS_MAP[mealKey];
    if (variant) return renderHowToMake(variant);
    return '';
  }
  if (typeof getCookSteps === 'function') return getCookSteps(proteinFallback || '');
  return '';
}

var SWAP_OPTIONS={

  // ═══════════════════════════════════════════════════════════
  // MEN'S DEFICIT ✅
  // ~1800 cal target | First 27.5% | Main 52.5% | Final 20%
  // High satiety, high protein, savory bias, disciplined meals
  // ═══════════════════════════════════════════════════════════
  men_deficit:{
    first:[

      // ── Greek Yogurt Bowl Family ──
      {key:'oats-berry-bowl', name:'Oats & Berry Bowl', img:'food-yogurt.png', cal:426,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:350, cooked_grams:350},
          {item:'Oats',                basis:'same', grams:30,  cooked_grams:30},
          {item:'Blueberries',         basis:'same', grams:100, cooked_grams:100},
          {item:'Honey',               basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'cottage-bowl', name:'Cottage Cheese Bowl', img:'food-cottage.png', cal:452,
        items:[
          {item:'Cottage cheese', basis:'same', grams:400, cooked_grams:400},
          {item:'Blueberries',    basis:'same', grams:75,  cooked_grams:75},
          {item:'Chia seeds',     basis:'same', grams:15,  cooked_grams:15},
          {item:'Honey',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Egg & Potato Skillet Family ──
      // cheesy-egg-potato: eggs + potatoes + cheese + sour cream — rich, satisfying
      // salsa-egg-potato:  eggs + egg whites + potatoes + salsa — lighter, fresher, same cal tier
      {key:'cheesy-egg-potato', name:'Egg & Potato Skillet', img:'food-eggs.png', cal:569,
        items:[
          {item:'Whole eggs',  basis:'raw',  grams:200, cooked_grams:180, count:4},
          {item:'Potatoes',    basis:'raw',  grams:250, cooked_grams:212},
          {item:'Cheese',      basis:'same', grams:23,  cooked_grams:23},
          {item:'Sour cream',  basis:'same', grams:30,  cooked_grams:30},
        ]},

      {key:'salsa-egg-potato', name:'Salsa Egg & Potato Skillet', img:'food-eggs.png', cal:571,
        items:[
          {item:'Whole eggs',  basis:'raw',  grams:100, cooked_grams:90,  count:2},
          {item:'Egg whites',  basis:'raw',  grams:300, cooked_grams:276},
          {item:'Potatoes',    basis:'raw',  grams:300, cooked_grams:255},
          {item:'Cheese',      basis:'same', grams:20,  cooked_grams:20},
          {item:'Salsa',       basis:'same', grams:60,  cooked_grams:60},
        ]},

    ],
    dinner:[

      // ── Original Loftin Potato-Based Meals (plan template defaults) ──
      {key:'honey-soy-chicken', name:'Honey Soy Chicken', img:'food-chicken.png', cal:719,
        items:[
          {item:'Chicken breast', basis:'raw',  grams:227, cooked_grams:170},
          {item:'Potatoes',       basis:'raw',  grams:240, cooked_grams:204},
          {item:'Cheese',         basis:'same', grams:25,  cooked_grams:25},
          {item:'Sour cream',     basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',          basis:'same', grams:40,  cooked_grams:40},
          {item:'Soy sauce',      basis:'same', grams:36,  cooked_grams:36},
        ]},

      {key:'beef-and-potatoes', name:'Beef & Potatoes', img:'food-beef.png', cal:673,
        items:[
          {item:'Beef sirloin', basis:'raw',  grams:250, cooked_grams:188},
          {item:'Potatoes',     basis:'raw',  grams:220, cooked_grams:187},
          {item:'Cheese',       basis:'same', grams:25,  cooked_grams:25},
          {item:'Sour cream',   basis:'same', grams:20,  cooked_grams:20},
        ]},

      {key:'honey-soy-salmon', name:'Honey Soy Salmon', img:'food-salmon.png', cal:810,
        items:[
          {item:'Salmon',     basis:'raw',  grams:200, cooked_grams:170},
          {item:'Potatoes',   basis:'raw',  grams:260, cooked_grams:221},
          {item:'Cheese',     basis:'same', grams:25,  cooked_grams:25},
          {item:'Sour cream', basis:'same', grams:25,  cooked_grams:25},
          {item:'Honey',      basis:'same', grams:40,  cooked_grams:40},
          {item:'Soy sauce',  basis:'same', grams:36,  cooked_grams:36},
        ]},

      // ── Protein Bowl Family ──
      {key:'chicken-bowl', name:'Honey Soy Chicken Bowl', img:'food-chicken.png', cal:585,
        items:[
          {item:'Chicken breast', basis:'raw',  grams:220, cooked_grams:165},
          {item:'White rice',     basis:'dry',  grams:60,  cooked_grams:180},
          {item:'Soy sauce',      basis:'same', grams:25,  cooked_grams:25},
          {item:'Honey',          basis:'same', grams:15,  cooked_grams:15},
          {item:'Broccoli / veg', basis:'same', grams:100, cooked_grams:100},
        ]},

      {key:'salmon-bowl', name:'Salmon Rice Bowl', img:'food-salmon.png', cal:525,
        items:[
          {item:'Salmon',     basis:'raw',  grams:160, cooked_grams:136},
          {item:'White rice', basis:'dry',  grams:47,  cooked_grams:141},
          {item:'Soy sauce',  basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',      basis:'same', grams:10,  cooked_grams:10},
          {item:'Veg',        basis:'same', grams:90,  cooked_grams:90},
        ]},

      // ── Taco Bowl Family ──
      {key:'chicken-taco-bowl', name:'Chicken Taco Bowl', img:'food-chicken.png', cal:653,
        items:[
          {item:'Chicken breast',  basis:'raw',  grams:220, cooked_grams:165},
          {item:'White rice',      basis:'dry',  grams:50,  cooked_grams:150},
          {item:'Black beans',     basis:'same', grams:100, cooked_grams:100},
          {item:'Taco seasoning',  basis:'same', grams:9,   cooked_grams:9},
          {item:'Salsa',           basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Burger Bowl Family ──
      {key:'cheeseburger-bowl', name:'Cheeseburger Bowl', img:'food-beef.png', cal:612,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:200, cooked_grams:150},
          {item:'Potatoes',         basis:'raw',  grams:250, cooked_grams:212},
          {item:'Cheese',           basis:'same', grams:20,  cooked_grams:20},
          {item:'Pickles',          basis:'same', grams:30,  cooked_grams:30},
          {item:'Onion',            basis:'same', grams:30,  cooked_grams:30},
          {item:'Mustard',          basis:'same', grams:15,  cooked_grams:15},
          {item:'Ketchup',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Pasta Bowl Family ──
      {key:'chicken-pasta', name:'Chicken Red Sauce Pasta', img:'food-chicken.png', cal:702,
        items:[
          {item:'Chicken breast',        basis:'raw',  grams:220, cooked_grams:165},
          {item:'Pasta',                 basis:'dry',  grams:78,  cooked_grams:179},
          {item:'Red sauce (marinara)',   basis:'same', grams:120, cooked_grams:120},
          {item:'Parmesan',              basis:'same', grams:10,  cooked_grams:10},
          {item:'Italian seasoning',     basis:'same', grams:4,   cooked_grams:4},
        ]},

      // ── Taco Bowl Family — additional variants ──
      {key:'turkey-taco-bowl', theme:true, name:'Turkey Taco Bowl', img:'food-turkey.png', cal:677,
        items:[
          {item:'Ground turkey',  basis:'raw',  grams:175, cooked_grams:137},
          {item:'White rice',     basis:'dry',  grams:48,  cooked_grams:144},
          {item:'Black beans',    basis:'same', grams:100, cooked_grams:100},
          {item:'Taco seasoning', basis:'same', grams:9,   cooked_grams:9},
          {item:'Salsa',          basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',         basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'beef-taco-bowl', theme:true, name:'Beef Taco Bowl', img:'food-beef.png', cal:702,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:160, cooked_grams:120},
          {item:'White rice',       basis:'dry',  grams:47,  cooked_grams:141},
          {item:'Black beans',      basis:'same', grams:100, cooked_grams:100},
          {item:'Taco seasoning',   basis:'same', grams:9,   cooked_grams:9},
          {item:'Salsa',            basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',           basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Burger Bowl Family — additional variants ──
      {key:'turkey-burger-bowl', theme:true, name:'Turkey Burger Bowl', img:'food-turkey.png', cal:730,
        items:[
          {item:'Ground turkey', basis:'raw',  grams:220, cooked_grams:172},
          {item:'Potatoes',      basis:'raw',  grams:250, cooked_grams:212},
          {item:'Cheese',        basis:'same', grams:20,  cooked_grams:20},
          {item:'Pickles',       basis:'same', grams:30,  cooked_grams:30},
          {item:'Onion',         basis:'same', grams:30,  cooked_grams:30},
          {item:'Mustard',       basis:'same', grams:15,  cooked_grams:15},
          {item:'Ketchup',       basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'classic-burger-bowl', theme:true, name:'Classic Burger Bowl', img:'food-beef.png', cal:592,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:180, cooked_grams:135},
          {item:'Potatoes',         basis:'raw',  grams:240, cooked_grams:204},
          {item:'Cheese',           basis:'same', grams:15,  cooked_grams:15},
          {item:'Pickles',          basis:'same', grams:25,  cooked_grams:25},
          {item:'Onion',            basis:'same', grams:25,  cooked_grams:25},
          {item:'Mustard',          basis:'same', grams:12,  cooked_grams:12},
          {item:'Ketchup',          basis:'same', grams:12,  cooked_grams:12},
        ]},

      // ── Pasta Bowl Family — swap library only (theme:false) ──
      {key:'turkey-pasta', name:'Turkey Pasta Bowl', img:'food-turkey.png', cal:797,
        items:[
          {item:'Ground turkey',       basis:'raw',  grams:210, cooked_grams:164},
          {item:'Pasta',               basis:'dry',  grams:72,  cooked_grams:166},
          {item:'Red sauce (marinara)', basis:'same', grams:120, cooked_grams:120},
          {item:'Parmesan',            basis:'same', grams:10,  cooked_grams:10},
          {item:'Italian seasoning',   basis:'same', grams:4,   cooked_grams:4},
        ]},

      {key:'beef-pasta', name:'Beef Pasta Bowl', img:'food-beef.png', cal:825,
        items:[
          {item:'Lean beef',           basis:'raw',  grams:200, cooked_grams:150},
          {item:'Pasta',               basis:'dry',  grams:75,  cooked_grams:172},
          {item:'Red sauce (marinara)', basis:'same', grams:120, cooked_grams:120},
          {item:'Parmesan',            basis:'same', grams:10,  cooked_grams:10},
          {item:'Italian seasoning',   basis:'same', grams:4,   cooked_grams:4},
        ]},

    ],
    dessert:[

      // ── Greek Yogurt Bowl Family ──
      {key:'berry-chia-bowl', name:'Berry Chia Bowl', img:'food-yogurt.png', cal:313,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Blueberries',         basis:'same', grams:100, cooked_grams:100},
          {item:'Chia seeds',          basis:'same', grams:10,  cooked_grams:10},
          {item:'Honey',               basis:'same', grams:10,  cooked_grams:10},
        ]},

      {key:'ricotta-bowl', name:'Ricotta Bowl', img:'food-ricotta.png', cal:432,
        items:[
          {item:'Ricotta',     basis:'same', grams:200, cooked_grams:200},
          {item:'Blueberries', basis:'same', grams:75,  cooked_grams:75},
          {item:'Honey',       basis:'same', grams:25,  cooked_grams:25},
        ]},

      {key:'cookies', name:'Cookies', img:'food-cookies.png', cal:443,
        items:[
          {item:'Cookies (or chocolate bar 60g)', basis:'same', grams:70, cooked_grams:70},
        ]},

    ],
  },

  // ═══════════════════════════════════════════════════════════
  // WOMEN'S DEFICIT ✅
  // ~1500 cal target | First 27.5% | Main 52.5% | Final 20%
  // High protein, high compliance, moderate volume, clean and repeatable
  // ═══════════════════════════════════════════════════════════
  women_deficit:{
    first:[

      // ── Greek Yogurt Bowl Family ──
      {key:'berry-chia-bowl', name:'Berry Chia Bowl', img:'food-yogurt.png', cal:297,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Blueberries',         basis:'same', grams:90,  cooked_grams:90},
          {item:'Chia seeds',          basis:'same', grams:8,   cooked_grams:8},
          {item:'Honey',               basis:'same', grams:10,  cooked_grams:10},
        ]},

      {key:'oats-berry-bowl', name:'Oats & Berry Bowl', img:'food-yogurt.png', cal:302,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:250, cooked_grams:250},
          {item:'Oats',                basis:'same', grams:20,  cooked_grams:20},
          {item:'Blueberries',         basis:'same', grams:80,  cooked_grams:80},
          {item:'Honey',               basis:'same', grams:10,  cooked_grams:10},
        ]},

      // ── Egg & Potato Skillet Family ──
      {key:'salsa-egg-potato', name:'Salsa Egg & Potato Skillet', img:'food-eggs.png', cal:370,
        items:[
          {item:'Whole eggs',  basis:'raw',  grams:50,  cooked_grams:45,  count:1},
          {item:'Egg whites',  basis:'raw',  grams:220, cooked_grams:202},
          {item:'Potatoes',    basis:'raw',  grams:180, cooked_grams:153},
          {item:'Cheese',      basis:'same', grams:15,  cooked_grams:15},
          {item:'Salsa',       basis:'same', grams:60,  cooked_grams:60},
        ]},

    ],
    dinner:[

      // ── Protein Bowl Family ──
      {key:'salmon-rice-bowl', name:'Salmon Rice Bowl', img:'food-salmon.png', cal:525,
        items:[
          {item:'Salmon',     basis:'raw',  grams:160, cooked_grams:136},
          {item:'White rice', basis:'dry',  grams:47,  cooked_grams:141},
          {item:'Soy sauce',  basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',      basis:'same', grams:10,  cooked_grams:10},
          {item:'Veg',        basis:'same', grams:90,  cooked_grams:90},
        ]},

      {key:'chicken-bowl', name:'Honey Soy Chicken Bowl', img:'food-chicken.png', cal:538,
        items:[
          {item:'Chicken breast', basis:'raw',  grams:180, cooked_grams:135},
          {item:'White rice',     basis:'dry',  grams:63,  cooked_grams:189},
          {item:'Soy sauce',      basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',          basis:'same', grams:15,  cooked_grams:15},
          {item:'Veg',            basis:'same', grams:80,  cooked_grams:80},
        ]},

      // ── Taco Bowl Family ──
      {key:'turkey-taco-bowl', name:'Turkey Taco Bowl', img:'food-turkey.png', cal:559,
        items:[
          {item:'Ground turkey',  basis:'raw',  grams:170, cooked_grams:133},
          {item:'White rice',     basis:'dry',  grams:40,  cooked_grams:120},
          {item:'Black beans',    basis:'same', grams:80,  cooked_grams:80},
          {item:'Taco seasoning', basis:'same', grams:8,   cooked_grams:8},
          {item:'Salsa',          basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',         basis:'same', grams:11,  cooked_grams:11},
        ]},

      // ── Burger Bowl Family ──
      {key:'classic-burger-bowl', name:'Classic Burger Bowl', img:'food-beef.png', cal:472,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:160, cooked_grams:120},
          {item:'Potatoes',         basis:'raw',  grams:180, cooked_grams:153},
          {item:'Cheese',           basis:'same', grams:15,  cooked_grams:15},
          {item:'Pickles',          basis:'same', grams:25,  cooked_grams:25},
          {item:'Onion',            basis:'same', grams:25,  cooked_grams:25},
          {item:'Mustard',          basis:'same', grams:12,  cooked_grams:12},
          {item:'Ketchup',          basis:'same', grams:10,  cooked_grams:10},
        ]},

      // ── Pasta Bowl Family ──
      {key:'turkey-pasta', name:'Turkey Pasta Bowl', img:'food-turkey.png', cal:595,
        items:[
          {item:'Ground turkey',       basis:'raw',  grams:170, cooked_grams:133},
          {item:'Pasta',               basis:'dry',  grams:61,  cooked_grams:140},
          {item:'Red sauce (marinara)', basis:'same', grams:100, cooked_grams:100},
          {item:'Parmesan',            basis:'same', grams:8,   cooked_grams:8},
          {item:'Italian seasoning',   basis:'same', grams:4,   cooked_grams:4},
        ]},

    ],
    dessert:[

      // ── Greek Yogurt Bowl Family ──
      {key:'oats-berry-bowl', name:'Oats & Berry Bowl', img:'food-yogurt.png', cal:302,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:250, cooked_grams:250},
          {item:'Oats',                basis:'same', grams:20,  cooked_grams:20},
          {item:'Blueberries',         basis:'same', grams:80,  cooked_grams:80},
          {item:'Honey',               basis:'same', grams:10,  cooked_grams:10},
        ]},

      {key:'berry-chia-bowl', name:'Berry Chia Bowl', img:'food-yogurt.png', cal:297,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Blueberries',         basis:'same', grams:90,  cooked_grams:90},
          {item:'Chia seeds',          basis:'same', grams:8,   cooked_grams:8},
          {item:'Honey',               basis:'same', grams:10,  cooked_grams:10},
        ]},

    ],
  },

  // ═══════════════════════════════════════════════════════════
  // MEN'S SURPLUS ✅
  // ~2200 cal target | First 30% | Main 40% | Final 30%
  // High protein, denser meals, calorie-efficient, easy to finish
  // ═══════════════════════════════════════════════════════════
  men_surplus:{
    first:[

      // ── Greek Yogurt Bowl Family ──
      {key:'banana-honey-bowl', name:'Banana Honey Bowl', img:'food-yogurt.png', cal:502,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:350, cooked_grams:350},
          {item:'Banana',          basis:'same', grams:120, cooked_grams:120},
          {item:'Honey',           basis:'same', grams:20,  cooked_grams:20},
          {item:'Oats',            basis:'same', grams:20,  cooked_grams:20},
        ]},

      // ── Egg & Potato Skillet Family ──
      {key:'loaded-egg-potato', name:'Loaded Egg & Potato Skillet', img:'food-eggs.png', cal:633,
        items:[
          {item:'Whole eggs',  basis:'raw',  grams:150, cooked_grams:135, count:3},
          {item:'Egg whites',  basis:'raw',  grams:200, cooked_grams:184},
          {item:'Potatoes',    basis:'raw',  grams:300, cooked_grams:255},
          {item:'Cheese',      basis:'same', grams:25,  cooked_grams:25},
          {item:'Sour cream',  basis:'same', grams:25,  cooked_grams:25},
        ]},

    ],
    dinner:[

      // ── Protein Bowl Family ──
      {key:'beef-rice-bowl', name:'Beef Rice Bowl', img:'food-beef.png', cal:732,
        items:[
          {item:'Beef sirloin', basis:'raw',  grams:220, cooked_grams:165},
          {item:'White rice',   basis:'dry',  grams:80,  cooked_grams:240},
          {item:'Olive oil',    basis:'same', grams:10,  cooked_grams:10},
          {item:'Soy sauce',    basis:'same', grams:18,  cooked_grams:18},
        ]},

      // ── Taco Bowl Family ──
      {key:'loaded-beef-taco', name:'Loaded Beef Taco Bowl', img:'food-beef.png', cal:915,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:220, cooked_grams:165},
          {item:'White rice',       basis:'dry',  grams:70,  cooked_grams:210},
          {item:'Black beans',      basis:'same', grams:120, cooked_grams:120},
          {item:'Taco seasoning',   basis:'same', grams:10,  cooked_grams:10},
          {item:'Salsa',            basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',           basis:'same', grams:25,  cooked_grams:25},
          {item:'Sour cream',       basis:'same', grams:20,  cooked_grams:20},
        ]},

      // ── Burger Bowl Family ──
      {key:'loaded-burger-bowl', name:'Loaded Burger Bowl', img:'food-beef.png', cal:748,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:240, cooked_grams:180},
          {item:'Potatoes',         basis:'raw',  grams:320, cooked_grams:272},
          {item:'Cheese',           basis:'same', grams:25,  cooked_grams:25},
          {item:'Pickles',          basis:'same', grams:30,  cooked_grams:30},
          {item:'Onion',            basis:'same', grams:30,  cooked_grams:30},
          {item:'Mustard',          basis:'same', grams:15,  cooked_grams:15},
          {item:'Ketchup',          basis:'same', grams:20,  cooked_grams:20},
        ]},

      // ── Pasta Bowl Family ──
      {key:'beef-pasta', name:'Beef Pasta Bowl', img:'food-beef.png', cal:947,
        items:[
          {item:'Lean beef',           basis:'raw',  grams:220, cooked_grams:165},
          {item:'Pasta',               basis:'dry',  grams:104, cooked_grams:239},
          {item:'Red sauce (marinara)', basis:'same', grams:140, cooked_grams:140},
          {item:'Parmesan',            basis:'same', grams:15,  cooked_grams:15},
          {item:'Olive oil',           basis:'same', grams:6,   cooked_grams:6},
        ]},

    ],
    dessert:[

      // ── Greek Yogurt Bowl Family ──
      {key:'banana-oat-pb-bowl', name:'Banana Oat Nut Butter Bowl', img:'food-yogurt.png', cal:659,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:350, cooked_grams:350},
          {item:'Oats',            basis:'same', grams:40,  cooked_grams:40},
          {item:'Banana',          basis:'same', grams:120, cooked_grams:120},
          {item:'Peanut butter',   basis:'same', grams:16,  cooked_grams:16},
          {item:'Honey',           basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'banana-honey-bowl', name:'Banana Honey Bowl', img:'food-yogurt.png', cal:502,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:350, cooked_grams:350},
          {item:'Banana',          basis:'same', grams:120, cooked_grams:120},
          {item:'Honey',           basis:'same', grams:20,  cooked_grams:20},
          {item:'Oats',            basis:'same', grams:20,  cooked_grams:20},
        ]},

    ],
  },

  // ═══════════════════════════════════════════════════════════
  // WOMEN'S SURPLUS ✅
  // ~1800 cal target | First 30% | Main 40% | Final 30%
  // High protein, moderate volume, appetite-friendly density
  // ═══════════════════════════════════════════════════════════
  women_surplus:{
    first:[

      // ── Greek Yogurt Bowl Family ──
      {key:'oats-berry-bowl', name:'Oats & Berry Bowl', img:'food-yogurt.png', cal:439,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Oats',            basis:'same', grams:30,  cooked_grams:30},
          {item:'Blueberries',     basis:'same', grams:100, cooked_grams:100},
          {item:'Honey',           basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'banana-honey-bowl', name:'Banana Honey Bowl', img:'food-yogurt.png', cal:413,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Banana',          basis:'same', grams:100, cooked_grams:100},
          {item:'Honey',           basis:'same', grams:15,  cooked_grams:15},
          {item:'Peanut butter',   basis:'same', grams:10,  cooked_grams:10},
        ]},

      // ── Egg & Potato Skillet Family ──
      // cheesy-egg-potato: matches plan template (eggs + potatoes + cheese + sour cream)
      // loaded-egg-potato: egg-whites variant — distinct heavier meal
      {key:'cheesy-egg-potato', name:'Egg & Potato Skillet', img:'food-eggs.png', cal:540,
        items:[
          {item:'Whole eggs',  basis:'raw',  grams:200, cooked_grams:180, count:4},
          {item:'Potatoes',    basis:'raw',  grams:220, cooked_grams:187},
          {item:'Cheese',      basis:'same', grams:20,  cooked_grams:20},
          {item:'Sour cream',  basis:'same', grams:25,  cooked_grams:25},
        ]},

    ],
    dinner:[

      // ── Protein Bowl Family ──
      {key:'chicken-bowl', name:'Honey Soy Chicken Bowl', img:'food-chicken.png', cal:538,
        items:[
          {item:'Chicken breast', basis:'raw',  grams:180, cooked_grams:135},
          {item:'White rice',     basis:'dry',  grams:63,  cooked_grams:189},
          {item:'Soy sauce',      basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',          basis:'same', grams:15,  cooked_grams:15},
          {item:'Veg',            basis:'same', grams:80,  cooked_grams:80},
        ]},

      // ── Taco Bowl Family ──
      {key:'chicken-taco-bowl', name:'Chicken Taco Bowl', img:'food-chicken.png', cal:627,
        items:[
          {item:'Chicken breast',  basis:'raw',  grams:180, cooked_grams:135},
          {item:'White rice',      basis:'dry',  grams:57,  cooked_grams:171},
          {item:'Black beans',     basis:'same', grams:100, cooked_grams:100},
          {item:'Taco seasoning',  basis:'same', grams:8,   cooked_grams:8},
          {item:'Salsa',           basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Burger Bowl Family ──
      {key:'cheeseburger-bowl', name:'Cheeseburger Bowl', img:'food-beef.png', cal:569,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:180, cooked_grams:135},
          {item:'Potatoes',         basis:'raw',  grams:240, cooked_grams:204},
          {item:'Cheese',           basis:'same', grams:20,  cooked_grams:20},
          {item:'Pickles',          basis:'same', grams:25,  cooked_grams:25},
          {item:'Onion',            basis:'same', grams:25,  cooked_grams:25},
          {item:'Mustard',          basis:'same', grams:12,  cooked_grams:12},
          {item:'Ketchup',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Pasta Bowl Family ──
      {key:'creamy-chicken-pasta', theme:true, name:'Creamy Chicken Pasta Bowl', img:'food-chicken.png', cal:694,
        items:[
          {item:'Chicken breast',     basis:'raw',  grams:180, cooked_grams:135},
          {item:'Pasta',              basis:'dry',  grams:83,  cooked_grams:191},
          {item:'Light creamy sauce', basis:'same', grams:110, cooked_grams:110},
          {item:'Parmesan',           basis:'same', grams:12,  cooked_grams:12},
          {item:'Italian seasoning',  basis:'same', grams:4,   cooked_grams:4},
        ]},

      // ── Taco Bowl Family — additional variants ──
      {key:'turkey-taco-bowl', theme:true, name:'Turkey Taco Bowl', img:'food-turkey.png', cal:689,
        items:[
          {item:'Ground turkey',  basis:'raw',  grams:170, cooked_grams:133},
          {item:'White rice',     basis:'dry',  grams:53,  cooked_grams:159},
          {item:'Black beans',    basis:'same', grams:90,  cooked_grams:90},
          {item:'Taco seasoning', basis:'same', grams:8,   cooked_grams:8},
          {item:'Salsa',          basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',         basis:'same', grams:12,  cooked_grams:12},
        ]},

      {key:'beef-taco-bowl', theme:true, name:'Beef Taco Bowl', img:'food-beef.png', cal:696,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:160, cooked_grams:120},
          {item:'White rice',       basis:'dry',  grams:52,  cooked_grams:156},
          {item:'Black beans',      basis:'same', grams:90,  cooked_grams:90},
          {item:'Taco seasoning',   basis:'same', grams:8,   cooked_grams:8},
          {item:'Salsa',            basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',           basis:'same', grams:12,  cooked_grams:12},
        ]},

      // ── Burger Bowl Family — additional variants ──
      {key:'turkey-burger-bowl', theme:true, name:'Turkey Burger Bowl', img:'food-turkey.png', cal:669,
        items:[
          {item:'Ground turkey', basis:'raw',  grams:190, cooked_grams:148},
          {item:'Potatoes',      basis:'raw',  grams:260, cooked_grams:221},
          {item:'Cheese',        basis:'same', grams:18,  cooked_grams:18},
          {item:'Pickles',       basis:'same', grams:25,  cooked_grams:25},
          {item:'Onion',         basis:'same', grams:25,  cooked_grams:25},
          {item:'Mustard',       basis:'same', grams:12,  cooked_grams:12},
          {item:'Ketchup',       basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'classic-burger-bowl', theme:true, name:'Classic Burger Bowl', img:'food-beef.png', cal:660,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:175, cooked_grams:131},
          {item:'Potatoes',         basis:'raw',  grams:260, cooked_grams:221},
          {item:'Cheese',           basis:'same', grams:15,  cooked_grams:15},
          {item:'Pickles',          basis:'same', grams:25,  cooked_grams:25},
          {item:'Onion',            basis:'same', grams:25,  cooked_grams:25},
          {item:'Mustard',          basis:'same', grams:12,  cooked_grams:12},
          {item:'Ketchup',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Pasta Bowl Family — additional variants ──
      {key:'chicken-pasta', theme:true, name:'Chicken Red Sauce Pasta', img:'food-chicken.png', cal:688,
        items:[
          {item:'Chicken breast',        basis:'raw',  grams:160, cooked_grams:120},
          {item:'Pasta',                 basis:'dry',  grams:78,  cooked_grams:179},
          {item:'Red sauce (marinara)',   basis:'same', grams:110, cooked_grams:110},
          {item:'Parmesan',              basis:'same', grams:12,  cooked_grams:12},
          {item:'Italian seasoning',     basis:'same', grams:4,   cooked_grams:4},
        ]},

      {key:'turkey-pasta', theme:true, name:'Turkey Pasta Bowl', img:'food-turkey.png', cal:697,
        items:[
          {item:'Ground turkey',         basis:'raw',  grams:150, cooked_grams:117},
          {item:'Pasta',                 basis:'dry',  grams:75,  cooked_grams:172},
          {item:'Red sauce (marinara)',   basis:'same', grams:110, cooked_grams:110},
          {item:'Parmesan',              basis:'same', grams:12,  cooked_grams:12},
          {item:'Italian seasoning',     basis:'same', grams:4,   cooked_grams:4},
        ]},

      {key:'beef-pasta', theme:true, name:'Beef Pasta Bowl', img:'food-beef.png', cal:712,
        items:[
          {item:'Lean beef',             basis:'raw',  grams:150, cooked_grams:112},
          {item:'Pasta',                 basis:'dry',  grams:72,  cooked_grams:166},
          {item:'Red sauce (marinara)',   basis:'same', grams:110, cooked_grams:110},
          {item:'Parmesan',              basis:'same', grams:12,  cooked_grams:12},
          {item:'Italian seasoning',     basis:'same', grams:4,   cooked_grams:4},
        ]},

      // ── Protein Bowl Family — additional variants ──
      {key:'salmon-bowl', theme:true, name:'Salmon Rice Bowl', img:'food-salmon.png', cal:681,
        items:[
          {item:'Salmon',     basis:'raw',  grams:185, cooked_grams:157},
          {item:'White rice', basis:'dry',  grams:62,  cooked_grams:186},
          {item:'Soy sauce',  basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',      basis:'same', grams:10,  cooked_grams:10},
          {item:'Veg',        basis:'same', grams:80,  cooked_grams:80},
        ]},

      {key:'beef-rice-bowl', theme:true, name:'Beef Rice Bowl', img:'food-beef.png', cal:697,
        items:[
          {item:'Beef sirloin', basis:'raw',  grams:175, cooked_grams:131},
          {item:'White rice',   basis:'dry',  grams:65,  cooked_grams:195},
          {item:'Soy sauce',    basis:'same', grams:18,  cooked_grams:18},
          {item:'Olive oil',    basis:'same', grams:10,  cooked_grams:10},
        ]},

    ],
    dessert:[

      // ── Greek Yogurt Bowl Family ──
      {key:'banana-honey-bowl', name:'Banana Honey Bowl', img:'food-yogurt.png', cal:413,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Banana',          basis:'same', grams:100, cooked_grams:100},
          {item:'Honey',           basis:'same', grams:15,  cooked_grams:15},
          {item:'Peanut butter',   basis:'same', grams:10,  cooked_grams:10},
        ]},

      {key:'oats-berry-bowl', name:'Oats & Berry Bowl', img:'food-yogurt.png', cal:439,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Oats',            basis:'same', grams:30,  cooked_grams:30},
          {item:'Blueberries',     basis:'same', grams:100, cooked_grams:100},
          {item:'Honey',           basis:'same', grams:15,  cooked_grams:15},
        ]},

    ],
  },

};

// ── DINNER THEME FAMILIES ─────────────────────────────────────
// Maps family keys to their lane-aware variant arrays.
// dinnerTheme stores a family key (e.g. 'taco-bowl'), not a meal key.
// Rotation: variants[dayIdx % variants.length] — natural variety across the week.
//
// null for a lane = family not valid for that lane (not shown in selector).
// uiVisible:false = in architecture for future use, not shown in v1 selector.
//
// Variant order within each lane array determines weekly rotation.
// Put the most family-friendly / most neutral variant first.

var DINNER_THEME_FAMILIES = {

  'taco-bowl': {
    name: 'Taco Bowl Week',
    img: 'food-chicken.png',
    uiVisible: true,
    lanes: {
      men_deficit:   ['chicken-taco-bowl', 'turkey-taco-bowl', 'beef-taco-bowl'],
      women_deficit: ['chicken-taco-bowl', 'turkey-taco-bowl'],
      men_surplus:   ['loaded-beef-taco', 'chicken-taco-bowl'],
      women_surplus: ['chicken-taco-bowl', 'turkey-taco-bowl', 'beef-taco-bowl']
    }
  },

  'burger-bowl': {
    name: 'Burger Bowl Week',
    img: 'food-beef.png',
    uiVisible: true,
    lanes: {
      men_deficit:   ['cheeseburger-bowl', 'turkey-burger-bowl', 'classic-burger-bowl'],
      women_deficit: ['classic-burger-bowl', 'cheeseburger-bowl'],
      men_surplus:   ['loaded-burger-bowl', 'cheeseburger-bowl'],
      women_surplus: ['cheeseburger-bowl', 'turkey-burger-bowl', 'classic-burger-bowl']
    }
  },

  'pasta-bowl': {
    name: 'Pasta Bowl Week',
    img: 'food-chicken.png',
    uiVisible: true,
    lanes: {
      men_deficit:   null,// pasta not a featured theme for men_deficit v1
      women_deficit: ['turkey-pasta', 'chicken-pasta'],
      men_surplus:   ['beef-pasta', 'chicken-pasta'],
      women_surplus: ['chicken-pasta', 'turkey-pasta', 'beef-pasta', 'creamy-chicken-pasta']
    }
  },

  'protein-bowl': {
    name: 'Rice Bowl Week',
    img: 'food-chicken.png',
    uiVisible: false,// reserved for future — not shown in v1 selector
    lanes: {
      men_deficit:   ['chicken-bowl', 'salmon-bowl'],
      women_deficit: ['chicken-bowl', 'salmon-rice-bowl'],
      men_surplus:   ['beef-rice-bowl', 'chicken-bowl'],
      women_surplus: ['chicken-bowl', 'salmon-bowl', 'beef-rice-bowl']
    }
  }

};

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
    html+='<div onclick="confirmMealSwap(\''+opt.key+'\')" style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:'+(hasPref?'rgba(184,150,60,.1)':'var(--s2)')+';border:1px solid '+(hasPref?'rgba(184,150,60,.5)':'var(--gold-line)')+';border-radius:12px;cursor:pointer;margin-bottom:10px;transition:all .2s">'+
      '<img src="'+opt.img+'" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0">'+
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
      '<img src="'+chosen.img+'" style="width:80px;height:80px;object-fit:cover;border-radius:12px;margin-bottom:14px">'+
      '<div style="font-size:1.1rem;font-weight:700;color:var(--t1);font-family:var(--font-display);margin-bottom:6px">'+chosen.name+'</div>'+
      '<div style="font-size:.82rem;color:var(--t2);margin-bottom:24px">Make this your permanent '+slot+' on '+dayLabel+'s?</div>'+
      '<div style="display:flex;flex-direction:column;gap:10px">'+
        '<button onclick="applyMealSwap(\''+optKey+'\',true)" style="width:100%;padding:14px;background:linear-gradient(135deg,var(--s3),var(--s2));border:1px solid var(--gold-line);border-top:1px solid rgba(184,150,60,.4);border-radius:12px;color:var(--gold-light);font-size:.88rem;font-weight:700;cursor:pointer;font-family:var(--font-body)">Yes — Every '+dayLabel+' from now on</button>'+
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
      progTxt.textContent=parseFloat(lbsToGo.toFixed(1))+' lbs to go';
    }
    progLine.style.display='block';
  } else if(progLine){
    progLine.style.display='none';
  }
  var phaseObj={name:currentPlan.phase};
  // Weekly loss line in greeting
  // weekly loss display removed
  document.getElementById('dash-no-plan').classList.add('hidden');
  document.getElementById('dash-plan').classList.remove('hidden');
  // Build dinner theme selector UI whenever dashboard updates
  if(typeof buildDinnerThemeUI==='function')buildDinnerThemeUI();

  // Nudge — show only if today's weight hasn't been logged
  // Nudge starts hidden in HTML — we explicitly show or hide here
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
  el.innerHTML=buildDayHTML(i,currentPlan,false);
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
