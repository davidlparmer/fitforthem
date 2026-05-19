// ─────────────────────────────────────────────────────────────
// plan-templates.js — Loftin Method Structured Meal Templates
// Contains the weekly meal plan arrays for all four lanes.
// Pure data — no DOM, no side effects.
// Load order: after lane-profiles.js, before engine.js
//
// Internal slot keys: first | dinner | dessert
// Public labels (rendered in meals.js):
//   first   → First Meal
//   dinner  → Main Meal
//   dessert → Final Meal
//
// Each slot carries:
//   n — exact display name (specific variant, not family umbrella)
//   k — swap key matching SWAP_OPTIONS and MEAL_INSTRUCTIONS_MAP
//   i — ingredient strings
//   c — reference calories
//
// TEMPLATE STATUS KEY
//   ✅ LOCKED    — real food, tested, production ready
//   🔶 PROVISIONAL — real meal families, correct structure,
//                    exact foods may evolve with user testing
// ─────────────────────────────────────────────────────────────


// ═════════════════════════════════════════════════════════════
// MEN'S DEFICIT — ✅ LOCKED BASELINE
// ═════════════════════════════════════════════════════════════
// Deficit ratios: First 27.5% | Main 52.5% | Final 20%
// Reference target: ~1800 cal → First 495 | Main 945 | Final 360

// ── MEN DEFICIT — OFFICE MODE ────────────────────────────────
var IF_PLAN_OFFICE = [
  // Mon
  {first:{n:'Cottage Cheese Bowl',k:'cottage-bowl',i:['Cottage cheese 400g','Chia 15g','Blueberries 75g','Honey 15g'],c:495},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 227g','Potatoes 240g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:false,isWeekend:false},
  // Tue
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Greek yogurt 400g','Blueberries 100g','Chia 20g','Honey 30g'],c:495},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 250g','Potatoes 220g','Cheese 25g','Sour cream 20g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:false,isWeekend:false},
  // Wed
  {first:{n:'Cottage Cheese Bowl',k:'cottage-bowl',i:['Cottage cheese 400g','Chia 15g','Blueberries 75g','Honey 15g'],c:495},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 200g','Potatoes 260g','Cheese 25g','Sour cream 25g','Honey 40g','Soy sauce 36g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:false,isWeekend:false},
  // Thu
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Greek yogurt 400g','Blueberries 100g','Chia 20g','Honey 30g'],c:495},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 227g','Potatoes 240g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:false,isWeekend:false},
  // Fri
  {first:{n:'Cottage Cheese Bowl',k:'cottage-bowl',i:['Cottage cheese 400g','Chia 15g','Blueberries 75g','Honey 15g'],c:495},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 250g','Potatoes 220g','Cheese 25g','Sour cream 20g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:true,isWeekend:true},
  // Sat
  {first:{n:'Whole Egg & Potato Skillet',k:'cheesy-egg-potato',i:['Eggs 200g','Potatoes 250g','Cheese 23g','Sour cream 30g'],c:569},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 227g','Potatoes 240g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:true,isWeekend:true},
  // Sun
  {first:{n:'Cottage Cheese Bowl',k:'cottage-bowl',i:['Cottage cheese 400g','Chia 15g','Blueberries 75g','Honey 15g'],c:495},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 200g','Potatoes 260g','Cheese 25g','Sour cream 25g','Honey 40g','Soy sauce 36g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:true,isWeekend:true},
];

