// ─────────────────────────────────────────────────────────────
// stripe.js — Loftin Method Auth, Subscription & Payments
// Handles Stripe checkout, subscription status, app boot flow.
// Globals used: subStatus, currentPlan, userName, workMode, weightLog
// ─────────────────────────────────────────────────────────────

// ── PERMANENT FREE ACCESS ─────────────────────────────────────
// These device IDs bypass all subscription checks permanently.
// Add more via Why It Works → Settings → Copy Device ID.
var WHITELISTED_DEVICES = [
  'fft-mp71n9xx-m9q0hhenf', // David — iPad
  'fft-mp630h1q-kkpb7y32o', // David — iPhone
  'fft-mp7a2u5i-f51b1nc9b', // Wife — iPhone
];

// ── iPAD LINK SCREEN ─────────────────────────────────────────
async function iPadClaimLink(){
  var input=document.getElementById('ipad-link-input');
  var status=document.getElementById('ipad-link-status');
  if(!input||!status)return;
  var code=input.value.replace(/[^0-9]/g,'');
  if(code.length!==6){status.textContent='Please enter the full 6-digit code.';return;}
  status.innerHTML='<span style="color:var(--gold)">Linking — this takes a moment…</span>';
  try{
    var res=await fetch('/.netlify/functions/linkDevice',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'claim',deviceId:getDeviceId(),code:code})
    });
    var data=await res.json();
    if(!data.ok){status.textContent=data.reason||'Something went wrong. Try again.';return;}
    if(data.groupId){try{localStorage.setItem('fft_group_id',data.groupId);}catch(e){}}
    var d=data.data||{};
    var keys=['fft_plan','fft_name','fft_workmode','fft_age','fft_log',
              'fft_meal_prefs','fft_swaps','fft_skipped','fft_milestones',
              'fft_custom','fft_summary_dismissed','fft_saved_meals','fft_drinking_days'];
    keys.forEach(function(k){if(d[k]){try{localStorage.setItem(k,d[k]);}catch(e){}}}); 
    status.innerHTML='<span style="color:var(--gold)">Linked. Loading your plan…</span>';
    // Persist fft_group_id to device blob so reinstalls don't break sync
    if (typeof saveAllData === 'function') saveAllData();
    setTimeout(function(){window.location.reload();},800);
  }catch(err){
    status.textContent='Connection error. Check your network and try again.';
  }
}

// ── TRIAL FUNCTIONS ───────────────────────────────────────────
function isSubscribed(){
  if(WHITELISTED_DEVICES.indexOf(getDeviceId())>=0)return true;
  return subStatus==='active'||subStatus==='trialing';
}
function isTrialExpired(){
  if(WHITELISTED_DEVICES.indexOf(getDeviceId())>=0)return false;
  if(isSubscribed())return false;
  var ts=localStorage.getItem('fft_trial_start');
  if(!ts)return false;
  var SEVEN_DAYS=7*24*60*60*1000;
  return(Date.now()-parseInt(ts))>SEVEN_DAYS;
}
function checkTrialAndGate(){if(isTrialExpired())showPaywall();}
function startJourney(){
  var n=document.getElementById('welcome-name').value.trim();
  if(!n){document.getElementById('welcome-name').focus();return;}
  userName=n;
  localStorage.setItem('fft_name',n);
  saveAllData();
  document.getElementById('welcome-screen').style.display='none';
  document.getElementById('main-nav').style.display='flex';
  updateDashGreeting();
  showPage('builder');
}

// — showPaywall ———————————————————————————————————————
function showPaywall(){
  document.getElementById('paywall-screen').style.display='flex';
  document.getElementById('welcome-screen').style.display='none';
  document.getElementById('main-nav').style.display='none';
}

// — hidePaywall ———————————————————————————————————————
function hidePaywall(){
  document.getElementById('paywall-screen').style.display='none';
}

// — checkSubscription —————————————————————————————————
async function checkSubscription(){
  var deviceId=getDeviceId();
  if(!deviceId)return 'none';
  try{
    var res=await fetch('/.netlify/functions/check-subscription?deviceId='+encodeURIComponent(deviceId));
    var data=await res.json();
    subStatus=data.status||'none';
    return subStatus;
  }catch(e){
    return 'active';
  }
}

