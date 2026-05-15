// ─────────────────────────────────────────────────────────────
// swap-options.js — Loftin Method Meal Data
// Contains: MEAL_INSTRUCTIONS, MEAL_INSTRUCTIONS_MAP, SWAP_OPTIONS, DINNER_THEME_FAMILIES
// Pure data. No DOM. No side effects. No dependencies.
// Load order: after plan-templates.js, before meals.js
// ─────────────────────────────────────────────────────────────

var MEAL_INSTRUCTIONS = {
  greek_yogurt_bowl_family: {
    berry_chia_bowl: {
      how_to_make: ['Add Greek yogurt to a bowl.','Top with blueberries and chia.','Drizzle honey over the top.','Stir or leave layered and serve cold.'],
      batch_note: 'Best made fresh. Pre-portion yogurt and toppings separately if prepping ahead.'
    },
    oats_berry_bowl: {
      how_to_make: ['Add Greek yogurt to a bowl.','Add oats and blueberries.','Drizzle honey over the top.','Stir and let sit 2–3 minutes if you want the oats softer.'],
      batch_note: 'Can be pre-portioned for 1–2 days. Keep fruit and honey separate for best texture.'
    },
    banana_honey_bowl: {
      how_to_make: ['Add Greek yogurt to a bowl.','Slice banana over the top.','Add honey and any oats if included.','Stir gently and serve cold.'],
      batch_note: 'Best made fresh so the banana stays at its best.'
    },
    banana_oat_nut_butter_bowl: {
      how_to_make: ['Add Greek yogurt to a bowl.','Add oats and sliced banana.','Top with peanut butter and honey.','Stir lightly or leave layered and serve.'],
      batch_note: 'Best made fresh. Pre-measure oats and peanut butter ahead to make assembly fast.'
    }
  },
  egg_potato_skillet_family: {
    classic_egg_potato_skillet: {
      how_to_make: ['Cook potatoes in a skillet until browned and tender.','Season with salt, pepper, and any simple seasoning.','Add eggs and/or egg whites to the pan.','Cook until set and serve hot.'],
      batch_note: 'Batch-cook potatoes separately, then reheat portions and add fresh eggs when serving.'
    },
    cheesy_egg_potato_skillet: {
      how_to_make: ['Cook potatoes in a skillet until browned and tender.','Add eggs and/or egg whites and cook until almost set.','Sprinkle cheese over the top.','Finish with salsa or serve as-is.'],
      batch_note: 'For family use, batch-cook potatoes first. Cook egg portions fresh for best texture.'
    },
    salsa_egg_potato_skillet: {
      how_to_make: ['Cook potatoes until browned and tender.','Add eggs and/or egg whites and cook through.','Top with salsa.','Serve hot.'],
      batch_note: 'Potatoes can be batch-cooked ahead. Add salsa after plating.'
    },
    loaded_egg_potato_skillet: {
      how_to_make: ['Cook potatoes in a skillet until browned and tender.','Add eggs and/or egg whites and cook until set.','Top with cheese and let it melt.','Finish with sour cream or salsa and serve hot.'],
      batch_note: 'Batch-cook potatoes ahead. Keep cheese and sour cream for final plating.'
    }
  },
  protein_bowl_family: {
    honey_soy_chicken_potato: {
      how_to_make: ['Boil or air-fry potatoes until tender, then mash with cheese, sour cream, salt, and pepper.','Cube and season chicken with salt, pepper, and garlic powder.','Add to a hot pan, let sit 1 minute, then cook over medium heat until done.','Add honey and soy sauce, cook on low 2–3 minutes, then pour over the mashed potatoes.'],
      batch_note: 'Batch-cook potatoes and chicken separately. Portion by cooked weight and add sauce when serving.'
    },
    beef_and_potatoes: {
      how_to_make: ['Boil or air-fry potatoes until tender, then mash with cheese, sour cream, salt, and pepper.','Cube and season beef with salt, pepper, and garlic powder.','Add to a hot pan, let sit 1 minute, then cook over medium heat, stirring until done.','Pour beef over the mashed potatoes.'],
      batch_note: 'Batch-cook potatoes and beef separately. Portion by cooked weight.'
    },
    honey_soy_salmon_potato: {
      how_to_make: ['Boil or air-fry potatoes until tender, then mash with cheese, sour cream, salt, and pepper.','Cube and season salmon with salt, pepper, and garlic powder while partially frozen.','Add to a hot pan, let sit 1 minute, then cook over medium heat, stirring until done.','Add honey and soy sauce, cook on low 2–3 minutes, then pour over the mashed potatoes.'],
      batch_note: 'Best when salmon is cooked fresh. Potatoes can be batch-cooked and reheated.'
    },
    honey_soy_chicken_bowl: {
      how_to_make: ['Cook rice separately.','Cook chicken until done and season lightly.','Add soy sauce and honey to the pan and coat the chicken.','Serve chicken over rice with optional vegetables.'],
      batch_note: 'Excellent for batch cooking. Cook chicken and rice separately, then portion by weight.'
    },
    beef_rice_bowl: {
      how_to_make: ['Cook rice separately.','Cook beef in a skillet and season with garlic, onion, salt, and pepper.','Add any light sauce if using.','Serve beef over rice.'],
      batch_note: 'Batch-cook beef and rice separately for the easiest family portioning.'
    },
    salmon_rice_bowl: {
      how_to_make: ['Cook rice separately.','Cook salmon until just done.','Finish with soy sauce, lemon-style glaze, or light seasoning.','Serve salmon over rice with optional vegetables.'],
      batch_note: 'Best cooked fresh or in smaller batches. Rice can be batch-cooked ahead.'
    },
    turkey_rice_bowl: {
      how_to_make: ['Cook rice separately.','Cook ground turkey in a skillet with seasoning until fully done.','Add salsa or a simple light sauce if using.','Serve turkey over rice.'],
      batch_note: 'Very batch-friendly. Cook turkey and rice separately, then portion by cooked weight.'
    }
  },
  taco_bowl_family: {
    chicken_taco_bowl: {
      how_to_make: ['Cook rice separately.','Cook chicken with taco seasoning until done.','Warm the beans.','Build the bowl with rice, beans, chicken, salsa, and any cheese.'],
      batch_note: 'Excellent family meal. Batch-cook chicken, rice, and beans separately, then assemble.'
    },
    ground_beef_taco_bowl: {
      how_to_make: ['Cook rice separately.','Brown the beef and season with taco seasoning.','Warm the beans.','Build the bowl with rice, beans, beef, salsa, and optional cheese.'],
      batch_note: 'Very batch-friendly. Keep salsa, cheese, and sour cream for final plating.'
    },
    turkey_taco_bowl: {
      how_to_make: ['Cook rice separately.','Cook ground turkey with taco seasoning until fully done.','Warm the beans.','Build the bowl with rice, beans, turkey, salsa, and optional cheese.'],
      batch_note: 'Great for batch prep. Portion turkey, rice, and beans separately for easy scaling.'
    },
    loaded_taco_bowl: {
      how_to_make: ['Cook rice separately.','Cook the protein with taco seasoning.','Warm the beans.','Build the bowl with rice, beans, protein, cheese, salsa, and sour cream.'],
      batch_note: 'Batch the base components first. Add toppings after plating so texture stays better.'
    },
    beef_taco_bowl: {
      how_to_make: ['Cook rice separately.','Brown the beef and season with taco seasoning until fully cooked.','Warm the beans.','Build the bowl with rice, beans, beef, salsa, and cheese.'],
      batch_note: 'Very batch-friendly. Batch beef, rice, and beans separately. Add salsa and cheese at serving time.'
    }
  },
  burger_bowl_family: {
    classic_burger_bowl: {
      how_to_make: ['Cook potatoes until browned and tender.','Cook the beef and season like a burger.','Add pickles and onion to the bowl or plate.','Finish with mustard and ketchup.'],
      batch_note: 'Batch-cook potatoes and beef separately. Add pickles, onion, and sauces at serving time.'
    },
    cheeseburger_bowl: {
      how_to_make: ['Cook potatoes until browned and tender.','Cook the beef and season well.','Add cheese while the beef is still hot so it melts.','Serve with pickles, onion, mustard, and ketchup.'],
      batch_note: 'Very batch-friendly. Add cheese and sauces during plating for best texture.'
    },
    burger_plate: {
      how_to_make: ['Cook burger patties until done.','Cook potatoes separately until browned and tender.','Plate the patties with potatoes on the side.','Add simple toppings and condiments.'],
      batch_note: 'Best when patties and potatoes are cooked separately and portioned by cooked weight.'
    },
    loaded_burger_bowl: {
      how_to_make: ['Cook potatoes until browned and tender.','Cook the beef and season like a burger.','Add cheese while hot.','Finish with pickles, onion, mustard, ketchup, and any additional controlled toppings.'],
      batch_note: 'Batch the beef and potatoes first. Add sauces and toppings after plating.'
    },
    turkey_burger_bowl: {
      how_to_make: ['Cook potatoes until browned and tender.','Cook ground turkey in a skillet and season like a burger — salt, pepper, garlic powder.','Add cheese while the turkey is still hot.','Serve with pickles, onion, mustard, and ketchup.'],
      batch_note: 'Batch-cook turkey and potatoes separately. Add cheese and condiments at plating time.'
    }
  },
  pasta_bowl_family: {
    chicken_red_sauce_pasta_bowl: {
      how_to_make: ['Cook pasta and drain.','Cook chicken until done and season lightly.','Warm the red sauce.','Combine pasta, chicken, and sauce, then finish with parmesan if using.'],
      batch_note: 'Batch-cook pasta and chicken separately when possible. Add sauce during final assembly.'
    },
    beef_pasta_bowl: {
      how_to_make: ['Cook pasta and drain.','Cook beef with garlic, onion, salt, and pepper.','Warm the red sauce.','Combine pasta, beef, and sauce, then finish with parmesan.'],
      batch_note: 'Very batch-friendly. Keep beef, pasta, and sauce separate until portioning if possible.'
    },
    turkey_pasta_bowl: {
      how_to_make: ['Cook pasta and drain.','Cook turkey with simple seasoning until done.','Warm the red sauce.','Combine pasta, turkey, and sauce, then finish with parmesan if using.'],
      batch_note: 'Great for batch prep. Portion pasta and turkey separately, then add sauce when serving.'
    },
    creamy_chicken_pasta_bowl: {
      how_to_make: ['Cook pasta and drain.','Cook chicken until done and season lightly.','Warm the light creamy sauce.','Combine pasta, chicken, and sauce, then finish with parmesan.'],
      batch_note: 'Best when sauce is added closer to serving time so the texture stays smooth.'
    }
  }
};

