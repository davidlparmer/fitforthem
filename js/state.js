// ─────────────────────────────────────────────────────────────
// state.js — Loftin Method Global App State
// Declares and initialises every global variable the app depends on.
// Load order: SECOND — immediately after migrate.js, before everything else.
//
// Why this file exists:
//   These declarations were previously in ui.js which loaded last.
//   Any file that ran synchronously before ui.js loaded would get
//   undefined instead of the initialised values. state.js loads early
//   so globals exist before any other module references them.
// ─────────────────────────────────────────────────────────────

// ── SETTINGS OBJECT ──────────────────────────────────────────
var S={work:'office',walkType:'flat',speed:2.5,incline:3,wakeTime:'06:00',bedTime:'22:00',age:35};

// ── CORE APP STATE ────────────────────────────────────────────
var workMode='office';
var currentPlan={};
var userName='';
var currentDayIdx=new Date().getDay()===0?6:new Date().getDay()-1;
var recipeDayIdx=new Date().getDay()===0?6:new Date().getDay()-1;

// ── MEAL STATE ────────────────────────────────────────────────
var customMeals=[];
var proteinSwaps={};
var skippedMeals={};    // {dayIdx: ['first','dinner','dessert']}
var mealPrefs={};       // {dayIdx: {slot: {key, name, items, cal}}}
var dinnerTheme=null;   // family key from DINNER_THEME_FAMILIES, or null. NOT a meal key.

// ── DRINKING DAY STATE ────────────────────────────────────────
var drinkingDays={4:false,5:false,6:false}; // false | 'light' | 'regular' | 'big'
var DRINK_RESERVES={light:200,regular:450,big:700};

// ── WEIGHT LOG ────────────────────────────────────────────────
var weightLog=[];

// ── EATING OUT STATE ──────────────────────────────────────────
var eoMealType='dinner';
var eoDrinking=false;

// ── GROCERY STATE ─────────────────────────────────────────────
var groceryList={};
var shopDays=7;
var storeMode='protein';
var groceryUnits='store'; // 'g' or 'store' (lbs for proteins/produce, oz for dairy)

// ── PROGRESS STATE ────────────────────────────────────────────
var chartRange=7;

// ── CONSTANTS ─────────────────────────────────────────────────
const GROCERY_PPW=32,EATOUT_PPM=22,MPD=1;

// ── INITIAL LOAD FROM localStorage ───────────────────────────
// Populated here so all globals have real values before any
// module runs. restoreFromServer() will overwrite these on boot
// if server data is newer.
try{weightLog=JSON.parse(localStorage.getItem('fft_log')||'[]');}catch(e){}
try{customMeals=JSON.parse(localStorage.getItem('fft_custom')||'[]');}catch(e){}
try{proteinSwaps=JSON.parse(localStorage.getItem('fft_swaps')||'{}');}catch(e){}
try{skippedMeals=JSON.parse(localStorage.getItem('fft_skipped')||'{}');}catch(e){}
try{mealPrefs=JSON.parse(localStorage.getItem('fft_meal_prefs')||'{}');}catch(e){}
try{dinnerTheme=localStorage.getItem('fft_dinner_theme')||null;}catch(e){}
try{
  // Cookie is the most reliable source — survives iOS PWA full termination
  var _ddCookie=document.cookie.match(/(?:^|;\s*)fft_drinks=([^;]+)/);
  if(_ddCookie){
    drinkingDays=JSON.parse(decodeURIComponent(_ddCookie[1]));
  } else {
    // Fallback to localStorage if no cookie
    var _dd=localStorage.getItem('fft_drinking_days');
    if(_dd)drinkingDays=JSON.parse(_dd);
  }
}catch(e){}