// ── MEN DEFICIT — WFH MODE ────────────────────────────────────
var IF_PLAN_WFH = [
  // Mon
  {first:{n:'Whole Egg & Potato Skillet',k:'cheesy-egg-potato',i:['Eggs 200g','Potatoes 250g','Cheese 23g','Sour cream 30g'],c:569},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 227g','Potatoes 240g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:false,isWeekend:false},
  // Tue
  {first:{n:'Cottage Cheese Bowl',k:'cottage-bowl',i:['Cottage cheese 400g','Chia 15g','Blueberries 75g','Honey 15g'],c:495},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 250g','Potatoes 220g','Cheese 25g','Sour cream 20g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:false,isWeekend:false},
  // Wed
  {first:{n:'Whole Egg & Potato Skillet',k:'cheesy-egg-potato',i:['Eggs 200g','Potatoes 250g','Cheese 23g','Sour cream 30g'],c:569},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 200g','Potatoes 260g','Cheese 25g','Sour cream 25g','Honey 40g','Soy sauce 36g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:false,isWeekend:false},
  // Thu
  {first:{n:'Cottage Cheese Bowl',k:'cottage-bowl',i:['Cottage cheese 400g','Chia 15g','Blueberries 75g','Honey 15g'],c:495},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 227g','Potatoes 240g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:false,isWeekend:false},
  // Fri
  {first:{n:'Whole Egg & Potato Skillet',k:'cheesy-egg-potato',i:['Eggs 200g','Potatoes 250g','Cheese 23g','Sour cream 30g'],c:569},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 250g','Potatoes 220g','Cheese 25g','Sour cream 20g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:true,isWeekend:true},
  // Sat
  {first:{n:'Whole Egg & Potato Skillet',k:'cheesy-egg-potato',i:['Eggs 200g','Potatoes 250g','Cheese 23g','Sour cream 30g'],c:569},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 227g','Potatoes 240g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:true,isWeekend:true},
  // Sun
  {first:{n:'Cottage Cheese Bowl',k:'cottage-bowl',i:['Cottage cheese 400g','Chia 15g','Blueberries 75g','Honey 15g'],c:495},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 200g','Potatoes 260g','Cheese 25g','Sour cream 25g','Honey 40g','Soy sauce 36g'],c:945},dessert:{n:'Yogurt & Honey Bowl',k:'yogurt-honey-bowl',i:['2% Greek yogurt 280g','Honey 30g','Biscoff cookies 2'],c:360},drinks:true,isWeekend:true},
];


// ═════════════════════════════════════════════════════════════
// WOMEN'S DEFICIT — 🔶 PROVISIONAL
// ═════════════════════════════════════════════════════════════

// ── WOMEN DEFICIT — OFFICE MODE ──────────────────────────────
var IF_PLAN_OFFICE_WOMEN = [
  // Mon
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Nonfat Greek yogurt 300g','Blueberries 90g','Chia 8g','Honey 10g'],c:275},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 180g','Potatoes 200g','Cheese 20g','Sour cream 15g','Honey 25g','Soy sauce 25g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:false,isWeekend:false},
  // Tue
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Nonfat Greek yogurt 300g','Blueberries 90g','Chia 8g','Honey 10g'],c:275},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 200g','Potatoes 180g','Cheese 20g','Sour cream 15g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:false,isWeekend:false},
  // Wed
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Nonfat Greek yogurt 300g','Blueberries 90g','Chia 8g','Honey 10g'],c:275},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 160g','Potatoes 210g','Cheese 20g','Sour cream 20g','Honey 25g','Soy sauce 25g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:false,isWeekend:false},
  // Thu
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Nonfat Greek yogurt 300g','Blueberries 90g','Chia 8g','Honey 10g'],c:275},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 180g','Potatoes 200g','Cheese 20g','Sour cream 15g','Honey 25g','Soy sauce 25g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:false,isWeekend:false},
  // Fri
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Nonfat Greek yogurt 300g','Blueberries 90g','Chia 8g','Honey 10g'],c:275},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 200g','Potatoes 180g','Cheese 20g','Sour cream 15g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:true,isWeekend:true},
  // Sat
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Nonfat Greek yogurt 300g','Blueberries 90g','Chia 8g','Honey 10g'],c:275},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 180g','Potatoes 200g','Cheese 20g','Sour cream 15g','Honey 25g','Soy sauce 25g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:true,isWeekend:true},
  // Sun
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Nonfat Greek yogurt 300g','Blueberries 90g','Chia 8g','Honey 10g'],c:275},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 160g','Potatoes 210g','Cheese 20g','Sour cream 20g','Honey 25g','Soy sauce 25g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:true,isWeekend:true},
];

// ── WOMEN DEFICIT — WFH MODE ─────────────────────────────────
var IF_PLAN_WFH_WOMEN = [
  // Mon — Egg & Potato first
  {first:{n:'Salsa Egg White & Potato Skillet',k:'salsa-egg-potato',i:['Eggs 150g','Potatoes 180g','Cheese 15g','Sour cream 20g'],c:275},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 180g','Potatoes 200g','Cheese 20g','Sour cream 15g','Honey 25g','Soy sauce 25g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:false,isWeekend:false},
  // Tue — Berry Chia Bowl first
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Nonfat Greek yogurt 300g','Blueberries 90g','Chia 8g','Honey 10g'],c:275},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 200g','Potatoes 180g','Cheese 20g','Sour cream 15g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:false,isWeekend:false},
  // Wed — Egg & Potato first
  {first:{n:'Salsa Egg White & Potato Skillet',k:'salsa-egg-potato',i:['Eggs 150g','Potatoes 180g','Cheese 15g','Sour cream 20g'],c:275},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 160g','Potatoes 210g','Cheese 20g','Sour cream 20g','Honey 25g','Soy sauce 25g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:false,isWeekend:false},
  // Thu — Berry Chia Bowl first
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Nonfat Greek yogurt 300g','Blueberries 90g','Chia 8g','Honey 10g'],c:275},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 180g','Potatoes 200g','Cheese 20g','Sour cream 15g','Honey 25g','Soy sauce 25g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:false,isWeekend:false},
  // Fri — Egg & Potato first
  {first:{n:'Salsa Egg White & Potato Skillet',k:'salsa-egg-potato',i:['Eggs 150g','Potatoes 180g','Cheese 15g','Sour cream 20g'],c:275},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 200g','Potatoes 180g','Cheese 20g','Sour cream 15g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:true,isWeekend:true},
  // Sat — Egg & Potato first
  {first:{n:'Salsa Egg White & Potato Skillet',k:'salsa-egg-potato',i:['Eggs 150g','Potatoes 180g','Cheese 15g','Sour cream 20g'],c:275},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 180g','Potatoes 200g','Cheese 20g','Sour cream 15g','Honey 25g','Soy sauce 25g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:true,isWeekend:true},
  // Sun — Berry Chia Bowl first
  {first:{n:'Berry Chia Bowl',k:'berry-chia-bowl',i:['Nonfat Greek yogurt 300g','Blueberries 90g','Chia 8g','Honey 10g'],c:275},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 160g','Potatoes 210g','Cheese 20g','Sour cream 20g','Honey 25g','Soy sauce 25g'],c:525},dessert:{n:'Blueberry Yogurt Cookie Bowl',k:'blueberry-yogurt-cookie-bowl',i:['Nonfat Greek yogurt 200g','Blueberries 75g','Honey 10g','Biscoff cookies 2'],c:269},drinks:true,isWeekend:true},
];


// ═════════════════════════════════════════════════════════════
// MEN'S SURPLUS — 🔶 PROVISIONAL
// ═════════════════════════════════════════════════════════════

// ── MEN SURPLUS — OFFICE MODE ────────────────────────────────
var IF_PLAN_OFFICE_MEN_SURPLUS = [
  // Mon
  {first:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 350g','Banana 120g','Honey 20g','Oats 20g'],c:660},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 250g','Rice 200g','Potatoes 150g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:false,isWeekend:false},
  // Tue
  {first:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 350g','Banana 120g','Honey 20g','Oats 20g'],c:660},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 280g','Rice 200g','Potatoes 130g','Cheese 25g','Sour cream 20g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:false,isWeekend:false},
  // Wed
  {first:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 350g','Banana 120g','Honey 20g','Oats 20g'],c:660},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 220g','Rice 200g','Potatoes 160g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:false,isWeekend:false},
  // Thu
  {first:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 350g','Banana 120g','Honey 20g','Oats 20g'],c:660},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 250g','Rice 200g','Potatoes 150g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:false,isWeekend:false},
  // Fri
  {first:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 350g','Banana 120g','Honey 20g','Oats 20g'],c:660},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 280g','Rice 200g','Potatoes 130g','Cheese 25g','Sour cream 20g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:true,isWeekend:true},
  // Sat
  {first:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 350g','Banana 120g','Honey 20g','Oats 20g'],c:660},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 250g','Rice 200g','Potatoes 150g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:true,isWeekend:true},
  // Sun
  {first:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 350g','Banana 120g','Honey 20g','Oats 20g'],c:660},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 220g','Rice 200g','Potatoes 160g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:true,isWeekend:true},
];

// ── MEN SURPLUS — WFH MODE ───────────────────────────────────
var IF_PLAN_WFH_MEN_SURPLUS = [
  // Mon — Loaded Egg & Potato first
  {first:{n:'Loaded Egg & Potato Skillet',k:'loaded-egg-potato',i:['Eggs 250g','Potatoes 300g','Cheese 30g','Sour cream 35g'],c:660},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 250g','Rice 200g','Potatoes 150g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:false,isWeekend:false},
  // Tue — Banana Honey Bowl first
  {first:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 350g','Banana 120g','Honey 20g','Oats 20g'],c:660},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 280g','Rice 200g','Potatoes 130g','Cheese 25g','Sour cream 20g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:false,isWeekend:false},
  // Wed — Loaded Egg & Potato first
  {first:{n:'Loaded Egg & Potato Skillet',k:'loaded-egg-potato',i:['Eggs 250g','Potatoes 300g','Cheese 30g','Sour cream 35g'],c:660},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 220g','Rice 200g','Potatoes 160g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:false,isWeekend:false},
  // Thu — Banana Honey Bowl first
  {first:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 350g','Banana 120g','Honey 20g','Oats 20g'],c:660},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 250g','Rice 200g','Potatoes 150g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:false,isWeekend:false},
  // Fri — Loaded Egg & Potato first
  {first:{n:'Loaded Egg & Potato Skillet',k:'loaded-egg-potato',i:['Eggs 250g','Potatoes 300g','Cheese 30g','Sour cream 35g'],c:660},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 280g','Rice 200g','Potatoes 130g','Cheese 25g','Sour cream 20g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:true,isWeekend:true},
  // Sat — Loaded Egg & Potato first
  {first:{n:'Loaded Egg & Potato Skillet',k:'loaded-egg-potato',i:['Eggs 250g','Potatoes 300g','Cheese 30g','Sour cream 35g'],c:660},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 250g','Rice 200g','Potatoes 150g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:true,isWeekend:true},
  // Sun — Banana Honey Bowl first
  {first:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 350g','Banana 120g','Honey 20g','Oats 20g'],c:660},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 220g','Rice 200g','Potatoes 160g','Cheese 25g','Sour cream 20g','Honey 40g','Soy sauce 36g'],c:880},dessert:{n:'Banana Oat Nut Butter Bowl',k:'banana-oat-pb-bowl',i:['2% Greek yogurt 350g','Oats 40g','Banana 120g','Peanut butter 16g','Honey 15g'],c:660},drinks:true,isWeekend:true},
];


// ═════════════════════════════════════════════════════════════
// WOMEN'S SURPLUS — 🔶 PROVISIONAL
// ═════════════════════════════════════════════════════════════

// ── WOMEN SURPLUS — OFFICE MODE ──────────────────────────────
var IF_PLAN_OFFICE_WOMEN_SURPLUS = [
  // Mon
  {first:{n:'Oats & Berry Bowl',k:'oats-berry-bowl',i:['2% Greek yogurt 300g','Oats 30g','Blueberries 100g','Honey 15g'],c:540},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 200g','Rice 180g','Potatoes 120g','Cheese 20g','Sour cream 15g','Honey 30g','Soy sauce 25g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:false,isWeekend:false},
  // Tue
  {first:{n:'Oats & Berry Bowl',k:'oats-berry-bowl',i:['2% Greek yogurt 300g','Oats 30g','Blueberries 100g','Honey 15g'],c:540},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 220g','Rice 180g','Potatoes 100g','Cheese 20g','Sour cream 15g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:false,isWeekend:false},
  // Wed
  {first:{n:'Oats & Berry Bowl',k:'oats-berry-bowl',i:['2% Greek yogurt 300g','Oats 30g','Blueberries 100g','Honey 15g'],c:540},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 180g','Rice 180g','Potatoes 130g','Cheese 20g','Sour cream 15g','Honey 30g','Soy sauce 25g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:false,isWeekend:false},
  // Thu
  {first:{n:'Oats & Berry Bowl',k:'oats-berry-bowl',i:['2% Greek yogurt 300g','Oats 30g','Blueberries 100g','Honey 15g'],c:540},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 200g','Rice 180g','Potatoes 120g','Cheese 20g','Sour cream 15g','Honey 30g','Soy sauce 25g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:false,isWeekend:false},
  // Fri
  {first:{n:'Oats & Berry Bowl',k:'oats-berry-bowl',i:['2% Greek yogurt 300g','Oats 30g','Blueberries 100g','Honey 15g'],c:540},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 220g','Rice 180g','Potatoes 100g','Cheese 20g','Sour cream 15g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:true,isWeekend:true},
  // Sat
  {first:{n:'Oats & Berry Bowl',k:'oats-berry-bowl',i:['2% Greek yogurt 300g','Oats 30g','Blueberries 100g','Honey 15g'],c:540},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 200g','Rice 180g','Potatoes 120g','Cheese 20g','Sour cream 15g','Honey 30g','Soy sauce 25g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:true,isWeekend:true},
  // Sun
  {first:{n:'Oats & Berry Bowl',k:'oats-berry-bowl',i:['2% Greek yogurt 300g','Oats 30g','Blueberries 100g','Honey 15g'],c:540},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 180g','Rice 180g','Potatoes 130g','Cheese 20g','Sour cream 15g','Honey 30g','Soy sauce 25g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:true,isWeekend:true},
];

// ── WOMEN SURPLUS — WFH MODE ─────────────────────────────────
var IF_PLAN_WFH_WOMEN_SURPLUS = [
  // Mon — Egg & Potato Skillet first
  {first:{n:'Whole Egg & Potato Skillet',k:'cheesy-egg-potato',i:['Eggs 200g','Potatoes 220g','Cheese 20g','Sour cream 25g'],c:540},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 200g','Rice 180g','Potatoes 120g','Cheese 20g','Sour cream 15g','Honey 30g','Soy sauce 25g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:false,isWeekend:false},
  // Tue — Oats & Berry Bowl first
  {first:{n:'Oats & Berry Bowl',k:'oats-berry-bowl',i:['2% Greek yogurt 300g','Oats 30g','Blueberries 100g','Honey 15g'],c:540},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 220g','Rice 180g','Potatoes 100g','Cheese 20g','Sour cream 15g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:false,isWeekend:false},
  // Wed — Egg & Potato Skillet first
  {first:{n:'Whole Egg & Potato Skillet',k:'cheesy-egg-potato',i:['Eggs 200g','Potatoes 220g','Cheese 20g','Sour cream 25g'],c:540},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 180g','Rice 180g','Potatoes 130g','Cheese 20g','Sour cream 15g','Honey 30g','Soy sauce 25g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:false,isWeekend:false},
  // Thu — Oats & Berry Bowl first
  {first:{n:'Oats & Berry Bowl',k:'oats-berry-bowl',i:['2% Greek yogurt 300g','Oats 30g','Blueberries 100g','Honey 15g'],c:540},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 200g','Rice 180g','Potatoes 120g','Cheese 20g','Sour cream 15g','Honey 30g','Soy sauce 25g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:false,isWeekend:false},
  // Fri — Egg & Potato Skillet first
  {first:{n:'Whole Egg & Potato Skillet',k:'cheesy-egg-potato',i:['Eggs 200g','Potatoes 220g','Cheese 20g','Sour cream 25g'],c:540},dinner:{n:'Beef & Potatoes',k:'beef-and-potatoes',i:['Beef sirloin 220g','Rice 180g','Potatoes 100g','Cheese 20g','Sour cream 15g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:true,isWeekend:true},
  // Sat — Egg & Potato Skillet first
  {first:{n:'Whole Egg & Potato Skillet',k:'cheesy-egg-potato',i:['Eggs 200g','Potatoes 220g','Cheese 20g','Sour cream 25g'],c:540},dinner:{n:'Honey Soy Chicken & Potatoes',k:'honey-soy-chicken',i:['Chicken 200g','Rice 180g','Potatoes 120g','Cheese 20g','Sour cream 15g','Honey 30g','Soy sauce 25g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:true,isWeekend:true},
  // Sun — Oats & Berry Bowl first
  {first:{n:'Oats & Berry Bowl',k:'oats-berry-bowl',i:['2% Greek yogurt 300g','Oats 30g','Blueberries 100g','Honey 15g'],c:540},dinner:{n:'Honey Soy Salmon & Potatoes',k:'honey-soy-salmon',i:['Salmon 180g','Rice 180g','Potatoes 130g','Cheese 20g','Sour cream 15g','Honey 30g','Soy sauce 25g'],c:720},dessert:{n:'Banana Honey Bowl',k:'banana-honey-bowl',i:['2% Greek yogurt 300g','Banana 100g','Honey 15g','Peanut butter 10g'],c:540},drinks:true,isWeekend:true},
];


// ═════════════════════════════════════════════════════════════
// ACTIVE PLAN SELECTOR — LANE-AWARE
// ═════════════════════════════════════════════════════════════
function getActivePlan() {
  var sex = (currentPlan && currentPlan.sex) ? currentPlan.sex : 'male';
  var phaseMode = (currentPlan && currentPlan.phase) ? currentPlan.phase : '';
  var isGain = (phaseMode === 'moderate_gain' || phaseMode === 'mild_gain' || phaseMode === 'landing_gain');
  var isWFH = workMode === 'wfh';

  if (sex === 'female') {
    if (isGain) {
      return isWFH ? IF_PLAN_WFH_WOMEN_SURPLUS : IF_PLAN_OFFICE_WOMEN_SURPLUS;
    }
    return isWFH ? IF_PLAN_WFH_WOMEN : IF_PLAN_OFFICE_WOMEN;
  }

  // Male
  if (isGain) {
    return isWFH ? IF_PLAN_WFH_MEN_SURPLUS : IF_PLAN_OFFICE_MEN_SURPLUS;
  }
  return isWFH ? IF_PLAN_WFH : IF_PLAN_OFFICE;
}
