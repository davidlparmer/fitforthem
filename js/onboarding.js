// ─────────────────────────────────────────────────────────────
// onboarding.js — Loftin Method Guided Plan Builder
// Multi-step onboarding flow replacing the single-page form.
//
// Architecture:
//   - All step logic and HTML lives here, not in app.html
//   - _ob object holds all user selections across steps
//   - generatePlan() in engine.js is called unchanged at Step 5
//   - Before calling generatePlan(), _obInjectAndGenerate()
//     writes _ob values into the hidden inputs engine.js expects
//
// Load order: after engine.js
// ─────────────────────────────────────────────────────────────

// ── Onboarding state ─────────────────────────────────────────
var _ob = {
  step:        1,
  totalSteps:  5,
  // Step 1 — About You
  sex:         'male',
  height:      '',
  weight:      '',
  goalWeight:  '',
  age:         '',
  // Step 2 — Your Routine
  wakeTime:    '06:00',
  bedTime:     '22:00',
  workMode:    'office',
  // Step 3 — Your Activity
  walkType:    'flat',
  speed:        2.5,
  incline:      3,
  // Step 4 — Your Food
  proteins:    []
};

// Step names shown in the progress bar
var _obStepNames = ['About You','Your Routine','Your Activity','Your Food','Almost There'];

// ── Entry point ───────────────────────────────────────────────
function startOnboarding() {
  _ob.step = 1;
  _obRender();
}

// ── Render with subtle fade-in transition ─────────────────────
function _obRender() {
  var c = document.getElementById('onboarding-container');
  if (!c) return;
  // Fade out
  c.style.transition = 'none';
  c.style.opacity    = '0';
  c.style.transform  = 'translateY(10px)';
  var stepFns = [null, _obStep1, _obStep2, _obStep3, _obStep4, _obStep5];
  setTimeout(function() {
    c.innerHTML = stepFns[_ob.step]();
    _obRestoreStep();
    // Fade in
    c.style.transition = 'opacity .22s ease, transform .22s ease';
    c.style.opacity    = '1';
    c.style.transform  = 'translateY(0)';
  }, 60);
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
  var err = '';
  if (_ob.step === 1) {
    var h = (document.getElementById('ob-height')||{}).value || _ob.height;
    var w = parseFloat((document.getElementById('ob-weight')||{}).value || _ob.weight);
    var a = parseFloat((document.getElementById('ob-age')||{}).value || _ob.age);
    if (!h)           err = 'Please select your height.';
    else if (!w||w<80)err = 'Please enter a valid current weight.';
    else if (!a||a<18||a>99) err = 'Please enter a valid age (18–99).';
  }
  if (err) { _obError(err); return false; }
  return true;
}

