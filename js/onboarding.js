// ─────────────────────────────────────────────────────────────
// onboarding.js — Loftin Method Guided Plan Builder
// Multi-step onboarding flow replacing the single-page form.
//
// Architecture:
//   - All step logic and HTML lives here, not in app.html
//   - _ob object holds all user selections across steps
//   - generatePlan() in engine.js is called unchanged at Step 5
//   - Before calling generatePlan(), we inject _ob values into
//     the hidden inputs it expects (inp-height, inp-weight, etc.)
//
// Load order: after state.js, before engine.js
// ─────────────────────────────────────────────────────────────

// ── Onboarding state ─────────────────────────────────────────
var _ob = {
  step:      1,
  totalSteps: 5,
  // Step 1 — Goal
  sex:        'male',
  height:     '',
  weight:     '',
  goalWeight: '',
  age:        '',
  // Step 2 — Routine
  wakeTime:   '06:00',
  bedTime:    '22:00',
  workMode:   'office',
  // Step 3 — Activity
  walkType:   'flat',
  speed:       2.5,
  incline:     3,
  // Step 4 — Food structure
  proteins:   []
};

// ── Entry point ───────────────────────────────────────────────
function startOnboarding() {
  _ob.step = 1;
  _obRender();
}

// ── Render current step ───────────────────────────────────────
function _obRender() {
  var c = document.getElementById('onboarding-container');
  if (!c) return;
  var stepFns = [null, _obStep1, _obStep2, _obStep3, _obStep4, _obStep5];
  c.innerHTML = stepFns[_ob.step]();
  _obRestoreStep();
}

// ── Navigation ────────────────────────────────────────────────
function _obNext() {
  if (!_obValidate()) return;
  _obSave();
  if (_ob.step < _ob.totalSteps) {
    _ob.step++;
    _obRender();
    window.scrollTo(0, 0);
  }
}

function _obBack() {
  _obSave();
  if (_ob.step > 1) {
    _ob.step--;
    _obRender();
    window.scrollTo(0, 0);
  }
}

// ── Validation ────────────────────────────────────────────────
function _obValidate() {
  if (_ob.step === 1) {
    var w = parseFloat(document.getElementById('ob-weight') ? document.getElementById('ob-weight').value : _ob.weight);
    var h = document.getElementById('ob-height') ? document.getElementById('ob-height').value : _ob.height;
    var a = parseFloat(document.getElementById('ob-age') ? document.getElementById('ob-age').value : _ob.age);
    if (!h)              return _obError('Please select your height.');
    if (!w || w < 80)    return _obError('Please enter a valid current weight.');
    if (!a || a < 18 || a > 99) return _obError('Please enter a valid age (18–99).');
  }
  return true;
}

