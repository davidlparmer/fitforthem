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
  if (_ob.step === _ob.totalSteps) {
    _obInjectAndGenerate();
    return;
  }
  _ob.step++;
  _obRender();
  window.scrollTo(0, 0);
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
    _ob.height     = _ob.height; // set directly by selectHeight()
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
    // Height button — restore value and update color
    var hBtn = document.getElementById('ob-height-btn');
    if (hBtn && _ob.height) {
      hBtn.textContent = _obHeightLabel(_ob.height);
      hBtn.style.color = 'var(--t1)';
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
      '' +
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
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
      '<div>' +
        _obFieldLabel('Height') +
        '<button id="ob-height-btn" onclick="openHeightPicker()" ' +
          'style="' + _obInputStyle + ';color:' + (_ob.height ? 'var(--t1)' : 'var(--t3)') + ';' +
          'text-align:left;cursor:pointer;display:block">' +
          (_ob.height ? _obHeightLabel(_ob.height) : 'Select height') +
        '</button>' +
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



    _obButtons(1);
}

function _obSexBtn(sex, label, active) {
  return '<button id="ob-sex-' + sex + '" onclick="_obSetSex(\'' + sex + '\')" ' +
    'style="padding:16px;border-radius:14px;border:1px solid;font-size:.9rem;font-weight:700;cursor:pointer;' +
    'transition:all .2s;' +
    'background:' + (active ? 'rgba(0,212,255,.1)' : 'var(--s2)') + ';' +
    'border-color:' + (active ? 'rgba(0,212,255,.45)' : 'var(--border)') + ';' +
    'color:' + (active ? 'var(--gold-light)' : 'var(--t2)') + '">' +
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
    btn.style.color        = active ? 'var(--gold-light)' : 'var(--t2)';
  });
}

// ── Height picker ────────────────────────────────────────────
// Generate label like 5'10" from total inches — no hardcoded quote escaping needed
function _obHeightLabel(in_) {
  var n = parseInt(in_);
  if (!n) return '';
  return Math.floor(n / 12) + "'" + (n % 12) + '"';
}

