// ─────────────────────────────────────────────────────────────
// history.js — Loftin Method Meal History & Quick Log
// Quick meal logging, meal history display, server-side snapshots.
// Globals used: customMeals, mealPrefs, skippedMeals, currentPlan,
//               currentDayIdx, weightLog (all in app.html)
// Depends on: engine.js (getActivePlan, buildDayHTML via meals)
//             sync.js (getDeviceId)
// ─────────────────────────────────────────────────────────────

var quickLogDay=null;
var quickLogSlot=null;
var quickLogEditId=null; // tracks if we're editing an existing meal

// ── MEAL HISTORY ──────────────────────────────────────────────
var mealHistory=[];
try{mealHistory=JSON.parse(localStorage.getItem('fft_meal_history')||'[]');}catch(e){}

function saveMealToHistory(name,cal){
  // Keep unique entries by name, most recent first, max 10
  mealHistory=mealHistory.filter(function(m){return m.name.toLowerCase()!==name.toLowerCase();});
  mealHistory.unshift({name:name,cal:cal});
  if(mealHistory.length>10)mealHistory=mealHistory.slice(0,10);
  try{localStorage.setItem('fft_meal_history',JSON.stringify(mealHistory));}catch(e){}
}

function showQuickLog(dayIdx,slot){
  quickLogDay=dayIdx;
  quickLogSlot=slot;
  quickLogEditId=null;
  document.getElementById('ql-title').textContent='What did you actually eat?';
  document.getElementById('ql-btn').textContent='Log It — Replace This Meal →';
  document.getElementById('ql-name').value='';
  document.getElementById('ql-cal').value='';
  document.getElementById('ql-result').innerHTML='';
  renderMealHistory();
  document.getElementById('quick-log-modal').style.display='block';
  document.body.style.overflow='hidden';
  setTimeout(function(){document.getElementById('ql-name').focus();},300);
}

function showEditMeal(mealId,dayIdx){
  // Find the meal
  var meal=customMeals.filter(function(m){return m.id===mealId;})[0];
  if(!meal)return;
  quickLogDay=dayIdx;
  quickLogSlot=meal.slot;
  quickLogEditId=mealId;
  document.getElementById('ql-title').textContent='Edit This Meal';
  document.getElementById('ql-btn').textContent='Save Changes →';
  document.getElementById('ql-name').value=meal.name;
  document.getElementById('ql-cal').value=meal.cal;
  document.getElementById('ql-result').innerHTML='';
  document.getElementById('ql-history').innerHTML='';
  document.getElementById('quick-log-modal').style.display='block';
  document.body.style.overflow='hidden';
  setTimeout(function(){document.getElementById('ql-name').focus();},300);
}

function renderMealHistory(){
  var el=document.getElementById('ql-history');
  if(!el)return;
  if(!mealHistory.length){el.innerHTML='';return;}
  var html='<div style="font-size:.6rem;font-weight:600;color:var(--gold);letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px;font-family:var(--font-body)">Recent</div>';
  html+='<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">';
  mealHistory.slice(0,5).forEach(function(m){
    html+='<div onclick="useHistoryMeal(\''+m.name.replace(/\x27/g,"\\'")+"',"+m.cal+')" '+
      'style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;'+
      'background:var(--s2);border:1px solid var(--gold-line);border-radius:8px;cursor:pointer">'+
      '<span style="font-size:.85rem;color:var(--t1);font-family:var(--font-body)">'+m.name+'</span>'+
      '<span style="font-size:.8rem;color:var(--gold);font-family:var(--font-display)">'+m.cal+' cal</span>'+
    '</div>';
  });
  html+='</div>';
  el.innerHTML=html;
}

function useHistoryMeal(name,cal){
  document.getElementById('ql-name').value=name;
  document.getElementById('ql-cal').value=cal;
  document.getElementById('ql-name').focus();
}

function closeQuickLog(){
  document.getElementById('quick-log-modal').style.display='none';
  document.body.style.overflow='';
  quickLogDay=null;
  quickLogSlot=null;
  quickLogEditId=null;
}

