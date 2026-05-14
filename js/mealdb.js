// ─────────────────────────────────────────────────────────────
// mealdb.js — Loftin Method Master Meal Database
// Schema version 1.0
//
// ARCHITECTURE NOTE (Option A):
// The existing Loftin Method structured plan (IF_PLAN_OFFICE, IF_PLAN_WFH)
// continues to power the core dashboard for existing users.
// This file powers the Meal Explorer — a separate, expandable system
// for all meal families, cultural lanes, dietary preferences, and
// medical-sensitive options.
//
// Migration to Option B (unified engine) is planned post-launch.
//
// Schema fields:
//   id            — unique slug, kebab-case
//   family        — meal family this belongs to (groups related meals)
//   name          — display name
//   meal_type     — breakfast | lunch | dinner | snack | any
//   goals         — array: lose | maintain | gain
//   tags.diet     — dietary flags
//   tags.cultural — cultural lane
//   tags.budget   — low | moderate | premium
//   tags.family_friendly — boolean
//   tags.medical  — medical sensitivity tags
//   tags.prep     — quick | moderate | batch
//   base_servings — integer, default 1
//   ingredients   — array of { item, amount, unit, role }
//   macros_per_serving — { cal, pro, carb, fat, fiber, sugar }
//   scaling       — { light, medium, large } multipliers
//   modifiers     — named transformations (budget, carb_conscious, family, etc.)
//   instructions  — array of step strings
//   swap_options  — array of meal IDs in same family
//   image         — filename from app assets
//   loftin_plan   — true if this is a core Loftin Method plan meal
// ─────────────────────────────────────────────────────────────

