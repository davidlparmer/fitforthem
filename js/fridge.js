// ─────────────────────────────────────────────────────────────
// fridge.js — Loftin Method My Fridge & Ingredient Swap
// Fridge modal meal builder, ingredient swap system, extra cal calc.
// Globals used: currentPlan, customMeals, proteinSwaps, mealPrefs,
//               currentDayIdx, swapContext, lastBuiltMeal (declared here)
// Depends on: engine.js (buildRotation, calcSteps)
// ─────────────────────────────────────────────────────────────

// ── INGREDIENT SWAP ───────────────────────────────────────────
var swapContext={dayIdx:null, slot:null, ingredientIdx:null, originalItem:null, originalCal:null};

async function showIngredientSwap(dayIdx, slot, ingredientIdx, ingredientText, ingredientName, grams){
  swapContext={dayIdx:dayIdx, slot:slot, ingredientIdx:ingredientIdx, originalItem:ingredientText, originalCal:0, originalGrams:grams||100};
  document.getElementById('swap-current').innerHTML='Looking up <strong>'+ingredientText+'</strong>...';
  document.getElementById('swap-input').value='';
  document.getElementById('swap-results').innerHTML='';
  document.getElementById('ingredient-swap-modal').style.display='block';
  document.body.style.overflow='hidden';

  // Look up actual calories for this ingredient
  // Eggs: use direct calculation ~70 cal per large egg (USDA)
  var isEgg=ingredientName.toLowerCase().indexOf('egg')>=0||ingredientText.match(/^\d+\s*eggs?$/i);
  if(isEgg){
    var eggG=grams||100;
    var eggCal=Math.round((eggG/50)*70);// ~70 cal per 50g egg
    swapContext.originalCal=eggCal;
    document.getElementById('swap-current').innerHTML='Swapping: <strong>'+ingredientText+'</strong> (~'+eggCal+' cal)';
  } else {
    try{
      var data=await askClaude('Calories for '+ingredientName+' at '+(grams||100)+'g. JSON: {"cal":'+(grams||100)+'}');
      swapContext.originalCal=data.cal||Math.round((grams||100)*1.5);
      document.getElementById('swap-current').innerHTML='Swapping: <strong>'+ingredientText+'</strong> (~'+swapContext.originalCal+' cal)';
    }catch(e){
      // Fallback estimate
      swapContext.originalCal=Math.round((grams||100)*1.5);
      document.getElementById('swap-current').innerHTML='Swapping: <strong>'+ingredientText+'</strong>';
    }
  }

  setTimeout(function(){document.getElementById('swap-input').focus();},300);
}

function closeIngredientSwap(){
  document.getElementById('ingredient-swap-modal').style.display='none';
  document.body.style.overflow='';
}