function saveQuickLog(){
  var name=document.getElementById('ql-name').value.trim();
  var cal=parseInt(document.getElementById('ql-cal').value);
  if(!name){alert('What did you eat?');return;}
  if(!cal||cal<50){alert('Please enter calories (at least 50).');return;}

  if(quickLogEditId){
    // EDIT MODE — update in place, keep same id
    customMeals=customMeals.map(function(m){
      if(m.id===quickLogEditId){return Object.assign({},m,{name:name,cal:cal});}
      return m;
    });
  } else {
    // LOG MODE — replace slot
    customMeals=customMeals.filter(function(m){return!(m.day===quickLogDay&&m.slot===quickLogSlot);});
    customMeals.push({
      day:quickLogDay,name:name,cal:cal,slot:quickLogSlot,
      notes:'Quick logged',id:Date.now(),
      ingredients:[],instructions:[],tip:''
    });
  }

  saveMealToHistory(name,cal);
  try{localStorage.setItem('fft_custom',JSON.stringify(customMeals));}catch(e){}

  var msg=quickLogEditId?'Updated — <strong>'+name+' ('+cal+' cal)</strong>':'Logged — <strong>'+name+' ('+cal+' cal)</strong>';
  document.getElementById('ql-result').innerHTML=
    '<div style="padding:10px 14px;background:var(--s2);border:1px solid var(--gold-line);border-left:2px solid var(--gold);border-radius:8px;font-size:.82rem;color:var(--t2);font-style:italic">'+msg+'</div>';

  setTimeout(function(){
    var day=quickLogEditId?quickLogDay:(quickLogDay||0);
    closeQuickLog();
    refreshCurrentView(day);
    buildDashDayTabs();
  },1400);
}
// ── END QUICK LOG ──────────────────────────────────────────────


// ── MEAL HISTORY ──────────────────────────────────────────────
var mealHistoryLoaded=false;
var mealHistoryCache=null;



function buildMealSnapshot(){
  // Build a snapshot of today's actual meals
  var today=new Date().toISOString().split('T')[0];
  var todayIdx=new Date().getDay()===0?6:new Date().getDay()-1;
  var plan=currentPlan;
  if(!plan||!plan.cal)return null;

  // Get today's day meals from the plan
  var activePlan=typeof getActivePlan==='function'?getActivePlan():null;
  var dayPlan=activePlan?activePlan[todayIdx]:null;

  // Get any custom meals for today
  var todayCustom=(customMeals||[]).filter(function(m){return m.day===todayIdx;});

  // Get weight logged today if any
  var todayWeight=null;
  if(weightLog&&weightLog.length){
    var todayEntry=weightLog.filter(function(e){return e.d===today;});
    if(todayEntry.length)todayWeight=todayEntry[todayEntry.length-1].w;
  }

  var snapshot={
    date:today,
    cal:plan.cal,
    phase:plan.phase,
    weight:todayWeight,
    isDrinking:!!(drinkingDays&&drinkingDays[todayIdx]),
    meals:{
      first:null,
      dinner:null,
      dessert:null,
      custom:[]
    }
  };

  // Foundation meals
  if(dayPlan){
    var effectiveScale=plan.cal/(dayPlan.first.c+dayPlan.dinner.c+dayPlan.dessert.c);
    snapshot.meals.first={
      name:null,// derived on render
      ingredients:dayPlan.first.i,
      cal:Math.round(dayPlan.first.c*effectiveScale)
    };
    snapshot.meals.dinner={
      name:null,
      ingredients:dayPlan.dinner.i,
      cal:Math.round(dayPlan.dinner.c*effectiveScale)
    };
    snapshot.meals.dessert={
      name:null,
      ingredients:dayPlan.dessert.i,
      cal:Math.round(dayPlan.dessert.c*effectiveScale)
    };
  }

  // Custom/swapped meals override foundation
  todayCustom.forEach(function(m){
    var slot=m.slot;
    if(slot==='first'||slot==='dinner'||slot==='dessert'){
      snapshot.meals[slot]={
        name:m.name,
        ingredients:(m.ingredients||[]).map(function(i){return i.item+(i.amount?' '+i.amount:'');}),
        cal:m.cal,
        notes:m.notes||''
      };
    } else {
      snapshot.meals.custom.push({name:m.name,cal:m.cal,notes:m.notes||''});
    }
  });

  return snapshot;
}

