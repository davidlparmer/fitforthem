// ─────────────────────────────────────────────────────────────
// devicelink.js — Loftin Method Device Linking
// Generates and claims 6-digit codes to sync data across devices.
// Globals used: currentPlan, userName, workMode, weightLog,
//               mealPrefs, proteinSwaps, skippedMeals, customMeals
// Depends on: sync.js (getDeviceId, saveAllData)
// ─────────────────────────────────────────────────────────────

var _linkCodeTimer = null;

function openDeviceLink() {
  var modal = document.getElementById('device-link-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  renderDeviceLinkHome();
}

function closeDeviceLink() {
  var modal = document.getElementById('device-link-modal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  if (_linkCodeTimer) { clearInterval(_linkCodeTimer); _linkCodeTimer = null; }
}

function renderDeviceLinkHome() {
  var content = document.getElementById('device-link-content');
  if (!content) return;
  content.innerHTML =
    '<p style="font-size:.85rem;color:var(--t2);margin-bottom:24px;line-height:1.65">' +
      'Link this device to another — phone, tablet, or computer — so your plan, meals, and weight log stay in sync everywhere.' +
    '</p>' +
    '<button onclick="renderDeviceLinkGenerate()" style="width:100%;padding:16px;background:linear-gradient(150deg,var(--s3),var(--s2));border:1px solid var(--gold-line);border-top:1px solid rgba(184,150,60,.4);border-radius:12px;color:var(--gold-light);font-size:.85rem;font-weight:700;cursor:pointer;margin-bottom:12px;font-family:var(--font-body);letter-spacing:.06em;text-transform:uppercase">' +
      'Get a Link Code \u2192' +
    '</button>' +
    '<button onclick="renderDeviceLinkClaim()" style="width:100%;padding:16px;background:none;border:1px solid var(--gold-line);border-radius:12px;color:var(--t2);font-size:.85rem;font-weight:600;cursor:pointer;margin-bottom:24px;font-family:var(--font-body);letter-spacing:.06em;text-transform:uppercase">' +
      'Enter a Code from Another Device' +
    '</button>' +
    '<div style="border-top:1px solid rgba(184,150,60,.1);padding-top:20px">' +
      '<div style="font-size:.65rem;font-weight:700;color:var(--t3);letter-spacing:.16em;text-transform:uppercase;font-family:var(--font-body);margin-bottom:10px">Having sync problems?</div>' +
      '<button onclick="renderDeviceLinkResync()" style="width:100%;padding:13px;background:none;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:var(--t2);font-size:.8rem;font-weight:600;cursor:pointer;font-family:var(--font-body);letter-spacing:.04em;text-transform:uppercase">' +
        'Reset & Resync This Device' +
      '</button>' +
    '</div>' +
    '<p style="font-size:.72rem;color:var(--t3);margin-top:16px;text-align:center;line-height:1.6">' +
      'Codes expire in 10 minutes. Your data is never shared with anyone else.' +
    '</p>';
}

function renderDeviceLinkGenerate() {
  var content = document.getElementById('device-link-content');
  if (!content) return;
  content.innerHTML =
    '<div style="text-align:center;padding:10px 0">' +
      '<div style="font-size:.7rem;font-weight:700;color:var(--t2);letter-spacing:.18em;text-transform:uppercase;margin-bottom:16px;font-family:var(--font-body)">Your Link Code</div>' +
      '<div id="dl-code-display" style="font-size:3rem;font-weight:700;color:var(--gold-light);letter-spacing:.25em;font-family:var(--font-display);margin-bottom:8px">—</div>' +
      '<div id="dl-code-timer" style="font-size:.78rem;color:var(--t2);margin-bottom:24px"></div>' +
      '<p style="font-size:.82rem;color:var(--t2);line-height:1.65;margin-bottom:24px">' +
        'Open the app on your other device, tap <strong style="color:var(--t1)">Link Device</strong>, then tap <strong style="color:var(--t1)">Enter a Code</strong> and type this number.' +
      '</p>' +
      '<div id="dl-gen-status" style="font-size:.8rem;color:var(--t2);min-height:20px"></div>' +
    '</div>' +
    '<button onclick="renderDeviceLinkHome()" style="width:100%;padding:12px;background:none;border:none;color:var(--t2);font-size:.82rem;cursor:pointer;margin-top:16px">← Back</button>';

  _generateLinkCode();
}

async function _generateLinkCode() {
  var codeEl = document.getElementById('dl-code-display');
  var timerEl = document.getElementById('dl-code-timer');
  var statusEl = document.getElementById('dl-gen-status');

  if (codeEl) codeEl.textContent = '...';
  if (timerEl) timerEl.textContent = '';

  try {
    var res = await fetch('/.netlify/functions/linkDevice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', deviceId: getDeviceId() })
    });
    var data = await res.json();

    if (!data.ok || !data.code) throw new Error(data.error || 'Failed to generate code');

    // Display code in two groups of 3 for readability
    var code = data.code;
    var display = code.substring(0, 3) + ' ' + code.substring(3, 6);
    if (codeEl) codeEl.textContent = display;

    // Countdown timer
    var secondsLeft = data.expiresIn || 600;
    if (_linkCodeTimer) clearInterval(_linkCodeTimer);
    _linkCodeTimer = setInterval(function() {
      secondsLeft--;
      if (!document.getElementById('dl-code-timer')) {
        clearInterval(_linkCodeTimer); _linkCodeTimer = null; return;
      }
      if (secondsLeft <= 0) {
        clearInterval(_linkCodeTimer); _linkCodeTimer = null;
        if (timerEl) timerEl.textContent = 'Code expired.';
        if (codeEl) { codeEl.textContent = '—'; codeEl.style.opacity = '.3'; }
        if (statusEl) statusEl.innerHTML =
          '<button onclick="renderDeviceLinkGenerate()" style="padding:10px 20px;background:var(--s3);border:1px solid var(--gold-line);border-radius:8px;color:var(--gold-light);font-size:.78rem;cursor:pointer;font-weight:600;font-family:var(--font-body)">Generate New Code</button>';
        return;
      }
      var mins = Math.floor(secondsLeft / 60);
      var secs = secondsLeft % 60;
      if (timerEl) timerEl.textContent = 'Expires in ' + mins + ':' + (secs < 10 ? '0' : '') + secs;
    }, 1000);

    // Trigger initial timer display
    var mins = Math.floor(secondsLeft / 60);
    var secs = secondsLeft % 60;
    if (timerEl) timerEl.textContent = 'Expires in ' + mins + ':' + (secs < 10 ? '0' : '') + secs;

  } catch(err) {
    if (codeEl) codeEl.textContent = '—';
    if (statusEl) statusEl.textContent = 'Could not generate code. Check your connection and try again.';
  }
}