async function searchSwapIngredient(){
  var q=document.getElementById('swap-input').value.trim();
  if(!q){alert('What do you want to swap it with?');return;}
  var el=document.getElementById('swap-results');
  el.innerHTML='<div class="loading"><div class="spinner"></div>Finding '+q+'...</div>';

  // Get original grams and estimate original cal per gram
  var gramsMatch=swapContext.originalItem.match(/(\d+)g/);
  var originalGrams=gramsMatch?parseInt(gramsMatch[1]):100;
  var targetCal=swapContext.originalCal; // calories we need to match

  try{
    // First get cal per 100g of the new ingredient
    var data=await askClaude('Nutrition for '+q+' per 100g cooked/raw (whichever is typical). JSON: {"name":"'+q+'","cal_per_100g":0,"pro_per_100g":0,"carb_per_100g":0,"fat_per_100g":0,"cooking_note":"how to prepare briefly"}');

    // Calculate grams needed to match target calories
    var calPer100g=data.cal_per_100g||0;
    if(calPer100g<=0){
      el.innerHTML='<div class="error-box">⚠️ Couldn\'t get nutrition data. Try again.</div>';
      return;
    }

    var neededGrams=Math.round((targetCal/calPer100g)*100);
    var actualCal=Math.round(calPer100g*neededGrams/100);
    var actualPro=Math.round((data.pro_per_100g||0)*neededGrams/100);

    el.innerHTML='<div class="food-card best">'+
      '<div class="best-badge top">Calorie Matched</div>'+
      '<div class="food-name">'+data.name+' '+neededGrams+'g</div>'+
      '<div class="coach-note" style="margin-bottom:10px">To replace <strong>'+swapContext.originalItem+'</strong> at the same calories, cook <strong>'+neededGrams+'g of '+data.name+'</strong>.'+(data.cooking_note?' '+data.cooking_note:'')+'</div>'+
      '<div class="food-macros">'+
        '<div class="macro"><div class="mv">'+actualCal+'</div><div class="ml">Cal</div></div>'+
        '<div class="macro"><div class="mv">'+actualPro+'g</div><div class="ml">Protein</div></div>'+
      '</div>'+
      '<button class="btn" onclick="confirmIngredientSwap(\''+data.name.replace(/\x27/g,"\\'")+' '+neededGrams+'g\','+actualCal+')" style="margin-top:10px;background:var(--green)"> Swap '+swapContext.originalItem.split(' ')[0]+' → '+neededGrams+'g '+data.name+'</button>'+
    '</div>';
  }catch(err){
    el.innerHTML='<div class="error-box">⚠️ Try again.</div>';
  }
}

function confirmIngredientSwap(newIngredient, newCal){
  if(swapContext.dayIdx===null)return;

  // Save swap to both memory and localStorage
  if(!window.ingredientSwaps)window.ingredientSwaps={};
  var swapKey='fft_ingswap_'+swapContext.dayIdx+'_'+swapContext.slot+'_'+swapContext.ingredientIdx;
  var swapData={ingredient:newIngredient, cal:newCal};
  window.ingredientSwaps[swapKey]=swapData;
  try{localStorage.setItem(swapKey, JSON.stringify(swapData));}catch(e){}

  closeIngredientSwap();

  // Force full re-render of the day
  setTimeout(function(){
    buildDashDayTabs();
    renderDashDay(swapContext.dayIdx);
    // Show success banner
    var el=document.getElementById('dash-loss');
    if(el){
      el.className='adj-banner good';
      el.innerHTML='<strong> Swapped!</strong> '+newIngredient+' is now in your '+swapContext.slot+'.';
      el.classList.remove('hidden');
      setTimeout(function(){el.classList.add('hidden');el.innerHTML='';},4000);
    }
  },100);
}
// ── END INGREDIENT SWAP ────────────────────────────────────────

function showExtraCalModal(){
  document.getElementById('extra-cal-modal').style.display='block';
  document.body.style.overflow='hidden';
  document.getElementById('extra-cal-input').value='';
  document.getElementById('extra-cal-result').innerHTML='';
  setTimeout(function(){document.getElementById('extra-cal-input').focus();},300);
}
function closeExtraCalModal(){
  document.getElementById('extra-cal-modal').style.display='none';
  document.body.style.overflow='';
}
function calcExtraSteps(){
  var extraCal=parseInt(document.getElementById('extra-cal-input').value);
  if(!extraCal||extraCal<50){alert('Please enter at least 50 calories.');return;}
  if(!currentPlan.wLbs){alert('Build your plan first.');return;}

  // Calculate extra steps needed
  // Flat walking: ~0.53 × bodyweight(lbs) × miles burned per mile
  // Steps per mile ≈ 63360 / (height × 0.413)
  var hIn=currentPlan.hIn||68;
  var wLbs=currentPlan.wLbs;
  var strideIn=hIn*0.413;
  var stepsPerMile=63360/strideIn;
  var calPerMile=0.53*wLbs;
  var calPerStep=calPerMile/stepsPerMile;
  var extraSteps=Math.round(extraCal/calPerStep/1000)*1000;
  var totalSteps=(currentPlan.steps||10000)+extraSteps;
  var cappedSteps=Math.min(totalSteps,17000);
  var wasCapped=totalSteps>17000;

  var html='<div class="loss-banner"><strong>🦶 Updated Step Target</strong>'+
    extraCal+' extra calories = approximately <strong>'+extraSteps.toLocaleString()+' more steps</strong> to stay on track.<br><br>'+
    'Your target for today: <strong style="font-size:1.1rem">'+cappedSteps.toLocaleString()+' steps</strong>'+
    (wasCapped?'<br><span style="font-size:.8rem;opacity:.8">(capped at 17,000 — maximum recommended)</span>':'')+
  '</div>'+
  '<div class="coach-note" style="margin-top:10px;background:rgba(61,122,82,.1);border-color:rgba(61,122,82,.3);color:var(--green)">'+
    '<strong>Nothing broke.</strong> This is exactly what the system is built for — real life happens, we adjust and keep going. Hit those steps and tomorrow is a clean slate. 💪'+
  '</div>'+
  '<button class="btn" onclick="closeExtraCalModal()" style="margin-top:12px;background:var(--green)">Got It — Back on Track →</button>';

  document.getElementById('extra-cal-result').innerHTML=html;
}

