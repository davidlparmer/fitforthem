// ─────────────────────────────────────────────────────────────
// ui.js — Loftin Method UI Layer
// Navigation, Claude API helper, light mode, mobile nav, tooltips.
// Globals used: currentPlan, userName, workMode, weightLog,
//               mealPrefs, proteinSwaps, skippedMeals, currentDayIdx,
//               subStatus (all declared in app.html or stripe.js)
// Depends on: all other modules (called from here)
// ─────────────────────────────────────────────────────────────


// GLOBAL restaurant add function — must be defined first
window.restaurantCardItems={};
window.addMealToDay=function(itemKey){
  // Snapshot will be saved after customMeals is updated — trigger async
  setTimeout(saveMealDaySnapshot, 300);
  var stored=window.restaurantCardItems[itemKey];
  if(!stored){alert('Item not found. Try searching again.');return;}
  var item=stored.item;
  var restaurant=stored.restaurant;
  window._pendingRestaurantMeal={name:item.name,cal:item.cal,pro:item.pro||0,carb:item.carb||0,fat:item.fat||0,meal:item.meal||[],restaurant:restaurant};
  document.getElementById('rsp-meal-name').textContent=item.name+' ('+item.cal+' cal)';
  var picker=document.getElementById('restaurant-slot-picker');
  picker.style.cssText='display:flex;position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.5)';
  document.body.style.overflow='hidden';
};
window.addRestaurantMealToDay=function(slot){
  var meal=window._pendingRestaurantMeal;
  if(!meal){alert('No meal selected.');return;}
  var todayIdx=new Date().getDay()===0?6:new Date().getDay()-1;
  // Always work directly with the main customMeals array
  if(typeof customMeals==='undefined')customMeals=[];
  // Remove existing meal in same slot today
  customMeals=customMeals.filter(function(m){return!(m.day===todayIdx&&m.slot===slot);});
  customMeals.push({day:todayIdx,name:meal.name,cal:meal.cal,pro:meal.pro||0,carb:meal.carb||0,fat:meal.fat||0,slot:slot,notes:'Eating out — '+meal.restaurant,id:Date.now(),ingredients:meal.meal?meal.meal.map(function(i){return {item:i,amount:''};}):[],instructions:[],tip:'From '+meal.restaurant});
  window._customMeals=customMeals;
  try{localStorage.setItem('fft_custom',JSON.stringify(customMeals));}catch(e){}
  document.getElementById('restaurant-slot-picker').style.cssText='display:none';
  document.body.style.overflow='';
  if(typeof showPage!=='undefined')showPage('dashboard');
  setTimeout(function(){
    if(typeof buildDashDayTabs!=='undefined'){buildDashDayTabs();renderDashDay(todayIdx);}
    var el=document.getElementById('dash-loss');
    if(el){el.className='adj-banner good';el.innerHTML='<strong>Added</strong> — '+meal.name+' is now in your '+slot+' slot today.';el.classList.remove('hidden');setTimeout(function(){el.classList.add('hidden');},4000);}
  },150);
};
window.closeRestaurantSlotPicker=function(){
  var picker=document.getElementById('restaurant-slot-picker');
  picker.style.cssText='display:none';
  document.body.style.overflow='';
};
function addRestaurantMealToDay(slot){window.addRestaurantMealToDay(slot);}
function closeRestaurantSlotPicker(){window.closeRestaurantSlotPicker();}

// ── GLOBAL STATE ─────────────────────────────────────────────
// All global state declarations (currentPlan, weightLog, customMeals,
// mealPrefs, drinkingDays, etc.) have been moved to state.js,
// which loads immediately after migrate.js so globals exist
// before any other module references them.











// Known major restaurant chains — used to color-code pins


// ── HABIT LOOP SYSTEM ─────────────────────────────────────────
// ── END HABIT LOOP ─────────────────────────────────────────────








async function askClaude(prompt){
  try{
    var res=await fetch('/.netlify/functions/claude',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({prompt:prompt})
    });
    if(!res.ok){
      var errBody=await res.text();
      throw new Error('Server '+res.status+': '+errBody);
    }
    var data=await res.json();
    if(data.error)throw new Error(data.error+(data.details?' — '+data.details:''));
    var text=data.result||'';
    if(!text)throw new Error('Empty response from server');
    return JSON.parse(text.replace(/```json|```/g,'').trim());
  }catch(err){
    console.error('FFT API error:',err);
    throw err;
  }
}