function saveMealDaySnapshot(){
  var snapshot=buildMealSnapshot();
  if(!snapshot)return;
  var deviceId=getDeviceId();
  if(!deviceId)return;
  fetch('/.netlify/functions/saveMealDay',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({deviceId:deviceId,date:snapshot.date,snapshot:snapshot})
  }).catch(function(){});
  // Invalidate cache so next view reloads
  mealHistoryLoaded=false;
  mealHistoryCache=null;
}

function loadMealHistory(){
  var loading=document.getElementById('meal-history-loading');
  var contentEl=document.getElementById('meal-history-content');
  var emptyEl=document.getElementById('meal-history-empty');
  if(loading)loading.style.display='block';
  if(contentEl)contentEl.style.display='none';
  if(emptyEl)emptyEl.style.display='none';

  var deviceId=getDeviceId();
  if(!deviceId){
    if(loading)loading.style.display='none';
    if(emptyEl)emptyEl.style.display='block';
    return;
  }

  fetch('/.netlify/functions/loadMealHistory',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({deviceId:deviceId,days:30})
  })
  .then(function(r){return r.json();})
  .then(function(data){
    mealHistoryLoaded=true;
    mealHistoryCache=data.history||[];
    if(loading)loading.style.display='none';
    if(!mealHistoryCache.length){
      if(emptyEl)emptyEl.style.display='block';
    } else {
      if(contentEl)contentEl.style.display='block';
      renderMealHistory(mealHistoryCache);
    }
  })
  .catch(function(){
    mealHistoryLoaded=true;
    mealHistoryCache=[];
    if(loading)loading.style.display='none';
    if(emptyEl)emptyEl.style.display='block';
  });
}


