// ─────────────────────────────────────────────────────────────
// sync.js — Loftin Method Data Persistence
// Handles server sync via Netlify Blobs using cookie-based device ID.
// Globals used: localStorage, navigator, fetch
// ─────────────────────────────────────────────────────────────

function getDeviceId(){
  var match=document.cookie.match(/(?:^|;\s*)fft_device=([^;]+)/);
  if(match)return match[1];
  var id='fft-'+Date.now().toString(36)+'-'+Math.random().toString(36).substr(2,9);
  var exp=new Date();exp.setFullYear(exp.getFullYear()+10);
  document.cookie='fft_device='+id+';expires='+exp.toUTCString()+';path=/;SameSite=Lax';
  return id;
}

function buildSavePayload(){
  return {
    deviceId:getDeviceId(),
    data:{
      fft_plan:localStorage.getItem('fft_plan'),
      fft_name:localStorage.getItem('fft_name'),
      fft_workmode:localStorage.getItem('fft_workmode'),
      fft_age:localStorage.getItem('fft_age'),
      fft_log:localStorage.getItem('fft_log'),
      fft_meal_prefs:localStorage.getItem('fft_meal_prefs'),
      fft_swaps:localStorage.getItem('fft_swaps'),
      fft_skipped:localStorage.getItem('fft_skipped'),
      fft_milestones:localStorage.getItem('fft_milestones'),
      fft_custom:localStorage.getItem('fft_custom'),
      fft_summary_dismissed:localStorage.getItem('fft_summary_dismissed'),
      fft_saved_meals:localStorage.getItem('fft_saved_meals'),
      fft_group_id:localStorage.getItem('fft_group_id'),
      fft_dinner_theme:localStorage.getItem('fft_dinner_theme'),
      fft_drinking_days: window.FFT_IS_IPAD ? undefined : localStorage.getItem('fft_drinking_days'),
    }
  };
}

var _groupSyncDebounceTimer = null;
function _scheduleGroupSync() {
  if (window.FFT_IS_IPAD) return;
  if (!localStorage.getItem('fft_group_id')) return;
  clearTimeout(_groupSyncDebounceTimer);
  _groupSyncDebounceTimer = setTimeout(function() {
    _doGroupSync();
  }, 2000);
}

function saveAllData(){
  if(!localStorage.getItem('fft_name'))return;
  var payload=JSON.stringify(buildSavePayload());
  if(navigator.sendBeacon){
    var blob=new Blob([payload],{type:'application/json'});
    navigator.sendBeacon('/.netlify/functions/saveData',blob);
  } else {
    fetch('/.netlify/functions/saveData',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:payload
    }).catch(function(){});
  }
  _scheduleGroupSync();
}

function _refreshWeeklyGridIfOpen() {
  try {
    var overlay = document.getElementById('weekly-grid-overlay');
    if (overlay && overlay.style.display !== 'none' && typeof renderWeeklyGrid === 'function') {
      renderWeeklyGrid();
    }
  } catch(e) {}
}

// Cache groupId from a server response into localStorage.
// The phone doesn't receive groupId during the link-code flow — only the iPad
// does on claim. This ensures the phone gets it cached after the first
// successful sync so _doGroupSync can always pass it as a body fallback.
function _cacheGroupId(d) {
  try {
    if (d && d.groupId && !localStorage.getItem('fft_group_id')) {
      localStorage.setItem('fft_group_id', d.groupId);
    }
  } catch(e) {}
}

