// ─────────────────────────────────────────────────────────────
// grocery.js — Loftin Method Grocery List
// Generates and renders the weekly grocery list.
// Globals used: groceryList, shopDays, storeMode, groceryUnits,
//               currentPlan, workMode, proteinSwaps, mealPrefs,
//               skippedMeals, customMeals (all in app.html)
// Depends on: engine.js (getActivePlan, IF_PLAN_OFFICE, IF_PLAN_WFH)
// ─────────────────────────────────────────────────────────────

function setGroceryUnits(unit,el){
  groceryUnits=unit;
  document.querySelectorAll('#unit-g,#unit-store').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  renderGroceryList();
}

// Smart unit conversion — proteins/produce in lbs, dairy in oz, tiny amounts stay in g
function convertQty(qty,itemName){
  // Eggs: always show as count regardless of unit mode
  var eggM=qty.match(/^(\d+)g$/);
  if(eggM&&(itemName.toLowerCase()==='eggs'||itemName.toLowerCase()==='egg')){
    return eggsGtoCount(parseInt(eggM[1]));
  }
  if(groceryUnits==='g')return qty;
  var m=qty.match(/^(\d+)g$/);
  if(!m)return qty;// not a gram amount — return as-is
  var grams=parseInt(m[1]);
  if(grams<30)return qty;// tiny amounts stay in grams (chia seeds, spices etc)
  var name=itemName.toLowerCase();
  // Proteins and produce → lbs
  var useLbs=['chicken','beef','sirloin','salmon','fish','potato','blueberries','banana'];
  var useOz=['cottage cheese','greek yogurt','yogurt','ricotta','eggs','sour cream','cheese','mozzarella','honey','oats'];
  var isLbs=useLbs.some(function(k){return name.indexOf(k)>=0;});
  var isOz=useOz.some(function(k){return name.indexOf(k)>=0;});
  if(isLbs){
    var lbs=grams/453.6;
    return lbs>=1?parseFloat(lbs.toFixed(2))+' lbs':Math.round(lbs*16*10)/10+' oz';
  }
  if(isOz){
    return parseFloat((grams/28.35).toFixed(1))+' oz';
  }
  // Default for unrecognised items over 100g → oz
  if(grams>=100)return parseFloat((grams/28.35).toFixed(1))+' oz';
  return qty;
}


// Category mapping for ingredient keywords
function getGroceryCategory(ingredient){
  var s=ingredient.toLowerCase();
  if(s.indexOf('chicken')>=0||s.indexOf('beef')>=0||s.indexOf('steak')>=0||s.indexOf('salmon')>=0||s.indexOf('fish')>=0||s.indexOf('tuna')>=0||s.indexOf('turkey')>=0||s.indexOf('pork')>=0||s.indexOf('shrimp')>=0)return 'Meat & Seafood';
  if(s.indexOf('egg')>=0||s.indexOf('yogurt')>=0||s.indexOf('cottage')>=0||s.indexOf('cheese')>=0||s.indexOf('sour cream')>=0||s.indexOf('milk')>=0||s.indexOf('butter')>=0)return 'Dairy & Eggs';
  if(s.indexOf('potato')>=0||s.indexOf('blueberr')>=0||s.indexOf('broccoli')>=0||s.indexOf('spinach')>=0||s.indexOf('tomato')>=0||s.indexOf('onion')>=0||s.indexOf('garlic')>=0||s.indexOf('lemon')>=0||s.indexOf('fruit')>=0||s.indexOf('vegetable')>=0||s.indexOf('avocado')>=0||s.indexOf('pepper')>=0||s.indexOf('carrot')>=0||s.indexOf('lettuce')>=0||s.indexOf('apple')>=0||s.indexOf('banana')>=0)return 'Produce';
  if(s.indexOf('honey')>=0||s.indexOf('soy sauce')>=0||s.indexOf('olive oil')>=0||s.indexOf('oil')>=0||s.indexOf('vinegar')>=0||s.indexOf('sauce')>=0||s.indexOf('ketchup')>=0||s.indexOf('mustard')>=0||s.indexOf('mayo')>=0||s.indexOf('seasoning')>=0||s.indexOf('salt')>=0||s.indexOf('pepper')>=0||s.indexOf('garlic powder')>=0||s.indexOf('onion powder')>=0)return 'Pantry & Condiments';
  if(s.indexOf('cookie')>=0||s.indexOf('chocolate')>=0||s.indexOf('chia')>=0||s.indexOf('granola')>=0||s.indexOf('bar')>=0||s.indexOf('snack')>=0||s.indexOf('candy')>=0||s.indexOf('cracker')>=0)return 'Snacks & Sweets';
  if(s.indexOf('bread')>=0||s.indexOf('tortilla')>=0||s.indexOf('wrap')>=0||s.indexOf('bun')>=0||s.indexOf('bagel')>=0||s.indexOf('muffin')>=0)return '🍞 Bakery & Bread';
  if(s.indexOf('oat')>=0||s.indexOf('cereal')>=0||s.indexOf('granola')>=0)return '🥣 Breakfast & Cereal';
  return 'Other';
}

