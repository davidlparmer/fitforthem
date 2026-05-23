// ─────────────────────────────────────────────────────────────
// progress.js — Loftin Method Progress & Weight Tracking
// Weight log, chart rendering, silent recalc, progress display.
// Globals used: weightLog, chartRange, currentPlan, currentDayIdx,
//               workMode, userName (all in app.html)
// Depends on: engine.js (calcTargetZone, calcSteps, etc.)
// ─────────────────────────────────────────────────────────────

function focusWeightLog(){
  var logDiv=document.getElementById('dash-weight-log');
  var nudge=document.getElementById('log-nudge');
  if(logDiv){
    logDiv.style.display='block';
    if(nudge)nudge.style.display='none';
    setTimeout(function(){var inp=document.getElementById('dash-log-w');if(inp)inp.focus();},100);
  }
}

function logWeightFromDash(){
  var inp=document.getElementById('dash-log-w');
  var w=parseFloat(inp?inp.value:'');
  if(!w||w<80||w>700){alert('Please enter a valid weight.');return;}
  var d=new Date().toISOString().split('T')[0];
  // Remove existing entry for today if any
  weightLog=weightLog.filter(function(e){return e.d!==d;});
  weightLog.push({w:w,d:d,t:Date.now()});
  weightLog.sort(function(a,b){return a.d.localeCompare(b.d);});
  try{localStorage.setItem('fft_log',JSON.stringify(weightLog));saveAllData();}catch(e){}
  if(inp)inp.value='';
  var logDiv=document.getElementById('dash-weight-log');
  if(logDiv)logDiv.style.display='none';
  var nudge=document.getElementById('log-nudge');
  if(nudge)nudge.style.display='none';
  // Silent recalculation
  silentRecalc(w);
  showDiaryComplete(w);
  // Save meal history snapshot when weight is logged
  saveMealDaySnapshot();
}

function silentRecalc(newWeight){
  if(!currentPlan.hIn||!currentPlan.age)return;
  var oldCal=currentPlan.cal;
  var oldPhase=currentPlan.phase;
  // Recalculate with new weight
  var tz=calcTargetZone(currentPlan.hIn);
  var phase=getPhase(newWeight,currentPlan.hIn);
  var br=phase.mode==='gain'?{bridge:0,ref:newWeight}:calcBridgeReference(newWeight,tz.mid);
  var maintenance=calcMifflinMaintenance(br.ref,currentPlan.hIn,currentPlan.age,currentPlan.sex||'male');
  var windows=calcPhaseWindows(maintenance,phase,newWeight);
  // Step targets based on phase mode
  var recalcBurnNormal=500,recalcBurnDrink=750;
  if(phase.mode==='gain'){recalcBurnNormal=250;recalcBurnDrink=350;}
  else if(phase.name==='landing'||phase.name==='maintenance'){recalcBurnNormal=350;recalcBurnDrink=500;}
  var steps=calcSteps(newWeight,currentPlan.hIn,recalcBurnNormal,S.walkType,S.speed,S.incline);
  var wSteps=calcSteps(newWeight,currentPlan.hIn,recalcBurnDrink,S.walkType,S.speed,S.incline);
  var lossData=calcWeeklyLoss(maintenance,windows.center,steps,wSteps);
  // Update tmp goal
  var tmp;
  if(newWeight<=tz.high){tmp=Math.round(tz.mid);}
  else if(newWeight-tz.high<=10){tmp=Math.round(tz.low);}
  else{tmp=newWeight-10;}
  // Update plan
  currentPlan.wLbs=newWeight;
  currentPlan.tz=tz;
  currentPlan.bridge=br;
  currentPlan.maintenance=maintenance;
  currentPlan.phase=phase.name;
  currentPlan.phaseLabel=phase.label;
  currentPlan.phaseMsg=phase.msg;
  currentPlan.calLow=windows.low;
  currentPlan.cal=windows.center;
  currentPlan.calHigh=windows.high;
  currentPlan.steps=steps;
  currentPlan.wSteps=wSteps;
  currentPlan.lossData=lossData;
  currentPlan.tmp=tmp;
  try{localStorage.setItem('fft_plan',JSON.stringify(currentPlan));saveAllData();}catch(e){}
  // Alert if calories changed meaningfully
  var calDiff=Math.abs(windows.center-oldCal);
  if(calDiff>=30){
    var alertEl=document.getElementById('plan-update-alert');
    var msgEl=document.getElementById('plan-update-msg');
    if(alertEl&&msgEl){
      var direction=windows.center>oldCal?'up':'down';
      msgEl.textContent='New target: '+windows.center.toLocaleString()+' cal/day'+(phase.name!==oldPhase?' · Phase: '+phase.label:'');
      alertEl.style.display='flex';
    }
  }
  updateDashboard();
  buildDashDayTabs();
}