function updateFridgeModalContext(){
  var el=document.getElementById('fridge-modal-context');
  if(!el||!currentPlan.cal)return;
  var slot=document.getElementById('modal-meal-slot').value;
  var slotTargets=getSlotCalorieTargets(currentPlan);
  var budget=slotTargets[slot]||slotTargets.first;
  var proteinTargets=getSlotProteinTargets(currentPlan);
  var pro=proteinTargets[slot]||proteinTargets.first;
  var slotLabel=getSlotDisplayLabel(slot);
  el.textContent='Replacing '+slotLabel+' — target: ~'+budget+' cal · ~'+pro+'g protein';
}
function showIngredientsModal(){
  var modal=document.getElementById('fridge-modal');
  modal.style.display='block';
  document.body.style.overflow='hidden';
  document.getElementById('modal-results').innerHTML='';
  // Auto-select time-appropriate slot if none chosen yet
  var slotEl=document.getElementById('modal-meal-slot');
  if(slotEl&&!slotEl.value){
    var hour=new Date().getHours();
    slotEl.value=hour<12?'first':hour<20?'dinner':'dessert';
  }
  updateFridgeModalContext();
}
function closeFridgeModal(){
  document.getElementById('fridge-modal').style.display='none';
  document.body.style.overflow='';
}

// Store last built meal globally so Add to Today button works cleanly
var lastBuiltMeal=null;
function addLastBuiltMealToDay(slot){
  if(!lastBuiltMeal){alert('No meal found — please build a meal first.');return;}
  addBuiltMealToDay(lastBuiltMeal.name||lastBuiltMeal.meal||'Fridge Meal',lastBuiltMeal.totalCal,slot,lastBuiltMeal.ingredients,lastBuiltMeal.instructions,lastBuiltMeal.tip||'',lastBuiltMeal.totalPro||0,lastBuiltMeal.totalCarb||0,lastBuiltMeal.totalFat||0);
}

function addBuiltMealToDay(mealName, mealCal, slot, ingredients, instructions, tip, pro, carb, fat){
  var todayIdx=new Date().getDay()===0?6:new Date().getDay()-1;
  // Check if same slot already has a custom meal — prompt to replace
  var existing=customMeals.filter(function(m){return m.day===todayIdx&&m.slot===slot;});
  if(existing.length>0){
    var replace=confirm('You already have a custom '+slot+' today.\n\nTap OK to replace it, or Cancel to keep both.');
    if(replace){customMeals=customMeals.filter(function(m){return!(m.day===todayIdx&&m.slot===slot);});}
  }
  customMeals.push({
    day:todayIdx,
    name:mealName,
    cal:mealCal,
    pro:pro||0,
    carb:carb||0,
    fat:fat||0,
    slot:slot,
    notes:'Built from fridge',
    id:Date.now(),
    ingredients:ingredients||[],
    instructions:instructions||[],
    tip:tip||''
  });
  try{localStorage.setItem('fft_custom',JSON.stringify(customMeals));}catch(e){}
  buildDashDayTabs();
  // Show confirmation
  var confirmEl=document.createElement('div');
  confirmEl.className='loss-banner';
  confirmEl.style.marginTop='10px';
  confirmEl.innerHTML='<strong> Added to Today!</strong> '+mealName+' has been added to your '+slot+' slot. Check your dashboard to see it.';
  document.getElementById('modal-results').appendChild(confirmEl);
  setTimeout(function(){closeFridgeModal();},2200);
}

