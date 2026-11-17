"""Build the offline catalog selection from the official FoodData Central SR Legacy CSV zip."""

import csv
import io
import json
import sys
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from zipfile import ZipFile

# FoodData Central ID | category | English | Italian | German
SELECTION = """
170851|dairy|Ricotta, whole milk|Ricotta di latte intero|Ricotta aus Vollmilch
171248|dairy|Ricotta, part-skim|Ricotta di latte parzialmente scremato|Fettarmer Ricotta
170850|dairy|Provolone cheese|Provolone|Provolone
171242|dairy|Gruyere cheese|Groviera|Gruy\u00e8re
173435|dairy|Soft goat cheese|Formaggio di capra morbido|Weicher Ziegenk\u00e4se
172182|dairy|Cottage cheese, 2% milkfat|Fiocchi di latte, 2% di grassi|K\u00f6rniger Frischk\u00e4se, 2% Fett
170903|dairy|Greek yogurt, plain, low fat|Yogurt greco bianco magro|Fettarmer griechischer Naturjoghurt
168411|legumes|Edamame, cooked|Edamame cotti|Edamame, gegart
173735|legumes|Black beans, boiled without salt|Fagioli neri lessati senza sale|Schwarze Bohnen, ungesalzen gekocht
175200|legumes|Pinto beans, boiled without salt|Fagioli pinto lessati senza sale|Pintobohnen, ungesalzen gekocht
175203|legumes|White beans, boiled without salt|Fagioli bianchi lessati senza sale|Wei\u00dfe Bohnen, ungesalzen gekocht
173740|legumes|Kidney beans, boiled without salt|Fagioli rossi lessati senza sale|Kidneybohnen, ungesalzen gekocht
173800|legumes|Chickpeas, canned and drained|Ceci in scatola sgocciolati|Kichererbsen aus der Dose, abgetropft
172421|legumes|Lentils, boiled without salt|Lenticchie lessate senza sale|Linsen, ungesalzen gekocht
172429|legumes|Split peas, boiled without salt|Piselli spezzati lessati senza sale|Sch\u00e4lerbsen, ungesalzen gekocht
174257|legumes|Mung beans, boiled without salt|Fagioli mung lessati senza sale|Mungbohnen, ungesalzen gekocht
172467|legumes|Tempeh, cooked|Tempeh cotto|Tempeh, gegart
172475|legumes|Firm tofu, calcium-set|Tofu compatto al calcio|Fester Tofu mit Calciumsulfat
170148|nuts_seeds|Hulled hemp seeds|Semi di canapa decorticati|Hanfsamen, gesch\u00e4lt
170190|nuts_seeds|Chestnuts, roasted|Castagne arrostite|Ger\u00f6stete Esskastanien
170569|nuts_seeds|Brazil nuts|Noci del Brasile|Paran\u00fcsse
170591|nuts_seeds|Pine nuts, dried|Pinoli secchi|Getrocknete Pinienkerne
168588|nuts_seeds|Almond butter, unsalted|Crema di mandorle senza sale|Mandelmus ohne Salz
168564|produce_veg|Radicchio, raw|Radicchio crudo|Radicchio, roh
168424|produce_veg|Kohlrabi, raw|Cavolo rapa crudo|Kohlrabi, roh
169385|produce_veg|Fennel bulb, raw|Finocchio crudo|Fenchelknolle, roh
170417|produce_veg|Parsnip, raw|Pastinaca cruda|Pastinake, roh
168386|produce_veg|Artichoke, boiled without salt|Carciofo lessato senza sale|Artischocke, ungesalzen gekocht
169261|produce_veg|Okra, boiled without salt|Gombo lessato senza sale|Okra, ungesalzen gekocht
169243|produce_veg|Portobello mushroom, grilled|Funghi portobello alla griglia|Portobello, gegrillt
170496|produce_veg|Wakame seaweed, raw|Alga wakame cruda|Wakame-Alge, roh
168569|produce_veg|Hearts of palm, canned|Cuori di palma in scatola|Palmherzen aus der Dose
170068|produce_veg|Watercress, raw|Crescione crudo|Brunnenkresse, roh
169108|produce_fruit|Purple passion fruit|Frutto della passione viola|Violette Passionsfrucht
169941|produce_fruit|Persimmon, raw|Cachi crudi|Kaki, roh
173044|produce_fruit|Guava, raw|Guava cruda|Guave, roh
168154|produce_fruit|Kumquat, raw|Kumquat crudo|Kumquat, roh
173043|produce_fruit|Cape gooseberry (physalis)|Alchechengi (physalis)|Kapstachelbeere (Physalis)
174687|produce_fruit|Jackfruit, raw|Frutto del jackfruit crudo|Jackfrucht, roh
168917|grains_pasta|Quinoa, cooked|Quinoa cotta|Quinoa, gekocht
170287|grains_pasta|Bulgur, cooked|Bulgur cotto|Bulgur, gekocht
170285|grains_pasta|Pearled barley, cooked|Orzo perlato cotto|Perlgraupen, gekocht
170686|grains_pasta|Buckwheat groats, cooked|Grano saraceno tostato e cotto|Buchweizengr\u00fctze, gekocht
168918|grains_pasta|Teff, cooked|Teff cotto|Teff, gekocht
169700|grains_pasta|Couscous, cooked|Couscous cotto|Couscous, gekocht
168871|grains_pasta|Millet, cooked|Miglio cotto|Hirse, gekocht
175139|meat_fish|Sardines in oil, drained|Sardine sott'olio sgocciolate|Sardinen in \u00d6l, abgetropft
174183|meat_fish|Anchovies in oil, drained|Acciughe sott'olio sgocciolate|Sardellen in \u00d6l, abgetropft
174249|meat_fish|Octopus, cooked|Polpo cotto|Oktopus, gegart
167742|meat_fish|Scallops, steamed|Capesante al vapore|Jakobsmuscheln, ged\u00e4mpft
174219|meat_fish|Pacific oyster, raw|Ostrica del Pacifico cruda|Pazifische Auster, roh
173718|meat_fish|Farmed rainbow trout, cooked|Trota iridea d'allevamento cotta|Regenbogenforelle aus Zucht, gegart
172409|meat_fish|Duck, roasted with skin|Anatra arrosto con pelle|Ente, mit Haut gebraten
170250|snacks_sweets|Rice cakes, brown rice, unsalted|Gallette di riso integrale senza sale|Vollkornreiswaffeln ohne Salz
170246|snacks_sweets|Air-popped popcorn, unsalted|Popcorn ad aria senza sale|Heissluft-Popcorn ohne Salz
167555|snacks_sweets|Salted pretzels, crunchy|Pretzel croccanti salati|Knusprige Salzbrezeln
167558|snacks_sweets|White corn tortilla chips, salted|Chips di tortilla di mais bianco salate|Tortillachips aus wei\u00dfem Mais, gesalzen
173147|snacks_sweets|Pita chips, salted|Chips di pita salate|Pitachips, gesalzen
170654|snacks_sweets|Trail mix, unsalted|Mix di frutta secca senza sale|Studentenfutter ohne Salz
168849|snacks_sweets|Banana chips|Chips di banana|Bananenchips
172744|snacks_sweets|Rye crispbread wafers|Sfoglie croccanti di segale|Roggen-Kn\u00e4ckebrot
169063|snacks_sweets|Oat, raisin and coconut granola bar|Barretta di avena, uvetta e cocco|M\u00fcsliriegel mit Hafer, Rosinen und Kokos
170273|snacks_sweets|Dark chocolate, 70-85% cocoa|Cioccolato fondente, 70-85% cacao|Zartbitterschokolade, 70-85% Kakao
172454|prepared|Hummus, homemade|Hummus fatto in casa|Hummus, hausgemacht
172455|prepared|Falafel, homemade|Falafel fatti in casa|Falafel, hausgemacht
169850|prepared|Meat lasagna, restaurant-style|Lasagne di carne, da ristorante|Fleischlasagne, Restaurantportion
169038|prepared|Cheese ravioli with tomato sauce|Ravioli al formaggio al pomodoro|K\u00e4seravioli mit Tomatensauce
167680|prepared|Spaghetti with meat sauce|Spaghetti al rag\u00f9|Spaghetti mit Fleischsauce
169033|prepared|Spaghetti with tomato sauce|Spaghetti al pomodoro|Spaghetti mit Tomatensauce
168062|prepared|Chicken parmesan, no pasta|Pollo alla parmigiana senza pasta|H\u00e4hnchen-Parmesan ohne Pasta
168064|prepared|Rice with black beans|Riso con fagioli neri|Reis mit schwarzen Bohnen
169855|prepared|Cheese enchilada|Enchilada al formaggio|Enchilada mit K\u00e4se
167660|prepared|Beef empanada|Empanada di manzo|Empanada mit Rindfleisch
167667|prepared|Chinese-style egg roll, assorted|Involtino cinese fritto|Chinesische Fr\u00fchlingsrolle, frittiert
171550|soups|Minestrone, ready to serve|Minestrone pronto da servire|Minestrone, servierfertig
174530|soups|Minestrone, reduced sodium|Minestrone a ridotto contenuto di sodio|Minestrone, natriumreduziert
168068|soups|Black bean soup|Zuppa di fagioli neri|Schwarze Bohnensuppe
168069|soups|Tripe soup|Zuppa di trippa|Kuttelsuppe
168782|desserts|Rice pudding, ready to eat|Budino di riso pronto|Milchreis, verzehrfertig
172711|desserts|Cheesecake, commercial|Cheesecake confezionata|K\u00e4sekuchen, im Handel
168815|desserts|Vanilla frozen yogurt, soft serve|Frozen yogurt alla vaniglia|Vanille-Joghurteis, Softeis
167577|desserts|Orange sherbet|Sorbetto all'arancia con latte|Orangensorbet mit Milch
170189|condiments_oils|Tahini, roasted sesame|Tahina di sesamo tostato|Tahin aus ger\u00f6stetem Sesam
172442|condiments_oils|Miso paste|Pasta di miso|Misopaste
"""