// Parse ingredient string to extract name and quantity
function parseIngredient(str){
  // Match patterns like "Chicken 227g" or "Blueberries 75g" or "4 eggs"
  var m=str.match(/^(.*?)(\d+)(g)$/);
  if(m)return{name:m[1].trim(),qty:m[2]+m[3]};
  var m2=str.match(/^(\d+)\s+(.+)$/);
  if(m2)return{name:m2[2].trim(),qty:m2[1]+'x'};
  return{name:str.trim(),qty:'as needed'};
}

function generateGroceryList(){
  if(!currentPlan.cal){
    var container=document.getElementById('grocery-list-container');
    if(container)container.innerHTML='<div class="empty">Build your plan first to generate a personalized grocery list.</div>';
    return;
  }
  var container=document.getElementById('grocery-list-container');
  if(!container)return;
  groceryList={};
  var activePlan=getActivePlan();

  // Count meal appearances per ingredient instead of accumulating grams
  // Each ingredient gets: name, mealCount (how many meals this week it appears in), category
  var ingredientCounts={};// key: normalized name → {name, cat, count}

  for(var i=0;i<shopDays;i++){
    var day=activePlan[i];
    if(!day)continue;
    // Use shared dinner resolution: customMeals → mealPrefs → dinnerTheme → template
    var resolvedDinnerSlot=(typeof getResolvedDinner==='function')?getResolvedDinner(i):null;
    var dinnerIngredients=resolvedDinnerSlot?resolvedDinnerSlot.i:day.dinner.i;
    var allIngredients=day.first.i.concat(dinnerIngredients).concat(day.dessert.i);
    allIngredients.forEach(function(ing){
      var parsed=parseIngredient(ing);
      if(!parsed.name||parsed.name.length<2)return;
      // Skip Biscoff cookies — they come in a pack, no need to count meals
      if(parsed.name.toLowerCase().indexOf('biscoff')>=0)return;
      var key=parsed.name.toLowerCase().trim();
      if(ingredientCounts[key]){
        ingredientCounts[key].count++;
      } else {
        ingredientCounts[key]={
          name:parsed.name,
          cat:getGroceryCategory(parsed.name),
          count:1
        };
      }
    });
  }

  // Convert counts to grocery list with "X meals this week" label
  Object.values(ingredientCounts).forEach(function(item){
    var cat=item.cat;
    if(!groceryList[cat])groceryList[cat]=[];
    var mealLabel=item.count===1?'1 meal this week':item.count+' meals this week';
    // Special handling: eggs shown as count
    var displayName=item.name;
    if(displayName.toLowerCase()==='eggs'||displayName.toLowerCase()==='egg'){
      displayName='Eggs';
    }
    groceryList[cat].push({
      name:displayName,
      qty:mealLabel,
      mealCount:item.count,
      checked:false,
      family:false
    });
  });

  // Sort each category by meal count (most frequent first)
  Object.keys(groceryList).forEach(function(cat){
    groceryList[cat].sort(function(a,b){return(b.mealCount||0)-(a.mealCount||0);});
  });

  // Add staples (always needed regardless of count)
  var staples=[
    {cat:'Pantry & Condiments',name:'Honey',qty:'pantry staple'},
    {cat:'Pantry & Condiments',name:'Soy sauce',qty:'pantry staple'},
    {cat:'Pantry & Condiments',name:'Olive oil',qty:'pantry staple'},
    {cat:'Pantry & Condiments',name:'Garlic powder',qty:'pantry staple'},
    {cat:'Pantry & Condiments',name:'Salt & pepper',qty:'pantry staple'},
  ];
  staples.forEach(function(s){
    if(!groceryList[s.cat])groceryList[s.cat]=[];
    var exists=groceryList[s.cat].find(function(x){return x.name===s.name;});
    if(!exists)groceryList[s.cat].push({name:s.name,qty:s.qty,checked:false,family:false});
  });

  renderGroceryList();
}

