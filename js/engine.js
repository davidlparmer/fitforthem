// ─────────────────────────────────────────────────────────────
// engine.js — Loftin Method Calorie & Plan Engine
// Pure calculation functions. No DOM dependencies.
// Globals used: S (settings), workMode, currentPlan, drinkingDays
// ─────────────────────────────────────────────────────────────

// ── NEW ENGINE: Mifflin-St Jeor + Hybrid Bridge ──────────────

function calcTargetZone(hIn){
  var targetBMI=25.0;
  var mid=(targetBMI*hIn*hIn)/703;
  return{low:Math.round((mid-5)*10)/10,mid:Math.round(mid*10)/10,high:Math.round((mid+5)*10)/10};
}

function calcBridgeReference(wLbs,targetMid){
  var dist=wLbs-targetMid;
  var bridge=0;
  if(dist>=40)bridge=20;
  else if(dist>=20)bridge=10;
  var ref=Math.max(targetMid,wLbs-bridge);
  return{bridge:bridge,ref:ref};
}

function calcMifflinMaintenance(refLbs,hIn,age,sex){
  var refKg=refLbs/2.20462;
  var hCm=hIn*2.54;
  // Mifflin-St Jeor: male +5, female -161
  var sexConstant=(sex==='female')?-161:5;
  var bmr=(10*refKg)+(6.25*hCm)-(5*age)+sexConstant;
  return Math.round(bmr*1.375);
}

function getPhase(wLbs,hIn){
  var bmi=(wLbs/(hIn*hIn))*703;
  var tz=calcTargetZone(hIn);
  var distBelow=tz.low-wLbs;// positive = below target zone

  // Cut phases — above target zone
  if(bmi>=27.0)return{name:'aggressive',center:0.75,mode:'cut',label:'Cutting',msg:'You\'re in an active cut. Consistent meals and daily steps are your engine.'};
  if(bmi>=25.5)return{name:'moderate',center:0.85,mode:'cut',label:'Steady Cut',msg:'A disciplined, sustainable deficit. This is where most of the work happens.'};
  if(bmi>24.5)return{name:'mild',center:0.90,mode:'cut',label:'Dialing In',msg:'Close to your target zone. Small, consistent deficit to finish strong.'};
  if(bmi>=24.0)return{name:'landing',center:0.95,mode:'cut',label:'Landing',msg:'You\'re in your target zone. Gradual approach to your goal weight.'};

  // Maintenance — within 2 lbs of target zone
  if(distBelow<=2)return{name:'maintenance',center:1.00,mode:'maintenance',label:'Maintenance',msg:'You\'ve reached your target zone. Eat to maintain and protect your progress.'};

  // Lean gain phases — below target zone by more than 2 lbs
  if(distBelow>=20)return{name:'moderate_gain',center:1.10,mode:'gain',label:'Building',msg:'You\'re below your target zone. A controlled surplus will build you up steadily.'};
  if(distBelow>=10)return{name:'mild_gain',center:1.05,mode:'gain',label:'Lean Build',msg:'Getting closer to your target zone. A small surplus keeps progress moving without excess fat.'};
  return{name:'landing_gain',center:1.025,mode:'gain',label:'Dialing In',msg:'Almost at your target zone. A gentle surplus to land at the right weight.'};
}

function calcPhaseWindows(maintenance,phase,wLbs){
  var c=phase.center;
  var floor=wLbs?Math.round(wLbs*8):1200;
  // For gain phases, window is above maintenance — no floor clamp needed
  if(phase.mode==='gain'){
    return{
      low:Math.round(maintenance*(c-0.015)),
      center:Math.round(maintenance*c),
      high:Math.round(maintenance*(c+0.015))
    };
  }
  return{
    low:Math.max(Math.round(maintenance*(c-0.025)),floor),
    center:Math.max(Math.round(maintenance*c),floor),
    high:Math.max(Math.round(maintenance*(c+0.025)),floor)
  };
}