function renderDeviceLinkClaim() {
  var content = document.getElementById('device-link-content');
  if (!content) return;
  content.innerHTML =
    '<p style="font-size:.85rem;color:var(--t2);margin-bottom:20px;line-height:1.65">' +
      'Open the app on your other device and tap <strong style="color:var(--t1)">Get a Link Code</strong>. Enter that code here.' +
    '</p>' +
    '<div style="margin-bottom:16px">' +
      '<label>6-Digit Code</label>' +
      '<input type="number" id="dl-claim-input" placeholder="e.g. 483920" maxlength="6" ' +
        'style="width:100%;padding:16px;border:1px solid rgba(184,150,60,.3);border-radius:10px;font-size:1.4rem;text-align:center;letter-spacing:.2em;background:var(--s2);color:var(--t1);outline:none;font-family:var(--font-display);margin-top:6px" ' +
        'oninput="this.value=this.value.replace(/[^0-9]/g,\'\').substring(0,6)">' +
    '</div>' +
    '<button onclick="claimLinkCode()" style="width:100%;padding:16px;background:linear-gradient(150deg,var(--s3),var(--s2));border:1px solid var(--gold-line);border-top:1px solid rgba(184,150,60,.4);border-radius:12px;color:var(--gold-light);font-size:.85rem;font-weight:700;cursor:pointer;font-family:var(--font-body);letter-spacing:.06em;text-transform:uppercase">' +
      'Link & Sync →' +
    '</button>' +
    '<div id="dl-claim-status" style="font-size:.82rem;color:var(--t2);margin-top:16px;min-height:20px;text-align:center"></div>' +
    '<button onclick="renderDeviceLinkHome()" style="width:100%;padding:12px;background:none;border:none;color:var(--t2);font-size:.82rem;cursor:pointer;margin-top:8px">← Back</button>';
}