// — subStatus + IIFE (initApp/bootApp/finishBoot) —————
var subStatus='none';
(function(){
  function initApp(){
    var savedName=localStorage.getItem('fft_name');
    var savedPlan=localStorage.getItem('fft_plan');
    var savedMode=localStorage.getItem('fft_workmode');
    var savedAge=localStorage.getItem('fft_age');
    if(savedMode){
      workMode=savedMode;
      var wmEl=document.getElementById('wm-'+savedMode);
      if(wmEl){
        document.querySelectorAll('[id^="wm-"]').forEach(function(b){b.classList.remove('active');});
        wmEl.classList.add('active');
      }
      var wmNoteEl=document.getElementById('workmode-note');
      if(wmNoteEl){
        var wmNotes={
          office:'Office mode — portable first meals you can take anywhere. No cooking required until dinner.',
          wfh:'Work from home mode — cooked first meals with eggs and potatoes. More variety, more fuel.'
        };
        wmNoteEl.textContent=wmNotes[savedMode]||wmNotes.office;
      }
    }
    if(savedName){
      userName=savedName;
      document.getElementById('welcome-screen').style.display='none';
      document.getElementById('main-nav').style.display='flex';
      if(savedPlan){
        try{
          currentPlan=JSON.parse(savedPlan);
          runPlanMigration();
          if(currentPlan.tz&&currentPlan.tz.mid){
            currentPlan.protein=Math.round(currentPlan.tz.mid*0.6);
          }
          if(currentPlan.age)S.age=currentPlan.age;
          var eoCalEl=document.getElementById('eo-cal');
          if(eoCalEl&&currentPlan.cal){
            eoCalEl.value=currentPlan.cal;
            eoCalEl.dataset.planCal=currentPlan.cal;
            eoCalEl.dataset.planProtein=currentPlan.protein;
          }
          try{weightLog=JSON.parse(localStorage.getItem('fft_log')||'[]');}catch(e){}
          try{mealPrefs=JSON.parse(localStorage.getItem('fft_meal_prefs')||'{}');}catch(e){}
          try{proteinSwaps=JSON.parse(localStorage.getItem('fft_swaps')||'{}');}catch(e){}
          try{skippedMeals=JSON.parse(localStorage.getItem('fft_skipped')||'{}');}catch(e){}
        }catch(e){}
        try{
          var _ddC=document.cookie.match(/(?:^|;\s*)fft_drinks=([^;]+)/);
          if(_ddC){
            drinkingDays=JSON.parse(decodeURIComponent(_ddC[1]));
          } else if(!window.FFT_IS_IPAD){
            var _ddL=localStorage.getItem('fft_drinking_days');
            if(_ddL)drinkingDays=JSON.parse(_ddL);
          }
        }catch(e){}
        if(!localStorage.getItem('fft_trial_start')){
          localStorage.setItem('fft_trial_start',Date.now().toString());
        }
      }
      updateDashGreeting();
      var targetPage=savedPlan?'dashboard':'builder';
      showPage(targetPage);
      if(currentPlan.cal){
        updateDashboard();
        buildDashDayTabs();
      }
      setTimeout(function(){},500);
      initLightMode();
    }
    document.getElementById('log-d').value=new Date().toISOString().split('T')[0];
    if(localStorage.getItem('fft_name'))saveAllData();
  }

  var cookieMatch=document.cookie.match(/(?:^|;\s*)fft_device=([^;]+)/);

  function timeout(ms){return new Promise(function(r){setTimeout(r,ms);});}

  function showRestoreLoader(){
    var el=document.getElementById('welcome-screen');
    if(!el)return;
    el.style.display='flex';
    var card=el.querySelector('.welcome-card');
    if(card){
      card.innerHTML='<div style="text-align:center;padding:20px 0">'+
        '<div style="font-size:1.1rem;font-weight:600;color:var(--gold-light);letter-spacing:.08em;text-transform:uppercase;font-family:var(--font-body);margin-bottom:12px">Loftin Method</div>'+
        '<div style="font-size:.88rem;color:var(--t2);margin-bottom:24px">Restoring your plan…</div>'+
        '<div style="width:40px;height:40px;border:2px solid rgba(184,150,60,.2);border-top:2px solid var(--gold);border-radius:50%;margin:0 auto;animation:spin .8s linear infinite"></div>'+
        '</div>';
      if(!document.getElementById('fft-spin-style')){
        var s=document.createElement('style');
        s.id='fft-spin-style';
        s.textContent='@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
      }
    }
  }

  function hideRestoreLoader(){
    var el=document.getElementById('welcome-screen');
    if(!el)return;
    var card=el.querySelector('.welcome-card');
    if(card&&card.innerHTML.indexOf('Restoring')>=0){
      card.innerHTML=
        '<div class="welcome-logo"><img src="logo-mark.png" alt="" style="height:28px;width:28px;vertical-align:middle;margin-right:8px;display:inline-block">Loftin<span> Method</span></div>'+
        '<div class="welcome-tagline">The private system behind a leaner body and a stronger life.<br><br>Real food. Real steps. Built for men who carry real responsibility.</div>'+
        '<div class="welcome-q">Before we build your plan,</div>'+
        '<div class="welcome-q" style="margin-bottom:6px">what should we call you?</div>'+
        '<div class="welcome-sub">Just your first name is perfect.</div>'+
        '<input class="welcome-input" type="text" id="welcome-name" placeholder="e.g. David" maxlength="30" onkeydown="if(event.key===\'Enter\')startJourney()">'+
        '<button class="welcome-btn" onclick="startJourney()">Let\'s Get Started →</button>'+
        '<div class="welcome-footer">Your plan is personalized to your height, weight, and goals.<br>No supplements. No nonsense. Just results.</div>';
    }
  }

  async function bootApp(){
    if(!returningFromStripe){
      if(WHITELISTED_DEVICES.indexOf(getDeviceId())>=0){
        subStatus='active';
      } else {
        var cached=localStorage.getItem('fft_sub_status');
        if(cached==='active'||cached==='trialing'){
          subStatus=cached;
          checkSubscription().then(function(s){
            if(s==='active'||s==='trialing'){localStorage.setItem('fft_sub_status',s);}
          }).catch(function(){});
        } else {
          try{
            var serverStatus=await Promise.race([
              checkSubscription(),
              timeout(3000).then(function(){return 'none';})
            ]);
            subStatus=serverStatus||'none';
            if(subStatus==='active'||subStatus==='trialing'){
              localStorage.setItem('fft_sub_status',subStatus);
            }
          }catch(e){
            subStatus='none';
          }
        }
      }
    }

    if(cookieMatch){
      showRestoreLoader();
      var restored=false;
      var restoreTimer=setTimeout(function(){
        if(!restored){restored=true;finishBoot();}
      },4000);
      restoreFromServer(function(){
        if(restored)return;
        restored=true;
        clearTimeout(restoreTimer);
        finishBoot();
      });
    } else {
      finishBoot();
    }
  }

  function finishBoot(){
    hideRestoreLoader();

    // ── iPAD BOOT ─────────────────────────────────────────────
    if(window.FFT_IS_IPAD){
      var groupId=localStorage.getItem('fft_group_id');
      if(!groupId){
        // Not linked — show link screen and stop
        var ipadScreen=document.getElementById('ipad-link-screen');
        if(ipadScreen)ipadScreen.style.display='flex';
        return;
      }

      // ── LINKED iPAD: clean read-only boot ───────────────────
      // iPad never runs initApp(), updateDashboard(), or saveAllData().
      // It has exactly one job: pull the phone's data from the group slot
      // and show the weekly grid. Nothing else happens on this device.
      document.getElementById('welcome-screen').style.display='none';
      var nav=document.getElementById('main-nav');
      if(nav)nav.style.display='none';

      pullGroupData(function(){
        // pullGroupData (iPad path) has already set currentPlan, mealPrefs,
        // drinkingDays in memory. Just open the grid.
        checkWeeklyGrid();
        // Poll every 30 seconds — covers the case where both devices are active
        // and the user changes a drink level on the phone without sleeping the iPad.
        // pullGroupData handles the re-render internally via _refreshWeeklyGridIfOpen.
        setInterval(function(){
          pullGroupData(function(){});
        }, 15*1000); // 15s keeps grid current (was 30s)
      });
      return; // ← critical: never fall through to phone boot below
    }

    // ── PHONE BOOT ────────────────────────────────────────────
    var hasName=!!localStorage.getItem('fft_name');
    document.getElementById('welcome-screen').style.display=hasName?'none':'flex';
    hidePaywall();
    if(hasName){
      if(typeof pullGroupData==='function' && localStorage.getItem('fft_group_id')){
        pullGroupData(function(){
          initApp();
          if(typeof startBackgroundSync==='function')startBackgroundSync();
          setTimeout(checkTrialAndGate,1500);
        });
      } else {
        initApp();
        if(typeof startBackgroundSync==='function')startBackgroundSync();
        setTimeout(checkTrialAndGate,1500);
      }
    }
  }

  var returningFromStripe=false;
  (function(){
    var params=new URLSearchParams(window.location.search);
    if(params.get('subscribed')==='true'){
      returningFromStripe=true;
      history.replaceState({},'',window.location.pathname);
      localStorage.setItem('fft_sub_status','trialing');
      subStatus='trialing';
    }
    if(params.get('subscribed')==='false'){
      history.replaceState({},'',window.location.pathname);
    }
  })();

  bootApp();
})();

