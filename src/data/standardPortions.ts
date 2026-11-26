import type { FoodPortion } from '../types';

const p = (id: string, grams: number, label: string, label_it: string): FoodPortion => ({
  id,
  grams,
  label,
  label_it,
});

// ---- Reusable portion sets (normal/medium always first) ----

// EU egg sizes (edible portion without shell)
const EGG_WHOLE = [
  p('egg-m', 50, 'Medium (M)', 'Medio (M)'),
  p('egg-s', 40, 'Small (S)', 'Piccolo (S)'),
  p('egg-l', 58, 'Large (L)', 'Grande (L)'),
  p('egg-xl', 65, 'Extra Large (XL)', 'Extra Large (XL)'),
];
const EGG_WHITE = [
  p('eggw-m', 33, '1 medium white', '1 albume medio'),
  p('eggw-l', 38, '1 large white', '1 albume grande'),
];
const EGG_YOLK = [
  p('eggy-m', 17, '1 medium yolk', '1 tuorlo medio'),
  p('eggy-l', 20, '1 large yolk', '1 tuorlo grande'),
];

// Fruits (USDA standard edible weights)
const APPLE = [
  p('apple-m', 180, 'Medium', 'Media'),
  p('apple-s', 150, 'Small', 'Piccola'),
  p('apple-l', 225, 'Large', 'Grande'),
];
const BANANA = [
  p('banana-m', 125, 'Medium', 'Media'),
  p('banana-s', 95, 'Small', 'Piccola'),
  p('banana-l', 165, 'Large', 'Grande'),
];
const ORANGE = [
  p('orange-m', 150, 'Medium', 'Media'),
  p('orange-s', 95, 'Small', 'Piccola'),
  p('orange-l', 185, 'Large', 'Grande'),
];
const PEAR = [
  p('pear-m', 165, 'Medium', 'Media'),
  p('pear-s', 140, 'Small', 'Piccola'),
  p('pear-l', 230, 'Large', 'Grande'),
];
const PEACH = [
  p('peach-m', 150, 'Medium', 'Media'),
  p('peach-s', 105, 'Small', 'Piccola'),
  p('peach-l', 175, 'Large', 'Grande'),
];
const KIWI = [
  p('kiwi-m', 75, 'Medium', 'Medio'),
  p('kiwi-s', 65, 'Small', 'Piccolo'),
  p('kiwi-l', 110, 'Large', 'Grande'),
];
const TANGERINE = [
  p('tang-m', 88, 'Medium', 'Medio'),
  p('tang-s', 70, 'Small', 'Piccolo'),
  p('tang-l', 115, 'Large', 'Grande'),
];
const APRICOT = [
  p('apricot-m', 35, 'Medium', 'Media'),
  p('apricot-l', 50, 'Large', 'Grande'),
];
const PLUM = [
  p('plum-m', 65, 'Medium', 'Media'),
  p('plum-s', 45, 'Small', 'Piccola'),
  p('plum-l', 90, 'Large', 'Grande'),
];
const LEMON = [
  p('lemon-m', 65, 'Medium', 'Medio'),
  p('lemon-s', 45, 'Small', 'Piccolo'),
  p('lemon-l', 85, 'Large', 'Grande'),
];
const LIME = [
  p('lime-m', 45, 'Medium', 'Medio'),
  p('lime-l', 65, 'Large', 'Grande'),
];
const GRAPEFRUIT = [
  p('gfruit-half', 125, 'Half', 'Metà'),
  p('gfruit-whole', 250, 'Whole', 'Intero'),
];
const AVOCADO = [
  p('avo-half', 75, 'Half medium', 'Metà medio'),
  p('avo-m', 150, 'Medium whole', 'Medio intero'),
  p('avo-s', 115, 'Small whole', 'Piccolo intero'),
  p('avo-l', 200, 'Large whole', 'Grande intero'),
];
const STRAWBERRY = [
  p('straw-bowl', 150, '1 bowl (8 berries)', '1 ciotola (8 fragole)'),
  p('straw-m', 18, '1 medium berry', '1 fragola media'),
  p('straw-l', 25, '1 large berry', '1 fragola grande'),
];
const BLUEBERRY = [
  p('blue-hand', 40, '1 handful', '1 manciata'),
  p('blue-cup', 150, '1 cup', '1 tazza'),
];
const BERRY_SMALL = [
  p('berry-hand', 35, '1 handful', '1 manciata'),
  p('berry-cup', 125, '1 cup', '1 tazza'),
];
const CHERRY = [
  p('cherry-10', 80, '10 cherries', '10 ciliegie'),
  p('cherry-cup', 150, '1 cup', '1 tazza'),
];
const GRAPES = [
  p('grape-bunch', 125, '1 small bunch', '1 grappolo piccolo'),
  p('grape-hand', 75, '1 handful', '1 manciata'),
];
const MELON_SLICE = [
  p('melon-slice', 250, '1 slice', '1 fetta'),
  p('melon-cup', 150, '1 bowl', '1 ciotola'),
];
const PINEAPPLE = [
  p('pine-slice', 85, '1 slice', '1 fetta'),
  p('pine-cup', 165, '1 bowl', '1 ciotola'),
];
const MANGO = [
  p('mango-half', 165, 'Half', 'Metà'),
  p('mango-whole', 330, 'Whole medium', 'Intero medio'),
];
const FIG = [
  p('fig-m', 50, 'Medium', 'Medio'),
  p('fig-l', 65, 'Large', 'Grande'),
];
const DATE = [
  p('date-medjool', 24, '1 Medjool', '1 Medjool'),
  p('date-s', 8, '1 small', '1 piccolo'),
];
const PRUNE = [
  p('prune-1', 10, '1 prune', '1 prugna'),
  p('prune-5', 50, '5 prunes', '5 prugne'),
];
const RAISIN = [
  p('raisin-tbsp', 10, '1 tbsp', '1 cucchiaio'),
  p('raisin-pack', 40, '1 small pack', '1 confezione piccola'),
];
const POMEGRANATE = [
  p('pom-half', 85, 'Half (arils)', 'Metà (chicchi)'),
  p('pom-whole', 170, 'Whole', 'Intera'),
];