async function claimLinkCode() {
  var input = document.getElementById('dl-claim-input');
  var status = document.getElementById('dl-claim-status');
  if (!input || !status) return;

  var code = input.value.replace(/[^0-9]/g, '');
  if (code.length !== 6) {
    status.textContent = 'Please enter the full 6-digit code.';
    return;
  }

  status.innerHTML = '<span style="color:var(--gold)">Linking… this takes a moment.</span>';

  try {
    var res = await fetch('/.netlify/functions/linkDevice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim', deviceId: getDeviceId(), code: code })
    });
    var data = await res.json();

    if (!data.ok) {
      status.textContent = data.reason || 'Something went wrong. Try again.';
      return;
    }

    // Write merged data to localStorage
    var d = data.data;
    var keys = ['fft_plan','fft_name','fft_workmode','fft_age','fft_log',
                'fft_meal_prefs','fft_swaps','fft_skipped','fft_milestones','fft_custom','fft_summary_dismissed','fft_saved_meals'];
    keys.forEach(function(k) {
      if (d[k]) { try { localStorage.setItem(k, d[k]); } catch(e) {} }
    });
    // Store groupId so background sync knows this device is in a group
    if (data.groupId) {
      try { localStorage.setItem('fft_group_id', data.groupId); } catch(e) {}
    }

    // Repopulate all in-memory globals
    try { if (d.fft_log) weightLog = JSON.parse(d.fft_log); } catch(e) {}
    try { if (d.fft_meal_prefs) mealPrefs = JSON.parse(d.fft_meal_prefs); } catch(e) {}
    try { if (d.fft_swaps) proteinSwaps = JSON.parse(d.fft_swaps); } catch(e) {}
    try { if (d.fft_skipped) skippedMeals = JSON.parse(d.fft_skipped); } catch(e) {}
    try { if (d.fft_custom) customMeals = JSON.parse(d.fft_custom); } catch(e) {}
    try { if (d.fft_name) userName = d.fft_name; } catch(e) {}
    try { if (d.fft_workmode) workMode = d.fft_workmode; } catch(e) {}
    try {
      if (d.fft_plan) {
        currentPlan = JSON.parse(d.fft_plan);
        if (typeof runPlanMigration === 'function') runPlanMigration();
      }
    } catch(e) {}

    // Update iPad's own blob with linked data so restoreFromServer()
    // gets current data on next cold launch instead of the stale pre-link blob.
    // Also starts the 15s polling interval for the current session.
    try {
      window.FFT_IS_IPAD = typeof isIpad === 'function' ? isIpad() : window.FFT_IS_IPAD;
      if (typeof saveAllData === 'function') saveAllData();
      // Start polling if not already running (finishBoot() exited early at link screen)
      if (window.FFT_IS_IPAD && typeof pullGroupData === 'function') {
        if (!window._ipadPollStarted) {
          window._ipadPollStarted = true;
          setInterval(function(){ pullGroupData(function(){}); }, 15000);
        }
      }
    } catch(e) {}

    // Show success then close
    var content = document.getElementById('device-link-content');
    if (content) {
      content.innerHTML =
        '<div style="text-align:center;padding:20px 0">' +
          '<div style="font-size:2.5rem;margin-bottom:16px">✓</div>' +
          '<div style="font-size:1.1rem;font-weight:700;color:var(--gold-light);font-family:var(--font-display);margin-bottom:10px">Devices Linked</div>' +
          '<p style="font-size:.85rem;color:var(--t2);line-height:1.65;margin-bottom:24px">' +
            'Your plan and data have been synced to this device. Going forward, both devices will share the same data automatically.' +
          '</p>' +
          '<button onclick="closeDeviceLink();if(currentPlan.cal){updateDashboard();buildDashDayTabs();}" ' +
            'style="width:100%;padding:16px;background:linear-gradient(150deg,var(--s3),var(--s2));border:1px solid var(--gold-line);border-top:1px solid rgba(184,150,60,.4);border-radius:12px;color:var(--gold-light);font-size:.85rem;font-weight:700;cursor:pointer;font-family:var(--font-body);letter-spacing:.06em;text-transform:uppercase">' +
            'Done →' +
          '</button>' +
        '</div>';
    }

  } catch(err) {
    if (status) status.textContent = 'Connection error. Check your network and try again.';
  }
}