function logWeight(){
  var w=parseFloat(document.getElementById('log-w').value);
  var d=document.getElementById('log-d').value;
  if(!w||!d){alert('Please enter weight and date.');return;}
  // Remove duplicate for same date
  weightLog=weightLog.filter(function(e){return e.d!==d;});
  weightLog.push({w:w,d:d,t:Date.now()});
  weightLog.sort(function(a,b){return a.d.localeCompare(b.d);});
  try{localStorage.setItem('fft_log',JSON.stringify(weightLog));saveAllData();}catch(e){}
  document.getElementById('log-w').value='';
  // Silent recalc if today
  var today=new Date().toISOString().split('T')[0];
  if(d===today){
    silentRecalc(w);
    // Clear the dashboard nudge — weight is logged for today
    var nudge=document.getElementById('log-nudge');
    if(nudge)nudge.style.display='none';
    var logDiv=document.getElementById('dash-weight-log');
    if(logDiv)logDiv.style.display='none';
  }
  renderProgress();
  showDiaryComplete(w);
}

function showDiaryComplete(currentWeight){
  if(!currentPlan||!currentPlan.cal||!currentPlan.maintenance)return;
  var deficit=currentPlan.maintenance-currentPlan.cal;
  if(deficit<=0)return;
  var weeklyLoss=deficit*7/3500;
  var weeks5=parseFloat((currentWeight-(weeklyLoss*5)).toFixed(1));
  var goalWeight=currentPlan.tz?currentPlan.tz.low:null;
  var el=document.getElementById('diary-complete-banner');
  if(!el)return;

  var barPct=50;
  var subMsg='';
  if(goalWeight&&weeklyLoss>0){
    var weeksToGoal=Math.ceil((currentWeight-goalWeight)/weeklyLoss);
    var startWeight=currentPlan.wLbs||currentWeight;
    var totalJourney=startWeight-goalWeight;
    var completed=startWeight-currentWeight;
    barPct=totalJourney>0?Math.min(100,Math.round((completed/totalJourney)*100)):50;
    subMsg=weeksToGoal>0?
      'At this rate, goal weight in approximately '+weeksToGoal+' weeks.':
      'You\'re at goal weight. Holding strong.';
  } else {
    subMsg=parseFloat(weeklyLoss.toFixed(1))+' lbs per week at current deficit.';
  }

  el.style.display='block';
  el.innerHTML=
    '<div style="font-size:.58rem;font-weight:600;color:var(--gold);letter-spacing:.2em;text-transform:uppercase;margin-bottom:10px;font-family:var(--font-body)">If every day were like today</div>'+
    '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:8px">'+
      '<div style="font-size:2.2rem;font-weight:700;color:var(--t1);font-family:var(--font-display);letter-spacing:-.02em">'+weeks5+' lbs</div>'+
      '<div style="font-size:.76rem;color:var(--t2);font-family:var(--font-body)">in 5 weeks</div>'+
    '</div>'+
    '<div style="background:rgba(184,150,60,.08);border-radius:1px;height:1px;margin-bottom:10px;overflow:hidden">'+
      '<div style="height:1px;width:'+barPct+'%;background:linear-gradient(90deg,var(--gold),var(--gold-light));border-radius:1px;transition:width .6s ease"></div>'+
    '</div>'+
    '<div style="font-size:.72rem;color:var(--t2);font-style:italic;line-height:1.6">'+subMsg+'</div>';
}