function calcWeeklyLoss(maintenance,center,steps,wSteps){
  var foodDeficit=maintenance-center;
  // Gain mode: surplus is negative deficit
  if(foodDeficit<0){
    var surplus=Math.abs(foodDeficit);
    var wkGain=Math.round((surplus*7/3500)*10)/10;
    return{
      weeklyLoss:-wkGain,// negative = gaining
      foodDeficit:Math.round(foodDeficit),
      stepBurn:0,
      deficit:Math.round(foodDeficit),
      isGain:true
    };
  }
  if(foodDeficit===0)return null;
  // Cut mode
  var avgStepBurn=steps?(Math.round((5*500+2*750)/7)):0;
  var totalDeficit=foodDeficit+avgStepBurn;
  var wkLoss=Math.round((totalDeficit*7/3500)*10)/10;
  return{
    weeklyLoss:wkLoss,
    foodDeficit:Math.round(foodDeficit),
    stepBurn:avgStepBurn,
    deficit:Math.round(totalDeficit),
    isGain:false
  };
}


function calcSteps(wLbs,hIn,burnTarget,walkType,speed,incline){
  var wKg=wLbs/2.20462;
  var strideIn=hIn*0.413;
  var steps;
  if(walkType==='flat'){
    // Outdoor MET 4.0, cadence 100
    var MET=4.0;
    var cadence=100;
    steps=Math.round((burnTarget*200*cadence)/(MET*3.5*wKg));
  } else {
    // Incline treadmill VO2 formula
    var speedMpm=speed*26.8;
    var grade=incline/100;
    var vo2=3.5+(0.1*speedMpm)+(1.8*speedMpm*grade);
    var calPerMin=(vo2*wKg/1000)*5;
    var mins=burnTarget/calPerMin;
    var speedFpm=speed*88;
    var stepsPerMin=speedFpm/(strideIn/12);
    steps=Math.round(mins*stepsPerMin);
  }
  return Math.round(steps/500)*500;
}

function calcMealTimes(wake,bed){
  var wH=parseInt(wake.split(':')[0]),wM=parseInt(wake.split(':')[1]);
  var bH=parseInt(bed.split(':')[0]),bM=parseInt(bed.split(':')[1]);
  var fm=wH*60+wM+300;var sm=fm+300;var bedMins=bH*60+bM;var lm=Math.min(sm+180,bedMins-60);
  function fmt(m){var h=Math.floor(m/60)%24,min=m%60;var ampm=h>=12?'PM':'AM';var h12=h>12?h-12:h===0?12:h;return h12+':'+(min<10?'0':'')+min+' '+ampm;}
  return{first:fmt(fm),second:fmt(sm),last:fmt(lm)};
}

function buildRotation(){
  var icons={chicken:'🍗',steak:'🥩',fish:'🐟',turkey:'🦃',beef:'🥩'};
  var plan=getActivePlan();
  var rot=[];
  for(var i=0;i<7;i++){
    // Detect protein from actual meal plan dinner ingredients — single source of truth
    var dinnerIngredients=plan[i]?plan[i].dinner.i.join(' ').toLowerCase():'';
    var detectedProtein='chicken';
    if(dinnerIngredients.indexOf('salmon')>=0||dinnerIngredients.indexOf('fish')>=0)detectedProtein='fish';
    else if(dinnerIngredients.indexOf('ground turkey')>=0||dinnerIngredients.indexOf('turkey')>=0)detectedProtein='turkey';
    else if(dinnerIngredients.indexOf('beef')>=0||dinnerIngredients.indexOf('steak')>=0)detectedProtein='beef';
    else if(dinnerIngredients.indexOf('chicken')>=0)detectedProtein='chicken';
    rot.push({protein:detectedProtein,icon:icons[detectedProtein]||'🍽️'});
  }
  return rot;
}

(function(){
  var sel=document.getElementById('inp-height');
  var blank=document.createElement('option');
  blank.value='';blank.textContent='Select your height';blank.disabled=true;blank.selected=true;
  sel.appendChild(blank);
  for(var tot=60;tot<=83;tot++){
    var ft=Math.floor(tot/12),inch=tot%12;
    var o=document.createElement('option');
    o.value=tot;o.textContent=ft+"'"+inch+'"';
    sel.appendChild(o);
  }
})();