// Vegetables (USDA standard edible weights)
const TOMATO = [
  p('tom-m', 125, 'Medium', 'Medio'),
  p('tom-s', 90, 'Small', 'Piccolo'),
  p('tom-l', 180, 'Large', 'Grande'),
];
const CHERRY_TOMATO = [
  p('ctom-5', 85, '5 tomatoes', '5 pomodorini'),
  p('ctom-1', 17, '1 cherry tomato', '1 pomodorino'),
  p('ctom-10', 170, '10 tomatoes', '10 pomodorini'),
];
const CARROT = [
  p('car-m', 65, 'Medium', 'Media'),
  p('car-s', 50, 'Small', 'Piccola'),
  p('car-l', 85, 'Large', 'Grande'),
];
const POTATO = [
  p('pot-m', 150, 'Medium', 'Media'),
  p('pot-s', 110, 'Small', 'Piccola'),
  p('pot-l', 280, 'Large', 'Grande'),
];
const SWEET_POTATO = [
  p('spot-m', 130, 'Medium', 'Media'),
  p('spot-s', 75, 'Small', 'Piccola'),
  p('spot-l', 200, 'Large', 'Grande'),
];
const ONION = [
  p('onion-m', 115, 'Medium', 'Media'),
  p('onion-s', 70, 'Small', 'Piccola'),
  p('onion-l', 175, 'Large', 'Grande'),
];
const SPRING_ONION = [
  p('sp-onion-1', 15, '1 stalk', '1 cipollotto'),
  p('sp-onion-3', 45, '3 stalks', '3 cipollotti'),
];
const GARLIC = [
  p('garlic-1', 3, '1 clove', '1 spicchio'),
  p('garlic-3', 10, '3 cloves', '3 spicchi'),
];
const ZUCCHINI = [
  p('zuc-m', 195, 'Medium', 'Media'),
  p('zuc-s', 120, 'Small', 'Piccola'),
  p('zuc-l', 320, 'Large', 'Grande'),
];
const CUCUMBER = [
  p('cuc-m', 200, 'Medium', 'Medio'),
  p('cuc-s', 155, 'Small', 'Piccolo'),
  p('cuc-l', 280, 'Large', 'Grande'),
  p('cuc-third', 65, '1/3 cucumber', '1/3 cetriolo'),
];
const BELL_PEPPER = [
  p('pep-m', 140, 'Medium', 'Medio'),
  p('pep-s', 90, 'Small', 'Piccolo'),
  p('pep-l', 190, 'Large', 'Grande'),
];
const EGGPLANT = [
  p('eggp-half', 225, 'Half medium', 'Metà media'),
  p('eggp-s', 300, 'Small', 'Piccola'),
  p('eggp-m', 450, 'Medium', 'Media'),
];
const BROCCOLI = [
  p('broc-m', 150, 'Medium stalk', 'Porzione media'),
  p('broc-cup', 75, '1 cup florets', '1 tazza cimette'),
  p('broc-head', 300, 'Whole head', 'Cespo intero'),
];
const CAULIFLOWER = [
  p('caul-cup', 110, '1 cup florets', '1 tazza cimette'),
  p('caul-half', 290, 'Half head', 'Metà cavolfiore'),
];
const SPINACH = [
  p('spin-hand', 30, '1 handful', '1 manciata'),
  p('spin-bowl', 150, '1 bowl', '1 ciotola'),
];
const ARUGULA = [
  p('arug-hand', 20, '1 handful', '1 manciata'),
  p('arug-bowl', 60, '1 bowl', '1 ciotola'),
];
const LETTUCE = [
  p('let-bowl', 75, '1 bowl', '1 ciotola'),
  p('let-leaf', 15, '1 leaf', '1 foglia'),
];
const MUSHROOM = [
  p('mush-cup', 70, '1 cup sliced', '1 tazza a fette'),
  p('mush-1', 18, '1 medium', '1 medio'),
  p('mush-pack', 250, '1 punnet', '1 vaschetta'),
];
const CELERY = [
  p('cel-m', 40, '1 medium stalk', '1 costa media'),
  p('cel-l', 65, '1 large stalk', '1 costa grande'),
];
const LEEK = [
  p('leek-m', 90, 'Medium', 'Medio'),
  p('leek-l', 140, 'Large', 'Grande'),
];
const RADISH = [
  p('rad-1', 10, '1 radish', '1 ravanello'),
  p('rad-5', 50, '5 radishes', '5 ravanelli'),
];
const BEETROOT = [
  p('beet-m', 85, 'Medium', 'Media'),
  p('beet-l', 135, 'Large', 'Grande'),
];
const SWEETCORN = [
  p('corn-can', 140, '1 small can', '1 lattina piccola'),
  p('corn-tbsp', 15, '1 tbsp', '1 cucchiaio'),
];