function setChartRange(days,el){
  chartRange=days;
  document.querySelectorAll('#chart-7,#chart-30,#chart-all').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  drawChart();
}

function calcWeeklyRate(){
  // 7-day moving average rate of change in lbs/week
  if(weightLog.length<2)return null;
  var sorted=weightLog.slice().sort(function(a,b){return a.d.localeCompare(b.d);});
  var recent=chartRange>0?sorted.slice(-Math.min(chartRange,sorted.length)):sorted;
  if(recent.length<2)return null;
  var first=recent[0];var last=recent[recent.length-1];
  var days=(new Date(last.d+'T12:00:00')-new Date(first.d+'T12:00:00'))/(1000*60*60*24);
  if(days<1)return null;
  var change=last.w-first.w;
  return{ratePerWeek:parseFloat((change/days*7).toFixed(2)),totalChange:parseFloat(change.toFixed(1)),days:Math.round(days)};
}

function renderProgress(){
  var feedbackEl=document.getElementById('progress-feedback');
  var sorted=weightLog.slice().sort(function(a,b){return a.d.localeCompare(b.d);});

  if(sorted.length>=1){
    feedbackEl.style.display='block';
    var last=sorted[sorted.length-1];
    document.getElementById('pf-last').textContent=last.w+' lbs';

    if(sorted.length>=2){
      var prev=sorted[sorted.length-2];
      var diff=parseFloat((last.w-prev.w).toFixed(1));
      var changeEl=document.getElementById('pf-change');
      var changeCard=document.getElementById('pf-change-card');
      changeEl.textContent=(diff>0?'+':'')+diff+' lbs';
      changeEl.style.color=diff<0?'var(--gold-light)':diff>0?'var(--red)':'var(--t2)';

      // 7-day trend
      var rate=calcWeeklyRate();
      var trendEl=document.getElementById('pf-trend');
      var msgEl=document.getElementById('pf-message');
      var projEl=document.getElementById('pf-projection');
      var projTxt=document.getElementById('pf-projection-text');

      if(rate){
        if(rate.ratePerWeek<-0.1){
          trendEl.textContent='↓ '+Math.abs(rate.ratePerWeek)+' lbs/wk';
          trendEl.style.color='var(--gold-light)';
          msgEl.textContent='Trending down. Keep doing exactly what you\'re doing — the system is working.';
          msgEl.style.borderLeftColor='var(--green)';
        } else if(rate.ratePerWeek>0.1){
          trendEl.textContent='↑ +'+rate.ratePerWeek+' lbs/wk';
          trendEl.style.color='var(--red)';
          msgEl.textContent='Trending up slightly — likely water weight. Tighten your step count and check portions. Nothing broke.';
          msgEl.style.borderLeftColor='var(--red)';
        } else {
          trendEl.textContent='→ Holding';
          trendEl.style.color='var(--t2)';
          msgEl.textContent='Weight holding steady. Add 1,000 steps or reduce 100 cal. One small adjustment is all it takes.';
          msgEl.style.borderLeftColor='rgba(184,150,60,.5)';
        }

        // Goal projection — only show if trending down and have a target
        if(rate.ratePerWeek<-0.1&&currentPlan.tz){
          var goalWeight=Math.round(currentPlan.tz.high);
          var currentW=last.w;
          if(currentW>goalWeight){
            var lbsToGo=currentW-goalWeight;
            var weeksToGo=lbsToGo/Math.abs(rate.ratePerWeek);
            var goalDate=new Date();
            goalDate.setDate(goalDate.getDate()+Math.round(weeksToGo*7));
            var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            var dateStr=months[goalDate.getMonth()]+' '+goalDate.getDate()+', '+goalDate.getFullYear();
            projTxt.textContent='At your current rate of '+Math.abs(rate.ratePerWeek)+' lbs/week, you\'ll reach '+goalWeight+' lbs around '+dateStr+' — '+Math.round(weeksToGo)+' weeks away. Includes natural weight fluctuation, not just fat loss.';
            projEl.style.display='block';
          } else {
            projEl.style.display='none';
          }
        } else {
          projEl.style.display='none';
        }
      } else {
        trendEl.textContent='Building...';
        trendEl.style.color='var(--t2)';
        msgEl.textContent='Keep logging daily — after a few entries your trend will tell you everything.';
        projEl.style.display='none';
      }
    } else {
      document.getElementById('pf-change').textContent='—';
      document.getElementById('pf-trend').textContent='Log again';
      document.getElementById('pf-message').textContent='Great start. Log again tomorrow morning and we\'ll show your trend.';
      document.getElementById('pf-projection').style.display='none';
    }
  } else {
    feedbackEl.style.display='none';
  }

  // Adjustment banner
  var banner=document.getElementById('adj-banner-prog');
  if(sorted.length>=2){
    var last2=sorted[sorted.length-1].w;var prev2=sorted[sorted.length-2].w;
    var diff2=parseFloat((last2-prev2).toFixed(1));
    var cls,title,msg;
    if(diff2<=-2){cls='low';title='Increase Calories';msg='Down '+Math.abs(diff2)+' lbs — add 100–150 cal to avoid rebound. The system is working faster than expected.';}
    else if(diff2<0){cls='good';title='Right on Track';msg='Down '+Math.abs(diff2)+' lbs. Keep everything exactly where it is — don\'t change a thing.';}
    else if(diff2===0){cls='flat';title='No Change — That\'s Fine';msg='Weight holding steady is normal. Add 1,000 steps or reduce 100 cal. One small adjustment is all it takes.';}
    else{cls='high';title='Normal Fluctuation';msg='Up '+diff2+' lbs — this is likely water weight, not fat. Stay on the plan, hit your steps. Nothing broke.';}
    banner.className='adj-banner '+cls;
    banner.innerHTML='<strong>'+title+'</strong> '+msg;
  } else {
    banner.className='';banner.innerHTML='';
  }

  // Log entries
  var logEl=document.getElementById('wtLog');
  var html='';
  var rev=sorted.slice().reverse();
  rev.forEach(function(e,i){
    var prev=rev[i+1];
    var dHtml='';
    if(prev){var d=parseFloat((e.w-prev.w).toFixed(1));dHtml='<span class="delta '+(d<0?'down':d>0?'up':'same')+'">'+(d>0?'+':'')+d+'</span>';}
    html+='<div class="log-entry"><span class="dt">'+e.d+'</span><span class="wt">'+e.w+' lbs</span>'+dHtml+'</div>';
  });
  logEl.innerHTML=html||'<p style="color:var(--t2);font-size:.85rem;font-style:italic;padding:10px 0">No entries yet. Log your weight every morning.</p>';
  drawChart();
}