function setWorkMode(mode,el){
  workMode=mode;
  document.querySelectorAll('[id^="wm-"]').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  var notes={
    office:'Office mode — portable first meals you can take anywhere. No cooking required until dinner.',
    wfh:'Work from home mode — cooked first meals with eggs and potatoes. More variety, more fuel.'
  };
  document.getElementById('workmode-note').textContent=notes[mode];
  if(currentPlan.cal){buildDashDayTabs();}
}
function setWalkType(type,el){
  S.walkType=type;
  document.querySelectorAll('[id^="wk-"]').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  var showSpeed=type==='treadmill'||type==='incline';
  var showIncline=type==='incline';
  var incOpts=document.getElementById('incline-options');
  var incLevel=document.getElementById('incline-level-row');
  if(incOpts)incOpts.classList.toggle('hidden',!showSpeed);
  if(incLevel)incLevel.classList.toggle('hidden',!showIncline);
  var notes={flat:'Walking outside — step target uses outdoor walking formula.',treadmill:'Flat treadmill — step target calculated from your speed.',incline:'Incline treadmill — burns more per step, fewer steps needed.'};
  var noteEl=document.getElementById('walk-note');
  if(noteEl)noteEl.textContent=notes[type]||'';
}
function setSpeed(spd,el){S.speed=spd;document.querySelectorAll('.speed-grid .sel-btn').forEach(function(b){b.classList.remove('active');});el.classList.add('active');var notes={2.0:'Easy stroll.',2.5:'Comfortable pace.',3.0:'Brisk walk.',3.5:'Fastest recommended.'};document.getElementById('speed-note').textContent=notes[spd];}
function setIncline(pct,el){S.incline=pct;document.querySelectorAll('.incline-grid .sel-btn').forEach(function(b){b.classList.remove('active');});el.classList.add('active');var notes={0:'Flat.',1:'Very slight.',2:'Gentle.',3:'Moderate — great burn.',4:'Challenging.',5:'High efficiency ✅',6:'Maximum recommended ✅'};document.getElementById('incline-note').textContent=notes[pct];}
// toggleProtein() removed — protein selection no longer happens in Build My Plan.
// Meal variation is handled via Swap Meal, Weekly Dinner Family, Eating Out, and What's in My Fridge.