// Bakery, Bread & Grains
const TOAST_SLICE = [
  p('toast-1', 35, '1 slice', '1 fetta'),
  p('toast-2', 70, '2 slices', '2 fette'),
];
const BREAD_SLICE = [
  p('bread-m', 45, '1 medium slice', '1 fetta media'),
  p('bread-s', 30, '1 thin slice', '1 fetta sottile'),
  p('bread-l', 65, '1 thick slice', '1 fetta spessa'),
];
const BAGUETTE = [
  p('bag-q', 65, '1/4 baguette', '1/4 baguette'),
  p('bag-sl', 25, '1 slice', '1 fetta'),
  p('bag-h', 125, 'Half baguette', 'Mezza baguette'),
];
const BREAD_ROLL = [
  p('roll-m', 60, 'Medium roll', 'Panino medio'),
  p('roll-s', 45, 'Small roll', 'Panino piccolo'),
  p('roll-l', 85, 'Large roll', 'Panino grande'),
];
const CROISSANT = [
  p('crois-m', 57, 'Medium', 'Medio'),
  p('crois-s', 35, 'Mini', 'Piccolo'),
  p('crois-l', 75, 'Large', 'Grande'),
];
const RICE_CAKE = [
  p('rcake-1', 10, '1 cake', '1 galletta'),
  p('rcake-2', 20, '2 cakes', '2 gallette'),
];
const DRY_PASTA = [
  p('pasta-m', 80, 'Medium serving', 'Porzione media'),
  p('pasta-s', 60, 'Small serving', 'Porzione piccola'),
  p('pasta-l', 120, 'Large serving', 'Porzione abbondante'),
];
const DRY_RICE = [
  p('rice-m', 75, 'Medium serving', 'Porzione media'),
  p('rice-s', 50, 'Small serving', 'Porzione piccola'),
  p('rice-l', 110, 'Large serving', 'Porzione abbondante'),
];
const OATS = [
  p('oats-bowl', 50, '1 bowl', '1 ciotola'),
  p('oats-tbsp', 10, '1 tbsp', '1 cucchiaio'),
  p('oats-l', 80, 'Large bowl', 'Ciotola grande'),
];
const CEREAL = [
  p('cer-m', 40, '1 bowl', '1 ciotola'),
  p('cer-l', 60, 'Large bowl', 'Ciotola grande'),
];
const GNOCCHI = [
  p('gnoc-m', 180, '1 serving', '1 porzione'),
  p('gnoc-l', 250, 'Large serving', 'Porzione abbondante'),
];