// Add custom meal ingredients to grocery list
function addIngredientsToGroceryList(ingredientsList){
  if(!ingredientsList||!ingredientsList.length)return;
  ingredientsList.forEach(function(ing){
    var name=ing.item||ing.name||ing;
    var qty=ing.amount||ing.qty||'as needed';
    if(!name)return;
    var cat=getGroceryCategory(name);
    if(!groceryList[cat])groceryList[cat]=[];
    var exists=groceryList[cat].find(function(x){return x.name.toLowerCase()===name.toLowerCase();});
    if(!exists)groceryList[cat].push({name:name,qty:qty,checked:false,family:false,custom:true});
  });
  renderGroceryList();
}
function renderGroceryList(){
  var container=document.getElementById('grocery-list-container');
  if(!container)return;
  if(!Object.keys(groceryList).length){
    container.innerHTML='<div class="empty">Click "Rebuild from Plan" to generate your list.</div>';
    return;
  }
  var html='';
  Object.keys(groceryList).forEach(function(cat){
    var items=groceryList[cat];
    var done=items.filter(function(i){return i.checked;}).length;
    // Slim category header — label left, done count right
    html+='<div style="margin-bottom:10px">'+
      '<div style="font-size:.68rem;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.12em;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;padding:0 2px">'+
        '<span>'+cat+'</span>'+
        (done>0?'<span style="color:var(--gold);font-weight:600">'+done+'/'+items.length+'</span>':'<span style="opacity:.4">'+items.length+'</span>')+
      '</div>';
    items.forEach(function(item,idx){
      var mealHint=item.mealCount?'<span style="font-size:.65rem;color:var(--t3);font-weight:400;margin-left:6px">'+item.mealCount+'×</span>':'';
      var nameStyle='font-size:.84rem;font-weight:600;color:var(--t1);text-decoration:'+(item.checked?'line-through':'none')+';opacity:'+(item.checked?'.45':'1');
      html+='<div class="groc-item" style="background:'+(item.checked?'var(--s3)':item.custom||item.family?'var(--s2)':'var(--s1)')+'">'+
        '<input type="checkbox"'+(item.checked?' checked':'')+' onchange="toggleItem(\''+cat+'\','+idx+')" style="width:15px;height:15px;cursor:pointer;accent-color:var(--gold);flex-shrink:0"/>'+
        '<div style="flex:1;min-width:0"><span style="'+nameStyle+'">'+item.name+'</span>'+mealHint+'</div>'+
        '<button onclick="removeItem(\''+cat+'\','+idx+')" style="background:none;border:none;cursor:pointer;color:var(--t3);font-size:.78rem;padding:0 2px;opacity:.5;flex-shrink:0">✕</button>'+
      '</div>';
    });
    html+='</div>';
  });
  container.innerHTML=html;
}
function toggleItem(cat,idx){groceryList[cat][idx].checked=!groceryList[cat][idx].checked;renderGroceryList();}
function removeItem(cat,idx){groceryList[cat].splice(idx,1);if(!groceryList[cat].length)delete groceryList[cat];renderGroceryList();}
function clearChecked(){Object.values(groceryList).forEach(function(items){items.forEach(function(item){item.checked=false;});});renderGroceryList();}
function addFamilyItem(){var name=document.getElementById('add-item-name').value.trim();var cat=document.getElementById('add-item-cat').value;if(!name){alert('Please enter an item name.');return;}if(!groceryList[cat])groceryList[cat]=[];groceryList[cat].push({name:name,qty:'As needed',checked:false,family:true});document.getElementById('add-item-name').value='';renderGroceryList();}
function printList(){var lines=['FIT FOR THEM — GROCERY LIST','================================'];Object.keys(groceryList).forEach(function(cat){lines.push('');lines.push(cat.toUpperCase());groceryList[cat].forEach(function(item){lines.push('  '+(item.checked?'[x]':'[ ]')+' '+item.name+' — '+item.qty);});});var w=window.open('','_blank');w.document.write('<pre style="font-family:monospace;padding:20px;font-size:14px">'+lines.join('\n')+'</pre>');w.print();}
function setStoreMode(mode,el){storeMode=mode;document.querySelectorAll('[id^="sm-"]').forEach(function(b){b.classList.remove('active');});el.classList.add('active');}