function restoreFromServer(callback){
  var deviceId=getDeviceId();
  if(!deviceId){callback(false);return;}
  fetch('/.netlify/functions/loadData',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({deviceId:deviceId})
  }).then(function(res){return res.json();})
  .then(function(result){
    if(result.found&&result.data){
      var d=result.data;
      var keys=['fft_plan','fft_name','fft_workmode','fft_age',
                'fft_meal_prefs','fft_swaps','fft_skipped','fft_milestones','fft_custom','fft_summary_dismissed','fft_saved_meals','fft_dinner_theme'];
      keys.forEach(function(k){
        if(d[k]){try{localStorage.setItem(k,d[k]);}catch(e){}}
      });
      try{
        if(typeof d.fft_dinner_theme !== 'undefined'){
          if(d.fft_dinner_theme){localStorage.setItem('fft_dinner_theme',d.fft_dinner_theme);}
          else{localStorage.removeItem('fft_dinner_theme');}
        }
      }catch(e){}
      // Restore groupId to localStorage so _doGroupSync can pass it as body fallback
      try{
        if(d.groupId && !localStorage.getItem('fft_group_id')){
          localStorage.setItem('fft_group_id', d.groupId);
        }
      }catch(e){}
      try{
        if(d.fft_log){
          var serverLog=JSON.parse(d.fft_log);
          var localRaw=localStorage.getItem('fft_log');
          var localLog=localRaw?JSON.parse(localRaw):[];
          var byDate={};
          localLog.concat(serverLog).forEach(function(e){
            if(!byDate[e.d]||(e.t||0)>(byDate[e.d].t||0))byDate[e.d]=e;
          });
          var merged=Object.values(byDate).sort(function(a,b){return b.d.localeCompare(a.d);});
          localStorage.setItem('fft_log',JSON.stringify(merged));
          if(typeof weightLog!=='undefined')weightLog=merged;
        }
      }catch(e){}
      try{if(typeof mealPrefs!=='undefined'&&d.fft_meal_prefs)mealPrefs=JSON.parse(d.fft_meal_prefs);}catch(e){}
      try{if(typeof proteinSwaps!=='undefined'&&d.fft_swaps)proteinSwaps=JSON.parse(d.fft_swaps);}catch(e){}
      try{if(typeof skippedMeals!=='undefined'&&d.fft_skipped)skippedMeals=JSON.parse(d.fft_skipped);}catch(e){}
      try{if(typeof customMeals!=='undefined'&&d.fft_custom)customMeals=JSON.parse(d.fft_custom);}catch(e){}
      try{if(typeof savedMeals!=='undefined'&&d.fft_saved_meals)savedMeals=JSON.parse(d.fft_saved_meals);}catch(e){}
      try{if(typeof userName!=='undefined'&&d.fft_name)userName=d.fft_name;}catch(e){}
      try{if(typeof workMode!=='undefined'&&d.fft_workmode)workMode=d.fft_workmode;}catch(e){}
      try{if(typeof dinnerTheme!=='undefined'){dinnerTheme=d.fft_dinner_theme||null;}}catch(e){}
      try{
        if(d.fft_drinking_days && window.FFT_IS_IPAD){
          drinkingDays=JSON.parse(d.fft_drinking_days);
          localStorage.setItem('fft_drinking_days',d.fft_drinking_days);
        }
      }catch(e){}
      try{
        if(typeof currentPlan!=='undefined'&&d.fft_plan){
          currentPlan=JSON.parse(d.fft_plan);
          if(typeof runPlanMigration==='function')runPlanMigration();
          if(window.FFT_IS_IPAD&&currentPlan.drinkingDays&&typeof currentPlan.drinkingDays==='object'){
            drinkingDays=currentPlan.drinkingDays;
          }
        }
      }catch(e){}
      callback(true);
    } else {
      callback(false);
    }
  }).catch(function(){callback(false);});
}

var _bgSyncInterval = null;
var _bgSyncRunning = false;

function startBackgroundSync() {
  if (_bgSyncInterval) return;
  _doGroupSync();
  _bgSyncInterval = setInterval(_doGroupSync, 60 * 1000);
}

// pullGroupData — fetches the group slot and updates local state.
//
// iPAD PATH: full restore of all fields (plan, meals, prefs, drinking days)
// plus in-memory globals. renderWeeklyGrid() uses currentPlan and mealPrefs
// directly — they must be updated here so the grid is always current.
//
// PHONE PATH: partial restore only. Phone is source of truth for its own plan.
function pullGroupData(callback) {
  var deviceId = getDeviceId();
  var groupId = localStorage.getItem('fft_group_id');
  if (!deviceId || !groupId) { if(callback)callback(false); return; }
  fetch('/.netlify/functions/linkDevice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync', deviceId: deviceId, groupId: groupId })
  })
  .then(function(res) { return res.json(); })
  .then(function(result) {
    if (!result.ok || !result.data) { if(callback)callback(false); return; }
    var d = result.data;

    _cacheGroupId(d);

    // ── iPAD: full restore ──────────────────────────────────
    if (window.FFT_IS_IPAD) {
      // localStorage — all data fields
      var ipadKeys = [
        'fft_plan','fft_name','fft_workmode','fft_age',
        'fft_meal_prefs','fft_swaps','fft_skipped','fft_milestones',
        'fft_custom','fft_summary_dismissed','fft_saved_meals','fft_dinner_theme'
      ];
      ipadKeys.forEach(function(k) {
        if (d[k] !== undefined && d[k] !== null && d[k] !== '') {
          try { localStorage.setItem(k, d[k]); } catch(e) {}
        }
      });

      // In-memory globals — renderWeeklyGrid() reads these directly.
      // Must be updated here since the iPad never runs initApp().
      try {
        if (d.fft_plan) {
          currentPlan = JSON.parse(d.fft_plan);
          if (typeof runPlanMigration === 'function') runPlanMigration();
        }
      } catch(e) {}
      try {
        if (d.fft_meal_prefs) mealPrefs = JSON.parse(d.fft_meal_prefs);
      } catch(e) {}
      // These globals are read by getResolvedDinner() to resolve today-only swaps,
      // dinner theme rotation, and protein/skipped state. Without them in memory,
      // getResolvedDinner() falls through to the template on every call.
      try { if (d.fft_custom) customMeals = JSON.parse(d.fft_custom); } catch(e) {}
      try { if (typeof dinnerTheme !== 'undefined') dinnerTheme = d.fft_dinner_theme || null; } catch(e) {}
      try { if (d.fft_swaps) proteinSwaps = JSON.parse(d.fft_swaps); } catch(e) {}
      try { if (d.fft_skipped) skippedMeals = JSON.parse(d.fft_skipped); } catch(e) {}

      // Drinking days — memory + storage
      try {
        if (d.fft_drinking_days) {
          drinkingDays = JSON.parse(d.fft_drinking_days);
          localStorage.setItem('fft_drinking_days', d.fft_drinking_days);
        }
      } catch(e) {}

      // Weight log — iPad never logs, just take server value
      try {
        if (d.fft_log) {
          weightLog = JSON.parse(d.fft_log);
          localStorage.setItem('fft_log', d.fft_log);
        }
      } catch(e) {}

      // Re-render grid with latest data
      _refreshWeeklyGridIfOpen();
      if(callback)callback(true);
      return;
    }

    // ── PHONE: partial restore ──────────────────────────────
    try {
      if (d.fft_log) {
        var serverLog = JSON.parse(d.fft_log);
        var localLog = weightLog || [];
        var byDate = {};
        localLog.concat(serverLog).forEach(function(e) {
          if (!byDate[e.d] || (e.t||0) > (byDate[e.d].t||0)) byDate[e.d] = e;
        });
        var merged = Object.values(byDate).sort(function(a,b){ return b.d.localeCompare(a.d); });
        weightLog = merged;
        localStorage.setItem('fft_log', JSON.stringify(merged));
      }
    } catch(e) {}
    try {
      if (d.fft_saved_meals) {
        var serverMeals = JSON.parse(d.fft_saved_meals);
        if (serverMeals.length > (savedMeals||[]).length) {
          savedMeals = serverMeals;
          localStorage.setItem('fft_saved_meals', JSON.stringify(serverMeals));
        }
      }
    } catch(e) {}
    if(callback)callback(true);
  })
  .catch(function() { if(callback)callback(false); });
}