function openMobileMenu(){document.getElementById('mobile-menu').style.display='block';document.body.style.overflow='hidden';}
function closeMobileMenu(){document.getElementById('mobile-menu').style.display='none';document.body.style.overflow='';}


function showPage(id){
  var prevPage=document.querySelector('.page.active');
  var prevId=prevPage?prevPage.id.replace('page-',''):'';
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(function(a){a.classList.remove('active');});
  document.querySelectorAll('.mobile-menu-panel a').forEach(function(a){a.classList.remove('active');});
  var navEl=document.getElementById('nav-'+id);if(navEl)navEl.classList.add('active');
  var mobEl=document.getElementById('mob-'+id);if(mobEl)mobEl.classList.add('active');
  // Hide nav on builder page if no plan built yet
  var hasPlan=!!localStorage.getItem('fft_plan');
  var nav=document.getElementById('main-nav');
  if(id==='builder'&&!hasPlan){nav.style.display='none';}
  else if(nav.style.display==='none'&&hasPlan){nav.style.display='flex';}
  window.scrollTo({top:0,behavior:'instant'});
  if(id==='progress'){document.getElementById('log-d').value=new Date().toISOString().split('T')[0];renderProgress();switchProgressTab('weight');mealHistoryLoaded=false;}
  if(id==='grocery'){setTimeout(function(){generateGroceryList();},50);}
  if(id==='dashboard'){
    updateDashGreeting();
    if(currentPlan.cal){
      updateDashboard();
      // Only rebuild tabs if navigating FROM another page — preserves selected day when re-tapping Home
      if(prevId!=='dashboard'){buildDashDayTabs();}
      else{renderDashDay(currentDayIdx);}
    }
      
  }
  if(id==='recipes'&&typeof renderRecipesPage==='function'){renderRecipesPage();}
  if(id==='builder'&&currentPlan.hIn){
    var hEl=document.getElementById('inp-height');var wEl=document.getElementById('inp-weight');var aEl=document.getElementById('inp-age');var gEl=document.getElementById('inp-goal');
    if(hEl&&currentPlan.hIn)hEl.value=currentPlan.hIn;
    if(wEl&&currentPlan.wLbs)wEl.value=currentPlan.wLbs;
    if(aEl&&currentPlan.age)aEl.value=currentPlan.age;
    if(gEl&&currentPlan.goalWeight)gEl.value=currentPlan.goalWeight;
  }
}





function getDeviceId(){
  var m=document.cookie.match(/(?:^|;\s*)fft_device=([^;]+)/);
  return m?m[1]:'';
}







// Re-render dashboard when app resumes from background (iOS swipe away/back)
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='hidden'){
    // Save before iOS potentially kills the process
    saveAllData();
  } else if(document.visibilityState==='visible'){
    // Always restore from server when resuming — covers localStorage wipe
    restoreFromServer(function(){
      try{weightLog=JSON.parse(localStorage.getItem('fft_log')||'[]');}catch(e){}
      try{mealPrefs=JSON.parse(localStorage.getItem('fft_meal_prefs')||'{}');}catch(e){}
      try{proteinSwaps=JSON.parse(localStorage.getItem('fft_swaps')||'{}');}catch(e){}
      try{skippedMeals=JSON.parse(localStorage.getItem('fft_skipped')||'{}');}catch(e){}
      if(!userName)userName=localStorage.getItem('fft_name')||'';
      if(!workMode)workMode=localStorage.getItem('fft_workmode')||'wfh';
      try{var _sp=localStorage.getItem('fft_plan');if(_sp)currentPlan=JSON.parse(_sp);}catch(e){}
      runPlanMigration();
      updateDashGreeting();
      // Start background group sync if not already running — runs every 5 min while active
      if(typeof startBackgroundSync==='function')startBackgroundSync();
      // Pull group data to merge any cross-device weight entries logged on another device
      if(localStorage.getItem('fft_group_id')){
        pullGroupData(function(){
          if(currentPlan.cal){updateDashboard();var savedDayIdx=currentDayIdx;buildDashDayTabs();currentDayIdx=savedDayIdx;renderDashDay(currentDayIdx);}
        });
      } else {
        if(currentPlan.cal){updateDashboard();var savedDayIdx=currentDayIdx;buildDashDayTabs();currentDayIdx=savedDayIdx;renderDashDay(currentDayIdx);}
      }
    });
  }
});
// Also catch iOS pageshow (back/forward cache restore)
window.addEventListener('pageshow',function(e){
  if(e.persisted){
    // Always restore from server on pageshow — even if fft_name is in localStorage.
    // The fft_name check was skipping restoreFromServer for initialized devices, preventing
    // cross-device log entries from reaching the iPad on cold reopen.
    restoreFromServer(function(){
      try{var _sp=localStorage.getItem('fft_plan');if(_sp)currentPlan=JSON.parse(_sp);}catch(e){}
      runPlanMigration();
      if(!userName)userName=localStorage.getItem('fft_name')||'';
      if(!workMode)workMode=localStorage.getItem('fft_workmode')||'wfh';
      // Pull group data after device restore to merge any cross-device weight entries
      if(localStorage.getItem('fft_group_id')){
        pullGroupData(function(){
          if(currentPlan.cal){updateDashboard();buildDashDayTabs();}
        });
      } else {
        if(currentPlan.cal){updateDashboard();buildDashDayTabs();}
      }
    });
  }
});