var MEAL_DB = [

  // ── FAMILY 1: PROTEIN BOWL ───────────────────────────────────
  {
    id: 'honey-soy-chicken-bowl',
    family: 'protein-bowl',
    name: 'Honey Soy Chicken Bowl',
    meal_type: 'dinner',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: ['high-protein', 'dairy-free'],
      cultural: ['asian-inspired'],
      budget: 'moderate',
      family_friendly: true,
      medical: ['carb-conscious-moderate'],
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Chicken breast', amount: 227, unit: 'g', role: 'protein' },
      { item: 'White rice', amount: 185, unit: 'g', role: 'carb' },
      { item: 'Honey', amount: 30, unit: 'g', role: 'flavor' },
      { item: 'Soy sauce', amount: 30, unit: 'g', role: 'flavor' },
      { item: 'Garlic powder', amount: 3, unit: 'g', role: 'seasoning' }
    ],
    macros_per_serving: { cal: 820, pro: 68, carb: 95, fat: 8, fiber: 1, sugar: 18 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      budget: {
        swap: [{ from: 'Chicken breast', to: 'Canned chicken', amount: 200, unit: 'g' }],
        note: 'Canned chicken cuts cost by ~60% with similar protein'
      },
      carb_conscious: {
        swap: [{ from: 'White rice', to: 'Cauliflower rice', amount: 250, unit: 'g' }],
        macro_delta: { carb: -75, cal: -280, fiber: 3 },
        note: 'Drops carbs from 95g to ~20g — ideal for carb-aware eating'
      },
      family: {
        multiplier: 4,
        note: 'Scale all ingredients by 4 for a family of 4'
      },
      gain: {
        swap: [{ from: 'White rice', to: 'White rice', amount: 280, unit: 'g' }],
        macro_delta: { carb: 25, cal: 130 },
        note: 'Larger rice portion adds ~130 cal for lean gaining'
      }
    },
    instructions: [
      'Season chicken with garlic powder, salt, and pepper',
      'Heat pan over medium-high, cook chicken 5–6 min per side until done',
      'Mix honey and soy sauce. Pour over chicken, cook on low 2 minutes',
      'Serve over cooked rice'
    ],
    swap_options: ['beef-rice-bowl', 'salmon-rice-bowl', 'turkey-rice-bowl', 'tofu-rice-bowl'],
    image: 'food-chicken.png',
    loftin_plan: false
  },

  {
    id: 'beef-rice-bowl',
    family: 'protein-bowl',
    name: 'Beef & Rice Bowl',
    meal_type: 'dinner',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: ['high-protein', 'dairy-free'],
      cultural: ['american'],
      budget: 'moderate',
      family_friendly: true,
      medical: [],
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Beef sirloin', amount: 220, unit: 'g', role: 'protein' },
      { item: 'White rice', amount: 185, unit: 'g', role: 'carb' },
      { item: 'Garlic powder', amount: 3, unit: 'g', role: 'seasoning' },
      { item: 'Olive oil', amount: 10, unit: 'g', role: 'fat' }
    ],
    macros_per_serving: { cal: 810, pro: 65, carb: 88, fat: 18, fiber: 1, sugar: 1 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      budget: {
        swap: [{ from: 'Beef sirloin', to: 'Ground beef 80/20', amount: 220, unit: 'g' }],
        note: 'Ground beef costs ~40% less with similar protein'
      },
      carb_conscious: {
        swap: [{ from: 'White rice', to: 'Cauliflower rice', amount: 250, unit: 'g' }],
        macro_delta: { carb: -75, cal: -280 },
        note: 'Drops to ~13g net carbs'
      },
      family: { multiplier: 4, note: 'Scale for family of 4' }
    },
    instructions: [
      'Season beef with garlic powder, salt, and pepper',
      'Heat oil in pan over high heat. Sear beef 3–4 min per side',
      'Rest 2 minutes, then slice against the grain',
      'Serve over cooked rice'
    ],
    swap_options: ['honey-soy-chicken-bowl', 'salmon-rice-bowl', 'turkey-rice-bowl'],
    image: 'food-beef.png',
    loftin_plan: false
  },

  {
    id: 'salmon-rice-bowl',
    family: 'protein-bowl',
    name: 'Honey Soy Salmon Bowl',
    meal_type: 'dinner',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: ['high-protein', 'dairy-free', 'omega-3'],
      cultural: ['asian-inspired'],
      budget: 'premium',
      family_friendly: true,
      medical: ['heart-healthy', 'anti-inflammatory'],
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Salmon fillet', amount: 200, unit: 'g', role: 'protein' },
      { item: 'White rice', amount: 185, unit: 'g', role: 'carb' },
      { item: 'Honey', amount: 25, unit: 'g', role: 'flavor' },
      { item: 'Soy sauce', amount: 25, unit: 'g', role: 'flavor' }
    ],
    macros_per_serving: { cal: 780, pro: 52, carb: 88, fat: 18, fiber: 1, sugar: 14 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      budget: {
        swap: [{ from: 'Salmon fillet', to: 'Canned salmon', amount: 200, unit: 'g' }],
        note: 'Canned salmon cuts cost by ~70%, same omega-3 profile'
      },
      carb_conscious: {
        swap: [{ from: 'White rice', to: 'Cauliflower rice', amount: 250, unit: 'g' }],
        macro_delta: { carb: -75, cal: -280 },
        note: 'Drops to ~13g net carbs'
      },
      family: { multiplier: 4, note: 'Scale for family of 4' }
    },
    instructions: [
      'Pat salmon dry. Season with salt, pepper, garlic powder',
      'Mix honey and soy sauce',
      'Cook salmon in hot pan 3 min per side until flaky',
      'Pour sauce over salmon, cook on low 1 minute',
      'Serve over rice'
    ],
    swap_options: ['honey-soy-chicken-bowl', 'beef-rice-bowl', 'shrimp-rice-bowl'],
    image: 'food-salmon.png',
    loftin_plan: false
  },

  {
    id: 'tofu-rice-bowl',
    family: 'protein-bowl',
    name: 'Crispy Tofu Rice Bowl',
    meal_type: 'dinner',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: ['vegetarian', 'vegan', 'dairy-free', 'high-protein'],
      cultural: ['asian-inspired'],
      budget: 'low',
      family_friendly: true,
      medical: ['carb-conscious-moderate', 'heart-healthy'],
      prep: 'moderate'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Extra firm tofu', amount: 300, unit: 'g', role: 'protein' },
      { item: 'White rice', amount: 185, unit: 'g', role: 'carb' },
      { item: 'Soy sauce', amount: 30, unit: 'g', role: 'flavor' },
      { item: 'Sesame oil', amount: 10, unit: 'g', role: 'fat' },
      { item: 'Honey', amount: 20, unit: 'g', role: 'flavor' }
    ],
    macros_per_serving: { cal: 710, pro: 34, carb: 95, fat: 16, fiber: 3, sugar: 12 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      carb_conscious: {
        swap: [{ from: 'White rice', to: 'Cauliflower rice', amount: 250, unit: 'g' }],
        macro_delta: { carb: -75, cal: -280 },
        note: 'Lower carb vegetarian option'
      },
      family: { multiplier: 4, note: 'Scale for family of 4' }
    },
    instructions: [
      'Press tofu dry with paper towels — the drier the better for crispiness',
      'Cut into cubes. Pan-fry in sesame oil over medium-high heat until golden on all sides (~8 min)',
      'Mix soy sauce and honey. Pour over tofu, toss and cook 2 minutes',
      'Serve over rice'
    ],
    swap_options: ['honey-soy-chicken-bowl', 'beef-rice-bowl'],
    image: 'food-chicken.png',
    loftin_plan: false
  },

  // ── FAMILY 2: TACO BOWL (Mexican-inspired) ───────────────────
  {
    id: 'chicken-taco-bowl',
    family: 'taco-bowl',
    name: 'Chicken Taco Bowl',
    meal_type: 'dinner',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: ['high-protein', 'gluten-conscious'],
      cultural: ['mexican-inspired'],
      budget: 'moderate',
      family_friendly: true,
      medical: ['carb-conscious-moderate'],
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Chicken breast', amount: 227, unit: 'g', role: 'protein' },
      { item: 'White rice', amount: 150, unit: 'g', role: 'carb' },
      { item: 'Black beans', amount: 130, unit: 'g', role: 'carb' },
      { item: 'Taco seasoning', amount: 10, unit: 'g', role: 'seasoning' },
      { item: 'Sour cream', amount: 30, unit: 'g', role: 'fat' },
      { item: 'Shredded cheese', amount: 25, unit: 'g', role: 'fat' }
    ],
    macros_per_serving: { cal: 870, pro: 72, carb: 85, fat: 18, fiber: 9, sugar: 3 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      budget: {
        swap: [{ from: 'Chicken breast', to: 'Ground turkey', amount: 220, unit: 'g' }],
        note: 'Ground turkey is ~30% cheaper and works great with taco seasoning'
      },
      carb_conscious: {
        swap: [
          { from: 'White rice', to: 'Cauliflower rice', amount: 200, unit: 'g' },
          { from: 'Black beans', to: 'Black beans', amount: 65, unit: 'g' }
        ],
        macro_delta: { carb: -55, cal: -220, fiber: -4 },
        note: 'Half the beans, cauli rice — drops to ~30g net carbs'
      },
      dairy_free: {
        remove: ['Sour cream', 'Shredded cheese'],
        add: [{ item: 'Avocado', amount: 60, unit: 'g', role: 'fat' }],
        macro_delta: { fat: -4, cal: -50 },
        note: 'Avocado replaces dairy for creaminess'
      },
      family: { multiplier: 4, note: 'Scale for family of 4 — great for taco night' }
    },
    instructions: [
      'Season chicken with taco seasoning, salt, and pepper',
      'Cook chicken in pan over medium heat until done, then slice or shred',
      'Warm black beans in a small pot',
      'Build bowl: rice first, then beans, chicken, sour cream, cheese',
      'Add salsa or hot sauce to taste'
    ],
    swap_options: ['beef-taco-bowl', 'shrimp-taco-bowl', 'vegetarian-taco-bowl'],
    image: 'food-chicken.png',
    loftin_plan: false
  },

  {
    id: 'beef-taco-bowl',
    family: 'taco-bowl',
    name: 'Ground Beef Taco Bowl',
    meal_type: 'dinner',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: ['high-protein'],
      cultural: ['mexican-inspired'],
      budget: 'low',
      family_friendly: true,
      medical: [],
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Ground beef 90/10', amount: 220, unit: 'g', role: 'protein' },
      { item: 'White rice', amount: 150, unit: 'g', role: 'carb' },
      { item: 'Black beans', amount: 130, unit: 'g', role: 'carb' },
      { item: 'Taco seasoning', amount: 10, unit: 'g', role: 'seasoning' },
      { item: 'Shredded cheese', amount: 25, unit: 'g', role: 'fat' }
    ],
    macros_per_serving: { cal: 860, pro: 68, carb: 83, fat: 20, fiber: 9, sugar: 2 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      budget: {
        note: 'Already a budget meal — ground beef is one of the most cost-effective proteins'
      },
      family: { multiplier: 4, note: 'Classic family taco night — easy to scale' }
    },
    instructions: [
      'Brown ground beef in pan over medium heat, breaking it up as it cooks (~8 min)',
      'Drain any excess fat. Add taco seasoning and stir 1 minute',
      'Warm black beans separately',
      'Build bowl: rice, beans, seasoned beef, cheese',
      'Top with salsa, hot sauce, or sour cream'
    ],
    swap_options: ['chicken-taco-bowl', 'shrimp-taco-bowl', 'vegetarian-taco-bowl'],
    image: 'food-beef.png',
    loftin_plan: false
  },

  {
    id: 'vegetarian-taco-bowl',
    family: 'taco-bowl',
    name: 'Vegetarian Taco Bowl',
    meal_type: 'dinner',
    goals: ['lose', 'maintain'],
    tags: {
      diet: ['vegetarian', 'gluten-conscious', 'high-fiber'],
      cultural: ['mexican-inspired'],
      budget: 'low',
      family_friendly: true,
      medical: ['carb-conscious-moderate', 'heart-healthy'],
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Black beans', amount: 200, unit: 'g', role: 'protein' },
      { item: 'Pinto beans', amount: 130, unit: 'g', role: 'protein' },
      { item: 'White rice', amount: 150, unit: 'g', role: 'carb' },
      { item: 'Taco seasoning', amount: 10, unit: 'g', role: 'seasoning' },
      { item: 'Avocado', amount: 80, unit: 'g', role: 'fat' },
      { item: 'Shredded cheese', amount: 25, unit: 'g', role: 'fat' }
    ],
    macros_per_serving: { cal: 750, pro: 30, carb: 105, fat: 18, fiber: 22, sugar: 3 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      vegan: {
        remove: ['Shredded cheese'],
        add: [{ item: 'Avocado', amount: 40, unit: 'g', role: 'fat' }],
        note: 'Extra avocado replaces cheese — fully plant-based'
      },
      family: { multiplier: 4, note: 'Budget-friendly family meal' }
    },
    instructions: [
      'Warm both beans in a pot with taco seasoning',
      'Cook rice according to package directions',
      'Slice avocado',
      'Build bowl: rice, seasoned beans, avocado, cheese',
      'Top with salsa and lime juice'
    ],
    swap_options: ['chicken-taco-bowl', 'beef-taco-bowl'],
    image: 'food-chicken.png',
    loftin_plan: false
  },

  // ── FAMILY 3: EGGS & POTATOES ─────────────────────────────────
  {
    id: 'classic-eggs-potatoes',
    family: 'eggs-potatoes',
    name: 'Eggs & Mashed Potatoes',
    meal_type: 'breakfast',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: ['high-protein', 'vegetarian', 'gluten-free'],
      cultural: ['american', 'southern'],
      budget: 'low',
      family_friendly: true,
      medical: [],
      prep: 'moderate'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Eggs', amount: 4, unit: 'count', role: 'protein' },
      { item: 'Russet potatoes', amount: 250, unit: 'g', role: 'carb' },
      { item: 'Shredded cheese', amount: 23, unit: 'g', role: 'fat' },
      { item: 'Sour cream', amount: 30, unit: 'g', role: 'fat' }
    ],
    macros_per_serving: { cal: 590, pro: 36, carb: 48, fat: 28, fiber: 4, sugar: 3 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      dairy_free: {
        remove: ['Shredded cheese', 'Sour cream'],
        add: [
          { item: 'Olive oil', amount: 15, unit: 'g', role: 'fat' },
          { item: 'Avocado', amount: 60, unit: 'g', role: 'fat' }
        ],
        note: 'Olive oil in mash, avocado on top — dairy-free and still rich'
      },
      budget: { note: 'Already one of the lowest-cost high-protein meals you can make' },
      family: { multiplier: 4, note: 'Scale for family of 4 — works as a weekend breakfast' }
    },
    instructions: [
      'Boil potatoes until tender (~15 min), then mash with cheese, sour cream, salt, and pepper',
      'Scramble or boil eggs to your preference',
      'Serve eggs over or alongside mashed potatoes'
    ],
    swap_options: ['veggie-scramble', 'oatmeal-bowl'],
    image: 'food-eggs.png',
    loftin_plan: false
  },

  // ── FAMILY 4: YOGURT BOWL ─────────────────────────────────────
  {
    id: 'greek-yogurt-bowl',
    family: 'yogurt-bowl',
    name: 'Greek Yogurt Power Bowl',
    meal_type: 'breakfast',
    goals: ['lose', 'maintain'],
    tags: {
      diet: ['high-protein', 'vegetarian', 'gluten-free'],
      cultural: ['mediterranean'],
      budget: 'moderate',
      family_friendly: false,
      medical: ['carb-conscious-moderate'],
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: [
      { item: '2% Greek yogurt', amount: 400, unit: 'g', role: 'protein' },
      { item: 'Blueberries', amount: 100, unit: 'g', role: 'carb' },
      { item: 'Chia seeds', amount: 20, unit: 'g', role: 'fat' },
      { item: 'Honey', amount: 30, unit: 'g', role: 'flavor' }
    ],
    macros_per_serving: { cal: 530, pro: 30, carb: 68, fat: 10, fiber: 6, sugar: 52 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      carb_conscious: {
        swap: [
          { from: 'Honey', to: 'Honey', amount: 15, unit: 'g' },
          { from: 'Blueberries', to: 'Blueberries', amount: 60, unit: 'g' }
        ],
        macro_delta: { carb: -25, cal: -100, sugar: -20 },
        note: 'Half honey and berries — drops sugar significantly'
      },
      dairy_free: {
        swap: [{ from: '2% Greek yogurt', to: 'Coconut yogurt', amount: 400, unit: 'g' }],
        macro_delta: { pro: -18, fat: 12, cal: 20 },
        note: 'Coconut yogurt — much lower protein, still satisfying'
      }
    },
    instructions: [
      'Add yogurt to bowl',
      'Top with blueberries and chia seeds',
      'Drizzle honey over top',
      'Mix gently and serve immediately'
    ],
    swap_options: ['cottage-cheese-bowl', 'oatmeal-bowl'],
    image: 'food-yogurt.png',
    loftin_plan: false
  },

  {
    id: 'cottage-cheese-bowl',
    family: 'yogurt-bowl',
    name: 'Cottage Cheese Power Bowl',
    meal_type: 'breakfast',
    goals: ['lose', 'maintain'],
    tags: {
      diet: ['high-protein', 'vegetarian', 'gluten-free', 'low-sugar'],
      cultural: ['american'],
      budget: 'low',
      family_friendly: false,
      medical: ['carb-conscious'],
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Cottage cheese 2%', amount: 400, unit: 'g', role: 'protein' },
      { item: 'Blueberries', amount: 75, unit: 'g', role: 'carb' },
      { item: 'Chia seeds', amount: 15, unit: 'g', role: 'fat' },
      { item: 'Honey', amount: 15, unit: 'g', role: 'flavor' }
    ],
    macros_per_serving: { cal: 490, pro: 46, carb: 40, fat: 14, fiber: 4, sugar: 28 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      carb_conscious: {
        swap: [{ from: 'Honey', to: 'Honey', amount: 8, unit: 'g' }],
        macro_delta: { carb: -6, cal: -22, sugar: -6 },
        note: 'Minimal honey — very low sugar, extremely high protein-to-carb ratio'
      }
    },
    instructions: [
      'Add cottage cheese to bowl',
      'Top with blueberries and chia seeds',
      'Drizzle honey lightly',
      'Serve cold'
    ],
    swap_options: ['greek-yogurt-bowl', 'oatmeal-bowl'],
    image: 'food-cottage.png',
    loftin_plan: false
  },

  // ── FAMILY 5: OATMEAL BOWL ────────────────────────────────────
  {
    id: 'oatmeal-bowl',
    family: 'oatmeal-bowl',
    name: 'Banana Honey Oatmeal',
    meal_type: 'breakfast',
    goals: ['maintain', 'gain'],
    tags: {
      diet: ['vegetarian', 'vegan', 'dairy-free', 'high-fiber'],
      cultural: ['american'],
      budget: 'low',
      family_friendly: true,
      medical: ['heart-healthy', 'high-fiber'],
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Rolled oats', amount: 80, unit: 'g', role: 'carb' },
      { item: 'Banana', amount: 120, unit: 'g', role: 'carb' },
      { item: 'Honey', amount: 20, unit: 'g', role: 'flavor' },
      { item: 'Water', amount: 240, unit: 'ml', role: 'liquid' }
    ],
    macros_per_serving: { cal: 450, pro: 10, carb: 95, fat: 4, fiber: 8, sugar: 38 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      high_protein: {
        add: [{ item: 'Protein powder', amount: 30, unit: 'g', role: 'protein' }],
        macro_delta: { pro: 25, cal: 120 },
        note: 'One scoop protein powder turns this into a high-protein meal'
      },
      budget: { note: 'Already one of the cheapest meals possible — oats are extremely economical' },
      family: { multiplier: 4, note: 'Easy to scale — great family breakfast' }
    },
    instructions: [
      'Add oats and water to a bowl',
      'Microwave 2 minutes',
      'Slice banana and place on top',
      'Drizzle honey over everything',
      'Stir and serve'
    ],
    swap_options: ['greek-yogurt-bowl', 'cottage-cheese-bowl'],
    image: 'food-oats.png',
    loftin_plan: false
  },

  // ── FAMILY 6: MEDITERRANEAN PLATE ────────────────────────────
  {
    id: 'mediterranean-chicken-plate',
    family: 'mediterranean-plate',
    name: 'Mediterranean Chicken Plate',
    meal_type: 'dinner',
    goals: ['lose', 'maintain'],
    tags: {
      diet: ['high-protein', 'gluten-free', 'low-sugar'],
      cultural: ['mediterranean'],
      budget: 'moderate',
      family_friendly: true,
      medical: ['heart-healthy', 'anti-inflammatory', 'lower-sodium'],
      prep: 'moderate'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Chicken breast', amount: 220, unit: 'g', role: 'protein' },
      { item: 'White rice', amount: 150, unit: 'g', role: 'carb' },
      { item: 'Cucumber', amount: 100, unit: 'g', role: 'volume' },
      { item: 'Cherry tomatoes', amount: 80, unit: 'g', role: 'volume' },
      { item: 'Olive oil', amount: 15, unit: 'g', role: 'fat' },
      { item: 'Lemon juice', amount: 15, unit: 'ml', role: 'flavor' },
      { item: 'Greek yogurt', amount: 60, unit: 'g', role: 'sauce' }
    ],
    macros_per_serving: { cal: 720, pro: 64, carb: 72, fat: 16, fiber: 3, sugar: 6 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      dairy_free: {
        remove: ['Greek yogurt'],
        add: [{ item: 'Hummus', amount: 60, unit: 'g', role: 'sauce' }],
        note: 'Hummus replaces tzatziki — still Mediterranean, fully dairy-free'
      },
      carb_conscious: {
        swap: [{ from: 'White rice', to: 'Cauliflower rice', amount: 200, unit: 'g' }],
        macro_delta: { carb: -60, cal: -240 },
        note: 'Very low carb — ideal for carb-aware eating'
      },
      family: { multiplier: 4, note: 'Great family dinner — fresh and colorful' }
    },
    instructions: [
      'Season chicken with oregano, garlic powder, salt, pepper, and lemon juice',
      'Cook chicken in olive oil over medium heat until done',
      'Dice cucumber and halve cherry tomatoes',
      'Mix Greek yogurt with garlic and lemon for quick tzatziki',
      'Plate: rice, sliced chicken, vegetables, dollop of tzatziki'
    ],
    swap_options: ['mediterranean-salmon-plate', 'mediterranean-falafel-plate'],
    image: 'food-chicken.png',
    loftin_plan: false
  },

  // ── FAMILY 7: CHILI ───────────────────────────────────────────
  {
    id: 'classic-beef-chili',
    family: 'chili',
    name: 'Classic Beef Chili',
    meal_type: 'dinner',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: ['high-protein', 'high-fiber', 'gluten-free', 'dairy-free'],
      cultural: ['american', 'southern', 'mexican-inspired'],
      budget: 'low',
      family_friendly: true,
      medical: ['heart-healthy', 'high-fiber'],
      prep: 'batch'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Ground beef 90/10', amount: 200, unit: 'g', role: 'protein' },
      { item: 'Kidney beans', amount: 130, unit: 'g', role: 'carb' },
      { item: 'Diced tomatoes', amount: 200, unit: 'g', role: 'volume' },
      { item: 'Chili seasoning', amount: 15, unit: 'g', role: 'seasoning' },
      { item: 'Onion', amount: 80, unit: 'g', role: 'volume' }
    ],
    macros_per_serving: { cal: 620, pro: 54, carb: 42, fat: 18, fiber: 13, sugar: 6 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      budget: {
        swap: [{ from: 'Ground beef 90/10', to: 'Ground beef 80/20', amount: 200, unit: 'g' }],
        note: '80/20 ground beef costs less — drain fat after browning'
      },
      vegetarian: {
        swap: [
          { from: 'Ground beef 90/10', to: 'Lentils', amount: 200, unit: 'g' },
          { from: 'Kidney beans', to: 'Black beans', amount: 130, unit: 'g' }
        ],
        macro_delta: { pro: -20, carb: 28, fat: -16, fiber: 8, cal: -80 },
        note: 'Lentil chili — high fiber, plant-based, budget-friendly'
      },
      family: {
        multiplier: 6,
        note: 'Chili is ideal for batch cooking — make a big pot and refrigerate up to 5 days'
      },
      carb_conscious: {
        swap: [{ from: 'Kidney beans', to: 'Kidney beans', amount: 65, unit: 'g' }],
        macro_delta: { carb: -14, fiber: -6, cal: -55 },
        note: 'Half the beans — still filling, lower carb'
      }
    },
    instructions: [
      'Brown ground beef in a large pot over medium heat, breaking it up (~8 min). Drain fat.',
      'Add diced onion, cook 3 minutes until softened',
      'Add diced tomatoes, beans, and chili seasoning',
      'Simmer on low heat 20–30 minutes, stirring occasionally',
      'Serve as-is or over rice. Top with cheese or sour cream'
    ],
    swap_options: ['turkey-chili', 'vegetarian-chili'],
    image: 'food-beef.png',
    loftin_plan: false
  },

  // ── FAMILY 8: SHEET PAN DINNER ────────────────────────────────
  {
    id: 'sheet-pan-chicken-vegetables',
    family: 'sheet-pan',
    name: 'Sheet Pan Chicken & Vegetables',
    meal_type: 'dinner',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: ['high-protein', 'gluten-free', 'dairy-free', 'low-sugar'],
      cultural: ['american'],
      budget: 'moderate',
      family_friendly: true,
      medical: ['heart-healthy', 'lower-sodium', 'anti-inflammatory'],
      prep: 'batch'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Chicken thighs', amount: 220, unit: 'g', role: 'protein' },
      { item: 'Russet potatoes', amount: 200, unit: 'g', role: 'carb' },
      { item: 'Broccoli', amount: 150, unit: 'g', role: 'volume' },
      { item: 'Olive oil', amount: 20, unit: 'g', role: 'fat' },
      { item: 'Garlic powder', amount: 3, unit: 'g', role: 'seasoning' }
    ],
    macros_per_serving: { cal: 720, pro: 55, carb: 48, fat: 26, fiber: 7, sugar: 4 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      budget: {
        swap: [{ from: 'Chicken thighs', to: 'Chicken drumsticks', amount: 250, unit: 'g' }],
        note: 'Drumsticks are the cheapest chicken cut — still great sheet pan results'
      },
      family: {
        multiplier: 4,
        note: 'Sheet pan meals are perfect for families — one pan, minimal cleanup'
      },
      carb_conscious: {
        swap: [
          { from: 'Russet potatoes', to: 'Broccoli', amount: 200, unit: 'g' },
          { from: 'Broccoli', to: 'Broccoli', amount: 250, unit: 'g' }
        ],
        macro_delta: { carb: -35, cal: -140, fiber: 5 },
        note: 'Replace potatoes with more vegetables — very low carb'
      }
    },
    instructions: [
      'Preheat oven to 425°F (220°C)',
      'Cut potatoes into chunks. Toss everything with olive oil, garlic powder, salt, and pepper',
      'Spread on a sheet pan — chicken in the center, vegetables around the edges',
      'Roast 30–35 minutes until chicken is cooked through and potatoes are golden',
      'Rest 5 minutes before serving'
    ],
    swap_options: ['sheet-pan-salmon-vegetables', 'sheet-pan-beef-vegetables'],
    image: 'food-chicken.png',
    loftin_plan: false
  },

  // ── FAMILY 9: WRAP / BURRITO BOWL ────────────────────────────
  {
    id: 'chicken-burrito-bowl',
    family: 'burrito-bowl',
    name: 'Chicken Burrito Bowl',
    meal_type: 'lunch',
    goals: ['lose', 'maintain', 'gain'],
    tags: {
      diet: ['high-protein', 'gluten-free'],
      cultural: ['mexican-inspired'],
      budget: 'moderate',
      family_friendly: true,
      medical: ['carb-conscious-moderate'],
      prep: 'quick'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Chicken breast', amount: 200, unit: 'g', role: 'protein' },
      { item: 'White rice', amount: 150, unit: 'g', role: 'carb' },
      { item: 'Black beans', amount: 100, unit: 'g', role: 'carb' },
      { item: 'Corn', amount: 60, unit: 'g', role: 'carb' },
      { item: 'Sour cream', amount: 30, unit: 'g', role: 'fat' },
      { item: 'Shredded cheese', amount: 25, unit: 'g', role: 'fat' },
      { item: 'Taco seasoning', amount: 8, unit: 'g', role: 'seasoning' }
    ],
    macros_per_serving: { cal: 820, pro: 64, carb: 90, fat: 18, fiber: 10, sugar: 5 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      carb_conscious: {
        swap: [
          { from: 'White rice', to: 'Cauliflower rice', amount: 200, unit: 'g' },
          { from: 'Black beans', to: 'Black beans', amount: 60, unit: 'g' },
          { from: 'Corn', to: null }
        ],
        macro_delta: { carb: -65, cal: -260, fiber: -5 },
        note: 'Drops to ~25g net carbs — Chipotle-style without the carb load'
      },
      dairy_free: {
        remove: ['Sour cream', 'Shredded cheese'],
        add: [{ item: 'Avocado', amount: 80, unit: 'g', role: 'fat' }],
        note: 'Guacamole-style — dairy-free and delicious'
      },
      family: { multiplier: 4, note: 'Build-your-own bowl night — everyone customizes their own' }
    },
    instructions: [
      'Season chicken with taco seasoning. Cook in pan over medium heat until done, then dice',
      'Warm rice and beans separately',
      'Build bowl: rice base, beans, corn, chicken, sour cream, cheese',
      'Add salsa, lime juice, and hot sauce to taste'
    ],
    swap_options: ['beef-taco-bowl', 'shrimp-taco-bowl'],
    image: 'food-chicken.png',
    loftin_plan: false
  },

  // ── FAMILY 10: SOUP & STEW ────────────────────────────────────
  {
    id: 'chicken-vegetable-soup',
    family: 'soup-stew',
    name: 'Chicken Vegetable Soup',
    meal_type: 'lunch',
    goals: ['lose', 'maintain'],
    tags: {
      diet: ['high-protein', 'gluten-free', 'dairy-free', 'low-fat', 'low-sugar'],
      cultural: ['american', 'southern'],
      budget: 'low',
      family_friendly: true,
      medical: ['heart-healthy', 'lower-sodium', 'softer-foods', 'high-fiber', 'anti-inflammatory'],
      prep: 'batch'
    },
    base_servings: 1,
    ingredients: [
      { item: 'Chicken breast', amount: 180, unit: 'g', role: 'protein' },
      { item: 'Carrots', amount: 80, unit: 'g', role: 'carb' },
      { item: 'Celery', amount: 60, unit: 'g', role: 'volume' },
      { item: 'Onion', amount: 60, unit: 'g', role: 'volume' },
      { item: 'Russet potatoes', amount: 120, unit: 'g', role: 'carb' },
      { item: 'Low-sodium chicken broth', amount: 400, unit: 'ml', role: 'liquid' },
      { item: 'Garlic powder', amount: 3, unit: 'g', role: 'seasoning' }
    ],
    macros_per_serving: { cal: 420, pro: 46, carb: 32, fat: 4, fiber: 5, sugar: 6 },
    scaling: { light: 0.80, medium: 1.00, large: 1.25 },
    modifiers: {
      budget: {
        swap: [{ from: 'Chicken breast', to: 'Chicken thighs', amount: 200, unit: 'g' }],
        note: 'Chicken thighs cost ~40% less and add richer flavor to soup'
      },
      family: {
        multiplier: 6,
        note: 'Make a large pot — stores in fridge 4–5 days, freezes well'
      },
      softer_foods: {
        note: 'Cook an extra 15–20 minutes for softer vegetables — ideal for those who need gentler textures'
      },
      lower_sodium: {
        swap: [{ from: 'Low-sodium chicken broth', to: 'Homemade broth or water', amount: 400, unit: 'ml' }],
        note: 'Homemade broth or water with herbs gives you full sodium control'
      }
    },
    instructions: [
      'Dice onion, carrots, celery, and potatoes',
      'Add chicken and broth to a large pot. Bring to a boil',
      'Add vegetables and garlic powder. Reduce to a simmer',
      'Cook 20–25 minutes until chicken is cooked through and vegetables are tender',
      'Remove chicken, shred it, return to pot',
      'Season with salt and pepper to taste. Serve hot'
    ],
    swap_options: ['beef-vegetable-stew', 'turkey-chili'],
    image: 'food-chicken.png',
    loftin_plan: false
  }

];