// Dairy, Drinks & Cheese
const DRINK_GLASS = [
  p('drink-glass', 200, '1 glass', '1 bicchiere'),
  p('drink-mug', 250, '1 mug', '1 tazza grande'),
  p('drink-splash', 30, 'Splash', 'Un goccio'),
];
const YOGURT_POT = [
  p('yog-pot', 150, '1 pot', '1 vasetto'),
  p('yog-bowl', 200, '1 bowl', '1 ciotola'),
  p('yog-tbsp', 25, '1 tbsp', '1 cucchiaio'),
];
const CHEESE_SLICE = [
  p('chsl-1', 25, '1 slice', '1 fetta'),
  p('chsl-2', 50, '2 slices', '2 fette'),
];
const PARMESAN = [
  p('parm-tbsp', 10, '1 tbsp grated', '1 cucchiaio gratt.'),
  p('parm-pc', 30, '1 piece', '1 pezzo'),
];
const MOZZARELLA = [
  p('moz-ball', 125, '1 ball', '1 mozzarella'),
  p('moz-half', 62, 'Half ball', 'Mezza mozzarella'),
  p('moz-boc', 25, '1 bocconcino', '1 bocconcino'),
];
const FETA = [
  p('feta-srv', 40, '1 serving', '1 porzione'),
  p('feta-blk', 200, '1 block', '1 panetto'),
];
const CREAM_CHEESE = [
  p('cch-1', 20, '1 tbsp', '1 cucchiaio'),
  p('cch-2', 40, '2 tbsp', '2 cucchiai'),
];
const BUTTER = [
  p('but-pat', 10, '1 pat', '1 noce'),
  p('but-tsp', 5, '1 tsp', '1 cucchiaino'),
  p('but-tbsp', 15, '1 tbsp', '1 cucchiaio'),
];

// Oils, Spreads, Nuts, Seeds, Meat/Fish, Sweets
const OIL_ML = [
  p('oil-tbsp', 15, '1 tbsp', '1 cucchiaio'),
  p('oil-tsp', 5, '1 tsp', '1 cucchiaino'),
];
const HONEY_JAM = [
  p('hj-tbsp', 20, '1 tbsp', '1 cucchiaio'),
  p('hj-tsp', 7, '1 tsp', '1 cucchiaino'),
];
const SPREAD_15 = [
  p('spr-tbsp', 15, '1 tbsp', '1 cucchiaio'),
  p('spr-tsp', 5, '1 tsp', '1 cucchiaino'),
];
const NUTS = [
  p('nuts-m', 30, '1 handful', '1 manciata'),
  p('nuts-s', 20, 'Small handful', 'Manciata piccola'),
  p('nuts-l', 45, 'Large handful', 'Manciata grande'),
];
const SEEDS = [
  p('seed-tbsp', 12, '1 tbsp', '1 cucchiaio'),
  p('seed-tsp', 4, '1 tsp', '1 cucchiaino'),
];
const CHOCOLATE = [
  p('choc-sq', 10, '1 square', '1 quadratino'),
  p('choc-row', 30, '1 row (3 sq)', '1 fila (3 quadr.)'),
];
const FILLET_MEAT = [
  p('meat-m', 170, 'Medium fillet', 'Porzione media'),
  p('meat-s', 120, 'Small fillet', 'Porzione piccola'),
  p('meat-l', 230, 'Large fillet', 'Porzione grande'),
];
const SLICED_MEAT = [
  p('slm-1', 15, '1 slice', '1 fetta'),
  p('slm-3', 45, '3 slices', '3 fette'),
];
const KEBAB_WRAP = [
  p('keb-m', 350, 'Regular', 'Normale'),
  p('keb-s', 250, 'Small', 'Piccolo'),
  p('keb-l', 450, 'Large', 'Grande'),
];

