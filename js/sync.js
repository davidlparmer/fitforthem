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
      // iPad is read-only for drinking days — never overwrite the phone's value in the group
      fft_drinking_days: window.FFT_IS_IPAD ? undefined : localStorage.getItem('fft_drinking_days'),
    }
  };
}

// ── IMMEDIATE GROUP PUSH ──────────────────────────────────────
// saveAllData writes to the phone's personal device slot only (fast, beacon).
// The GROUP SLOT — what the iPad reads — is updated by _doGroupSync.
// To ensure the iPad sees changes quickly (drink level, meal swaps, etc.),
// schedule a group push 2 seconds after any save. Debounced so rapid
// toggles produce one request, not one per tap. iPad never calls this.
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
  // Push changes to group slot immediately so the iPad sees updates
  // within ~2 seconds instead of waiting for the 5-minute interval.
  _scheduleGroupSync();
}

// ── WEEKLY GRID REFRESH HELPER ────────────────────────────────
// Re-renders the weekly grid if it is currently open.
// Called after drinkingDays is updated via group sync so the
// iPad always shows the latest drink level without manual reload.
function _refreshWeeklyGridIfOpen() {
  try {
    var overlay = document.getElementById('weekly-grid-overlay');
    if (overlay && overlay.style.display !== 'none' && typeof renderWeeklyGrid === 'function') {
      renderWeeklyGrid();
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
      // Restore groupId → fft_group_id in localStorage.
      //
      // WHY: The phone generates the link code but never gets fft_group_id written to its
      // own localStorage — only the iPad does during claim. Without it, the phone passes
      // groupId: null to _doGroupSync and the server returns not-in-group. The device slot
      // DOES have groupId (written by claim), so we pull it out here and persist it so all
      // future sync calls can pass it as an explicit fallback.
      try{
        if(d.groupId && !localStorage.getItem('fft_group_id')){
          localStorage.setItem('fft_group_id', d.groupId);
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
      // Restore drinking days from server — iPad only.
      // On phone, the cookie is more reliable than the server (beacon may not complete before kill).
      // On iPad, server is the only source of truth (phone writes there, iPad reads).
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
          // Only restore drinkingDays from plan on iPad — phone trusts its cookie
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

// ── BACKGROUND GROUP SYNC ────────────────────────────────────
// Runs every 5 minutes while app is active.
//
// PHONE: pushes current data to group slot, pulls merged result.
// IPAD:  read-only — never writes to server, only pulls from group slot.
//        groupId passed explicitly from localStorage so the server can find
//        the group even if the device slot was overwritten by saveData.
var _bgSyncInterval = null;
var _bgSyncRunning = false;

function startBackgroundSync() {
  if (_bgSyncInterval) return; // already running
  // Run immediately on start, then every 5 minutes
  _doGroupSync();
  _bgSyncInterval = setInterval(_doGroupSync, 5 * 60 * 1000);
}

// Pull-only sync — used on boot to get latest data from group.
//
// For iPad: does a FULL restore of all fields (plan, meals, prefs, drinking days)
// so that when initApp() reads localStorage it gets the phone's data, not the
// iPad's stale personal slot data that restoreFromServer loaded earlier.
//
// For phone: partial restore only (log, saved meals) — phone is source of truth
// for its own plan and should not overwrite its current data with group data.
//
// groupId passed explicitly so server fallback works even after saveData
// writes the device slot without the top-level groupId field.
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

    // ── iPAD: full restore from group slot ──────────────────
    // iPad must mirror the phone completely. restoreFromServer loaded the iPad's
    // personal slot (stale, from claim time). This overwrites everything in
    // localStorage with the group slot's current data so initApp() reads the
    // phone's plan, not the iPad's old one.
    if (window.FFT_IS_IPAD) {
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
      // Drinking days — memory + storage
      try {
        if (d.fft_drinking_days) {
          drinkingDays = JSON.parse(d.fft_drinking_days);
          localStorage.setItem('fft_drinking_days', d.fft_drinking_days);
        }
      } catch(e) {}
      // Weight log — iPad never logs weight so just take the server value directly
      try {
        if (d.fft_log) {
          weightLog = JSON.parse(d.fft_log);
          localStorage.setItem('fft_log', d.fft_log);
        }
      } catch(e) {}
      _refreshWeeklyGridIfOpen();
      if(callback)callback(true);
      return;
    }

    // ── PHONE: partial restore only ─────────────────────────
    // Phone is source of truth — don't overwrite its current plan or prefs.
    // Only sync things that benefit from cross-device merging.

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

  // ── iPAD: read-only — never push data to the group ───────────
  // iPad is a display-only device. It must never overwrite phone data.
  if (window.FFT_IS_IPAD) {
    pullGroupData(function() {});
    return;
  }

  // ── PHONE: push current data, pull merged result ──────────────
  _bgSyncRunning = true;

  var groupId = localStorage.getItem('fft_group_id');
  var payload = buildSavePayload();

  fetch('/.netlify/functions/linkDevice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // groupId passed explicitly — server uses it as fallback if device slot
    // was overwritten by saveData without the top-level groupId field.
    body: JSON.stringify({ action: 'sync', deviceId: deviceId, groupId: groupId, data: payload.data })
  })
  .then(function(res) { return res.json(); })
  .then(function(result) {
    _bgSyncRunning = false;
    if (!result.ok || result.reason === 'not-in-group') return;
    var d = result.data;
    if (!d) return;

    // Merge weight log — critical for cross-device logging
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

    // Sync drinking days — phone is always source of truth.
    // After updating, re-render dashboard and weekly grid if open.
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
// ─────────────────────────────────────────────────────────────