// ── RESET & RESYNC ────────────────────────────────────────────
function renderDeviceLinkResync() {
  var content = document.getElementById('device-link-content');
  if (!content) return;
  content.innerHTML =
    '<div style="text-align:center;padding:10px 0">' +
      '<div style="font-size:1.8rem;margin-bottom:14px">⚠️</div>' +
      '<div style="font-size:.95rem;font-weight:700;color:var(--t1);font-family:var(--font-display);margin-bottom:12px">Reset & Resync</div>' +
      '<p style="font-size:.83rem;color:var(--t2);line-height:1.65;margin-bottom:24px">' +
        'This will clear the plan stored on this device and pull fresh data from the server. ' +
        'Your weight log and meals will not be affected. Use this if your data looks wrong after linking.' +
      '</p>' +
      '<button onclick="executeResync()" style="width:100%;padding:16px;background:linear-gradient(150deg,var(--s3),var(--s2));border:1px solid var(--gold-line);border-top:1px solid rgba(184,150,60,.4);border-radius:12px;color:var(--gold-light);font-size:.85rem;font-weight:700;cursor:pointer;margin-bottom:12px;font-family:var(--font-body);letter-spacing:.06em;text-transform:uppercase">' +
        'Reset & Pull Fresh Data' +
      '</button>' +
      '<div id="dl-resync-status" style="font-size:.82rem;color:var(--t2);min-height:20px;margin-bottom:8px"></div>' +
    '</div>' +
    '<button onclick="renderDeviceLinkHome()" style="width:100%;padding:12px;background:none;border:none;color:var(--t2);font-size:.82rem;cursor:pointer">← Back</button>';
}

async function executeResync() {
  var status = document.getElementById('dl-resync-status');
  var btn = document.querySelector('[onclick="executeResync()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Resetting…'; }
  if (status) status.innerHTML = '<span style="color:var(--gold)">Clearing local data and pulling from server…</span>';

  // Clear the local plan so the server copy takes full authority
  try { localStorage.removeItem('fft_plan'); } catch(e) {}
  currentPlan = {};

  // Pull fresh from server
  restoreFromServer(function(found) {
    if (!found) {
      if (status) status.textContent = 'Could not reach server. Check your connection and try again.';
      if (btn) { btn.disabled = false; btn.textContent = 'Reset & Pull Fresh Data'; }
      return;
    }

    // Run migration on whatever came back — catches any zero-value fields
    if (typeof runPlanMigration === 'function') runPlanMigration();

    // Show success and refresh the dashboard
    var content = document.getElementById('device-link-content');
    if (content) {
      content.innerHTML =
        '<div style="text-align:center;padding:20px 0">' +
          '<div style="font-size:2.5rem;margin-bottom:16px">✓</div>' +
          '<div style="font-size:1.1rem;font-weight:700;color:var(--gold-light);font-family:var(--font-display);margin-bottom:10px">Resync Complete</div>' +
          '<p style="font-size:.85rem;color:var(--t2);line-height:1.65;margin-bottom:24px">' +
            'Your data has been refreshed from the server.' +
          '</p>' +
          '<button onclick="closeDeviceLink();if(currentPlan.cal){updateDashboard();buildDashDayTabs();updateDashGreeting();}" ' +
            'style="width:100%;padding:16px;background:linear-gradient(150deg,var(--s3),var(--s2));border:1px solid var(--gold-line);border-top:1px solid rgba(184,150,60,.4);border-radius:12px;color:var(--gold-light);font-size:.85rem;font-weight:700;cursor:pointer;font-family:var(--font-body);letter-spacing:.06em;text-transform:uppercase">' +
            'Done — View My Plan' +
          '</button>' +
        '</div>';
    }
  });
}