async function buildMealFromModal(){
  var ingredients=document.getElementById('modal-ingredients').value.trim();
  if(!ingredients){alert('Please enter some ingredients.');return;}
  if(!currentPlan.cal){alert('Build your plan first.');return;}

  var slot=document.getElementById('modal-meal-slot').value;
  var slotTargets=getSlotCalorieTargets(currentPlan);
  var budget=slotTargets[slot]||slotTargets.first;
  var slotProteinTargets=getSlotProteinTargets(currentPlan);
  var slotProtein=slotProteinTargets[slot]||slotProteinTargets.first;

  // Lane context for prompt
  var planMode=getPlanMode(currentPlan);
  var planSex=(currentPlan&&currentPlan.sex)?currentPlan.sex:'male';
  var planLane=(currentPlan&&currentPlan.lane)?currentPlan.lane:'men_deficit';

  // Today's protein intent for dinner
  var dow=new Date().getDay();var dayIdx=dow===0?6:dow-1;
  var rotation=buildRotation();
  var todayProtein=proteinSwaps[dayIdx]?{protein:proteinSwaps[dayIdx]}:rotation[dayIdx];
  var slotLabel=getSlotDisplayLabel(slot);

  var el=document.getElementById('modal-results');
  el.innerHTML='<div class="loading"><div class="spinner"></div>Building your '+slotLabel.toLowerCase()+'...</div>';

  try{
    var prompt='You are a physique nutrition coach building a replacement meal from available ingredients.\n\n'+
      'System context:\n'+
      '- Replacing: '+slotLabel+'\n'+
      '- Calorie target: '+budget+' cal\n'+
      '- Protein target for this meal: ~'+slotProtein+'g\n'+
      '- Plan mode: '+planMode+' ('+planLane+')\n'+
      '- User sex: '+planSex+'\n'+
      (slot==='dinner'?'- Today\'s protein: '+todayProtein.protein+' (prefer this if available)\n':'')+
      '- Available ingredients: '+ingredients+'\n\n'+
      'Rules:\n'+
      '1. Show ONE Best Match — most satiating, MAXIMIZING calories up to '+budget+' cal\n'+
      '2. Show up to 2 Alternates only if they use different ingredients or approach\n'+
      '3. All measurements must be in grams (round to nearest 5g), except eggs (count)\n'+
      '4. Never fake precision — round to practical amounts\n'+
      '5. Include step-by-step cooking instructions\n'+
      '6. Prioritize protein sources first, use potatoes/rice/oats as the calorie dial to reach '+budget+' cal\n'+
      '7. MAXIMIZE: get totalCal within 50 cal of '+budget+'. Do not leave calories on the table.\n'+
      '8. Role of '+slotLabel+': '+(slot==='dinner'?'largest most satisfying meal':slot==='first'?'controlled, not too heavy, sustaining':slot==='dessert'?'sweet, satiating, closes eating window':'small satisfying snack')+'\n'+
      '9. Include a brief budget_note explaining how you hit the calorie target\n'+
      '10. Use standard ingredient names for best nutrition tracking: \'beef sirloin\' not \'steak\', \'chicken breast\' not \'chicken\', \'broccoli\' not \'mixed vegetables\'\n'+
      '11. Name meals with simple food-based names only. Format: \'Chicken with Rice and Broccoli\' or \'Beef Sirloin and Potatoes\'. No hype words: no \'Power Bowl\', \'Shredded\', \'Bodybuilder\', \'Loaded\', \'Hearty\', \'Ultimate\', or fitness marketing language.\n\n'+
      'JSON format:\n'+
      '{"items":[{\n'+
      '  "rank":"best"|"alternate",\n'+
      '  "name":"meal name",\n'+
      '  "ingredients":[{"item":"name","amount":"Xg or X eggs","cal":0,"pro":0}],\n'+
      '  "totalCal":0,\n'+
      '  "totalPro":0,\n'+
      '  "totalCarb":0,\n'+
      '  "totalFat":0,\n'+
      '  "instructions":["step 1","step 2","step 3"],\n'+
      '  "tip":"one practical coaching note",\n'+
      '  "budget_note":"one sentence on how you hit the calorie target"\n'+
      '}]}';

    var data=await askClaude(prompt);
    if(!data.items||!data.items.length){el.innerHTML='<div class="error-box">⚠️ Could not build a meal from those ingredients. Try adding more options.</div>';return;}

    var html='';
    var bestItems=data.items.filter(function(i){return i.rank==='best';});
    var altItems=data.items.filter(function(i){return i.rank==='alternate';});

    bestItems.forEach(function(meal){
      html+='<div style="background:linear-gradient(170deg,var(--s2),var(--s1));border:1px solid rgba(184,150,60,.35);border-top:2px solid rgba(184,150,60,.6);border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 16px 48px rgba(0,0,0,.55)">';
      html+='<div style="font-size:.6rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;font-family:var(--font-body)">Best Match</div>';
      html+='<div style="font-size:1.05rem;font-weight:700;color:var(--t1);font-family:var(--font-display);margin-bottom:12px">'+meal.name+'</div>';

      // Macros
      html+='<div style="display:flex;gap:10px;margin-bottom:10px">';
      html+='<div style="background:rgba(184,150,60,.1);border:1px solid var(--gold-line);border-radius:10px;padding:10px 14px;text-align:center"><div style="font-size:1.1rem;font-weight:700;color:var(--gold-light)">'+meal.totalCal+'</div><div style="font-size:.58rem;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;font-weight:600">Cal of '+budget+'</div></div>';
      html+='<div style="background:rgba(184,150,60,.06);border:1px solid var(--gold-line);border-radius:10px;padding:10px 14px;text-align:center"><div style="font-size:1.1rem;font-weight:700;color:var(--t1)">'+meal.totalPro+'g</div><div style="font-size:.58rem;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;font-weight:600">Protein</div></div>';
      html+='</div>';
      html+=renderMacroBar({pro:meal.totalPro||0,carb:meal.totalCarb||0,fat:meal.totalFat||0},'row');

      // Budget badge — parseInt ensures string cal values from Claude still work
      var _mealCal=parseInt(meal.totalCal)||0;
      var _diff=_mealCal-budget;
      var _badgeColor=_diff>50?'rgba(192,57,43,.15)':_diff>0?'rgba(184,150,60,.15)':Math.abs(_diff)<=60?'rgba(61,122,82,.15)':'rgba(184,150,60,.1)';
      var _badgeText=_diff>50?(_diff+' cal over — see tip below'):_diff>0?(_diff+' cal over — within grace range ✓'):Math.abs(_diff)<=60?'Hits your target ✓':(Math.abs(_diff)+' cal under target');
      var _badgeFg=_diff>50?'#e07b6a':_diff>0?'var(--gold-light)':Math.abs(_diff)<=60?'#7ec99a':'var(--t2)';
      html+='<div style="margin:8px 0 12px"><span style="background:'+_badgeColor+';color:'+_badgeFg+';border-radius:20px;padding:4px 12px;font-size:.7rem;font-weight:700">'+_badgeText+'</span></div>';
      var _note=meal.budget_note||('Built to maximize your '+budget+' cal '+slotLabel+'.');
      html+='<div style="font-size:.76rem;color:var(--t2);font-style:italic;margin-bottom:12px;padding:6px 10px;background:rgba(184,150,60,.04);border-left:2px solid rgba(184,150,60,.3);border-radius:0 6px 6px 0">'+_note+'</div>';

      // Ingredients
      html+='<div style="margin-bottom:14px;background:rgba(0,0,0,.2);border-radius:8px;border:1px solid var(--gold-line);overflow:hidden">';
      html+='<div style="padding:8px 12px;font-size:.58rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);border-bottom:1px solid var(--gold-line)">Ingredients</div>';
      meal.ingredients.forEach(function(ing){
        html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-bottom:1px solid rgba(184,150,60,.06)">';
        html+='<div><div style="font-size:.88rem;color:var(--t1)">'+ing.item+'</div><div style="font-size:.72rem;color:var(--t3)">'+ing.cal+' cal · '+ing.pro+'g protein</div></div>';
        html+='<div style="font-size:.9rem;font-weight:700;color:var(--gold-light)">'+ing.amount+'</div>';
        html+='</div>';
      });
      html+='</div>';

      // Instructions
      html+='<div style="margin-bottom:14px">';
      html+='<div style="font-size:.58rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--t3);margin-bottom:8px">How to Make It</div>';
      meal.instructions.forEach(function(step,idx){
        html+='<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid rgba(184,150,60,.06)">';
        html+='<div style="font-size:.78rem;font-weight:700;color:var(--gold);min-width:18px">'+(idx+1)+'.</div>';
        html+='<div style="font-size:.82rem;color:var(--t2)">'+step+'</div>';
        html+='</div>';
      });
      html+='</div>';

      if(meal.tip){
        html+='<div style="padding:10px 12px;background:rgba(184,150,60,.04);border-left:2px solid rgba(184,150,60,.3);border-radius:0 6px 6px 0;font-size:.8rem;color:var(--t2);font-style:italic;margin-bottom:14px">'+meal.tip+'</div>';
      }

      html+='<button class="btn" onclick="addLastBuiltMealToDay(\''+slot+'\')" style="margin-top:4px;background:var(--cream-bg);color:var(--cream-text);border:1px solid var(--cream-border)"> Add to Today →</button>';
      html+='<button onclick="_pendingSaveFridge={meal:lastBuiltMeal,slot:lastBuiltMeal?lastBuiltMeal.slot:\'dinner\'};savePendingFridge()" style="width:100%;padding:10px;margin-top:8px;background:none;border:1px solid rgba(184,150,60,.4);border-radius:8px;color:var(--gold);font-size:.72rem;font-weight:700;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-body)">⭐ Save to My Meals</button>';
      html+='<button class="btn-outline" onclick="addIngredientsToGroceryList(lastBuiltMeal?lastBuiltMeal.ingredients:[])" style="margin-top:8px;width:100%;padding:10px"> Add to Grocery List</button>';
      html+='</div>';
      lastBuiltMeal=meal;
      lastBuiltMeal.slot=slot;
    });

    // Alternates
    if(altItems.length){
      html+='<div style="font-size:.6rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--t3);margin:20px 0 12px;font-family:var(--font-body);padding-top:16px;border-top:1px solid var(--gold-line)">Alternates</div>';
      altItems.slice(0,2).forEach(function(meal){
        html+='<div style="background:var(--card);border:1px solid var(--gold-line);border-radius:10px;padding:16px 18px;margin-bottom:10px">';
        html+='<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">';
        html+='<div style="font-family:var(--font-display);font-size:.95rem;font-weight:600;color:var(--t1);line-height:1.2;flex:1;padding-right:12px">'+meal.name+'</div>';
        html+='<div style="text-align:right"><div style="font-size:.85rem;font-weight:700;color:var(--gold-light)">'+meal.totalCal+' cal</div><div style="font-size:.72rem;color:var(--t3)">'+meal.totalPro+'g protein</div></div>';
        html+='</div>';
        if(meal.ingredients&&meal.ingredients.length){
          html+='<div style="margin-bottom:10px;padding:10px 12px;background:rgba(0,0,0,.25);border-radius:6px">';
          meal.ingredients.forEach(function(ing){
            html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(200,160,74,.07)">';
            html+='<div style="font-size:.8rem;color:var(--t2)"><span style="color:var(--t3);margin-right:6px">&rarr;</span>'+ing.item+'</div>';
            html+='<div style="font-size:.78rem;color:var(--t3)">'+ing.amount+'</div>';
            html+='</div>';
          });
          html+='</div>';
        }
        html+='<button onclick="(function(){lastBuiltMeal='+JSON.stringify(meal)+';lastBuiltMeal.slot=\''+slot+'\';addLastBuiltMealToDay(\''+slot+'\');})()" style="width:100%;padding:9px;background:none;border:1px solid var(--gold-line);color:var(--gold-light);border-radius:8px;font-size:.72rem;font-weight:700;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-body)">Use This Instead</button>';
        html+='</div>';
      });
    }

    el.innerHTML=html;
  }catch(err){el.innerHTML='<div class="error-box">⚠️ Try again.</div>';}
}