function generatePlan(){
  var hIn=parseInt(document.getElementById('inp-height').value);
  var wLbs=parseInt(document.getElementById('inp-weight').value);
  var age=parseInt(document.getElementById('inp-age').value);
  var goalInput=parseInt(document.getElementById('inp-goal').value)||0;
  if(!hIn||!wLbs||wLbs<80){alert('Please enter your height and a valid weight.');return;}
  if(!age||age<18||age>80){alert('Please enter your age (18–80).');return;}
  S.wakeTime=document.getElementById('inp-wake').value;
  S.bedTime=document.getElementById('inp-bed').value;
  S.age=age;
  // Sex selector — defaults to 'male' if element missing (backward compat)
  var sexEl=document.getElementById('inp-sex');
  var sex=sexEl?sexEl.value:'male';

  // Target zone
  var tz=calcTargetZone(hIn);

  // Phase — determine mode first so bridge logic can react
  var phase=getPhase(wLbs,hIn);
  // v1: surplus/gain lanes not available yet. Redirect to maintenance if triggered.
  if(phase.mode==='gain'){
    phase={name:'maintenance',center:1.0,mode:'deficit',label:'Maintenance',msg:'You\'re at or near your target weight. Eat at your burn rate to stay here.'};
  }
  // Bridge reference weight — no bridge for lean gain (use actual weight)
  var br=phase.mode==='gain'?{bridge:0,ref:wLbs}:calcBridgeReference(wLbs,tz.mid);

  // Maintenance calories (Mifflin-St Jeor)
  var maintenance=calcMifflinMaintenance(br.ref,hIn,age,sex);

  // Phase windows
  var windows=calcPhaseWindows(maintenance,phase,wLbs);

  // Protein — based on target midpoint
  var protein=Math.round(tz.mid*0.6);

  // Steps — burn target varies by phase mode
  var burnNormal=500,burnDrink=750;
  if(phase.mode==='gain'){burnNormal=250;burnDrink=350;}
  else if(phase.name==='landing'||phase.name==='maintenance'){burnNormal=350;burnDrink=500;}
  var burnLight=burnNormal+150;   // Light night — modest offset (~200 cal drinks)
  var burnBig  =burnNormal+400;   // Big night   — maximum push (~700 cal drinks)
  var steps      =calcSteps(wLbs,hIn,burnNormal,S.walkType,S.speed,S.incline);
  var wStepsLight=calcSteps(wLbs,hIn,burnLight,S.walkType,S.speed,S.incline);
  var wSteps     =calcSteps(wLbs,hIn,burnDrink,S.walkType,S.speed,S.incline);
  var wStepsBig  =calcSteps(wLbs,hIn,burnBig,S.walkType,S.speed,S.incline);

  // Meal times
  var mealTimes=calcMealTimes(S.wakeTime,S.bedTime);

  // Rotation
  var rotation=buildRotation();

  // Weekly loss estimate — includes food deficit + average step burn
  var lossData=calcWeeklyLoss(maintenance,windows.center,steps,wSteps);

  // Goal weight — use user input if provided and reasonable, else system target zone
  // Valid range: within 5 lbs of target zone low, or up to current weight
  var userGoal=0;
  if(goalInput>=tz.low-5&&goalInput<=wLbs){
    userGoal=goalInput;
  }
  // Temporary milestone — next 10-lb step toward goal
  var effectiveGoal=userGoal||Math.round(tz.low);
  var tmp;
  if(wLbs<=tz.high){tmp=Math.round(tz.mid);}
  else if(wLbs-effectiveGoal<=10){tmp=effectiveGoal;}
  else{tmp=wLbs-10;}

  // Derive lane from sex and phase mode
  var lane=(typeof getLaneId==='function')?getLaneId(sex,phase.mode):(sex==='female'?'women':'men')+'_'+(phase.mode==='gain'?'surplus':'deficit');

  currentPlan={
    hIn:hIn,wLbs:wLbs,age:age,
    goalWeight:userGoal||0,
    tz:tz,bridge:br,
    maintenance:maintenance,
    phase:phase.name,phaseLabel:phase.label,phaseMsg:phase.msg,
    calLow:windows.low,cal:windows.center,calHigh:windows.high,
    protein:protein,
    steps:steps,wStepsLight:wStepsLight,wSteps:wSteps,wStepsBig:wStepsBig,burnNormal:burnNormal,burnLight:burnLight,burnDrink:burnDrink,burnBig:burnBig,
    mealTimes:mealTimes,rotation:rotation,
    lossData:lossData,
    tmp:tmp,
    workMode:workMode,
    sex:sex,
    lane:lane
  };
  try{localStorage.setItem('fft_plan',JSON.stringify(currentPlan));localStorage.setItem('fft_workmode',workMode);localStorage.setItem('fft_age',age);saveAllData();}catch(e){}

  // Clear stale swaps and meal prefs — these contain cals from old plan targets
  window.ingredientSwaps={};
  try{var keys=Object.keys(localStorage);keys.forEach(function(k){if(k.indexOf('fft_ingswap_')===0)localStorage.removeItem(k);});}catch(e){}
  mealPrefs={};
  try{localStorage.removeItem('fft_meal_prefs');}catch(e){}

  // Update eat out field
  var eoCalEl=document.getElementById('eo-cal');
  eoCalEl.value=windows.center;eoCalEl.dataset.planCal=windows.center;eoCalEl.style.color='var(--muted)';eoCalEl.style.fontStyle='italic';eoCalEl.dataset.planProtein=protein;
  document.getElementById('cal-override-note').classList.add('hidden');

  // Phase banner
  var phaseMessages={
    aggressive:{cls:'aggressive',icon:'🔥',subtitle:'Active cut — hit your steps every day'},
    moderate:{cls:'aggressive',icon:'🎯',subtitle:'Steady, sustainable deficit'},
    mild:{cls:'steady',icon:'⚡',subtitle:'Dialing in — small consistent deficit'},
    landing:{cls:'steady',icon:'🏁',subtitle:'Landing phase — approaching your target'},
    maintenance:{cls:'maintenance',icon:'🏆',subtitle:'Maintain your results — you earned this'},
    moderate_gain:{cls:'steady',icon:'📈',subtitle:'Controlled surplus — building toward your target'},
    mild_gain:{cls:'steady',icon:'📈',subtitle:'Small surplus — lean and steady progress'},
    landing_gain:{cls:'steady',icon:'🏁',subtitle:'Almost there — gentle surplus to finish'}
  }[phase.name];

  var pb=document.getElementById('phase-banner');
  pb.className='phase-banner '+phaseMessages.cls;
  pb.style.cssText='';
  pb.innerHTML='<strong>'+phaseMessages.icon+' '+phase.label+'</strong>'+
    '<span style="display:block;font-size:.75rem;opacity:.75;font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px">'+phaseMessages.subtitle+'</span>'+
    phase.msg;

  if(phase.name==='maintenance'){
    pb.style.cssText='background:linear-gradient(135deg,#EAFAF1,#D5F5E3);border:2px solid #A9DFBF;border-radius:12px;padding:20px 16px;margin-bottom:16px;font-size:.88rem;line-height:1.5;text-align:center';
    pb.innerHTML='<div style="font-size:2rem;margin-bottom:8px">🏆</div><strong style="font-size:1.1rem;color:var(--green);display:block;margin-bottom:6px">Locked In.</strong><span style="color:var(--green)">'+phase.msg+'</span>';
  }

  

  // Stats
  document.getElementById('s-cal').textContent=windows.center.toLocaleString();
  document.getElementById('s-pro').textContent=protein+'g';
  document.getElementById('s-steps').textContent=steps.toLocaleString();
  document.getElementById('s-goal').textContent=tmp+' lbs';

  // Calorie range — always show
  var rangeWrap=document.getElementById('s-range-wrap');
  document.getElementById('s-range').textContent=windows.low.toLocaleString()+' – '+windows.high.toLocaleString()+' cal';
  rangeWrap.classList.remove('hidden');

  // Progress bar
  var totalJ=Math.max(wLbs-tz.low,1);
  var done=Math.max(0,wLbs-tz.high);
  var pct=Math.max(Math.round(((totalJ-done)/totalJ)*100),2);
  document.getElementById('prog-cur').textContent=wLbs+' lbs';
  document.getElementById('prog-end').textContent=Math.round(tz.low)+'–'+Math.round(tz.high)+' lbs';
  document.getElementById('prog-fill').style.width=pct+'%';
  document.getElementById('prog-txt').textContent=wLbs<=tz.high?'Target zone reached!':parseFloat((wLbs-Math.round(tz.high)).toFixed(1))+' lbs to go';

  updateDashboard();
  buildDashDayTabs();

  // Start the 30-day free trial clock on first plan build — only set once, never overwritten
  if(!localStorage.getItem('fft_trial_start')){
    localStorage.setItem('fft_trial_start',Date.now().toString());
  }

  document.getElementById('results').classList.remove('hidden');
  setTimeout(function(){document.getElementById('results').scrollIntoView({behavior:'smooth',block:'start'});},100);
}