// — startCheckout —————————————————————————————————————
async function startCheckout(){
  var btn=document.getElementById('paywall-subscribe-btn');
  btn.disabled=true;
  btn.textContent='Loading...';
  try{
    var res=await fetch('/.netlify/functions/create-checkout',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({deviceId:getDeviceId()})
    });
    var data=await res.json();
    if(data.url){
      window.location.href=data.url;
    } else {
      btn.disabled=false;
      btn.textContent='Subscribe · $19.99/month →';
      alert('Something went wrong. Please try again.');
    }
  }catch(e){
    btn.disabled=false;
    btn.textContent='Subscribe · $19.99/month →';
    alert('Something went wrong. Please try again.');
  }
}

// — openCustomerPortal ————————————————————————————————
async function openCustomerPortal(){
  var btn=document.getElementById('portal-btn');
  if(btn){btn.disabled=true;btn.textContent='Loading...';}
  try{
    var res=await fetch('/.netlify/functions/create-portal',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({deviceId:getDeviceId()})
    });
    var data=await res.json();
    if(data.url){
      window.location.href=data.url;
    } else {
      alert('Could not open subscription portal. Please contact david@fitforthem.app');
      if(btn){btn.disabled=false;btn.textContent='Manage';}
    }
  }catch(e){
    alert('Could not open subscription portal. Please contact david@fitforthem.app');
    if(btn){btn.disabled=false;btn.textContent='Manage';}
  }
}
