// ─────────────────────────────────────────────────────────────
// sync.js — Loftin Method Data Persistence
// Handles server sync via Netlify Blobs using cookie-based device ID.
// Globals used: localStorage, navigator, fetch
// ─────────────────────────────────────────────────────────────

// ── iOS PWA DATA PERSISTENCE — Server-side via Netlify Blobs ─────
// iOS wipes localStorage AND Cache API when PWA is killed.
// We persist to server using a device ID stored in a cookie.
// Cookies survive iOS PWA termination — localStorage does not.

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
      fft_drinking_days:localStorage.getItem('fft_drinking_days'),
    }
  };
}

function saveAllData(){
  if(!localStorage.getItem('fft_name'))return;
  var payload=JSON.stringify(buildSavePayload());
  // sendBeacon survives app termination — use it when available
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
      // Restore all keys with blind overwrite — EXCEPT fft_log (merged below)
      var keys=['fft_plan','fft_name','fft_workmode','fft_age',
                'fft_meal_prefs','fft_swaps','fft_skipped','fft_milestones','fft_custom','fft_summary_dismissed','fft_saved_meals','fft_dinner_theme'];
      keys.forEach(function(k){
        if(d[k]){try{localStorage.setItem(k,d[k]);}catch(e){}}
      });
      // fft_dinner_theme handled explicitly — must sync even when empty string (cleared state)
      try{
        if(typeof d.fft_dinner_theme !== 'undefined'){
          if(d.fft_dinner_theme){localStorage.setItem('fft_dinner_theme',d.fft_dinner_theme);}
          else{localStorage.removeItem('fft_dinner_theme');}
        }
      }catch(e){}
      // fft_log: MERGE server + local, never overwrite. Prevents data loss when iOS kills the
      // app before a save completes, or when two devices each have entries the other doesn't.
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
      // Repopulate remaining in-memory globals immediately after restoring localStorage
      try{if(typeof mealPrefs!=='undefined'&&d.fft_meal_prefs)mealPrefs=JSON.parse(d.fft_meal_prefs);}catch(e){}
      try{if(typeof proteinSwaps!=='undefined'&&d.fft_swaps)proteinSwaps=JSON.parse(d.fft_swaps);}catch(e){}
      try{if(typeof skippedMeals!=='undefined'&&d.fft_skipped)skippedMeals=JSON.parse(d.fft_skipped);}catch(e){}
      try{if(typeof customMeals!=='undefined'&&d.fft_custom)customMeals=JSON.parse(d.fft_custom);}catch(e){}
      try{if(typeof savedMeals!=='undefined'&&d.fft_saved_meals)savedMeals=JSON.parse(d.fft_saved_meals);}catch(e){}
      try{if(typeof userName!=='undefined'&&d.fft_name)userName=d.fft_name;}catch(e){}
      try{if(typeof workMode!=='undefined'&&d.fft_workmode)workMode=d.fft_workmode;}catch(e){}
      // Rehydrate dinnerTheme in-memory — handles both set and cleared state
      try{if(typeof dinnerTheme!=='undefined'){dinnerTheme=d.fft_dinner_theme||null;}}catch(e){}
      // Restore drinking days — phone is source of truth, always overwrite
      try{
        if(d.fft_drinking_days){
          drinkingDays=JSON.parse(d.fft_drinking_days);
          localStorage.setItem('fft_drinking_days',d.fft_drinking_days);
        }
      }catch(e){}
      try{
        if(typeof currentPlan!=='undefined'&&d.fft_plan){
          currentPlan=JSON.parse(d.fft_plan);
          if(typeof runPlanMigration==='function')runPlanMigration();
          // Restore drinkingDays from plan — plan is the most reliable persistence path
          if(currentPlan.drinkingDays&&typeof currentPlan.drinkingDays==='object'){
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
// ── BACKGROUND GROUP SYNC ────────────────────────────────────
// Runs every 5 minutes while app is active.
// Pushes current device data to group slot and pulls any newer data.
var _bgSyncInterval = null;
var _bgSyncRunning = false;

function startBackgroundSync() {
  if (_bgSyncInterval) return; // already running
  // Run immediately on start, then every 5 minutes
  _doGroupSync();
  _bgSyncInterval = setInterval(_doGroupSync, 5 * 60 * 1000);
}

// Pull-only sync — used on boot to get latest data from group
// without pushing (avoids overwriting newer phone data with stale computer data)
function pullGroupData(callback) {
  var deviceId = getDeviceId();
  var groupId = localStorage.getItem('fft_group_id');
  if (!deviceId || !groupId) { if(callback)callback(false); return; }
  fetch('/.netlify/functions/linkDevice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync', deviceId: deviceId })
  })
  .then(function(res) { return res.json(); })
  .then(function(result) {
    if (!result.ok || !result.data) { if(callback)callback(false); return; }
    var d = result.data;
    // Merge weight log
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
    // Merge saved meals
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
  if (_bgSyncRunning) return; // prevent overlapping syncs
  var deviceId = getDeviceId();
  if (!deviceId) return;
  if (!localStorage.getItem('fft_name')) return; // not initialized yet

  _bgSyncRunning = true;

  var payload = buildSavePayload();
  payload.action = 'sync';
  payload.data = payload.data; // already set by buildSavePayload

  fetch('/.netlify/functions/linkDevice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sync', deviceId: deviceId, data: payload.data })
  })
  .then(function(res) { return res.json(); })
  .then(function(result) {
    _bgSyncRunning = false;
    if (!result.ok || result.reason === 'not-in-group') return;
    // Got updated group data — merge into local state
    var d = result.data;
    if (!d) return;

    // Merge weight log — critical for cross-device logging
    try {
      if (d.fft_log) {
        var serverLog = JSON.parse(d.fft_log);
        var localLog = weightLog || [];
        // Merge by date, keep all unique entries
        var byDate = {};
        localLog.concat(serverLog).forEach(function(e) {
          if (!byDate[e.d] || e.t > (byDate[e.d].t || 0)) byDate[e.d] = e;
        });
        var merged = Object.values(byDate).sort(function(a, b) {
          return b.d.localeCompare(a.d);
        });
        // Only update if server has entries we don't
        if (merged.length > localLog.length || JSON.stringify(merged) !== JSON.stringify(localLog)) {
          weightLog = merged;
          localStorage.setItem('fft_log', JSON.stringify(merged));
          // Re-render dashboard if visible
          if (document.getElementById('page-dashboard') &&
              document.getElementById('page-dashboard').classList.contains('active')) {
            if (typeof updateDashboard === 'function') updateDashboard();
          }
        }
      }
    } catch(e) {}

    // Sync saved meals
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

    // Sync custom meals
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
  })
  .catch(function() { _bgSyncRunning = false; });
}

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