// ── TAG INDEX ─────────────────────────────────────────────────
// Pre-built index for fast client-side filtering.
// Call buildMealIndex() once on load, then use filterMeals() for queries.

var MEAL_INDEX = null;

function buildMealIndex() {
  MEAL_INDEX = {};
  MEAL_DB.forEach(function(meal) {
    // Index by family
    if (!MEAL_INDEX.family) MEAL_INDEX.family = {};
    if (!MEAL_INDEX.family[meal.family]) MEAL_INDEX.family[meal.family] = [];
    MEAL_INDEX.family[meal.family].push(meal.id);

    // Index by meal_type
    if (!MEAL_INDEX.meal_type) MEAL_INDEX.meal_type = {};
    if (!MEAL_INDEX.meal_type[meal.meal_type]) MEAL_INDEX.meal_type[meal.meal_type] = [];
    MEAL_INDEX.meal_type[meal.meal_type].push(meal.id);

    // Index by goal
    meal.goals.forEach(function(g) {
      if (!MEAL_INDEX.goal) MEAL_INDEX.goal = {};
      if (!MEAL_INDEX.goal[g]) MEAL_INDEX.goal[g] = [];
      MEAL_INDEX.goal[g].push(meal.id);
    });

    // Index by diet tag
    meal.tags.diet.forEach(function(t) {
      if (!MEAL_INDEX.diet) MEAL_INDEX.diet = {};
      if (!MEAL_INDEX.diet[t]) MEAL_INDEX.diet[t] = [];
      MEAL_INDEX.diet[t].push(meal.id);
    });

    // Index by cultural tag
    if (meal.tags.cultural) {
      meal.tags.cultural.forEach(function(c) {
        if (!MEAL_INDEX.cultural) MEAL_INDEX.cultural = {};
        if (!MEAL_INDEX.cultural[c]) MEAL_INDEX.cultural[c] = [];
        MEAL_INDEX.cultural[c].push(meal.id);
      });
    }

    // Index by budget
    if (!MEAL_INDEX.budget) MEAL_INDEX.budget = {};
    if (!MEAL_INDEX.budget[meal.tags.budget]) MEAL_INDEX.budget[meal.tags.budget] = [];
    MEAL_INDEX.budget[meal.tags.budget].push(meal.id);

    // Index by medical tag
    meal.tags.medical.forEach(function(m) {
      if (!MEAL_INDEX.medical) MEAL_INDEX.medical = {};
      if (!MEAL_INDEX.medical[m]) MEAL_INDEX.medical[m] = [];
      MEAL_INDEX.medical[m].push(meal.id);
    });

    // Index family-friendly
    if (meal.tags.family_friendly) {
      if (!MEAL_INDEX.family_friendly) MEAL_INDEX.family_friendly = [];
      MEAL_INDEX.family_friendly.push(meal.id);
    }
  });
}