function stopBackgroundSync() {
  if (_bgSyncInterval) { clearInterval(_bgSyncInterval); _bgSyncInterval = null; }
}

function _doGroupSync() {
  if (_bgSyncRunning) return;
  var deviceId = getDeviceId();
  if (!deviceId) return;
  if (!localStorage.getItem('fft_name')) return;

  // iPad is read-only — only pull, never push
  if (window.FFT_IS_IPAD) {
    pullGroupData(function() {});
    return;
  }

  _bgSyncRunning = true;

  var groupId = localStorage.getItem('fft_group_id');
  var payload = buildSavePayload();

  fetch('/.netlify/functions/linkDevice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync', deviceId: deviceId, groupId: groupId, data: payload.data })
  })
  .then(function(res) { return res.json(); })
  .then(function(result) {
    _bgSyncRunning = false;
    if (!result.ok || result.reason === 'not-in-group') return;
    var d = result.data;
    if (!d) return;

    _cacheGroupId(d);

    try {
      if (d.fft_log) {
        var serverLog = JSON.parse(d.fft_log);
        var localLog = weightLog || [];
        var byDate = {};
        localLog.concat(serverLog).forEach(function(e) {
          if (!byDate[e.d] || e.t > (byDate[e.d].t || 0)) byDate[e.d] = e;
        });
        var merged = Object.values(byDate).sort(function(a, b) {
          return b.d.localeCompare(a.d);
        });
        if (merged.length > localLog.length || JSON.stringify(merged) !== JSON.stringify(localLog)) {
          weightLog = merged;
          localStorage.setItem('fft_log', JSON.stringify(merged));
          if (document.getElementById('page-dashboard') &&
              document.getElementById('page-dashboard').classList.contains('active')) {
            if (typeof updateDashboard === 'function') updateDashboard();
          }
        }
      }
    } catch(e) {}

    try {
      if (d.fft_saved_meals) {
        var serverMeals = JSON.parse(d.fft_saved_meals);
        var localMeals = savedMeals || [];
        if (serverMeals.length > localMeals.length) {
          savedMeals = serverMeals;
          localStorage.setItem('fft_saved_meals', JSON.stringify(serverMeals));
        }
      }
    } catch(e) {}

    try {
      if (d.fft_custom) {
        var serverCustom = JSON.parse(d.fft_custom);
        var localCustom = customMeals || [];
        if (serverCustom.length > localCustom.length) {
          customMeals = serverCustom;
          localStorage.setItem('fft_custom', JSON.stringify(serverCustom));
        }
      }
    } catch(e) {}

    try {
      if (d.fft_drinking_days) {
        var incoming = JSON.parse(d.fft_drinking_days);
        drinkingDays = incoming;
        localStorage.setItem('fft_drinking_days', d.fft_drinking_days);
        if (document.getElementById('page-dashboard') &&
            document.getElementById('page-dashboard').classList.contains('active')) {
          if (typeof updateDashboard === 'function') updateDashboard();
          if (typeof renderDashDay === 'function') renderDashDay(currentDayIdx);
        }
        _refreshWeeklyGridIfOpen();
      }
    } catch(e) {}
  })
  .catch(function() { _bgSyncRunning = false; });
}

// ─────────────────────────────────────────────────────────────