def table(archive, name):
    path = next(path for path in archive.namelist() if path.rsplit('/', 1)[-1] == name)
    with io.TextIOWrapper(archive.open(path), encoding='utf-8-sig') as stream:
        yield from csv.DictReader(stream)


def export(archive_path, destination):
    selection = [line.split('|') for line in SELECTION.strip().splitlines()]
    ids = {row[0] for row in selection}
    assert len(ids) == len(selection), 'Duplicate FoodData Central IDs'
    nutrients = ('1008', '1005', '1003', '1004', '1079', '1093')
    amounts = defaultdict(dict)
    with ZipFile(archive_path) as archive:
        source_foods = {row['fdc_id']: row for row in table(archive, 'food.csv')}
        for row in table(archive, 'food_nutrient.csv'):
            identifier, nutrient = row['fdc_id'], row['nutrient_id']
            if identifier in ids and nutrient in nutrients and row['amount']:
                amounts[identifier].setdefault(nutrient, Decimal(row['amount']))

    lines = ['// Generated by scripts/generate-usda-foods.py from USDA SR Legacy (April 2018).',
             '// FDC ID, category, English, Italian, German, kcal, carbs, protein, fat, fiber, salt.',
             "import type { FoodCategory } from '../types';", '', 'export const USDA_FOOD_ROWS = [']
    for identifier, *labels in selection:
        if source_foods[identifier]['data_type'] != 'sr_legacy_food' or '1008' not in amounts[identifier]:
            raise ValueError(f'Missing SR Legacy energy entry: {identifier}')
        kcal, carbs, protein, fat, fiber, sodium = (amounts[identifier].get(key) for key in nutrients)
        salt = (sodium * Decimal('0.0025')).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP) if sodium is not None else None
        numbers = [int(kcal), carbs, protein, fat, fiber, salt]
        row = [int(identifier), *labels, *(float(value) if isinstance(value, Decimal) else value for value in numbers)]
        lines.append(f'  {json.dumps(row, ensure_ascii=True)},')
    lines.extend(['] as const satisfies readonly (readonly [',
                  '  number, FoodCategory, string, string, string, number,',
                  '  number | null, number | null, number | null, number | null, number | null,',
                  '])[];', ''])
    destination.write_text('\n'.join(lines), encoding='ascii')
    print(f'Wrote {len(selection)} source-backed foods to {destination}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 scripts/generate-usda-foods.py <SR Legacy CSV zip>')
    export(Path(sys.argv[1]), Path(__file__).resolve().parents[1] / 'src/data/usdaFoodRows.ts')