function openHeightPicker() {
  var overlay = document.getElementById('height-picker-overlay');
  var sheet   = document.getElementById('height-picker-sheet');
  if (!overlay || !sheet) return;
  overlay.style.display = 'block';
  sheet.style.display   = 'flex';
  setTimeout(function(){ sheet.style.transform = 'translateY(0)'; }, 10);
  // Scroll selected item into view after sheet opens
  setTimeout(function(){
    if (_ob.height) {
      var sel = document.getElementById('hpick-' + _ob.height);
      if (sel) sel.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, 150);
}

function closeHeightPicker() {
  var sheet = document.getElementById('height-picker-sheet');
  if (sheet) sheet.style.transform = 'translateY(100%)';
  setTimeout(function(){
    var overlay = document.getElementById('height-picker-overlay');
    if (sheet)   sheet.style.display   = 'none';
    if (overlay) overlay.style.display = 'none';
  }, 320);
}

function selectHeight(in_) {
  _ob.height = String(in_);
  var btn = document.getElementById('ob-height-btn');
  if (btn) {
    btn.textContent = _obHeightLabel(in_);
    btn.style.color = 'var(--t1)';
  }
  // Highlight selected row
  document.querySelectorAll('.hpick-row').forEach(function(r) {
    var active = r.getAttribute('data-in') === String(in_);
    r.style.color      = active ? 'var(--gold-light)' : 'var(--t1)';
    r.style.background = active ? 'rgba(0,212,255,.07)' : 'transparent';
    var check = r.querySelector('.hpick-check');
    if (check) check.style.opacity = active ? '1' : '0';
  });
  setTimeout(closeHeightPicker, 200);
}

// ══════════════════════════════════════════════════════════════
// STEP 2 — YOUR ROUTINE
// ══════════════════════════════════════════════════════════════
function _obStep2() {
  var officeActive = _ob.workMode === 'office';
  var wfhActive    = _ob.workMode === 'wfh';
  return '<div style="padding:4px 0 8px">' +
    _obProgress(2) +
    '<div style="margin-bottom:28px">' +
      '<div style="font-size:1.45rem;font-weight:800;color:var(--t1);line-height:1.25;margin-bottom:10px">When does your day begin?</div>' +
      '<div style="font-size:.85rem;color:var(--t2);line-height:1.65">Your eating window and meal timing adapt to your real schedule.</div>' +
    '</div>' +

    _obSection('Sleep Schedule') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px">' +
      '<div>' +
        _obFieldLabel('Wake Up') +
        '<input id="ob-wake" type="time" value="' + _ob.wakeTime + '" ' +
          'style="' + _obInputStyle + ';text-align:center;cursor:pointer">' +
      '</div>' +
      '<div>' +
        _obFieldLabel('Bedtime') +
        '<input id="ob-bed" type="time" value="' + _ob.bedTime + '" ' +
          'style="' + _obInputStyle + ';text-align:center;cursor:pointer">' +
      '</div>' +
    '</div>' +

    _obSection('Work Setup') +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
      _obToggleBtn('ob-work-office', 'Office', 'Out of house', officeActive, 'office') +
      _obToggleBtn('ob-work-wfh',    'Home',   'Work from home', wfhActive,  'wfh') +
    '</div>' +
    '<div id="ob-work-note" style="font-size:.72rem;color:var(--t3);line-height:1.6;font-style:italic;min-height:2.4em">' +
      (officeActive
        ? 'Your first meal travels with you — portable, no cooking required until dinner.'
        : 'More flexibility in your first meal window — home-cooked options available.') +
    '</div>' +

    _obButtons(2);
}

function _obToggleBtn(id, label, sub, active, mode) {
  var onclk = "onclick=\"_obSetWork('" + mode + "')\"";
  return '<button id="' + id + '" ' + onclk + ' ' +
    'style="padding:14px 10px;border-radius:14px;border:1px solid;cursor:pointer;text-align:center;' +
    'transition:all .2s;' +
    'background:' + (active ? 'rgba(0,212,255,.1)' : 'var(--s2)') + ';' +
    'border-color:' + (active ? 'rgba(0,212,255,.45)' : 'var(--border)') + ';">' +
    '<div style="font-size:.88rem;font-weight:700;color:' + (active ? 'var(--gold-light)' : 'var(--t1)') + '">' + label + '</div>' +
    '<div style="font-size:.65rem;color:' + (active ? 'rgba(0,212,255,.6)' : 'var(--t3)') + ';margin-top:3px">' + sub + '</div>' +
  '</button>';
}

function _obSetWork(mode) {
  _ob.workMode = mode;
  var btns = {
    office: document.getElementById('ob-work-office'),
    wfh:    document.getElementById('ob-work-wfh')
  };
  var notes = {
    office: 'Your first meal travels with you — portable, no cooking required until dinner.',
    wfh:    'More flexibility in your first meal window — home-cooked options available.'
  };
  Object.keys(btns).forEach(function(k) {
    var btn = btns[k]; if (!btn) return;
    var active = k === mode;
    btn.style.background   = active ? 'rgba(0,212,255,.1)'   : 'var(--s2)';
    btn.style.borderColor  = active ? 'rgba(0,212,255,.45)'  : 'var(--border)';
    btn.querySelector('div').style.color = active ? 'var(--gold-light)' : 'var(--t1)';
  });
  var note = document.getElementById('ob-work-note');
  if (note) note.textContent = notes[mode];
}

// ══════════════════════════════════════════════════════════════
// STEP 3 — YOUR ACTIVITY
// ══════════════════════════════════════════════════════════════
function _obStep3() {
  var isFlat      = _ob.walkType === 'flat';
  var isTreadmill = _ob.walkType === 'treadmill';
  var isIncline   = _ob.walkType === 'incline';
  var showSpeed   = isTreadmill || isIncline;

  return '<div style="padding:4px 0 8px">' +
    _obProgress(3) +
    '<div style="margin-bottom:28px">' +
      '<div style="font-size:1.45rem;font-weight:800;color:var(--t1);line-height:1.25;margin-bottom:10px">How do you earn your steps?</div>' +
      '<div style="font-size:.85rem;color:var(--t2);line-height:1.65">Your activity style sets your daily step target precisely.</div>' +
    '</div>' +

    _obSection('Walk Type') +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px">' +
      _obWalkBtn('flat',      'Outdoor',   'Flat walk',   isFlat) +
      _obWalkBtn('treadmill', 'Treadmill', 'Flat belt',   isTreadmill) +
      _obWalkBtn('incline',   'Incline',   'With grade',  isIncline) +
    '</div>' +

    '<div id="ob-speed-section" style="' + (showSpeed ? '' : 'display:none;') + '">' +
      _obSection('Speed (mph)') +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:20px">' +
        [2.0,2.5,3.0,3.5].map(function(s){
          return '<button id="ob-spd-' + Math.round(s*10) + '" onclick="_obSetSpeed(' + s + ')" ' +
            'class="sel-btn' + (Math.abs(_ob.speed-s)<0.01?' active':'') + '" ' +
            'style="padding:12px 4px;font-size:.85rem;font-weight:700">' + s + '</button>';
        }).join('') +
      '</div>' +
    '</div>' +

    '<div id="ob-incline-section" style="' + (isIncline ? '' : 'display:none;') + '">' +
      _obSection('Incline (%)') +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:20px">' +
        [0,1,2,3,4,5,6].map(function(inc){
          return '<button id="ob-inc-' + inc + '" onclick="_obSetIncline(' + inc + ')" ' +
            'class="sel-btn' + (_ob.incline===inc?' active':'') + '" ' +
            'style="padding:12px 2px;font-size:.82rem;font-weight:700">' + inc + '</button>';
        }).join('') +
      '</div>' +
    '</div>' +

    '<div id="ob-walk-note" style="font-size:.72rem;color:var(--t3);line-height:1.6;font-style:italic;min-height:2.4em">' +
      _obWalkNote() +
    '</div>' +

    _obButtons(3);
}

function _obWalkBtn(type, label, sub, active) {
  var onclk = "onclick=\"_obSetWalkType('" + type + "')\"";
  return '<button id="ob-walk-' + type + '" ' + onclk + ' ' +
    'style="padding:16px 6px;border-radius:14px;border:1px solid;cursor:pointer;text-align:center;transition:all .2s;' +
    'background:' + (active ? 'rgba(0,212,255,.1)' : 'var(--s2)') + ';' +
    'border-color:' + (active ? 'rgba(0,212,255,.45)' : 'var(--border)') + ';">' +
    '<div style="font-size:.85rem;font-weight:700;color:' + (active ? 'var(--gold-light)' : 'var(--t1)') + ';margin-bottom:4px">' + label + '</div>' +
    '<div style="font-size:.65rem;color:' + (active ? 'rgba(0,212,255,.7)' : 'var(--t2)') + '">' + sub + '</div>' +
  '</button>';
}

function _obWalkNote() {
  if (_ob.walkType === 'flat')      return 'Outdoor walking — natural movement, great daily burn.';
  if (_ob.walkType === 'treadmill') return 'Flat belt — consistent pace, calculated from your speed setting.';
  if (_ob.walkType === 'incline')   return 'Incline training — maximum calorie burn per step at your pace.';
  return '';
}

function _obSetWalkType(type) {
  _ob.walkType = type;
  ['flat','treadmill','incline'].forEach(function(t) {
    var btn = document.getElementById('ob-walk-' + t);
    if (!btn) return;
    var active = t === type;
    btn.style.background  = active ? 'rgba(0,212,255,.1)' : 'var(--s2)';
    btn.style.borderColor = active ? 'rgba(0,212,255,.45)' : 'var(--border)';
    var divs = btn.querySelectorAll('div');
    if (divs[1]) divs[1].style.color = active ? 'var(--gold-light)' : 'var(--t1)';
    if (divs[2]) divs[2].style.color = active ? 'rgba(0,212,255,.7)' : 'var(--t2)';
  });
  var speedSec   = document.getElementById('ob-speed-section');
  var inclineSec = document.getElementById('ob-incline-section');
  if (speedSec)   speedSec.style.display   = (type !== 'flat')     ? 'block' : 'none';
  if (inclineSec) inclineSec.style.display = (type === 'incline')  ? 'block' : 'none';
  var note = document.getElementById('ob-walk-note');
  if (note) note.textContent = _obWalkNote();
}

function _obSetSpeed(speed) {
  _ob.speed = speed;
  [2.0,2.5,3.0,3.5].forEach(function(s) {
    var btn = document.getElementById('ob-spd-' + Math.round(s*10));
    if (btn) btn.classList.toggle('active', Math.abs(s-speed)<0.01);
  });
}

function _obSetIncline(inc) {
  _ob.incline = inc;
  [0,1,2,3,4,5,6].forEach(function(i) {
    var btn = document.getElementById('ob-inc-' + i);
    if (btn) btn.classList.toggle('active', i === inc);
  });
}

// ══════════════════════════════════════════════════════════════
// STEP 4 — YOUR FOOD
// ══════════════════════════════════════════════════════════════
var _obProteins = [
  {key:'chicken', label:'Chicken'},
  {key:'beef',    label:'Beef'},
  {key:'steak',   label:'Steak'},
  {key:'fish',    label:'Fish'},
  {key:'eggs',    label:'Eggs'},
  {key:'turkey',  label:'Turkey'}
];

function _obStep4() {
  return '<div style="padding:4px 0 8px">' +
    _obProgress(4) +
    '<div style="margin-bottom:28px">' +
      '<div style="font-size:1.45rem;font-weight:800;color:var(--t1);line-height:1.25;margin-bottom:10px">What proteins do you eat?</div>' +
      '<div style="font-size:.85rem;color:var(--t2);line-height:1.65">Select all you eat regularly — we\'ll rotate them through your plan and restaurant recommendations.</div>' +
    '</div>' +

    _obSection('Proteins') +
    '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:24px">' +
      _obProteins.map(function(p) {
        var active = _ob.proteins.indexOf(p.key) >= 0;
        return '<button class="ob-protein-btn' + (active?' active':'') + '" data-protein="' + p.key + '" ' +
          "onclick=\"_obToggleProtein('" + p.key + "')\"" + ' ' +
          'style="padding:14px 10px;border-radius:14px;border:1px solid;cursor:pointer;text-align:center;transition:all .2s;font-size:.88rem;font-weight:700;' +
          'background:' + (active ? 'rgba(0,212,255,.1)' : 'var(--s2)') + ';' +
          'border-color:' + (active ? 'rgba(0,212,255,.45)' : 'var(--border)') + ';' +
          'color:' + (active ? 'var(--gold-light)' : 'var(--t2)') + '">' +
          p.label +
        '</button>';
      }).join('') +
    '</div>' +

    '<div style="font-size:.72rem;color:var(--t3);line-height:1.6;font-style:italic">Select at least one. You can always adjust your meals later.</div>' +

    _obButtons(4);
}

function _obToggleProtein(key) {
  var idx = _ob.proteins.indexOf(key);
  if (idx >= 0) _ob.proteins.splice(idx, 1);
  else           _ob.proteins.push(key);
  var btn = document.querySelector('.ob-protein-btn[data-protein="' + key + '"]');
  if (!btn) return;
  var active = _ob.proteins.indexOf(key) >= 0;
  btn.classList.toggle('active', active);
  btn.style.background  = active ? 'rgba(0,212,255,.1)' : 'var(--s2)';
  btn.style.borderColor = active ? 'rgba(0,212,255,.45)' : 'var(--border)';
  btn.style.color       = active ? 'var(--gold-light)' : 'var(--t2)';
}

// ══════════════════════════════════════════════════════════════
// STEP 5 — ALMOST THERE
// ══════════════════════════════════════════════════════════════
function _obStep5() {
  var walkLabels = {flat:'Outdoor walk', treadmill:'Flat treadmill', incline:'Incline treadmill'};
  var workLabels = {office:'Office', wfh:'Work from home'};
  var proteinList = _ob.proteins.length
    ? _ob.proteins.map(function(p){ return p.charAt(0).toUpperCase()+p.slice(1); }).join(', ')
    : 'Not specified';
  var walkDetail = walkLabels[_ob.walkType] || _ob.walkType;
  if (_ob.walkType === 'treadmill') walkDetail += ' · ' + _ob.speed + ' mph';
  if (_ob.walkType === 'incline')   walkDetail += ' · ' + _ob.speed + ' mph · ' + _ob.incline + '% grade';
  var heightLabel = _obHeightLabel(_ob.height);

  return '<div style="padding:4px 0 8px">' +
    _obProgress(5) +
    '<div style="margin-bottom:24px">' +
      '<div style="font-size:1.45rem;font-weight:800;color:var(--t1);line-height:1.25;margin-bottom:10px">Your structure is ready to build.</div>' +
      '<div style="font-size:.85rem;color:var(--t2);line-height:1.65">Here is everything we collected. Tap below to generate your plan.</div>' +
    '</div>' +

    '<div style="background:var(--s2);border:1px solid rgba(103,232,249,.12);border-radius:16px;padding:4px 20px;margin-bottom:24px">' +
      _obSummaryRow('Height',     heightLabel) +
      _obSummaryRow('Weight',     _ob.weight + ' lbs') +
      (_ob.goalWeight ? _obSummaryRow('Goal Weight', _ob.goalWeight + ' lbs') : '') +
      _obSummaryRow('Age',        _ob.age + ' yrs') +
      _obSummaryRow('Sex',        _ob.sex === 'male' ? 'Male' : 'Female') +
      _obSummaryRow('Schedule',   'Wake ' + _ob.wakeTime + ' · Sleep ' + _ob.bedTime) +
      _obSummaryRow('Work',       workLabels[_ob.workMode] || _ob.workMode) +
      _obSummaryRow('Activity',   walkDetail) +
      _obSummaryRow('Proteins',   proteinList) +
    '</div>' +

    _obButtons(5, 'Build My Structure →');
}

function _obSummaryRow(label, value) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;' +
    'padding:12px 0;border-bottom:1px solid rgba(103,232,249,.06)">' +
    '<span style="font-size:.78rem;color:var(--t2);font-weight:500">' + label + '</span>' +
    '<span style="font-size:.78rem;font-weight:700;color:var(--t1);text-align:right;max-width:60%">' + value + '</span>' +
  '</div>';
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