function renderMealHistory(history){
  var el=document.getElementById('meal-history-content');
  if(!el)return;
  if(!history||!history.length){el.innerHTML='';return;}

  // Group by week
  var weeks={};
  history.forEach(function(day){
    if(!day||!day.date)return;
    var d=new Date(day.date+'T12:00:00');
    var mon=new Date(d);
    mon.setDate(d.getDate()-((d.getDay()+6)%7));// Monday
    var wk=mon.toISOString().split('T')[0];
    if(!weeks[wk])weeks[wk]=[];
    weeks[wk].push(day);
  });

  var MONTH_NAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var html='';

  Object.keys(weeks).sort().reverse().forEach(function(wk){
    var days=weeks[wk].sort(function(a,b){return b.date.localeCompare(a.date);});
    var wkDate=new Date(wk+'T12:00:00');
    var wkEnd=new Date(wkDate);wkEnd.setDate(wkDate.getDate()+6);
    var wkLabel=MONTH_NAMES[wkDate.getMonth()]+' '+wkDate.getDate()+' – '+MONTH_NAMES[wkEnd.getMonth()]+' '+wkEnd.getDate();

    html+='<div style="margin-bottom:20px">';
    html+='<div style="font-size:.58rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;font-family:var(--font-body)">Week of '+wkLabel+'</div>';

    days.forEach(function(day){
      var d=new Date(day.date+'T12:00:00');
      var dayLabel=DAY_NAMES[d.getDay()]+', '+MONTH_NAMES[d.getMonth()]+' '+d.getDate();
      var phaseLabel={aggressive:'Cutting',moderate:'Steady Cut',mild:'Dialing In',landing:'Landing',maintenance:'Maintenance'}[day.phase]||day.phase||'';
      var isDrink=day.isDrinking;

      html+='<div style="background:var(--card);border:1px solid var(--gold-line);border-radius:10px;margin-bottom:8px;overflow:hidden">';
      // Day header
      var bodyId='mhb-'+day.date.replace(/-/g,'');
      html+='<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--gold-line);cursor:pointer" onclick="mhToggle(this)">';
      html+='<div>';
      html+='<div style="font-family:var(--font-display);font-size:.95rem;font-weight:600;color:var(--t1)">'+dayLabel+'</div>';
      html+='<div style="font-size:.68rem;color:var(--t3);margin-top:2px">';
      html+=day.cal?day.cal.toLocaleString()+' cal':'';
      if(phaseLabel)html+=' · '+phaseLabel;
      if(isDrink)html+=' · 🍻 Drinking night';
      html+='</div>';
      html+='</div>';
      html+='<div style="text-align:right">';
      if(day.weight)html+='<div style="font-size:.85rem;font-weight:700;color:var(--gold-light)">'+day.weight+' lbs</div>';
      html+='<div class="mh-arrow" style="font-size:.65rem;color:var(--t3);margin-top:2px">▼</div>';
      html+='</div>';
      html+='</div>';

      // Day body — collapsed by default
      html+='<div class="mh-body" id="'+bodyId+'" style="display:none;padding:12px 16px">';

      var meals=day.meals||{};
      var slotLabels={first:'First Meal',dinner:'Main Meal',dessert:'Final Meal'};
      ['first','dinner','dessert'].forEach(function(slot){
        var meal=meals[slot];
        if(!meal)return;
        var mealName=meal.name;
        if(!mealName&&meal.ingredients&&meal.ingredients.length){
          var firstIng=(meal.ingredients[0]||'').toLowerCase();
          if(firstIng.indexOf('egg')>=0)mealName='Eggs & Potatoes';
          else if(firstIng.indexOf('cottage')>=0)mealName='Cottage Cheese Bowl';
          else if(firstIng.indexOf('yogurt')>=0||firstIng.indexOf('greek')>=0)mealName=slot==='dessert'?'Yogurt Dessert Bowl':'Greek Yogurt Bowl';
          else if(firstIng.indexOf('chicken')>=0)mealName='Honey Soy Chicken';
          else if(firstIng.indexOf('beef')>=0||firstIng.indexOf('sirloin')>=0)mealName='Beef & Potatoes';
          else if(firstIng.indexOf('salmon')>=0)mealName='Honey Soy Salmon';
          else mealName=slotLabels[slot];
        }
        html+='<div style="padding:8px 0;border-bottom:1px solid rgba(200,160,74,.08)">';
        html+='<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">';
        html+='<div style="font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t3)">'+slotLabels[slot]+'</div>';
        html+='<div style="font-size:.78rem;color:var(--t2)">'+meal.cal+' cal</div>';
        html+='</div>';
        html+='<div style="font-size:.85rem;color:var(--t1);font-family:var(--font-display);font-weight:600;margin-bottom:4px">'+mealName+'</div>';
        if(meal.notes&&meal.notes.indexOf('Eating out')>=0){
          html+='<div style="font-size:.72rem;color:var(--gold);font-style:italic">'+meal.notes+'</div>';
        } else if(meal.ingredients&&meal.ingredients.length){
          html+='<div style="font-size:.75rem;color:var(--t3)">'+meal.ingredients.slice(0,4).join(' · ')+(meal.ingredients.length>4?' · …':'')+'</div>';
        }
        html+='</div>';
      });

      // Custom extras
      if(meals.custom&&meals.custom.length){
        meals.custom.forEach(function(m){
          html+='<div style="padding:8px 0;border-bottom:1px solid rgba(200,160,74,.08)">';
          html+='<div style="font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--t3)">Extra</div>';
          html+='<div style="font-size:.85rem;color:var(--t1);font-family:var(--font-display);font-weight:600">'+m.name+'</div>';
          if(m.notes)html+='<div style="font-size:.72rem;color:var(--gold);font-style:italic">'+m.notes+'</div>';
          html+='</div>';
        });
      }

      html+='</div>';// end mh-body
      html+='</div>';// end day card
    });

    html+='</div>';// end week group
  });

  el.innerHTML=html;
}


function mhToggle(headerEl){
  var card=headerEl.parentElement;
  var body=card.querySelector('.mh-body');
  var arrow=headerEl.querySelector('.mh-arrow');
  if(!body)return;
  var isOpen=body.style.display!=='none';
  body.style.display=isOpen?'none':'block';
  if(arrow)arrow.textContent=isOpen?'▼':'▲';
}