function _obError(msg) {
  var el = document.getElementById('ob-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// ── Save step values to _ob ───────────────────────────────────
function _obSave() {
  var g = function(id){ var el=document.getElementById(id); return el?el.value:''; };
  if (_ob.step === 1) {
    _ob.height     = g('ob-height');
    _ob.weight     = g('ob-weight');
    _ob.age        = g('ob-age');
    _ob.goalWeight = g('ob-goal');
  }
  if (_ob.step === 2) {
    _ob.wakeTime = g('ob-wake') || _ob.wakeTime;
    _ob.bedTime  = g('ob-bed')  || _ob.bedTime;
  }
  if (_ob.step === 4) {
    var checked = [];
    document.querySelectorAll('.ob-protein-btn.active').forEach(function(b) {
      checked.push(b.getAttribute('data-protein'));
    });
    _ob.proteins = checked;
  }
}

// ── Restore values when navigating back ──────────────────────
function _obRestoreStep() {
  var s = function(id, val){ var el=document.getElementById(id); if(el&&val) el.value=val; };
  if (_ob.step === 1) {
    s('ob-weight', _ob.weight);
    s('ob-age',    _ob.age);
    s('ob-goal',   _ob.goalWeight);
    // Height select — restore value and update color
    var hEl = document.getElementById('ob-height');
    if (hEl && _ob.height) {
      hEl.value = _ob.height;
      hEl.style.color = 'var(--t1)';
    }
  }
  if (_ob.step === 2) {
    s('ob-wake', _ob.wakeTime);
    s('ob-bed',  _ob.bedTime);
  }
  if (_ob.step === 4) {
    document.querySelectorAll('.ob-protein-btn').forEach(function(b) {
      if (_ob.proteins.indexOf(b.getAttribute('data-protein')) >= 0)
        b.classList.add('active');
    });
  }
}

// ── Shared: premium fill-bar progress ─────────────────────────
function _obProgress(step) {
  var pct = (step / 5 * 100).toFixed(0) + '%';
  var name = _obStepNames[step - 1];
  return '<div style="margin-bottom:28px">' +
    '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">' +
      '<div style="font-size:.68rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-light)">' + name + '</div>' +
      '<div style="font-size:.6rem;color:var(--t3);letter-spacing:.05em">' + step + ' of 5</div>' +
    '</div>' +
    '<div style="height:3px;background:rgba(103,232,249,.1);border-radius:2px">' +
      '<div style="height:3px;width:' + pct + ';background:linear-gradient(90deg,var(--gold),rgba(0,212,255,.7));' +
        'border-radius:2px;transition:width .4s ease"></div>' +
    '</div>' +
  '</div>';
}

// ── Shared: field label ───────────────────────────────────────
function _obFieldLabel(text) {
  return '<div style="font-size:.68rem;font-weight:600;color:var(--t2);letter-spacing:.04em;margin-bottom:6px">' + text + '</div>';
}

// ── Shared: section header ────────────────────────────────────
function _obSection(text) {
  return '<div style="font-size:.55rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;' +
    'color:rgba(0,212,255,.5);margin-bottom:12px;margin-top:24px">' + text + '</div>';
}

// ── Shared: input style string ────────────────────────────────
var _obInputStyle = 'width:100%;padding:14px 12px;background:var(--s2);border:1px solid var(--border);' +
  'border-radius:12px;color:var(--t1);font-size:.92rem;box-sizing:border-box;outline:none;' +
  '-webkit-appearance:none;appearance:none';

// ── Shared: back + continue buttons ──────────────────────────
function _obButtons(step, continueLabel) {
  continueLabel = continueLabel || 'Continue →';
  var back = step > 1
    ? '<button onclick="_obBack()" style="background:transparent;border:1px solid var(--border);' +
      'color:var(--t2);border-radius:14px;padding:15px 20px;font-size:.85rem;font-weight:600;cursor:pointer;' +
      'white-space:nowrap">← Back</button>'
    : '';
  return '<div id="ob-error" style="display:none;color:#e07b6a;font-size:.78rem;margin-bottom:12px;' +
    'text-align:center;font-weight:600;padding:10px;background:rgba(224,123,106,.08);border-radius:10px"></div>' +
    '<div style="display:grid;grid-template-columns:' + (step > 1 ? 'auto 1fr' : '1fr') + ';gap:10px;margin-top:28px">' +
      back +
      '<button onclick="_obNext()" style="background:linear-gradient(135deg,var(--gold),rgba(0,180,230,.9));' +
      'border:none;color:var(--bg);border-radius:14px;padding:16px;font-size:.92rem;font-weight:800;' +
      'cursor:pointer;letter-spacing:.02em;box-shadow:0 4px 20px rgba(0,212,255,.2)">' +
      continueLabel + '</button>' +
    '</div>';
}

// ══════════════════════════════════════════════════════════════
// STEP 1 — ABOUT YOU
// ══════════════════════════════════════════════════════════════
function _obStep1() {
  var heights = ['<option value="" disabled selected>Select height</option>'];
  var hLabels = {60:"5'0\"",61:"5'1\"",62:"5'2\"",63:"5'3\"",64:"5'4\"",65:"5'5\"",
                 66:"5'6\"",67:"5'7\"",68:"5'8\"",69:"5'9\"",70:"5'10\"",71:"5'11\"",
                 72:"6'0\"",73:"6'1\"",74:"6'2\"",75:"6'3\"",76:"6'4\"",77:"6'5\"",
                 78:"6'6\"",79:"6'7\"",80:"6'8\""};
  for (var i = 60; i <= 80; i++)
    heights.push('<option value="' + i + '">' + hLabels[i] + '</option>');

  var maleActive   = _ob.sex === 'male';
  var femaleActive = _ob.sex === 'female';

  return '<div style="padding:4px 0 8px">' +
    _obProgress(1) +

    '<div style="margin-bottom:28px">' +
      '<div style="font-size:1.55rem;font-weight:800;color:var(--t1);line-height:1.25;margin-bottom:10px">' +
        "Let's build your structure." +
      '</div>' +
      '<div style="font-size:.85rem;color:var(--t2);line-height:1.65">' +
        'A few details so the system can calculate your exact targets.' +
      '</div>' +
    '</div>' +

    // Sex
    _obSection('Sex') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px">' +
      _obSexBtn('male',   'Male',   maleActive) +
      _obSexBtn('female', 'Female', femaleActive) +
    '</div>' +

    // Height + Age
    _obSection('About You') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
      '<div>' +
        _obFieldLabel('Height') +
        '<select id="ob-height" ' +
          'onchange="this.style.color=this.value?\'var(--t1)\':\' var(--t3)\'}" ' +
          'style="' + _obInputStyle + ';color:' + (_ob.height ? 'var(--t1)' : 'var(--t3)') + ';cursor:pointer">' +
          heights.join('') +
        '</select>' +
      '</div>' +
      '<div>' +
        _obFieldLabel('Age') +
        '<input id="ob-age" type="number" placeholder="38" min="18" max="99" style="' + _obInputStyle + '">' +
      '</div>' +
    '</div>' +

    // Weight + Goal
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px">' +
      '<div>' +
        _obFieldLabel('Current Weight (lbs)') +
        '<input id="ob-weight" type="number" placeholder="220" min="80" max="700" style="' + _obInputStyle + '">' +
      '</div>' +
      '<div>' +
        _obFieldLabel('Goal Weight <span style="font-size:.6rem;color:var(--t3);font-weight:400">(optional)</span>') +
        '<input id="ob-goal" type="number" placeholder="185" min="80" max="400" style="' + _obInputStyle + '">' +
      '</div>' +
    '</div>' +

    '<div style="font-size:.68rem;color:var(--t3);margin-bottom:4px;line-height:1.6;font-style:italic">' +
      'Goal weight helps track your progress — the system calculates your deficit automatically.' +
    '</div>' +

    _obButtons(1);
}

function _obSexBtn(sex, label, active) {
  return '<button id="ob-sex-' + sex + '" onclick="_obSetSex(\'' + sex + '\')" ' +
    'style="padding:16px;border-radius:14px;border:1px solid;font-size:.9rem;font-weight:700;cursor:pointer;' +
    'transition:all .2s;' +
    'background:' + (active ? 'rgba(0,212,255,.1)' : 'var(--s2)') + ';' +
    'border-color:' + (active ? 'rgba(0,212,255,.45)' : 'var(--border)') + ';' +
    'color:' + (active ? 'var(--gold-light)' : 'var(--t3)') + '">' +
    label + '</button>';
}

function _obSetSex(sex) {
  _ob.sex = sex;
  ['male','female'].forEach(function(s) {
    var btn = document.getElementById('ob-sex-' + s);
    if (!btn) return;
    var active = s === sex;
    btn.style.background   = active ? 'rgba(0,212,255,.1)' : 'var(--s2)';
    btn.style.borderColor  = active ? 'rgba(0,212,255,.45)' : 'var(--border)';
    btn.style.color        = active ? 'var(--gold-light)' : 'var(--t3)';
  });
}

// ══════════════════════════════════════════════════════════════
// STEPS 2–5 — Placeholders (built next sessions)
// ══════════════════════════════════════════════════════════════
function _obStep2() {
  return '<div style="padding:4px 0 8px">' + _obProgress(2) +
    '<div style="color:var(--t2);padding:24px 0">Step 2 — Your Routine. Coming next.</div>' +
    _obButtons(2);
}
function _obStep3() {
  return '<div style="padding:4px 0 8px">' + _obProgress(3) +
    '<div style="color:var(--t2);padding:24px 0">Step 3 — Your Activity. Coming next.</div>' +
    _obButtons(3);
}
function _obStep4() {
  return '<div style="padding:4px 0 8px">' + _obProgress(4) +
    '<div style="color:var(--t2);padding:24px 0">Step 4 — Your Food. Coming next.</div>' +
    _obButtons(4);
}
function _obStep5() {
  return '<div style="padding:4px 0 8px">' + _obProgress(5) +
    '<div style="color:var(--t2);padding:24px 0">Step 5 — Generate. Coming next.</div>' +
    _obButtons(5, 'Build My Plan →');
}

// ── Inject _ob values into engine.js hidden inputs ────────────
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
  if (typeof setWorkMode === 'function') setWorkMode(_ob.workMode, null);
  if (typeof setWalkType === 'function') {
    setWalkType(_ob.walkType, null);
    if (_ob.walkType !== 'flat') {
      if (typeof setSpeed   === 'function') setSpeed(_ob.speed, null);
      if (typeof setIncline === 'function') setIncline(_ob.incline, null);
    }
  }
  generatePlan();
}