var MEAL_INSTRUCTIONS_MAP = {
  'oats-berry-bowl':       MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.oats_berry_bowl,
  'berry-chia-bowl':       MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.berry_chia_bowl,
  'banana-honey-bowl':     MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.banana_honey_bowl,
  'banana-oat-pb-bowl':    MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.banana_oat_nut_butter_bowl,
  'cottage-bowl':          MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.berry_chia_bowl,
  'cheesy-egg-potato':     MEAL_INSTRUCTIONS.egg_potato_skillet_family.cheesy_egg_potato_skillet,
  'salsa-egg-potato':      MEAL_INSTRUCTIONS.egg_potato_skillet_family.salsa_egg_potato_skillet,
  'loaded-egg-potato':     MEAL_INSTRUCTIONS.egg_potato_skillet_family.loaded_egg_potato_skillet,
  // Original Loftin potato-based meals
  'honey-soy-chicken':     MEAL_INSTRUCTIONS.protein_bowl_family.honey_soy_chicken_potato,
  'beef-and-potatoes':     MEAL_INSTRUCTIONS.protein_bowl_family.beef_and_potatoes,
  'honey-soy-salmon':      MEAL_INSTRUCTIONS.protein_bowl_family.honey_soy_salmon_potato,
  // Protein Bowl Family
  'chicken-bowl':          MEAL_INSTRUCTIONS.protein_bowl_family.honey_soy_chicken_bowl,
  'salmon-bowl':           MEAL_INSTRUCTIONS.protein_bowl_family.salmon_rice_bowl,
  'salmon-rice-bowl':      MEAL_INSTRUCTIONS.protein_bowl_family.salmon_rice_bowl,
  'beef-rice-bowl':        MEAL_INSTRUCTIONS.protein_bowl_family.beef_rice_bowl,
  'chicken-taco-bowl':     MEAL_INSTRUCTIONS.taco_bowl_family.chicken_taco_bowl,
  'turkey-taco-bowl':      MEAL_INSTRUCTIONS.taco_bowl_family.turkey_taco_bowl,
  'loaded-beef-taco':      MEAL_INSTRUCTIONS.taco_bowl_family.loaded_taco_bowl,
  'cheeseburger-bowl':     MEAL_INSTRUCTIONS.burger_bowl_family.cheeseburger_bowl,
  'classic-burger-bowl':   MEAL_INSTRUCTIONS.burger_bowl_family.classic_burger_bowl,
  'loaded-burger-bowl':    MEAL_INSTRUCTIONS.burger_bowl_family.loaded_burger_bowl,
  'beef-taco-bowl':        MEAL_INSTRUCTIONS.taco_bowl_family.beef_taco_bowl,
  'turkey-burger-bowl':    MEAL_INSTRUCTIONS.burger_bowl_family.turkey_burger_bowl,
  'chicken-pasta':         MEAL_INSTRUCTIONS.pasta_bowl_family.chicken_red_sauce_pasta_bowl,
  'turkey-pasta':          MEAL_INSTRUCTIONS.pasta_bowl_family.turkey_pasta_bowl,
  'beef-pasta':            MEAL_INSTRUCTIONS.pasta_bowl_family.beef_pasta_bowl,
  'creamy-chicken-pasta':  MEAL_INSTRUCTIONS.pasta_bowl_family.creamy_chicken_pasta_bowl,
  'yogurt-honey-bowl':     MEAL_INSTRUCTIONS.greek_yogurt_bowl_family.berry_chia_bowl,
  'ricotta-bowl':          null,
  'cookies':               null,
};