function _obError(msg) {
  var el = document.getElementById('ob-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  return false;
}

// ── Save step values to _ob ───────────────────────────────────
function _obSave() {
  if (_ob.step === 1) {
    var h = document.getElementById('ob-height');
    var w = document.getElementById('ob-weight');
    var a = document.getElementById('ob-age');
    var g = document.getElementById('ob-goal');
    if (h) _ob.height     = h.value;
    if (w) _ob.weight     = w.value;
    if (a) _ob.age        = a.value;
    if (g) _ob.goalWeight = g.value;
  }
  if (_ob.step === 2) {
    var wk = document.getElementById('ob-wake');
    var bd = document.getElementById('ob-bed');
    if (wk) _ob.wakeTime = wk.value;
    if (bd) _ob.bedTime  = bd.value;
  }
  if (_ob.step === 4) {
    var checked = [];
    document.querySelectorAll('.ob-protein-btn.active').forEach(function(b) {
      checked.push(b.getAttribute('data-protein'));
    });
    _ob.proteins = checked;
  }
}

// ── Restore values when re-rendering ─────────────────────────
function _obRestoreStep() {
  if (_ob.step === 1) {
    var h = document.getElementById('ob-height');
    var w = document.getElementById('ob-weight');
    var a = document.getElementById('ob-age');
    var g = document.getElementById('ob-goal');
    if (h && _ob.height)     h.value = _ob.height;
    if (w && _ob.weight)     w.value = _ob.weight;
    if (a && _ob.age)        a.value = _ob.age;
    if (g && _ob.goalWeight) g.value = _ob.goalWeight;
  }
  if (_ob.step === 2) {
    var wk = document.getElementById('ob-wake');
    var bd = document.getElementById('ob-bed');
    if (wk) wk.value = _ob.wakeTime;
    if (bd) bd.value = _ob.bedTime;
  }
  if (_ob.step === 4) {
    document.querySelectorAll('.ob-protein-btn').forEach(function(b) {
      if (_ob.proteins.indexOf(b.getAttribute('data-protein')) >= 0) {
        b.classList.add('active');
      }
    });
  }
}

// ── Shared: step progress bar ─────────────────────────────────
function _obProgress(step) {
  var labels = ['Goal','Routine','Activity','Food','Generate'];
  var pct = ((step - 1) / 4) * 100;
  var dots = labels.map(function(l, i) {
    var active = i + 1 === step;
    var done   = i + 1 < step;
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px">' +
      '<div style="width:8px;height:8px;border-radius:50%;background:' +
        (done ? 'var(--gold)' : active ? 'var(--gold)' : 'rgba(103,232,249,.2)') +
      ';transition:background .3s"></div>' +
      '<span style="font-size:.5rem;letter-spacing:.08em;text-transform:uppercase;color:' +
        (active ? 'var(--gold-light)' : done ? 'var(--gold-light)' : 'var(--t3)') +
      '">' + l + '</span></div>';
  }).join('<div style="flex:1;height:1px;background:rgba(103,232,249,.15);margin-bottom:14px;align-self:center"></div>');

  return '<div style="margin-bottom:28px">' +
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">' +
      dots +
    '</div></div>';
}

// ── Shared: section label ─────────────────────────────────────
function _obLabel(text) {
  return '<div style="font-size:.58rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;' +
    'color:rgba(0,212,255,.6);margin-bottom:10px">' + text + '</div>';
}

// ── Shared: back + continue buttons ──────────────────────────
function _obButtons(step, continueLabel) {
  continueLabel = continueLabel || 'Continue →';
  var back = step > 1
    ? '<button onclick="_obBack()" style="background:var(--s2);border:1px solid var(--border);' +
      'color:var(--t2);border-radius:14px;padding:14px 20px;font-size:.85rem;font-weight:600;cursor:pointer">' +
      '← Back</button>'
    : '<div></div>';
  return '<div id="ob-error" style="display:none;color:#e07b6a;font-size:.78rem;margin-bottom:10px;' +
    'text-align:center;font-weight:600"></div>' +
    '<div style="display:grid;grid-template-columns:' + (step > 1 ? 'auto 1fr' : '1fr') + ';gap:10px;margin-top:28px">' +
      back +
      '<button onclick="_obNext()" style="background:var(--gold);border:none;color:var(--bg);' +
      'border-radius:14px;padding:16px;font-size:.92rem;font-weight:800;cursor:pointer;letter-spacing:.02em">' +
      continueLabel + '</button>' +
    '</div>';
}

// ══════════════════════════════════════════════════════════════
// STEP 1 — YOUR GOAL
// ══════════════════════════════════════════════════════════════
function _obStep1() {
  var heights = [];
  var labels = {60:"5'0\"",61:"5'1\"",62:"5'2\"",63:"5'3\"",64:"5'4\"",65:"5'5\"",
                66:"5'6\"",67:"5'7\"",68:"5'8\"",69:"5'9\"",70:"5'10\"",71:"5'11\"",
                72:"6'0\"",73:"6'1\"",74:"6'2\"",75:"6'3\"",76:"6'4\"",77:"6'5\"",
                78:"6'6\"",79:"6'7\"",80:"6'8\""};
  heights.push('<option value="" disabled selected>Select height</option>');
  for (var in_ = 60; in_ <= 80; in_++) {
    heights.push('<option value="' + in_ + '">' + labels[in_] + '</option>');
  }

  return '<div style="padding:4px 0 24px">' +
    _obProgress(1) +

    '<div style="margin-bottom:32px">' +
      '<div style="font-size:1.6rem;font-weight:800;color:var(--t1);line-height:1.2;margin-bottom:8px">' +
        "Let's build your structure." +
      '</div>' +
      '<div style="font-size:.88rem;color:var(--t3);line-height:1.6">' +
        'A few details so the system can calculate your exact targets.' +
      '</div>' +
    '</div>' +

    // Sex
    _obLabel('Biological Sex') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px">' +
      '<button id="ob-sex-male" onclick="_obSetSex(\'male\')" class="ob-sex-btn' + (_ob.sex==='male'?' active':'') + '" ' +
        'style="padding:16px;border-radius:14px;border:1px solid;font-size:.9rem;font-weight:700;cursor:pointer;' +
        'background:' + (_ob.sex==='male'?'rgba(0,212,255,.12)':'var(--s2)') + ';' +
        'border-color:' + (_ob.sex==='male'?'rgba(0,212,255,.4)':'var(--border)') + ';' +
        'color:' + (_ob.sex==='male'?'var(--gold-light)':'var(--t2)') + '">Male</button>' +
      '<button id="ob-sex-female" onclick="_obSetSex(\'female\')" class="ob-sex-btn' + (_ob.sex==='female'?' active':'') + '" ' +
        'style="padding:16px;border-radius:14px;border:1px solid;font-size:.9rem;font-weight:700;cursor:pointer;' +
        'background:' + (_ob.sex==='female'?'rgba(0,212,255,.12)':'var(--s2)') + ';' +
        'border-color:' + (_ob.sex==='female'?'rgba(0,212,255,.4)':'var(--border)') + ';' +
        'color:' + (_ob.sex==='female'?'var(--gold-light)':'var(--t2)') + '">Female</button>' +
    '</div>' +

    // Height + Age row
    _obLabel('About You') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">' +
      '<div>' +
        '<div style="font-size:.72rem;color:var(--t3);margin-bottom:6px">Height</div>' +
        '<select id="ob-height" style="width:100%;padding:14px 12px;background:var(--s2);border:1px solid var(--border);' +
          'border-radius:12px;color:var(--t1);font-size:.9rem;appearance:none;-webkit-appearance:none">' +
          heights.join('') +
        '</select>' +
      '</div>' +
      '<div>' +
        '<div style="font-size:.72rem;color:var(--t3);margin-bottom:6px">Age</div>' +
        '<input id="ob-age" type="number" placeholder="e.g. 38" min="18" max="99" ' +
          'style="width:100%;padding:14px 12px;background:var(--s2);border:1px solid var(--border);' +
          'border-radius:12px;color:var(--t1);font-size:.9rem;box-sizing:border-box">' +
      '</div>' +
    '</div>' +

    // Weight + Goal row
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">' +
      '<div>' +
        '<div style="font-size:.72rem;color:var(--t3);margin-bottom:6px">Current Weight <span style="color:var(--gold-light)">(lbs)</span></div>' +
        '<input id="ob-weight" type="number" placeholder="e.g. 220" min="80" max="700" ' +
          'style="width:100%;padding:14px 12px;background:var(--s2);border:1px solid var(--border);' +
          'border-radius:12px;color:var(--t1);font-size:.9rem;box-sizing:border-box">' +
      '</div>' +
      '<div>' +
        '<div style="font-size:.72rem;color:var(--t3);margin-bottom:6px">Goal Weight <span style="opacity:.55;font-size:.65rem">(optional)</span></div>' +
        '<input id="ob-goal" type="number" placeholder="e.g. 185" min="80" max="400" ' +
          'style="width:100%;padding:14px 12px;background:var(--s2);border:1px solid var(--border);' +
          'border-radius:12px;color:var(--t1);font-size:.9rem;box-sizing:border-box">' +
      '</div>' +
    '</div>' +

    '<div style="font-size:.68rem;color:var(--t3);margin-bottom:24px;font-style:italic">' +
      'Goal weight helps track your progress — the system calculates your deficit automatically.' +
    '</div>' +

    _obButtons(1);
}

function _obSetSex(sex) {
  _ob.sex = sex;
  ['male','female'].forEach(function(s) {
    var btn = document.getElementById('ob-sex-' + s);
    if (!btn) return;
    var active = s === sex;
    btn.style.background     = active ? 'rgba(0,212,255,.12)' : 'var(--s2)';
    btn.style.borderColor    = active ? 'rgba(0,212,255,.4)'  : 'var(--border)';
    btn.style.color          = active ? 'var(--gold-light)'   : 'var(--t2)';
  });
}

// ══════════════════════════════════════════════════════════════
// STEPS 2–5 — Placeholders (built in next sessions)
// ══════════════════════════════════════════════════════════════
function _obStep2() { return '<div style="padding:4px 0 24px">' + _obProgress(2) + '<div style="color:var(--t2)">Step 2 — Coming next session</div>' + _obButtons(2); }
function _obStep3() { return '<div style="padding:4px 0 24px">' + _obProgress(3) + '<div style="color:var(--t2)">Step 3 — Coming next session</div>' + _obButtons(3); }
function _obStep4() { return '<div style="padding:4px 0 24px">' + _obProgress(4) + '<div style="color:var(--t2)">Step 4 — Coming next session</div>' + _obButtons(4); }
function _obStep5() { return '<div style="padding:4px 0 24px">' + _obProgress(5) + '<div style="color:var(--t2)">Step 5 — Coming next session</div>' + _obButtons(5); }

// ── Inject values into engine.js hidden inputs ────────────────
// Called just before generatePlan() — bridges onboarding → engine
function _obInjectAndGenerate() {
  function _set(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }
  _set('inp-height', _ob.height);
  _set('inp-weight', _ob.weight);
  _set('inp-age',    _ob.age);
  _set('inp-goal',   _ob.goalWeight || '');
  _set('inp-sex',    _ob.sex);
  _set('inp-wake',   _ob.wakeTime);
  _set('inp-bed',    _ob.bedTime);
  // Walk type (engine.js reads S.walkType directly, already set via setWalkType())
  if (typeof setWalkType === 'function') {
    setWalkType(_ob.walkType, null);
    if (_ob.walkType !== 'flat') {
      if (typeof setSpeed   === 'function') setSpeed(_ob.speed, null);
      if (typeof setIncline === 'function') setIncline(_ob.incline, null);
    }
  }
  if (typeof setWorkMode === 'function') setWorkMode(_ob.workMode, null);
  generatePlan();
}