// Cooking instructions by protein type
var COOK_STEPS={
  chicken:'<div class="coach-note" style="margin-top:8px"><strong>How to cook:</strong> Boil potatoes until tender, then mash with cheese, sour cream, salt, and pepper. Cube and season chicken with salt, pepper, and garlic powder. Add to a hot pan, let sit 1 minute, then cook over medium heat until done. Add honey and soy sauce (roughly 1–2 tbsp each), cook on low 2–3 minutes, then pour over the mashed potatoes.</div>',
  beef:'<div class="coach-note" style="margin-top:8px"><strong>How to cook:</strong> Boil potatoes until tender, then mash with cheese, sour cream, salt, and pepper. Cube and season beef with salt, pepper, and garlic powder. Add to a hot pan, let sit 1 minute, then cook over medium heat, stirring until done. Pour over the mashed potatoes.</div>',
  salmon:'<div class="coach-note" style="margin-top:8px"><strong>How to cook:</strong> Boil potatoes until tender, then mash with cheese, sour cream, salt, and pepper. Cube and season salmon with salt, pepper, and garlic powder while partially frozen. Add to a hot pan, let sit 1 minute, then cook over medium heat, stirring until done. Add honey and soy sauce (roughly 1–2 tbsp each), cook on low 2–3 minutes, then pour over the mashed potatoes.</div>',
  turkey:'<div class="coach-note" style="margin-top:8px"><strong>How to cook:</strong> Brown ground turkey in a pan over medium heat, breaking it up as it cooks — about 8 min. Drain any liquid. Add taco seasoning and stir 1 min. Serve over rice with sour cream on top.</div>',
  shrimp:'<div class="coach-note" style="margin-top:8px"><strong>How to cook:</strong> Pat shrimp dry. Hot pan, add honey + soy sauce + butter. Add shrimp, 2 min per side — they\'re done when pink and curled. Serve over rice. Do not overcook.</div>',
  eggs:'<div class="coach-note" style="margin-top:8px"><strong>How to cook:</strong> Cook potatoes in a skillet until browned and tender. Add eggs and/or egg whites and cook until set. Top with cheese and finish with salsa or sour cream. Serve hot.</div>',
  cottage:'<div class="coach-note" style="margin-top:8px"><strong>How to prepare:</strong> Weigh all ingredients and mix together in a bowl. No cooking required.</div>',
  yogurt:'<div class="coach-note" style="margin-top:8px"><strong>How to prepare:</strong> Weigh the yogurt and any mix-ins, combine in a bowl, and serve cold.</div>',
  oats:'<div class="coach-note" style="margin-top:8px"><strong>How to prepare:</strong> Add oats and water to a bowl. Microwave 2 minutes. Top with sliced banana and honey. Done.</div>',
  ricotta:'<div class="coach-note" style="margin-top:8px"><strong>How to prepare:</strong> Weigh all ingredients and mix together in a bowl. No cooking required.</div>'
};