// ── FILTER ENGINE ─────────────────────────────────────────────
// filterMeals({ goal, diet, cultural, budget, family_friendly, medical, meal_type })
// Returns array of matching meal objects.
function filterMeals(filters) {
  if (!MEAL_INDEX) buildMealIndex();
  filters = filters || {};

  var candidates = MEAL_DB.map(function(m) { return m.id; });

  function intersect(ids) {
    candidates = candidates.filter(function(id) { return ids.indexOf(id) >= 0; });
  }

  if (filters.goal)           intersect(MEAL_INDEX.goal[filters.goal] || []);
  if (filters.meal_type)      intersect(MEAL_INDEX.meal_type[filters.meal_type] || []);
  if (filters.diet)           intersect(MEAL_INDEX.diet[filters.diet] || []);
  if (filters.cultural)       intersect(MEAL_INDEX.cultural[filters.cultural] || []);
  if (filters.budget)         intersect(MEAL_INDEX.budget[filters.budget] || []);
  if (filters.medical)        intersect(MEAL_INDEX.medical[filters.medical] || []);
  if (filters.family_friendly) intersect(MEAL_INDEX.family_friendly || []);

  return candidates.map(function(id) {
    return MEAL_DB.find(function(m) { return m.id === id; });
  }).filter(Boolean);
}

// ── GET MEAL BY ID ────────────────────────────────────────────
function getMealById(id) {
  return MEAL_DB.find(function(m) { return m.id === id; }) || null;
}

// ── GET MEAL FAMILY ───────────────────────────────────────────
function getMealFamily(familyId) {
  return MEAL_DB.filter(function(m) { return m.family === familyId; });
}

// Build index on load
buildMealIndex();