export const STANDARD_PORTIONS_BY_ID: Record<string, FoodPortion[]> = {
  // Eggs
  'gen-18': EGG_WHOLE,
  'genx-egg': EGG_WHOLE,
  'aldi-06': EGG_WHOLE,
  'gen-19': EGG_WHITE,
  'genx-egg-white': EGG_WHITE,
  'genx-egg-yolk': EGG_YOLK,

  // Fruits
  'gen-01': APPLE, 'genx-apple': APPLE,
  'gen-02': BANANA, 'genx-banana': BANANA,
  'gen-39': ORANGE, 'genx-orange': ORANGE,
  'gen-41': PEAR, 'genx-pear': PEAR,
  'genx-peach': PEACH,
  'gen-40': KIWI, 'genx-kiwi': KIWI,
  'genx-tangerine': TANGERINE,
  'genx-apricot': APRICOT,
  'genx-plum': PLUM,
  'genx-lemon': LEMON,
  'genx-lime': LIME,
  'genx-grapefruit': GRAPEFRUIT,
  'gen-05': AVOCADO, 'genx-avocado': AVOCADO,
  'gen-04': STRAWBERRY, 'genx-strawberry': STRAWBERRY,
  'gen-03': BLUEBERRY, 'genx-blueberry': BLUEBERRY,
  'genx-raspberry': BERRY_SMALL, 'genx-blackberry': BERRY_SMALL,
  'genx-cherry': CHERRY,
  'gen-42': GRAPES, 'genx-grape': GRAPES,
  'genx-watermelon': MELON_SLICE, 'genx-melon': MELON_SLICE,
  'genx-pineapple': PINEAPPLE,
  'genx-mango': MANGO,
  'genx-fig': FIG,
  'genx-date': DATE,
  'genx-prune': PRUNE,
  'genx-raisin': RAISIN,
  'genx-pomegranate': POMEGRANATE,
  'usda-sr-169941': [p('pers-m', 170, 'Medium', 'Cachi medio'), p('pers-l', 220, 'Large', 'Cachi grande')],
  'usda-sr-169108': [p('pass-1', 18, '1 fruit', '1 frutto')],

  // Vegetables
  'gen-10': TOMATO, 'genx-tomato': TOMATO,
  'genx-cherry-tomato': CHERRY_TOMATO,
  'gen-08': CARROT, 'genx-carrot': CARROT,
  'gen-12': POTATO, 'genx-potato': POTATO,
  'gen-13': SWEET_POTATO, 'genx-sweet-potato': SWEET_POTATO,
  'gen-45': ONION, 'genx-onion': ONION,
  'genx-spring-onion': SPRING_ONION,
  'genx-garlic': GARLIC,
  'gen-14': ZUCCHINI, 'genx-zucchini': ZUCCHINI,
  'gen-09': CUCUMBER, 'genx-cucumber': CUCUMBER,
  'gen-11': BELL_PEPPER, 'genx-red-bell-pepper': BELL_PEPPER, 'genx-yellow-bell-pepper': BELL_PEPPER,
  'genx-eggplant': EGGPLANT,
  'gen-06': BROCCOLI, 'genx-broccoli': BROCCOLI,
  'genx-cauliflower': CAULIFLOWER,
  'gen-07': SPINACH, 'genx-spinach': SPINACH,
  'gen-44': ARUGULA, 'genx-arugula': ARUGULA,
  'gen-43': LETTUCE, 'genx-iceberg-lettuce': LETTUCE, 'genx-romaine-lettuce': LETTUCE,
  'gen-15': MUSHROOM, 'genx-mushroom': MUSHROOM,
  'genx-celery': CELERY,
  'genx-leek': LEEK,
  'genx-radish': RADISH,
  'genx-beetroot': BEETROOT,
  'usda-sr-169385': [p('fen-m', 235, 'Medium bulb', 'Finocchio medio'), p('fen-h', 120, 'Half bulb', 'Metà finocchio')],
  'usda-sr-168386': [p('art-m', 120, 'Medium', 'Carciofo medio'), p('art-l', 160, 'Large', 'Carciofo grande')],
  'gen-46': SWEETCORN, 'genx-sweetcorn': SWEETCORN,

  // Bread, Bakery & Grains
  'lidl-11': TOAST_SLICE, 'genx-sliced-toast': TOAST_SLICE,
  'gen-31': BREAD_SLICE, 'genx-white-bread': BREAD_SLICE, 'genx-wholegrain-bread': BREAD_SLICE, 'genx-ciabatta': BREAD_SLICE,
  'genx-baguette': BAGUETTE,
  'gen-30': BREAD_ROLL, 'genx-bread-roll': BREAD_ROLL,
  'gen-32': [p('pita-m', 65, '1 pita', '1 pita'), p('pita-l', 120, '1 large flatbread', '1 pane grande')],
  'lidl-21': [p('wrap-m', 45, '1 medium wrap', '1 piadina media'), p('wrap-l', 62, '1 large wrap', '1 piadina grande')],
  'genx-croissant': CROISSANT,
  'netto-11': RICE_CAKE, 'netto-13': RICE_CAKE, 'usda-sr-170250': RICE_CAKE,
  'gen-17': DRY_PASTA, 'lidl-14': DRY_PASTA, 'genx-durum-wheat-pasta': DRY_PASTA, 'genx-whole-wheat-pasta': DRY_PASTA, 'genx-spaghetti': DRY_PASTA, 'genx-penne': DRY_PASTA, 'genx-fusilli': DRY_PASTA,
  'gen-25': [p('cpasta-m', 200, 'Medium plate', 'Piatto medio'), p('cpasta-s', 150, 'Small plate', 'Piatto piccolo'), p('cpasta-l', 280, 'Large plate', 'Piatto abbondante')],
  'netto-04': DRY_RICE, 'genx-white-rice': DRY_RICE, 'genx-brown-rice': DRY_RICE, 'genx-basmati-rice': DRY_RICE, 'genx-jasmine-rice': DRY_RICE, 'genx-risotto-rice': DRY_RICE,
  'gen-26': [p('crice-m', 160, '1 bowl', '1 porzione'), p('crice-l', 240, 'Large bowl', 'Porzione abbondante')],
  'lidl-07': OATS, 'aldi-04': OATS, 'netto-02': OATS, 'genx-oats': OATS,
  'cereal-01': CEREAL, 'cereal-02': CEREAL, 'cereal-03': CEREAL, 'cereal-04': CEREAL, 'cereal-05': CEREAL, 'aldi-12': CEREAL,
  'gen-29': GNOCCHI, 'genx-gnocchi': GNOCCHI,

  // Dairy & Drinks
  'lidl-03': DRINK_GLASS, 'lidl-04': DRINK_GLASS, 'lidl-13': DRINK_GLASS, 'lidl-22': DRINK_GLASS,
  'aldi-02': DRINK_GLASS, 'aldi-08': DRINK_GLASS, 'netto-05': DRINK_GLASS,
  'genx-whole-milk': DRINK_GLASS, 'genx-semi-skimmed-milk': DRINK_GLASS, 'genx-skimmed-milk': DRINK_GLASS,
  'genx-oat-milk': DRINK_GLASS, 'genx-soy-milk': DRINK_GLASS, 'genx-almond-milk': DRINK_GLASS,
  'genx-orange-juice': DRINK_GLASS, 'genx-apple-juice': DRINK_GLASS, 'genx-cola': DRINK_GLASS,
  'genx-espresso': [p('esp-1', 30, '1 shot', '1 caffè'), p('esp-2', 60, 'Double', 'Doppio')],
  'genx-black-coffee': [p('cof-cup', 150, '1 cup', '1 tazza'), p('cof-mug', 250, '1 mug', '1 tazza grande')],
  'lidl-01': YOGURT_POT, 'lidl-02': YOGURT_POT, 'lidl-05': YOGURT_POT, 'lidl-16': YOGURT_POT,
  'lidl-18': YOGURT_POT, 'lidl-19': YOGURT_POT, 'lidl-24': YOGURT_POT, 'lidl-25': YOGURT_POT,
  'lidl-26': YOGURT_POT, 'lidl-27': YOGURT_POT, 'aldi-01': YOGURT_POT, 'aldi-03': YOGURT_POT,
  'aldi-16': YOGURT_POT, 'aldi-21': YOGURT_POT, 'netto-01': YOGURT_POT, 'gen-54': YOGURT_POT,
  'genx-natural-yogurt-3-5': YOGURT_POT, 'genx-fat-free-yogurt': YOGURT_POT, 'genx-greek-yogurt': YOGURT_POT,
  'genx-skyr': YOGURT_POT, 'genx-low-fat-quark': YOGURT_POT, 'usda-sr-170903': YOGURT_POT,
  'lidl-06': CHEESE_SLICE, 'genx-gouda': CHEESE_SLICE, 'genx-emmental': CHEESE_SLICE,
  'aldi-18': PARMESAN, 'genx-parmesan': PARMESAN,
  'aldi-09': MOZZARELLA, 'genx-mozzarella': MOZZARELLA,
  'lidl-20': FETA, 'genx-feta': FETA,
  'netto-06': CREAM_CHEESE, 'genx-cream-cheese': CREAM_CHEESE,
  'gen-33': BUTTER, 'genx-butter': BUTTER,

  // Oils, Condiments, Nuts, Seeds, Meat/Fish, Sweets
  'gen-16': OIL_ML, 'aldi-11': OIL_ML, 'genx-olive-oil': OIL_ML, 'genx-canola-oil': OIL_ML, 'genx-sunflower-oil': OIL_ML, 'genx-coconut-oil': OIL_ML,
  'gen-48': HONEY_JAM, 'gen-50': HONEY_JAM, 'genx-honey': HONEY_JAM,
  'netto-09': SPREAD_15, 'usda-sr-168588': SPREAD_15, 'gen-49': SPREAD_15, 'gen-51': SPREAD_15, 'gen-52': SPREAD_15,
  'genx-pesto': SPREAD_15, 'genx-mayonnaise': SPREAD_15, 'genx-ketchup': SPREAD_15, 'genx-mustard': SPREAD_15,
  'gen-53': [p('salt-pinch', 1, '1 pinch', '1 pizzico'), p('salt-tsp', 5, '1 tsp', '1 cucchiaino')],
  'genx-sugar': [p('sug-tsp', 5, '1 tsp', '1 cucchiaino'), p('sug-tbsp', 12, '1 tbsp', '1 cucchiaio')],
  'aldi-13': NUTS, 'gen-23': NUTS, 'genx-almonds': NUTS, 'genx-hazelnuts': NUTS, 'genx-walnuts': NUTS,
  'genx-peanuts': NUTS, 'genx-cashews': NUTS, 'genx-pistachios': NUTS,
  'gen-24': SEEDS, 'genx-chia-seeds': SEEDS, 'genx-flaxseed': SEEDS, 'genx-pumpkin-seeds': SEEDS, 'genx-sunflower-seeds': SEEDS, 'genx-sesame-seeds': SEEDS,
  'aldi-07': CHOCOLATE, 'genx-dark-chocolate': CHOCOLATE, 'genx-milk-chocolate': CHOCOLATE, 'usda-sr-170273': CHOCOLATE,
  'gen-21': FILLET_MEAT, 'aldi-05': FILLET_MEAT, 'genx-chicken-breast': FILLET_MEAT,
  'gen-20': FILLET_MEAT, 'aldi-10': FILLET_MEAT, 'genx-salmon': FILLET_MEAT,
  'gen-22': FILLET_MEAT, 'genx-beef-steak': FILLET_MEAT,
  'lidl-10': [p('tuna-can', 140, '1 drained can', '1 scatoletta sgoc.'), p('tuna-half', 70, 'Half can', 'Mezza scatoletta')],
  'lidl-08': SLICED_MEAT, 'lidl-09': SLICED_MEAT, 'aldi-20': SLICED_MEAT, 'gen-35': SLICED_MEAT, 'gen-36': SLICED_MEAT,
  'genx-salami': SLICED_MEAT, 'genx-mortadella': SLICED_MEAT, 'genx-bacon': SLICED_MEAT,
  'kebab-01': KEBAB_WRAP, 'kebab-02': KEBAB_WRAP, 'kebab-03': KEBAB_WRAP, 'kebab-04': KEBAB_WRAP, 'kebab-07': KEBAB_WRAP, 'kebab-08': KEBAB_WRAP,
  'genx-pizza-margherita': [p('piz-sl', 110, '1 slice', '1 fetta'), p('piz-half', 180, 'Half pizza', 'Mezza pizza'), p('piz-whole', 360, 'Whole pizza', 'Pizza intera')],
};

const EMPTY_PORTIONS: FoodPortion[] = [];

export function getStandardPortions(foodId: string): FoodPortion[] {
  return STANDARD_PORTIONS_BY_ID[foodId] ?? EMPTY_PORTIONS;
}

export function getPrimaryStandardPortion(foodId: string): number | undefined {
  const list = STANDARD_PORTIONS_BY_ID[foodId];
  return list && list.length > 0 ? list[0].grams : undefined;
}
