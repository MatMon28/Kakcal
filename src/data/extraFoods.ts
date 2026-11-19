import { FoodCategory, FoodItem } from '../types';

/**
 * Additional GENERIC foods (mostly single ingredients).
 * Each row: de|it|en|kcal|carbs|protein|fat|fiber|salt|category|unit|(unused flag)
 * Values are standard reference values per 100 g / 100 ml.
 * One entry per row: the estimated "boiled / grilled / oven-baked / pan-fried ..." variants that
 * used to be generated from every cookable row were removed. Real, sourced prepared foods live in
 * verifiedFoods.ts / usdaFoodRows.ts, and the 130,000-product Open Food Facts catalogue (offCatalog.ts)
 * provides the rest.
 */
const ROWS = `
Apfel|Mela|Apple|52|11.4|0.3|0.2|2.4|0.001|produce_fruit|g|0
Birne|Pera|Pear|57|12.4|0.4|0.1|3.1|0.002|produce_fruit|g|0
Banane|Banana|Banana|89|20.2|1.1|0.3|2.6|0.001|produce_fruit|g|0
Orange|Arancia|Orange|47|9.2|0.9|0.1|2.4|0.001|produce_fruit|g|0
Mandarine|Mandarino|Tangerine|53|11.5|0.8|0.3|1.8|0.001|produce_fruit|g|0
Zitrone|Limone|Lemon|29|6.5|1.1|0.3|2.8|0.002|produce_fruit|g|0
Limette|Lime|Lime|30|7.0|0.7|0.2|2.8|0.002|produce_fruit|g|0
Grapefruit|Pompelmo|Grapefruit|42|8.4|0.8|0.1|2.0|0.001|produce_fruit|g|0
Erdbeere|Fragola|Strawberry|32|5.5|0.7|0.3|1.6|0.002|produce_fruit|g|0
Himbeere|Lampone|Raspberry|52|5.9|1.2|0.7|6.5|0.001|produce_fruit|g|0
Brombeere|Mora|Blackberry|43|5.3|1.4|0.5|5.3|0.001|produce_fruit|g|0
Heidelbeere|Mirtillo|Blueberry|57|12.1|0.7|0.3|2.4|0.001|produce_fruit|g|0
Kirsche|Ciliegia|Cherry|63|16.0|1.1|0.2|2.1|0.001|produce_fruit|g|0
Pfirsich|Pesca|Peach|39|9.5|0.9|0.3|1.5|0.001|produce_fruit|g|0
Aprikose|Albicocca|Apricot|48|11.1|1.4|0.4|2.0|0.001|produce_fruit|g|0
Pflaume|Prugna|Plum|46|11.0|0.7|0.3|1.4|0.001|produce_fruit|g|0
Traube|Uva|Grape|69|16.0|0.7|0.2|0.9|0.005|produce_fruit|g|0
Wassermelone|Anguria|Watermelon|30|7.6|0.6|0.2|0.4|0.001|produce_fruit|g|0
Melone|Melone|Melon|34|8.2|0.8|0.2|0.9|0.001|produce_fruit|g|0
Ananas|Ananas|Pineapple|50|13.1|0.5|0.1|1.4|0.001|produce_fruit|g|0
Mango|Mango|Mango|60|15.0|0.8|0.4|1.6|0.001|produce_fruit|g|0
Papaya|Papaya|Papaya|43|10.8|0.5|0.3|1.7|0.008|produce_fruit|g|0
Kiwi|Kiwi|Kiwi|61|11.5|1.1|0.5|3.0|0.005|produce_fruit|g|0
Granatapfel|Melagrana|Pomegranate|83|18.7|1.7|1.2|4.0|0.003|produce_fruit|g|0
Feige|Fico|Fig|74|19.2|0.8|0.3|2.9|0.001|produce_fruit|g|0
Dattel|Dattero|Date|277|75.0|1.8|0.2|6.7|0.002|produce_fruit|g|0
Trockenpflaume|Prugna Secca|Prune|240|64.0|2.2|0.4|7.1|0.002|produce_fruit|g|0
Rosine|Uvetta|Raisin|299|79.2|3.1|0.5|2.6|0.011|produce_fruit|g|0
Avocado|Avocado|Avocado|160|1.8|2.0|14.7|6.7|0.007|produce_fruit|g|0
Tomate|Pomodoro|Tomato|18|2.6|0.9|0.2|1.2|0.01|produce_veg|g|1
Cherrytomate|Pomodorino|Cherry Tomato|17|3.0|1.0|0.2|1.2|0.01|produce_veg|g|1
Gurke|Cetriolo|Cucumber|15|1.8|0.7|0.1|0.5|0.005|produce_veg|g|1
Zucchini|Zucchina|Zucchini|17|2.1|1.2|0.3|1.0|0.003|produce_veg|g|1
Aubergine|Melanzana|Eggplant|25|5.9|1.0|0.2|3.0|0.002|produce_veg|g|1
Paprika Rot|Peperone Rosso|Red Bell Pepper|31|6.0|1.0|0.3|2.1|0.005|produce_veg|g|1
Paprika Gelb|Peperone Giallo|Yellow Bell Pepper|27|6.3|1.0|0.2|0.9|0.005|produce_veg|g|1
Brokkoli|Broccoli|Broccoli|34|2.7|2.8|0.4|2.6|0.08|produce_veg|g|1
Blumenkohl|Cavolfiore|Cauliflower|25|5.0|1.9|0.3|2.0|0.03|produce_veg|g|1
Rosenkohl|Cavolini di Bruxelles|Brussels Sprouts|43|9.0|3.4|0.3|3.8|0.025|produce_veg|g|1
Weißkohl|Cavolo Cappuccio|White Cabbage|25|5.8|1.3|0.1|2.5|0.018|produce_veg|g|1
Rotkohl|Cavolo Rosso|Red Cabbage|31|7.4|1.4|0.2|2.1|0.027|produce_veg|g|1
Kohlrabi|Cavolo Rapa|Kohlrabi|27|6.2|1.7|0.1|3.6|0.02|produce_veg|g|1
Spinat|Spinaci|Spinach|23|0.8|2.9|0.4|2.2|0.12|produce_veg|g|1
Rucola|Rucola|Arugula|25|2.1|2.6|0.7|1.6|0.07|produce_veg|g|1
Eisbergsalat|Lattuga Iceberg|Iceberg Lettuce|14|1.9|0.9|0.1|1.2|0.02|produce_veg|g|1
Römersalat|Lattuga Romana|Romaine Lettuce|17|3.3|1.2|0.3|2.1|0.02|produce_veg|g|1
Karotte|Carota|Carrot|39|6.8|0.9|0.2|2.8|0.06|produce_veg|g|1
Sellerie|Sedano|Celery|16|3.0|0.7|0.2|1.6|0.08|produce_veg|g|1
Lauch|Porro|Leek|61|14.2|1.5|0.3|1.8|0.02|produce_veg|g|1
Zwiebel|Cipolla|Onion|40|7.6|1.1|0.1|1.7|0.01|produce_veg|g|1
Knoblauch|Aglio|Garlic|149|33.1|6.4|0.5|2.1|0.017|produce_veg|g|1
Frühlingszwiebel|Cipollotto|Spring Onion|32|7.3|1.8|0.2|2.6|0.016|produce_veg|g|1
Kartoffel|Patata|Potato|73|15.4|2.0|0.1|1.7|0.01|produce_veg|g|1
Süßkartoffel|Patata Dolce|Sweet Potato|86|17.7|1.6|0.1|3.0|0.05|produce_veg|g|1
Mais|Mais Dolce|Sweetcorn|86|14.5|2.9|1.2|2.7|0.45|produce_veg|g|1
Erbse|Pisello|Green Peas|81|14.5|5.4|0.4|5.1|0.005|produce_veg|g|1
Grüne Bohne|Fagiolino|Green Bean|31|7.0|1.8|0.1|2.7|0.006|produce_veg|g|1
Kichererbse|Cece|Chickpea|364|61.0|19.3|6.0|17.4|0.024|legumes|g|1
Linse|Lenticchia|Lentil|353|60.1|25.0|1.1|30.5|0.006|legumes|g|1
Kidneybohne|Fagiolo Rosso|Kidney Bean|333|60.0|23.6|0.8|24.9|0.012|legumes|g|1
Weiße Bohne|Fagiolo Bianco|White Bean|333|60.0|23.4|0.9|24.9|0.016|legumes|g|1
Sojabohne|Soia|Soybean|446|30.2|36.5|19.9|9.3|0.002|legumes|g|1
Tofu|Tofu|Tofu|144|2.8|17.3|8.7|2.3|0.01|legumes|g|1
Tempeh|Tempeh|Tempeh|195|7.6|19.9|11.4|5.5|0.009|legumes|g|1
Champignon|Champignon|Mushroom|22|0.6|3.1|0.3|1.9|0.01|produce_veg|g|1
Austernpilz|Pleuroto|Oyster Mushroom|33|6.1|3.3|0.4|2.3|0.02|produce_veg|g|1
Shiitake|Shiitake|Shiitake|34|6.8|2.2|0.5|2.5|0.009|produce_veg|g|1
Radieschen|Ravanello|Radish|16|3.4|0.7|0.1|1.6|0.039|produce_veg|g|1
Rote Bete|Barbabietola|Beetroot|43|9.6|1.6|0.2|2.8|0.078|produce_veg|g|1
Kürbis|Zucca|Pumpkin|26|6.5|1.0|0.1|0.5|0.001|produce_veg|g|1
Ingwer|Zenzero|Ginger|80|17.8|1.8|0.8|2.0|0.012|produce_veg|g|1
Chili|Peperoncino|Chilli Pepper|40|8.8|1.9|0.4|1.5|0.009|produce_veg|g|1
Haferflocken|Fiocchi d'Avena|Oats|389|66.3|16.9|6.9|10.6|0.002|grains_pasta|g|0
Weizenmehl|Farina di Grano|Wheat Flour|364|76.3|10.3|1.0|2.7|0.002|grains_pasta|g|0
Dinkelmehl|Farina di Farro|Spelt Flour|352|73.0|14.6|2.4|3.9|0.003|grains_pasta|g|0
Reis Weiß|Riso Bianco|White Rice|360|79.0|6.6|0.6|1.3|0.005|grains_pasta|g|1
Vollkornreis|Riso Integrale|Brown Rice|370|77.2|7.9|2.9|3.5|0.007|grains_pasta|g|1
Basmatireis|Riso Basmati|Basmati Rice|349|78.0|8.0|0.6|1.5|0.003|grains_pasta|g|1
Jasminreis|Riso Jasmine|Jasmine Rice|356|79.0|6.8|0.7|1.0|0.003|grains_pasta|g|1
Risottoreis|Riso per Risotto|Risotto Rice|350|78.5|6.7|0.6|1.1|0.003|grains_pasta|g|1
Pasta Hartweizen|Pasta di Semola|Durum Wheat Pasta|355|71.0|12.8|1.5|3.0|0.01|grains_pasta|g|1
Vollkornpasta|Pasta Integrale|Whole Wheat Pasta|348|66.0|14.0|2.5|8.0|0.01|grains_pasta|g|1
Spaghetti|Spaghetti|Spaghetti|359|71.5|12.5|1.5|3.0|0.01|grains_pasta|g|1
Penne|Penne|Penne|355|71.0|12.6|1.5|3.0|0.01|grains_pasta|g|1
Fusilli|Fusilli|Fusilli|356|71.2|12.4|1.5|3.0|0.01|grains_pasta|g|1
Gnocchi|Gnocchi|Gnocchi|162|34.0|4.2|0.6|1.6|0.95|grains_pasta|g|1
Couscous|Couscous|Couscous|376|77.4|12.8|0.6|5.0|0.01|grains_pasta|g|1
Bulgur|Bulgur|Bulgur|342|75.9|12.3|1.3|12.5|0.017|grains_pasta|g|1
Quinoa|Quinoa|Quinoa|368|64.2|14.1|6.1|7.0|0.005|grains_pasta|g|1
Hirse|Miglio|Millet|378|72.9|11.0|4.2|8.5|0.005|grains_pasta|g|1
Gerste|Orzo Perlato|Pearl Barley|352|77.7|9.9|1.2|15.6|0.009|grains_pasta|g|1
Buchweizen|Grano Saraceno|Buckwheat|343|71.5|13.3|3.4|10.0|0.001|grains_pasta|g|1
Polenta Maisgrieß|Farina di Mais|Polenta Cornmeal|362|76.9|8.1|3.6|7.3|0.002|grains_pasta|g|1
Haferkleie|Crusca d'Avena|Oat Bran|246|66.2|17.3|7.0|15.4|0.003|grains_pasta|g|1
Dinkel|Farro|Spelt Grain|338|70.0|14.6|2.4|10.7|0.002|grains_pasta|g|1
Chiasamen|Semi di Chia|Chia Seeds|486|42.1|16.5|30.7|34.4|0.04|nuts_seeds|g|0
Leinsamen|Semi di Lino|Flaxseed|534|28.9|18.3|42.2|27.3|0.03|nuts_seeds|g|0
Kürbiskerne|Semi di Zucca|Pumpkin Seeds|559|10.7|30.2|49.1|6.0|0.02|nuts_seeds|g|0
Sonnenblumenkerne|Semi di Girasole|Sunflower Seeds|584|20.0|20.8|51.5|8.6|0.009|nuts_seeds|g|0
Sesam|Semi di Sesamo|Sesame Seeds|573|23.4|17.7|49.7|11.8|0.011|nuts_seeds|g|0
Hähnchenbrust|Petto di Pollo|Chicken Breast|165|0.0|31.0|3.6|0.0|0.16|meat_fish|g|1
Hähnchenschenkel|Coscia di Pollo|Chicken Thigh|209|0.0|26.0|10.9|0.0|0.19|meat_fish|g|1
Putenbrust|Petto di Tacchino|Turkey Breast|135|0.0|29.0|1.6|0.0|0.15|meat_fish|g|1
Rinderhack|Macinato di Manzo|Ground Beef|250|0.0|26.0|15.0|0.0|0.18|meat_fish|g|1
Rindsteak|Bistecca di Manzo|Beef Steak|271|0.0|25.0|19.0|0.0|0.14|meat_fish|g|1
Schweinefilet|Filetto di Maiale|Pork Tenderloin|143|0.0|26.0|3.5|0.0|0.15|meat_fish|g|1
Schweinehack|Macinato di Maiale|Ground Pork|263|0.0|17.0|21.0|0.0|0.19|meat_fish|g|1
Lammfleisch|Carne d'Agnello|Lamb|294|0.0|25.0|21.0|0.0|0.16|meat_fish|g|1
Lammkotelett|Costolette d'Agnello|Lamb Chop|282|0.0|25.0|20.0|0.0|0.17|meat_fish|g|1
Leber|Fegato|Liver|135|3.9|20.4|3.6|0.0|0.19|meat_fish|g|1
Rinderbraten|Arrosto di Manzo|Beef Roast|205|0.0|30.0|9.0|0.0|0.15|meat_fish|g|1
Entenbrust|Petto d'Anatra|Duck Breast|201|0.0|24.0|11.0|0.0|0.12|meat_fish|g|1
Speck|Pancetta|Bacon|393|1.4|22.0|33.0|0.0|1.50|meat_fish|g|1
Salami|Salame|Salami|407|2.4|22.0|35.0|0.0|1.90|meat_fish|g|1
Mortadella|Mortadella|Mortadella|311|1.7|16.5|26.5|0.0|1.60|meat_fish|g|1
Salsiccia|Salsiccia|Italian Sausage|304|1.0|17.0|26.0|0.0|1.70|meat_fish|g|1
Würstchen|Würstel|Frankfurter Sausage|260|1.5|12.5|23.0|0.0|1.80|meat_fish|g|1
Lachs|Salmone|Salmon|208|0.0|20.4|13.4|0.0|0.11|meat_fish|g|1
Thunfisch|Tonno|Tuna|132|0.0|28.0|1.3|0.0|0.09|meat_fish|g|1
Kabeljau|Merluzzo|Cod|82|0.0|18.0|0.7|0.0|0.16|meat_fish|g|1
Sardine|Sardina|Sardine|208|0.0|24.6|11.5|0.0|0.51|meat_fish|g|1
Makrele|Sgombro|Mackerel|205|0.0|18.6|13.9|0.0|0.09|meat_fish|g|1
Forelle|Trota|Trout|148|0.0|20.8|6.6|0.0|0.13|meat_fish|g|1
Garnelen|Gamberi|Prawns|99|0.2|24.0|0.3|0.0|0.30|meat_fish|g|1
Muscheln|Cozze|Mussels|86|3.7|11.9|2.2|0.0|0.61|meat_fish|g|1
Tintenfisch|Calamari|Squid|92|3.1|15.6|1.4|0.0|0.44|meat_fish|g|1
Ei|Uovo|Egg|143|0.7|12.6|9.9|0.0|0.32|dairy|g|1
Eiweiß|Albume|Egg White|52|0.7|10.9|0.2|0.0|0.40|dairy|g|1
Eigelb|Tuorlo|Egg Yolk|322|3.6|15.9|26.5|0.0|0.20|dairy|g|1
Milch 3,5%|Latte Intero|Whole Milk|64|4.8|3.4|3.5|0.0|0.12|dairy|ml|0
Milch 1,5%|Latte Parz. Scremato|Semi-skimmed Milk|47|4.9|3.4|1.5|0.0|0.12|dairy|ml|0
Magermilch|Latte Scremato|Skimmed Milk|35|5.1|3.4|0.2|0.0|0.12|dairy|ml|0
Joghurt Natur 3,5%|Yogurt Bianco Intero|Natural Yogurt 3.5%|61|4.7|3.5|3.3|0.0|0.10|dairy|g|0
Joghurt Natur 0%|Yogurt Bianco Magro|Fat-free Yogurt|56|7.0|10.2|0.2|0.0|0.13|dairy|g|0
Griechischer Joghurt|Yogurt Greco|Greek Yogurt|128|4.2|4.5|10.0|0.0|0.10|dairy|g|0
Skyr|Skyr|Skyr|63|4.0|11.0|0.2|0.0|0.10|dairy|g|0
Quark Mager|Quark Magro|Low-fat Quark|67|4.0|12.2|0.2|0.0|0.09|dairy|g|0
Frischkäse|Formaggio Spalmabile|Cream Cheese|175|3.5|9.0|14.0|0.5|0.85|dairy|g|0
Mozzarella|Mozzarella|Mozzarella|254|2.2|18.1|19.5|0.0|0.63|dairy|g|0
Gouda|Gouda|Gouda|356|2.2|24.9|27.4|0.0|1.80|dairy|g|0
Emmentaler|Emmental|Emmental|380|0.5|28.7|29.7|0.0|1.10|dairy|g|0
Parmesan|Parmigiano|Parmesan|398|0.0|33.0|29.0|0.0|1.50|dairy|g|0
Feta|Feta|Feta|271|0.5|16.5|22.5|0.0|2.80|dairy|g|0
Ricotta|Ricotta|Ricotta|146|3.5|8.8|10.9|0.0|0.40|dairy|g|0
Butter|Burro|Butter|741|0.6|0.7|82.0|0.0|0.03|dairy|g|0
Sahne|Panna|Cream|340|3.0|2.5|36.0|0.0|0.04|dairy|ml|0
Creme fraiche|Crème Fraîche|Crème Fraîche|291|3.4|2.1|30.0|0.0|0.07|dairy|g|0
Weißbrot|Pane Bianco|White Bread|267|51.0|8.9|3.2|2.7|1.20|bakery|g|0
Vollkornbrot|Pane Integrale|Wholegrain Bread|212|40.5|6.8|1.4|8.2|1.15|bakery|g|0
Baguette|Baguette|Baguette|274|53.0|9.0|2.5|2.5|1.30|bakery|g|0
Ciabatta|Ciabatta|Ciabatta|279|55.0|9.3|3.0|2.8|1.25|bakery|g|0
Toast|Pancarrè|Sliced Toast|252|47.0|8.5|3.3|2.6|1.20|bakery|g|0
Brötchen|Panino|Bread Roll|272|55.0|8.8|1.6|3.1|1.30|bakery|g|0
Croissant|Cornetto|Croissant|406|45.8|8.2|21.0|2.6|1.00|bakery|g|0
Pizza Margherita|Pizza Margherita|Pizza Margherita|266|33.0|11.0|10.0|2.3|1.20|prepared|g|0
Apfelmus|Passata di Mela|Apple Sauce|68|15.0|0.2|0.1|1.0|0.01|snacks_sweets|g|0
Zartbitterschokolade|Cioccolato Fondente|Dark Chocolate|546|45.9|7.8|35.0|10.9|0.02|snacks_sweets|g|0
Vollmilchschokolade|Cioccolato al Latte|Milk Chocolate|535|59.0|7.6|29.7|3.4|0.11|snacks_sweets|g|0
Mandeln|Mandorle|Almonds|579|21.6|21.2|49.9|12.5|0.003|nuts_seeds|g|0
Haselnüsse|Nocciole|Hazelnuts|628|16.7|15.0|60.7|9.7|0.001|nuts_seeds|g|0
Walnüsse|Noci|Walnuts|654|13.7|15.2|65.2|6.7|0.005|nuts_seeds|g|0
Erdnüsse|Arachidi|Peanuts|567|16.1|25.8|49.2|8.5|0.005|nuts_seeds|g|0
Cashewkerne|Anacardi|Cashews|553|30.2|18.2|43.9|3.3|0.012|nuts_seeds|g|0
Pistazien|Pistacchi|Pistachios|560|27.2|20.2|45.3|10.6|0.02|nuts_seeds|g|0
Popcorn|Popcorn|Popcorn|375|74.0|11.0|4.3|14.5|0.02|snacks_sweets|g|0
Honig|Miele|Honey|304|82.4|0.3|0.0|0.2|0.004|condiments_oils|g|0
Zucker|Zucchero|Sugar|400|100.0|0.0|0.0|0.0|0.001|condiments_oils|g|0
Olivenöl|Olio di Oliva|Olive Oil|884|0.0|0.0|100.0|0.0|0.002|condiments_oils|ml|0
Rapsöl|Olio di Canola|Canola Oil|884|0.0|0.0|100.0|0.0|0.0|condiments_oils|ml|0
Sonnenblumenöl|Olio di Semi|Sunflower Oil|884|0.0|0.0|100.0|0.0|0.0|condiments_oils|ml|0
Kokosöl|Olio di Cocco|Coconut Oil|892|0.0|0.0|99.1|0.0|0.0|condiments_oils|ml|0
Tomatenmark|Concentrato di Pomodoro|Tomato Paste|82|18.9|4.3|0.5|4.1|0.06|condiments_oils|g|0
Sojasoße|Salsa di Soia|Soy Sauce|53|4.9|8.1|0.6|0.8|14.00|condiments_oils|ml|0
Balsamicoessig|Aceto Balsamico|Balsamic Vinegar|88|17.0|0.5|0.0|0.0|0.02|condiments_oils|ml|0
Essig|Aceto Bianco|White Vinegar|19|0.6|0.0|0.0|0.0|0.01|condiments_oils|ml|0
Senf|Senape|Mustard|66|5.8|4.4|3.3|3.3|2.00|condiments_oils|g|0
Mayonnaise|Maionese|Mayonnaise|680|1.3|1.0|75.0|0.0|1.30|condiments_oils|g|0
Ketchup|Ketchup|Ketchup|112|25.0|1.2|0.2|0.4|1.80|condiments_oils|g|0
Pesto|Pesto|Pesto|433|6.0|5.0|43.0|2.0|1.70|condiments_oils|g|0
Wasser|Acqua|Water|0|0.0|0.0|0.0|0.0|0.0|drinks|ml|0
Mineralwasser Sprudel|Acqua Frizzante|Sparkling Water|0|0.0|0.0|0.0|0.0|0.01|drinks|ml|0
Kaffee Schwarz|Caffè|Black Coffee|2|0.0|0.1|0.0|0.0|0.01|drinks|ml|0
Espresso|Espresso|Espresso|9|1.7|0.1|0.2|0.0|0.01|drinks|ml|0
Tee ungesüßt|Tè non Zuccherato|Unsweetened Tea|1|0.2|0.0|0.0|0.0|0.0|drinks|ml|0
Orangensaft|Succo d'Arancia|Orange Juice|45|10.4|0.7|0.2|0.2|0.01|drinks|ml|0
Apfelsaft|Succo di Mela|Apple Juice|46|11.3|0.1|0.1|0.2|0.01|drinks|ml|0
Haferdrink|Bevanda d'Avena|Oat Milk|46|6.7|0.8|1.5|0.8|0.10|drinks|ml|0
Sojadrink|Bevanda di Soia|Soy Milk|54|3.0|3.3|2.0|0.6|0.09|drinks|ml|0
Mandeldrink|Bevanda di Mandorla|Almond Milk|24|3.0|0.6|1.1|0.3|0.10|drinks|ml|0
Cola|Cola|Cola|42|10.6|0.0|0.0|0.0|0.01|drinks|ml|0
Kebab Hähnchen Teller|Piatto Kebab di Pollo|Chicken Kebab Plate|198|16.0|14.0|9.0|1.8|1.30|prepared|g|0
Gemüsesuppe|Zuppa di Verdure|Vegetable Soup|35|5.0|1.2|1.1|1.0|0.55|soups|g|0
Hühnersuppe|Brodo di Pollo|Chicken Soup|42|2.0|4.0|2.0|0.0|0.75|soups|g|0
Linsensuppe|Zuppa di Lenticchie|Lentil Soup|60|8.5|3.5|1.2|2.5|0.60|soups|g|0
Omelett|Omelette|Omelette|184|1.4|12.5|14.0|0.0|0.50|prepared|g|0
Rührei|Uova Strapazzate|Scrambled Eggs|199|1.6|13.6|15.2|0.0|0.45|prepared|g|0
Pfannkuchen|Pancake|Pancake|227|28.3|6.4|9.7|0.9|0.60|prepared|g|0
`;

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const parseRows = () =>
  ROWS.trim()
    .split('\n')
    .map((line) => line.split('|').map((x) => x.trim()))
    .filter((c) => c.length >= 12);

export const EXTRA_FOODS: FoodItem[] = (() => {
  const out: FoodItem[] = [];

  for (const c of parseRows()) {
    const [de, it, en, kcal, carbs, protein, fat, fiber, salt, category, unit] = c;
    const base: FoodItem = {
      id: `genx-${slug(en)}`,
      name_de: de,
      name_it: it,
      name_en: en,
      store: 'Generic',
      category: category as FoodCategory,
      unit: unit === 'ml' ? 'ml' : 'g',
      calories: Number(kcal),
      carbs: Number(carbs),
      protein: Number(protein),
      fat: Number(fat),
      fiber: Number(fiber),
      salt: Number(salt),
    };
    out.push(base);
  }

  return out;
})();