function drawChart(){
  var cv=document.getElementById('wtChart');
  if(!cv)return;
  var sorted=weightLog.slice().sort(function(a,b){return a.d.localeCompare(b.d);});
  var display=chartRange>0?sorted.slice(-chartRange):sorted;
  var noteEl=document.getElementById('chart-note');

  if(display.length<2){
    var W=cv.offsetWidth||340;cv.width=W;cv.height=10;
    var ctx=cv.getContext('2d');ctx.clearRect(0,0,W,10);
    if(noteEl)noteEl.textContent='Log at least 2 entries to see your trend.';
    return;
  }

  // ── Retina / device pixel ratio support ─────────────────────
  // Without this the chart is blurry on iPhone and iPad screens.
  var dpr=window.devicePixelRatio||1;
  var W=cv.offsetWidth||340,H=220;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  cv.style.width=W+'px';cv.style.height=H+'px';
  var ctx=cv.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);

  var pad={t:22,r:20,b:34,l:44};
  var cw=W-pad.l-pad.r;
  var ch=H-pad.t-pad.b;

  var ws=display.map(function(e){return e.w;});
  var goalLow=currentPlan.tz?currentPlan.tz.low:null;
  var goalHigh=currentPlan.tz?currentPlan.tz.high:null;
  var allVals=ws.slice();
  if(goalLow)allVals.push(goalLow);
  if(goalHigh)allVals.push(goalHigh);
  var mn=Math.min.apply(null,allVals)-2;
  var mx=Math.max.apply(null,allVals)+2;
  var rng=mx-mn||1;

  function xPos(i){return pad.l+(i/(display.length-1))*cw;}
  function yPos(w){return pad.t+((mx-w)/rng)*ch;}
  var bottomY=H-pad.b;

  // ── Goal zone band ───────────────────────────────────────────
  if(goalLow&&goalHigh){
    var gy1=yPos(Math.min(goalHigh,mx));
    var gy2=yPos(Math.max(goalLow,mn));
    if(gy2>gy1){
      ctx.fillStyle='rgba(61,200,100,.07)';
      ctx.fillRect(pad.l,gy1,cw,gy2-gy1);
      ctx.strokeStyle='rgba(61,200,100,.22)';
      ctx.lineWidth=1;
      ctx.setLineDash([3,5]);
      ctx.beginPath();ctx.moveTo(pad.l,gy1);ctx.lineTo(W-pad.r,gy1);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='rgba(61,200,100,.6)';
      ctx.font='500 9px sans-serif';
      ctx.textAlign='right';
      ctx.fillText('Goal Zone',W-pad.r-2,gy1-4);
    }
  }

  // ── Horizontal grid lines + Y labels ────────────────────────
  ctx.lineWidth=1;
  for(var g=0;g<=4;g++){
    var yv=mn+(g/4)*rng;
    var yp=yPos(yv);
    ctx.strokeStyle='rgba(0,212,255,.06)';
    ctx.beginPath();ctx.moveTo(pad.l,yp);ctx.lineTo(W-pad.r,yp);ctx.stroke();
    ctx.fillStyle='rgba(140,190,215,.6)';
    ctx.font='500 10px sans-serif';
    ctx.textAlign='right';
    ctx.fillText(Math.round(yv),pad.l-6,yp+4);
  }

  // ── Trend line (linear regression) ──────────────────────────
  if(display.length>=3){
    var n=display.length;
    var sumX=0,sumY=0,sumXY=0,sumX2=0;
    for(var t=0;t<n;t++){sumX+=t;sumY+=display[t].w;sumXY+=t*display[t].w;sumX2+=t*t;}
    var slope=(n*sumXY-sumX*sumY)/(n*sumX2-sumX*sumX);
    var intercept=(sumY-slope*sumX)/n;
    ctx.strokeStyle='rgba(0,212,255,.22)';
    ctx.lineWidth=1.5;
    ctx.setLineDash([4,5]);
    ctx.beginPath();
    ctx.moveTo(xPos(0),yPos(intercept));
    ctx.lineTo(xPos(n-1),yPos(intercept+slope*(n-1)));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Point positions ──────────────────────────────────────────
  var pts=display.map(function(e,i){return{x:xPos(i),y:yPos(e.w)};});

  // ── Catmull-Rom control points (smooth bezier curves) ────────
  // Converts Catmull-Rom spline to cubic bezier — much smoother than lineTo.
  function cp(p0,p1,p2,p3){
    var a=0.5;
    return{
      cp1x:p1.x+(p2.x-p0.x)*a/3,cp1y:p1.y+(p2.y-p0.y)*a/3,
      cp2x:p2.x-(p3.x-p1.x)*a/3,cp2y:p2.y-(p3.y-p1.y)*a/3
    };
  }

  // ── Gradient fill under curve ────────────────────────────────
  var grad=ctx.createLinearGradient(0,pad.t,0,bottomY);
  grad.addColorStop(0,'rgba(0,212,255,.16)');
  grad.addColorStop(0.65,'rgba(0,212,255,.05)');
  grad.addColorStop(1,'rgba(0,212,255,.0)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x,bottomY);
  ctx.lineTo(pts[0].x,pts[0].y);
  for(var i=0;i<pts.length-1;i++){
    var c=cp(pts[Math.max(0,i-1)],pts[i],pts[i+1],pts[Math.min(pts.length-1,i+2)]);
    ctx.bezierCurveTo(c.cp1x,c.cp1y,c.cp2x,c.cp2y,pts[i+1].x,pts[i+1].y);
  }
  ctx.lineTo(pts[pts.length-1].x,bottomY);
  ctx.closePath();
  ctx.fillStyle=grad;
  ctx.fill();

  // ── Smooth weight line ───────────────────────────────────────
  ctx.beginPath();
  ctx.moveTo(pts[0].x,pts[0].y);
  for(var i=0;i<pts.length-1;i++){
    var c=cp(pts[Math.max(0,i-1)],pts[i],pts[i+1],pts[Math.min(pts.length-1,i+2)]);
    ctx.bezierCurveTo(c.cp1x,c.cp1y,c.cp2x,c.cp2y,pts[i+1].x,pts[i+1].y);
  }
  ctx.strokeStyle='#00D4FF';
  ctx.lineWidth=2.5;
  ctx.lineJoin='round';
  ctx.lineCap='round';
  ctx.stroke();

  // ── Data points ──────────────────────────────────────────────
  pts.forEach(function(p,i){
    var isLast=i===pts.length-1;
    // Glow ring on latest entry
    if(isLast){
      ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);
      ctx.fillStyle='rgba(0,212,255,.1)';ctx.fill();
      ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);
      ctx.fillStyle='rgba(0,212,255,.18)';ctx.fill();
    }
    // Dot
    ctx.beginPath();ctx.arc(p.x,p.y,isLast?5:3.5,0,Math.PI*2);
    ctx.fillStyle=isLast?'#00D4FF':'rgba(0,180,220,.75)';ctx.fill();
    ctx.strokeStyle='#0D1B2A';ctx.lineWidth=isLast?2:1.5;ctx.stroke();
    // Weight label: always first + last; others only if ≤ 10 entries
    if(isLast||i===0||display.length<=10){
      ctx.fillStyle=isLast?'rgba(0,212,255,.95)':'rgba(170,215,235,.75)';
      ctx.font=isLast?'600 10px sans-serif':'500 9px sans-serif';
      ctx.textAlign='center';
      ctx.fillText(display[i].w,p.x,p.y-(isLast?13:10));
    }
  });

  // ── X-axis date labels ───────────────────────────────────────
  ctx.fillStyle='rgba(140,190,215,.55)';
  ctx.font='500 9px sans-serif';
  ctx.textAlign='center';
  var labelEvery=Math.max(1,Math.floor(display.length/5));
  display.forEach(function(e,i){
    if(i===0||i===display.length-1||i%labelEvery===0){
      var parts=e.d.split('-');
      ctx.fillText(parts[1]+'/'+parts[2],xPos(i),H-pad.b+17);
    }
  });

  // ── Chart note ───────────────────────────────────────────────
  if(noteEl){
    var totalChange=display[display.length-1].w-display[0].w;
    var changeStr=(totalChange>0?'+':'')+parseFloat(totalChange.toFixed(1));
    noteEl.textContent=display.length+' entries · '+changeStr+' lbs this period';
  }
}

function switchProgressTab(tab){
  var weightTab=document.getElementById('prog-weight-tab');
  var mealsTab=document.getElementById('prog-meals-tab');
  var btnWeight=document.getElementById('prog-tab-weight');
  var btnMeals=document.getElementById('prog-tab-meals');
  if(tab==='weight'){
    weightTab.style.display='block';
    mealsTab.style.display='none';
    btnWeight.style.background='var(--gold)';btnWeight.style.color='var(--bg)';
    btnMeals.style.background='var(--s1)';btnMeals.style.color='var(--t2)';
  } else {
    weightTab.style.display='none';
    mealsTab.style.display='block';
    btnWeight.style.background='var(--s1)';btnWeight.style.color='var(--t2)';
    btnMeals.style.background='var(--gold)';btnMeals.style.color='var(--bg)';
    if(!mealHistoryLoaded){loadMealHistory();}
    else if(mealHistoryCache){renderMealHistory(mealHistoryCache);}
  }
}