var SWAP_OPTIONS={

  // ═══════════════════════════════════════════════════════════
  // MEN'S DEFICIT ✅
  // ~1800 cal target | First 27.5% | Main 52.5% | Final 20%
  // High satiety, high protein, savory bias, disciplined meals
  // ═══════════════════════════════════════════════════════════
  men_deficit:{
    first:[

      // ── Greek Yogurt Bowl Family ──
      {key:'oats-berry-bowl', name:'Oats & Berry Bowl', img:'food-yogurt.png', cal:426,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:350, cooked_grams:350},
          {item:'Oats',                basis:'same', grams:30,  cooked_grams:30},
          {item:'Blueberries',         basis:'same', grams:100, cooked_grams:100},
          {item:'Honey',               basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'cottage-bowl', name:'Cottage Cheese Bowl', img:'food-cottage.png', cal:452,
        items:[
          {item:'Cottage cheese', basis:'same', grams:400, cooked_grams:400},
          {item:'Blueberries',    basis:'same', grams:75,  cooked_grams:75},
          {item:'Chia seeds',     basis:'same', grams:15,  cooked_grams:15},
          {item:'Honey',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Egg & Potato Skillet Family ──
      // cheesy-egg-potato: eggs + potatoes + cheese + sour cream — rich, satisfying
      // salsa-egg-potato:  eggs + egg whites + potatoes + salsa — lighter, fresher, same cal tier
      {key:'cheesy-egg-potato', name:'Egg & Potato Skillet', img:'food-eggs.png', cal:569,
        items:[
          {item:'Whole eggs',  basis:'raw',  grams:200, cooked_grams:180, count:4},
          {item:'Potatoes',    basis:'raw',  grams:250, cooked_grams:212},
          {item:'Cheese',      basis:'same', grams:23,  cooked_grams:23},
          {item:'Sour cream',  basis:'same', grams:30,  cooked_grams:30},
        ]},

      {key:'salsa-egg-potato', name:'Salsa Egg & Potato Skillet', img:'food-eggs.png', cal:571,
        items:[
          {item:'Whole eggs',  basis:'raw',  grams:100, cooked_grams:90,  count:2},
          {item:'Egg whites',  basis:'raw',  grams:300, cooked_grams:276},
          {item:'Potatoes',    basis:'raw',  grams:300, cooked_grams:255},
          {item:'Cheese',      basis:'same', grams:20,  cooked_grams:20},
          {item:'Salsa',       basis:'same', grams:60,  cooked_grams:60},
        ]},

    ],
    dinner:[

      // ── Original Loftin Potato-Based Meals (plan template defaults) ──
      {key:'honey-soy-chicken', name:'Honey Soy Chicken', img:'food-chicken.png', cal:719,
        items:[
          {item:'Chicken breast', basis:'raw',  grams:227, cooked_grams:170},
          {item:'Potatoes',       basis:'raw',  grams:240, cooked_grams:204},
          {item:'Cheese',         basis:'same', grams:25,  cooked_grams:25},
          {item:'Sour cream',     basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',          basis:'same', grams:40,  cooked_grams:40},
          {item:'Soy sauce',      basis:'same', grams:36,  cooked_grams:36},
        ]},

      {key:'beef-and-potatoes', name:'Beef & Potatoes', img:'food-beef.png', cal:673,
        items:[
          {item:'Beef sirloin', basis:'raw',  grams:250, cooked_grams:188},
          {item:'Potatoes',     basis:'raw',  grams:220, cooked_grams:187},
          {item:'Cheese',       basis:'same', grams:25,  cooked_grams:25},
          {item:'Sour cream',   basis:'same', grams:20,  cooked_grams:20},
        ]},

      {key:'honey-soy-salmon', name:'Honey Soy Salmon', img:'food-salmon.png', cal:810,
        items:[
          {item:'Salmon',     basis:'raw',  grams:200, cooked_grams:170},
          {item:'Potatoes',   basis:'raw',  grams:260, cooked_grams:221},
          {item:'Cheese',     basis:'same', grams:25,  cooked_grams:25},
          {item:'Sour cream', basis:'same', grams:25,  cooked_grams:25},
          {item:'Honey',      basis:'same', grams:40,  cooked_grams:40},
          {item:'Soy sauce',  basis:'same', grams:36,  cooked_grams:36},
        ]},

      // ── Protein Bowl Family ──
      {key:'chicken-bowl', name:'Honey Soy Chicken Bowl', img:'food-chicken.png', cal:585,
        items:[
          {item:'Chicken breast', basis:'raw',  grams:220, cooked_grams:165},
          {item:'White rice',     basis:'dry',  grams:60,  cooked_grams:180},
          {item:'Soy sauce',      basis:'same', grams:25,  cooked_grams:25},
          {item:'Honey',          basis:'same', grams:15,  cooked_grams:15},
          {item:'Broccoli / veg', basis:'same', grams:100, cooked_grams:100},
        ]},

      {key:'salmon-bowl', name:'Salmon Rice Bowl', img:'food-salmon.png', cal:525,
        items:[
          {item:'Salmon',     basis:'raw',  grams:160, cooked_grams:136},
          {item:'White rice', basis:'dry',  grams:47,  cooked_grams:141},
          {item:'Soy sauce',  basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',      basis:'same', grams:10,  cooked_grams:10},
          {item:'Veg',        basis:'same', grams:90,  cooked_grams:90},
        ]},

      // ── Taco Bowl Family ──
      {key:'chicken-taco-bowl', name:'Chicken Taco Bowl', img:'food-chicken.png', cal:653,
        items:[
          {item:'Chicken breast',  basis:'raw',  grams:220, cooked_grams:165},
          {item:'White rice',      basis:'dry',  grams:50,  cooked_grams:150},
          {item:'Black beans',     basis:'same', grams:100, cooked_grams:100},
          {item:'Taco seasoning',  basis:'same', grams:9,   cooked_grams:9},
          {item:'Salsa',           basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Burger Bowl Family ──
      {key:'cheeseburger-bowl', name:'Cheeseburger Bowl', img:'food-beef.png', cal:612,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:200, cooked_grams:150},
          {item:'Potatoes',         basis:'raw',  grams:250, cooked_grams:212},
          {item:'Cheese',           basis:'same', grams:20,  cooked_grams:20},
          {item:'Pickles',          basis:'same', grams:30,  cooked_grams:30},
          {item:'Onion',            basis:'same', grams:30,  cooked_grams:30},
          {item:'Mustard',          basis:'same', grams:15,  cooked_grams:15},
          {item:'Ketchup',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Pasta Bowl Family ──
      {key:'chicken-pasta', name:'Chicken Red Sauce Pasta', img:'food-chicken.png', cal:702,
        items:[
          {item:'Chicken breast',        basis:'raw',  grams:220, cooked_grams:165},
          {item:'Pasta',                 basis:'dry',  grams:78,  cooked_grams:179},
          {item:'Red sauce (marinara)',   basis:'same', grams:120, cooked_grams:120},
          {item:'Parmesan',              basis:'same', grams:10,  cooked_grams:10},
          {item:'Italian seasoning',     basis:'same', grams:4,   cooked_grams:4},
        ]},

      // ── Taco Bowl Family — additional variants ──
      {key:'turkey-taco-bowl', theme:true, name:'Turkey Taco Bowl', img:'food-turkey.png', cal:677,
        items:[
          {item:'Ground turkey',  basis:'raw',  grams:175, cooked_grams:137},
          {item:'White rice',     basis:'dry',  grams:48,  cooked_grams:144},
          {item:'Black beans',    basis:'same', grams:100, cooked_grams:100},
          {item:'Taco seasoning', basis:'same', grams:9,   cooked_grams:9},
          {item:'Salsa',          basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',         basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'beef-taco-bowl', theme:true, name:'Beef Taco Bowl', img:'food-beef.png', cal:702,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:160, cooked_grams:120},
          {item:'White rice',       basis:'dry',  grams:47,  cooked_grams:141},
          {item:'Black beans',      basis:'same', grams:100, cooked_grams:100},
          {item:'Taco seasoning',   basis:'same', grams:9,   cooked_grams:9},
          {item:'Salsa',            basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',           basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Burger Bowl Family — additional variants ──
      {key:'turkey-burger-bowl', theme:true, name:'Turkey Burger Bowl', img:'food-turkey.png', cal:730,
        items:[
          {item:'Ground turkey', basis:'raw',  grams:220, cooked_grams:172},
          {item:'Potatoes',      basis:'raw',  grams:250, cooked_grams:212},
          {item:'Cheese',        basis:'same', grams:20,  cooked_grams:20},
          {item:'Pickles',       basis:'same', grams:30,  cooked_grams:30},
          {item:'Onion',         basis:'same', grams:30,  cooked_grams:30},
          {item:'Mustard',       basis:'same', grams:15,  cooked_grams:15},
          {item:'Ketchup',       basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'classic-burger-bowl', theme:true, name:'Classic Burger Bowl', img:'food-beef.png', cal:592,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:180, cooked_grams:135},
          {item:'Potatoes',         basis:'raw',  grams:240, cooked_grams:204},
          {item:'Cheese',           basis:'same', grams:15,  cooked_grams:15},
          {item:'Pickles',          basis:'same', grams:25,  cooked_grams:25},
          {item:'Onion',            basis:'same', grams:25,  cooked_grams:25},
          {item:'Mustard',          basis:'same', grams:12,  cooked_grams:12},
          {item:'Ketchup',          basis:'same', grams:12,  cooked_grams:12},
        ]},

      // ── Pasta Bowl Family — swap library only (theme:false) ──
      {key:'turkey-pasta', name:'Turkey Pasta Bowl', img:'food-turkey.png', cal:797,
        items:[
          {item:'Ground turkey',       basis:'raw',  grams:210, cooked_grams:164},
          {item:'Pasta',               basis:'dry',  grams:72,  cooked_grams:166},
          {item:'Red sauce (marinara)', basis:'same', grams:120, cooked_grams:120},
          {item:'Parmesan',            basis:'same', grams:10,  cooked_grams:10},
          {item:'Italian seasoning',   basis:'same', grams:4,   cooked_grams:4},
        ]},

      {key:'beef-pasta', name:'Beef Pasta Bowl', img:'food-beef.png', cal:825,
        items:[
          {item:'Lean beef',           basis:'raw',  grams:200, cooked_grams:150},
          {item:'Pasta',               basis:'dry',  grams:75,  cooked_grams:172},
          {item:'Red sauce (marinara)', basis:'same', grams:120, cooked_grams:120},
          {item:'Parmesan',            basis:'same', grams:10,  cooked_grams:10},
          {item:'Italian seasoning',   basis:'same', grams:4,   cooked_grams:4},
        ]},

    ],
    dessert:[

      // ── Greek Yogurt Bowl Family ──
      {key:'berry-chia-bowl', name:'Berry Chia Bowl', img:'food-yogurt.png', cal:313,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Blueberries',         basis:'same', grams:100, cooked_grams:100},
          {item:'Chia seeds',          basis:'same', grams:10,  cooked_grams:10},
          {item:'Honey',               basis:'same', grams:10,  cooked_grams:10},
        ]},

      {key:'ricotta-bowl', name:'Ricotta Bowl', img:'food-ricotta.png', cal:432,
        items:[
          {item:'Ricotta',     basis:'same', grams:200, cooked_grams:200},
          {item:'Blueberries', basis:'same', grams:75,  cooked_grams:75},
          {item:'Honey',       basis:'same', grams:25,  cooked_grams:25},
        ]},

      {key:'cookies', name:'Cookies', img:'food-cookies.png', cal:443,
        items:[
          {item:'Cookies (or chocolate bar 60g)', basis:'same', grams:70, cooked_grams:70},
        ]},

    ],
  },

  // ═══════════════════════════════════════════════════════════
  // WOMEN'S DEFICIT ✅
  // ~1500 cal target | First 27.5% | Main 52.5% | Final 20%
  // High protein, high compliance, moderate volume, clean and repeatable
  // ═══════════════════════════════════════════════════════════
  women_deficit:{
    first:[

      // ── Greek Yogurt Bowl Family ──
      {key:'berry-chia-bowl', name:'Berry Chia Bowl', img:'food-yogurt.png', cal:297,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Blueberries',         basis:'same', grams:90,  cooked_grams:90},
          {item:'Chia seeds',          basis:'same', grams:8,   cooked_grams:8},
          {item:'Honey',               basis:'same', grams:10,  cooked_grams:10},
        ]},

      {key:'oats-berry-bowl', name:'Oats & Berry Bowl', img:'food-yogurt.png', cal:302,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:250, cooked_grams:250},
          {item:'Oats',                basis:'same', grams:20,  cooked_grams:20},
          {item:'Blueberries',         basis:'same', grams:80,  cooked_grams:80},
          {item:'Honey',               basis:'same', grams:10,  cooked_grams:10},
        ]},

      // ── Egg & Potato Skillet Family ──
      {key:'salsa-egg-potato', name:'Salsa Egg & Potato Skillet', img:'food-eggs.png', cal:370,
        items:[
          {item:'Whole eggs',  basis:'raw',  grams:50,  cooked_grams:45,  count:1},
          {item:'Egg whites',  basis:'raw',  grams:220, cooked_grams:202},
          {item:'Potatoes',    basis:'raw',  grams:180, cooked_grams:153},
          {item:'Cheese',      basis:'same', grams:15,  cooked_grams:15},
          {item:'Salsa',       basis:'same', grams:60,  cooked_grams:60},
        ]},

    ],
    dinner:[

      // ── Protein Bowl Family ──
      {key:'salmon-rice-bowl', name:'Salmon Rice Bowl', img:'food-salmon.png', cal:525,
        items:[
          {item:'Salmon',     basis:'raw',  grams:160, cooked_grams:136},
          {item:'White rice', basis:'dry',  grams:47,  cooked_grams:141},
          {item:'Soy sauce',  basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',      basis:'same', grams:10,  cooked_grams:10},
          {item:'Veg',        basis:'same', grams:90,  cooked_grams:90},
        ]},

      {key:'chicken-bowl', name:'Honey Soy Chicken Bowl', img:'food-chicken.png', cal:538,
        items:[
          {item:'Chicken breast', basis:'raw',  grams:180, cooked_grams:135},
          {item:'White rice',     basis:'dry',  grams:63,  cooked_grams:189},
          {item:'Soy sauce',      basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',          basis:'same', grams:15,  cooked_grams:15},
          {item:'Veg',            basis:'same', grams:80,  cooked_grams:80},
        ]},

      // ── Taco Bowl Family ──
      {key:'turkey-taco-bowl', name:'Turkey Taco Bowl', img:'food-turkey.png', cal:559,
        items:[
          {item:'Ground turkey',  basis:'raw',  grams:170, cooked_grams:133},
          {item:'White rice',     basis:'dry',  grams:40,  cooked_grams:120},
          {item:'Black beans',    basis:'same', grams:80,  cooked_grams:80},
          {item:'Taco seasoning', basis:'same', grams:8,   cooked_grams:8},
          {item:'Salsa',          basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',         basis:'same', grams:11,  cooked_grams:11},
        ]},

      // ── Burger Bowl Family ──
      {key:'classic-burger-bowl', name:'Classic Burger Bowl', img:'food-beef.png', cal:472,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:160, cooked_grams:120},
          {item:'Potatoes',         basis:'raw',  grams:180, cooked_grams:153},
          {item:'Cheese',           basis:'same', grams:15,  cooked_grams:15},
          {item:'Pickles',          basis:'same', grams:25,  cooked_grams:25},
          {item:'Onion',            basis:'same', grams:25,  cooked_grams:25},
          {item:'Mustard',          basis:'same', grams:12,  cooked_grams:12},
          {item:'Ketchup',          basis:'same', grams:10,  cooked_grams:10},
        ]},

      // ── Pasta Bowl Family ──
      {key:'turkey-pasta', name:'Turkey Pasta Bowl', img:'food-turkey.png', cal:595,
        items:[
          {item:'Ground turkey',       basis:'raw',  grams:170, cooked_grams:133},
          {item:'Pasta',               basis:'dry',  grams:61,  cooked_grams:140},
          {item:'Red sauce (marinara)', basis:'same', grams:100, cooked_grams:100},
          {item:'Parmesan',            basis:'same', grams:8,   cooked_grams:8},
          {item:'Italian seasoning',   basis:'same', grams:4,   cooked_grams:4},
        ]},

    ],
    dessert:[

      // ── Greek Yogurt Bowl Family ──
      {key:'oats-berry-bowl', name:'Oats & Berry Bowl', img:'food-yogurt.png', cal:302,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:250, cooked_grams:250},
          {item:'Oats',                basis:'same', grams:20,  cooked_grams:20},
          {item:'Blueberries',         basis:'same', grams:80,  cooked_grams:80},
          {item:'Honey',               basis:'same', grams:10,  cooked_grams:10},
        ]},

      {key:'berry-chia-bowl', name:'Berry Chia Bowl', img:'food-yogurt.png', cal:297,
        items:[
          {item:'Nonfat Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Blueberries',         basis:'same', grams:90,  cooked_grams:90},
          {item:'Chia seeds',          basis:'same', grams:8,   cooked_grams:8},
          {item:'Honey',               basis:'same', grams:10,  cooked_grams:10},
        ]},

    ],
  },

  // ═══════════════════════════════════════════════════════════
  // MEN'S SURPLUS ✅
  // ~2200 cal target | First 30% | Main 40% | Final 30%
  // High protein, denser meals, calorie-efficient, easy to finish
  // ═══════════════════════════════════════════════════════════
  men_surplus:{
    first:[

      // ── Greek Yogurt Bowl Family ──
      {key:'banana-honey-bowl', name:'Banana Honey Bowl', img:'food-yogurt.png', cal:502,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:350, cooked_grams:350},
          {item:'Banana',          basis:'same', grams:120, cooked_grams:120},
          {item:'Honey',           basis:'same', grams:20,  cooked_grams:20},
          {item:'Oats',            basis:'same', grams:20,  cooked_grams:20},
        ]},

      // ── Egg & Potato Skillet Family ──
      {key:'loaded-egg-potato', name:'Loaded Egg & Potato Skillet', img:'food-eggs.png', cal:633,
        items:[
          {item:'Whole eggs',  basis:'raw',  grams:150, cooked_grams:135, count:3},
          {item:'Egg whites',  basis:'raw',  grams:200, cooked_grams:184},
          {item:'Potatoes',    basis:'raw',  grams:300, cooked_grams:255},
          {item:'Cheese',      basis:'same', grams:25,  cooked_grams:25},
          {item:'Sour cream',  basis:'same', grams:25,  cooked_grams:25},
        ]},

    ],
    dinner:[

      // ── Protein Bowl Family ──
      {key:'beef-rice-bowl', name:'Beef Rice Bowl', img:'food-beef.png', cal:732,
        items:[
          {item:'Beef sirloin', basis:'raw',  grams:220, cooked_grams:165},
          {item:'White rice',   basis:'dry',  grams:80,  cooked_grams:240},
          {item:'Olive oil',    basis:'same', grams:10,  cooked_grams:10},
          {item:'Soy sauce',    basis:'same', grams:18,  cooked_grams:18},
        ]},

      // ── Taco Bowl Family ──
      {key:'loaded-beef-taco', name:'Loaded Beef Taco Bowl', img:'food-beef.png', cal:915,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:220, cooked_grams:165},
          {item:'White rice',       basis:'dry',  grams:70,  cooked_grams:210},
          {item:'Black beans',      basis:'same', grams:120, cooked_grams:120},
          {item:'Taco seasoning',   basis:'same', grams:10,  cooked_grams:10},
          {item:'Salsa',            basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',           basis:'same', grams:25,  cooked_grams:25},
          {item:'Sour cream',       basis:'same', grams:20,  cooked_grams:20},
        ]},

      // ── Burger Bowl Family ──
      {key:'loaded-burger-bowl', name:'Loaded Burger Bowl', img:'food-beef.png', cal:748,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:240, cooked_grams:180},
          {item:'Potatoes',         basis:'raw',  grams:320, cooked_grams:272},
          {item:'Cheese',           basis:'same', grams:25,  cooked_grams:25},
          {item:'Pickles',          basis:'same', grams:30,  cooked_grams:30},
          {item:'Onion',            basis:'same', grams:30,  cooked_grams:30},
          {item:'Mustard',          basis:'same', grams:15,  cooked_grams:15},
          {item:'Ketchup',          basis:'same', grams:20,  cooked_grams:20},
        ]},

      // ── Pasta Bowl Family ──
      {key:'beef-pasta', name:'Beef Pasta Bowl', img:'food-beef.png', cal:947,
        items:[
          {item:'Lean beef',           basis:'raw',  grams:220, cooked_grams:165},
          {item:'Pasta',               basis:'dry',  grams:104, cooked_grams:239},
          {item:'Red sauce (marinara)', basis:'same', grams:140, cooked_grams:140},
          {item:'Parmesan',            basis:'same', grams:15,  cooked_grams:15},
          {item:'Olive oil',           basis:'same', grams:6,   cooked_grams:6},
        ]},

    ],
    dessert:[

      // ── Greek Yogurt Bowl Family ──
      {key:'banana-oat-pb-bowl', name:'Banana Oat Nut Butter Bowl', img:'food-yogurt.png', cal:659,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:350, cooked_grams:350},
          {item:'Oats',            basis:'same', grams:40,  cooked_grams:40},
          {item:'Banana',          basis:'same', grams:120, cooked_grams:120},
          {item:'Peanut butter',   basis:'same', grams:16,  cooked_grams:16},
          {item:'Honey',           basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'banana-honey-bowl', name:'Banana Honey Bowl', img:'food-yogurt.png', cal:502,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:350, cooked_grams:350},
          {item:'Banana',          basis:'same', grams:120, cooked_grams:120},
          {item:'Honey',           basis:'same', grams:20,  cooked_grams:20},
          {item:'Oats',            basis:'same', grams:20,  cooked_grams:20},
        ]},

    ],
  },

  // ═══════════════════════════════════════════════════════════
  // WOMEN'S SURPLUS ✅
  // ~1800 cal target | First 30% | Main 40% | Final 30%
  // High protein, moderate volume, appetite-friendly density
  // ═══════════════════════════════════════════════════════════
  women_surplus:{
    first:[

      // ── Greek Yogurt Bowl Family ──
      {key:'oats-berry-bowl', name:'Oats & Berry Bowl', img:'food-yogurt.png', cal:439,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Oats',            basis:'same', grams:30,  cooked_grams:30},
          {item:'Blueberries',     basis:'same', grams:100, cooked_grams:100},
          {item:'Honey',           basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'banana-honey-bowl', name:'Banana Honey Bowl', img:'food-yogurt.png', cal:413,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Banana',          basis:'same', grams:100, cooked_grams:100},
          {item:'Honey',           basis:'same', grams:15,  cooked_grams:15},
          {item:'Peanut butter',   basis:'same', grams:10,  cooked_grams:10},
        ]},

      // ── Egg & Potato Skillet Family ──
      // cheesy-egg-potato: matches plan template (eggs + potatoes + cheese + sour cream)
      // loaded-egg-potato: egg-whites variant — distinct heavier meal
      {key:'cheesy-egg-potato', name:'Egg & Potato Skillet', img:'food-eggs.png', cal:540,
        items:[
          {item:'Whole eggs',  basis:'raw',  grams:200, cooked_grams:180, count:4},
          {item:'Potatoes',    basis:'raw',  grams:220, cooked_grams:187},
          {item:'Cheese',      basis:'same', grams:20,  cooked_grams:20},
          {item:'Sour cream',  basis:'same', grams:25,  cooked_grams:25},
        ]},

    ],
    dinner:[

      // ── Protein Bowl Family ──
      {key:'chicken-bowl', name:'Honey Soy Chicken Bowl', img:'food-chicken.png', cal:538,
        items:[
          {item:'Chicken breast', basis:'raw',  grams:180, cooked_grams:135},
          {item:'White rice',     basis:'dry',  grams:63,  cooked_grams:189},
          {item:'Soy sauce',      basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',          basis:'same', grams:15,  cooked_grams:15},
          {item:'Veg',            basis:'same', grams:80,  cooked_grams:80},
        ]},

      // ── Taco Bowl Family ──
      {key:'chicken-taco-bowl', name:'Chicken Taco Bowl', img:'food-chicken.png', cal:627,
        items:[
          {item:'Chicken breast',  basis:'raw',  grams:180, cooked_grams:135},
          {item:'White rice',      basis:'dry',  grams:57,  cooked_grams:171},
          {item:'Black beans',     basis:'same', grams:100, cooked_grams:100},
          {item:'Taco seasoning',  basis:'same', grams:8,   cooked_grams:8},
          {item:'Salsa',           basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Burger Bowl Family ──
      {key:'cheeseburger-bowl', name:'Cheeseburger Bowl', img:'food-beef.png', cal:569,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:180, cooked_grams:135},
          {item:'Potatoes',         basis:'raw',  grams:240, cooked_grams:204},
          {item:'Cheese',           basis:'same', grams:20,  cooked_grams:20},
          {item:'Pickles',          basis:'same', grams:25,  cooked_grams:25},
          {item:'Onion',            basis:'same', grams:25,  cooked_grams:25},
          {item:'Mustard',          basis:'same', grams:12,  cooked_grams:12},
          {item:'Ketchup',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Pasta Bowl Family ──
      {key:'creamy-chicken-pasta', theme:true, name:'Creamy Chicken Pasta Bowl', img:'food-chicken.png', cal:694,
        items:[
          {item:'Chicken breast',     basis:'raw',  grams:180, cooked_grams:135},
          {item:'Pasta',              basis:'dry',  grams:83,  cooked_grams:191},
          {item:'Light creamy sauce', basis:'same', grams:110, cooked_grams:110},
          {item:'Parmesan',           basis:'same', grams:12,  cooked_grams:12},
          {item:'Italian seasoning',  basis:'same', grams:4,   cooked_grams:4},
        ]},

      // ── Taco Bowl Family — additional variants ──
      {key:'turkey-taco-bowl', theme:true, name:'Turkey Taco Bowl', img:'food-turkey.png', cal:689,
        items:[
          {item:'Ground turkey',  basis:'raw',  grams:170, cooked_grams:133},
          {item:'White rice',     basis:'dry',  grams:53,  cooked_grams:159},
          {item:'Black beans',    basis:'same', grams:90,  cooked_grams:90},
          {item:'Taco seasoning', basis:'same', grams:8,   cooked_grams:8},
          {item:'Salsa',          basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',         basis:'same', grams:12,  cooked_grams:12},
        ]},

      {key:'beef-taco-bowl', theme:true, name:'Beef Taco Bowl', img:'food-beef.png', cal:696,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:160, cooked_grams:120},
          {item:'White rice',       basis:'dry',  grams:52,  cooked_grams:156},
          {item:'Black beans',      basis:'same', grams:90,  cooked_grams:90},
          {item:'Taco seasoning',   basis:'same', grams:8,   cooked_grams:8},
          {item:'Salsa',            basis:'same', grams:60,  cooked_grams:60},
          {item:'Cheese',           basis:'same', grams:12,  cooked_grams:12},
        ]},

      // ── Burger Bowl Family — additional variants ──
      {key:'turkey-burger-bowl', theme:true, name:'Turkey Burger Bowl', img:'food-turkey.png', cal:669,
        items:[
          {item:'Ground turkey', basis:'raw',  grams:190, cooked_grams:148},
          {item:'Potatoes',      basis:'raw',  grams:260, cooked_grams:221},
          {item:'Cheese',        basis:'same', grams:18,  cooked_grams:18},
          {item:'Pickles',       basis:'same', grams:25,  cooked_grams:25},
          {item:'Onion',         basis:'same', grams:25,  cooked_grams:25},
          {item:'Mustard',       basis:'same', grams:12,  cooked_grams:12},
          {item:'Ketchup',       basis:'same', grams:15,  cooked_grams:15},
        ]},

      {key:'classic-burger-bowl', theme:true, name:'Classic Burger Bowl', img:'food-beef.png', cal:660,
        items:[
          {item:'Lean ground beef', basis:'raw',  grams:175, cooked_grams:131},
          {item:'Potatoes',         basis:'raw',  grams:260, cooked_grams:221},
          {item:'Cheese',           basis:'same', grams:15,  cooked_grams:15},
          {item:'Pickles',          basis:'same', grams:25,  cooked_grams:25},
          {item:'Onion',            basis:'same', grams:25,  cooked_grams:25},
          {item:'Mustard',          basis:'same', grams:12,  cooked_grams:12},
          {item:'Ketchup',          basis:'same', grams:15,  cooked_grams:15},
        ]},

      // ── Pasta Bowl Family — additional variants ──
      {key:'chicken-pasta', theme:true, name:'Chicken Red Sauce Pasta', img:'food-chicken.png', cal:688,
        items:[
          {item:'Chicken breast',        basis:'raw',  grams:160, cooked_grams:120},
          {item:'Pasta',                 basis:'dry',  grams:78,  cooked_grams:179},
          {item:'Red sauce (marinara)',   basis:'same', grams:110, cooked_grams:110},
          {item:'Parmesan',              basis:'same', grams:12,  cooked_grams:12},
          {item:'Italian seasoning',     basis:'same', grams:4,   cooked_grams:4},
        ]},

      {key:'turkey-pasta', theme:true, name:'Turkey Pasta Bowl', img:'food-turkey.png', cal:697,
        items:[
          {item:'Ground turkey',         basis:'raw',  grams:150, cooked_grams:117},
          {item:'Pasta',                 basis:'dry',  grams:75,  cooked_grams:172},
          {item:'Red sauce (marinara)',   basis:'same', grams:110, cooked_grams:110},
          {item:'Parmesan',              basis:'same', grams:12,  cooked_grams:12},
          {item:'Italian seasoning',     basis:'same', grams:4,   cooked_grams:4},
        ]},

      {key:'beef-pasta', theme:true, name:'Beef Pasta Bowl', img:'food-beef.png', cal:712,
        items:[
          {item:'Lean beef',             basis:'raw',  grams:150, cooked_grams:112},
          {item:'Pasta',                 basis:'dry',  grams:72,  cooked_grams:166},
          {item:'Red sauce (marinara)',   basis:'same', grams:110, cooked_grams:110},
          {item:'Parmesan',              basis:'same', grams:12,  cooked_grams:12},
          {item:'Italian seasoning',     basis:'same', grams:4,   cooked_grams:4},
        ]},

      // ── Protein Bowl Family — additional variants ──
      {key:'salmon-bowl', theme:true, name:'Salmon Rice Bowl', img:'food-salmon.png', cal:681,
        items:[
          {item:'Salmon',     basis:'raw',  grams:185, cooked_grams:157},
          {item:'White rice', basis:'dry',  grams:62,  cooked_grams:186},
          {item:'Soy sauce',  basis:'same', grams:20,  cooked_grams:20},
          {item:'Honey',      basis:'same', grams:10,  cooked_grams:10},
          {item:'Veg',        basis:'same', grams:80,  cooked_grams:80},
        ]},

      {key:'beef-rice-bowl', theme:true, name:'Beef Rice Bowl', img:'food-beef.png', cal:697,
        items:[
          {item:'Beef sirloin', basis:'raw',  grams:175, cooked_grams:131},
          {item:'White rice',   basis:'dry',  grams:65,  cooked_grams:195},
          {item:'Soy sauce',    basis:'same', grams:18,  cooked_grams:18},
          {item:'Olive oil',    basis:'same', grams:10,  cooked_grams:10},
        ]},

    ],
    dessert:[

      // ── Greek Yogurt Bowl Family ──
      {key:'banana-honey-bowl', name:'Banana Honey Bowl', img:'food-yogurt.png', cal:413,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Banana',          basis:'same', grams:100, cooked_grams:100},
          {item:'Honey',           basis:'same', grams:15,  cooked_grams:15},
          {item:'Peanut butter',   basis:'same', grams:10,  cooked_grams:10},
        ]},

      {key:'oats-berry-bowl', name:'Oats & Berry Bowl', img:'food-yogurt.png', cal:439,
        items:[
          {item:'2% Greek yogurt', basis:'same', grams:300, cooked_grams:300},
          {item:'Oats',            basis:'same', grams:30,  cooked_grams:30},
          {item:'Blueberries',     basis:'same', grams:100, cooked_grams:100},
          {item:'Honey',           basis:'same', grams:15,  cooked_grams:15},
        ]},

    ],
  },

};

var DINNER_THEME_FAMILIES = {

  'taco-bowl': {
    name: 'Taco Bowl Week',
    img: 'food-chicken.png',
    uiVisible: true,
    lanes: {
      men_deficit:   ['chicken-taco-bowl', 'turkey-taco-bowl', 'beef-taco-bowl'],
      women_deficit: ['chicken-taco-bowl', 'turkey-taco-bowl'],
      men_surplus:   ['loaded-beef-taco', 'chicken-taco-bowl'],
      women_surplus: ['chicken-taco-bowl', 'turkey-taco-bowl', 'beef-taco-bowl']
    }
  },

  'burger-bowl': {
    name: 'Burger Bowl Week',
    img: 'food-beef.png',
    uiVisible: true,
    lanes: {
      men_deficit:   ['cheeseburger-bowl', 'turkey-burger-bowl', 'classic-burger-bowl'],
      women_deficit: ['classic-burger-bowl', 'cheeseburger-bowl'],
      men_surplus:   ['loaded-burger-bowl', 'cheeseburger-bowl'],
      women_surplus: ['cheeseburger-bowl', 'turkey-burger-bowl', 'classic-burger-bowl']
    }
  },

  'pasta-bowl': {
    name: 'Pasta Bowl Week',
    img: 'food-chicken.png',
    uiVisible: true,
    lanes: {
      men_deficit:   null,// pasta not a featured theme for men_deficit v1
      women_deficit: ['turkey-pasta', 'chicken-pasta'],
      men_surplus:   ['beef-pasta', 'chicken-pasta'],
      women_surplus: ['chicken-pasta', 'turkey-pasta', 'beef-pasta', 'creamy-chicken-pasta']
    }
  },

  'protein-bowl': {
    name: 'Rice Bowl Week',
    img: 'food-chicken.png',
    uiVisible: false,// reserved for future — not shown in v1 selector
    lanes: {
      men_deficit:   ['chicken-bowl', 'salmon-bowl'],
      women_deficit: ['chicken-bowl', 'salmon-rice-bowl'],
      men_surplus:   ['beef-rice-bowl', 'chicken-bowl'],
      women_surplus: ['chicken-bowl', 'salmon-bowl', 'beef-rice-bowl']
    }
  }

};