function openMoreDrawer(){
  document.getElementById('more-drawer').style.display='block';
  document.getElementById('more-drawer-overlay').style.display='block';
  document.body.style.overflow='hidden';
}
function closeMoreDrawer(){
  document.getElementById('more-drawer').style.display='none';
  document.getElementById('more-drawer-overlay').style.display='none';
  document.body.style.overflow='';
}
window.addEventListener('DOMContentLoaded',function(){
  var _origShowPage=window.showPage;
  window.showPage=function(page){
    if(typeof _origShowPage==='function')_origShowPage(page);
    var tabMap={dashboard:'tab-dashboard',recipes:'tab-meals',progress:'tab-progress',builder:'tab-more',eatout:'tab-more',grocery:'tab-more',about:'tab-more'};
    document.querySelectorAll('#bottom-nav .tab').forEach(function(t){t.classList.remove('active')});
    var tabId=tabMap[page]||'tab-dashboard';
    var el=document.getElementById(tabId);
    if(el)el.classList.add('active');
  };
});

// ── STRIPE SUBSCRIPTION ──────────────────────────────────────
var STRIPE_PK='pk_test_51THw2f7SIAqrERB31THrimsDCcS6H0cpFPjndZREm5gDv0uaG0hzRodcb7H8faPhDOuX79h6nfgpUgEplZthUckt00pc1MTaTG';

// checkSubscription, getDeviceId, isSubscribed moved before boot IIFE



async function restoreSubscription(){
  var status=await checkSubscription();
  if(isSubscribed()){
    hidePaywall();
    alert('Subscription restored. Welcome back!');
  } else {
    alert('No active subscription found for this device. If you believe this is an error, contact david@fitforthem.app');
  }
}

// Stripe return handled in boot sequence above


// ── LIGHT MODE ────────────────────────────────────────────
function toggleLightMode(){
  var isLight=document.body.classList.toggle('light-mode');
  localStorage.setItem('fft_light_mode',isLight?'1':'0');
  var knob=document.getElementById('light-mode-knob');
  var toggle=document.getElementById('light-mode-toggle');
  if(knob){knob.style.transform=isLight?'translateX(20px)':'translateX(0)';knob.style.background=isLight?'var(--gold)':'var(--t2)';}
  if(toggle){toggle.style.background=isLight?'rgba(200,160,74,.3)':'var(--s3)';}
}

function initLightMode(){
  if(localStorage.getItem('fft_light_mode')==='1'){
    document.body.classList.add('light-mode');
    var knob=document.getElementById('light-mode-knob');
    var toggle=document.getElementById('light-mode-toggle');
    if(knob){knob.style.transform='translateX(20px)';knob.style.background='var(--gold)';}
    if(toggle){toggle.style.background='rgba(200,160,74,.3)';}
  }
}

// ── FIRST-TIME TUTORIAL ───────────────────────────────────


// ── ZONE 3 CONTEXTUAL TOOLTIP ─────────────────────────────
function showZone3Tooltip(){
  if(localStorage.getItem('fft_zone3_seen'))return false;
  document.getElementById('zone3-tooltip').style.display='block';
  document.getElementById('zone3-backdrop').style.display='block';
  return true;// block the action on first tap
}

function closeZone3Tooltip(){
  document.getElementById('zone3-tooltip').style.display='none';
  document.getElementById('zone3-backdrop').style.display='none';
  localStorage.setItem('fft_zone3_seen','1');
}


// ── STRIPE CUSTOMER PORTAL ────────────────────────────────