function getCookSteps(proteinName){
  var p=proteinName.toLowerCase();
  if(p.indexOf('chicken')>=0)return COOK_STEPS.chicken;
  if(p.indexOf('beef')>=0||p.indexOf('steak')>=0)return COOK_STEPS.beef;
  if(p.indexOf('salmon')>=0||p.indexOf('fish')>=0)return COOK_STEPS.salmon;
  if(p.indexOf('turkey')>=0)return COOK_STEPS.turkey;
  if(p.indexOf('shrimp')>=0)return COOK_STEPS.shrimp;
  if(p.indexOf('egg')>=0)return COOK_STEPS.eggs;
  if(p.indexOf('oat')>=0||p.indexOf('banana')>=0)return COOK_STEPS.oats;
  if(p.indexOf('cottage')>=0)return COOK_STEPS.cottage;
  if(p.indexOf('ricotta')>=0)return COOK_STEPS.ricotta;
  if(p.indexOf('yogurt')>=0||p.indexOf('greek')>=0)return COOK_STEPS.yogurt;
  return '';
}

var DAYS_SHORT=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var DAYS_FULL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// ── SHARED SLOT TARGETING HELPERS ────────────────────────────
// Single source of truth for slot calorie and protein ratios.
// Used by restaurants.js, fridge.js, meals.js, and any future tools.

function getPlanMode(plan) {
  var p = plan || currentPlan;
  var phase = p ? p.phase : '';
  if (phase === 'moderate_gain' || phase === 'mild_gain' || phase === 'landing_gain') return 'surplus';
  return 'deficit';
}

function getSlotRatios(plan) {
  var mode = getPlanMode(plan);
  if (mode === 'surplus') {
    return { first: 0.30, dinner: 0.40, dessert: 0.30 };
  }
  return { first: 0.275, dinner: 0.525, dessert: 0.20 };
}

// ── Single source of truth for slot calorie targets ──────────────
// Called by meals.js buildDayHTML AND app-handlers.js renderWeeklyGrid.
// If you change this function, both files update automatically.
// IMPORTANT: dessert uses remainder (not direct multiply) to prevent rounding drift.
function getSlotCalorieTargets(plan, drinkReserve) {
  var p = plan || currentPlan;
  var cal = (p && p.cal) ? p.cal : 0;
  var reserve = drinkReserve || 0;
  var foodCal = cal - reserve;
  var ratios = getSlotRatios(p);
  var tFirst  = Math.round(foodCal * ratios.first);
  var tDinner = Math.round(foodCal * ratios.dinner);
  return {
    first:   tFirst,
    dinner:  tDinner,
    dessert: foodCal - tFirst - tDinner, // remainder — avoids rounding drift
    extra:   Math.round(cal * 0.15)
  };
}

function getSlotProteinTargets(plan) {
  var p = plan || currentPlan;
  var protein = (p && p.protein) ? p.protein : 0;
  var mode = getPlanMode(p);
  if (mode === 'surplus') {
    return {
      first:   Math.round(protein * 0.30),
      dinner:  Math.round(protein * 0.40),
      dessert: Math.round(protein * 0.30)
    };
  }
  return {
    first:   Math.round(protein * 0.30),
    dinner:  Math.round(protein * 0.45),
    dessert: Math.round(protein * 0.25)
  };
}

function getSlotDisplayLabel(slotKey) {
  var labels = { first: 'First Meal', dinner: 'Main Meal', dessert: 'Final Meal', extra: 'Extra' };
  return labels[slotKey] || slotKey;
}