async function buildMeal(){
  var ingredients=document.getElementById('ingredients-input').value.trim();
  if(!ingredients){alert('Please enter ingredients.');return;}
  var cal=parseInt(document.getElementById('ib-cal').value)||currentPlan.cal||1800;
  var mealType=document.getElementById('ib-meal').value;
  var tempPlan=Object.assign({},currentPlan,{cal:cal});
  var budgets=getSlotCalorieTargets(tempPlan);
  var budget=budgets[mealType]||budgets.first;
  var el=document.getElementById('builder-results');
  el.innerHTML='<div class="loading"><div class="spinner"></div>Building your meal...</div>';
  try{
    var data=await askClaude('Build a '+mealType+' meal using ONLY: '+ingredients+'. Target: '+budget+' cal. JSON: {"meal":"name","ingredients":[{"item":"name","amount":"amount","cal":0,"pro":0}],"totalCal":0,"totalPro":0,"instructions":["step1","step2"],"tip":"note"}');
    lastBuiltMeal=data;
    lastBuiltMeal.slot=mealType;
    var html='<div class="food-card best"><div class="best-badge top">Built for You</div><div class="food-name">'+data.meal+'</div>'+
      '<div class="food-macros"><div class="macro"><div class="mv">'+data.totalCal+'</div><div class="ml">Cal</div></div><div class="macro"><div class="mv">'+data.totalPro+'g</div><div class="ml">Protein</div></div></div>'+
      '<div style="margin:10px 0;padding:10px 12px;background:var(--white);border-radius:8px;border:1px solid var(--border)">'+data.ingredients.map(function(i){return '<div style="font-size:.84rem;padding:3px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between"><span><span style="color:var(--warm)">→</span> '+i.item+'</span><span style="color:var(--muted)">'+i.amount+'</span></div>';}).join('')+'</div>'+
      '<div style="margin:10px 0;padding:10px 12px;background:var(--white);border-radius:8px;border:1px solid var(--border)">'+data.instructions.map(function(s,i){return '<div style="font-size:.84rem;padding:3px 0;border-bottom:1px solid var(--border)"><span style="color:var(--warm);font-weight:700">'+(i+1)+'.</span> '+s+'</div>';}).join('')+'</div>'+
      (data.tip?'<div class="coach-note">'+data.tip+'</div>':'')+
      '<button class="btn" onclick="addLastBuiltMealToDay(\''+mealType+'\')" style="margin-top:12px;background:var(--green)"> Add to Today →</button>'+
      '<button onclick="_pendingSaveFridge={meal:lastBuiltMeal,slot:lastBuiltMeal?lastBuiltMeal.slot:\'dinner\'};savePendingFridge()" style="width:100%;padding:10px;margin-top:8px;background:none;border:1px solid rgba(184,150,60,.4);border-radius:8px;color:var(--gold);font-size:.72rem;font-weight:700;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;font-family:var(--font-body)">⭐ Save to My Meals</button>'+
      '<button class="btn-outline" onclick="addIngredientsToGroceryList(lastBuiltMeal?lastBuiltMeal.ingredients:[])" style="margin-top:8px;width:100%;padding:10px"> Add Ingredients to Grocery List</button>'+
    '</div>';
    el.innerHTML=html;
  }catch(err){el.innerHTML='<div class="error-box">⚠️ Try again.</div>';}
}

