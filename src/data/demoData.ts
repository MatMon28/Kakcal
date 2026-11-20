import type {
  CustomButtonDef,
  DayLog,
  FoodItem,
  PeriodData,
  PeriodDayLog,
  PeriodSettings,
  PreBuiltMeal,
  PreBuiltMealIngredient,
} from '../types';
import { VERIFIED_FOODS } from './verifiedFoods';
import { addDaysToDateString, getTodayDateString } from '../utils/formatters';

export const DEMO_CUSTOM_BUTTONS: CustomButtonDef[] = [
  {
    id: 'demo-magnesium',
    name: 'Magnesium',
    type: 'quantity',
    unit: 'mg',
    icon: 'pill',
    showStats: true,
  },
  {
    id: 'demo-vitamin-d',
    name: 'Vitamin D',
    type: 'toggle',
    icon: 'sun',
    showStats: true,
  },
];

function makeRecipe(
  id: string,
  names: { name_en: string; name_it: string; name_de: string },
  ingredients: PreBuiltMealIngredient[],
): FoodItem {
  // Nutrition is derived from the referenced foods so the expanded ingredient
  // list (original quantities) always matches the per-100 g values shown.
  let kcal = 0, carbs = 0, protein = 0, fat = 0, fiber = 0, salt = 0, grams = 0;
  for (const ingredient of ingredients) {
    const food = VERIFIED_FOODS.find((f) => f.id === ingredient.foodId);
    if (!food) continue;
    const factor = ingredient.amount / 100;
    grams += ingredient.amount;
    kcal += food.calories * factor;
    carbs += (food.carbs ?? 0) * factor;
    protein += (food.protein ?? 0) * factor;
    fat += (food.fat ?? 0) * factor;
    fiber += (food.fiber ?? 0) * factor;
    salt += (food.salt ?? 0) * factor;
  }
  const per100 = grams > 0 ? 100 / grams : 0;
  const round = (value: number) => Math.round(value * 100) / 100;

  return {
    id,
    ...names,
    store: 'Custom',
    category: 'prepared',
    unit: 'g',
    calories: Math.round(kcal * per100),
    carbs: round(carbs * per100),
    protein: round(protein * per100),
    fat: round(fat * per100),
    fiber: round(fiber * per100),
    salt: round(salt * per100),
    isCustom: true,
    isRecipe: true,
    recipeIngredients: ingredients,
  };
}

export const DEMO_RECIPES: FoodItem[] = [
  makeRecipe(
    'demo-recipe-yogurt-crunch',
    {
      name_en: 'Skyr, Oat & Blueberry Bowl',
      name_it: 'Bowl di skyr, avena e mirtilli',
      name_de: 'Skyr-Hafer-Blaubeer-Bowl',
    },
    [
      { foodId: 'lidl-01', amount: 150 },
      { foodId: 'lidl-07', amount: 50 },
      { foodId: 'gen-03', amount: 60 },
    ]
  ),
  makeRecipe(
    'demo-recipe-chicken-rice',
    {
      name_en: 'Chicken, Basmati & Olive Oil Meal Prep',
      name_it: 'Meal prep con pollo, basmati e olio d’oliva',
      name_de: 'Meal Prep mit Hähnchen, Basmati und Olivenöl',
    },
    [
      { foodId: 'gen-21', amount: 180 },
      { foodId: 'netto-04', amount: 75 },
      { foodId: 'gen-16', amount: 8 },
    ]
  ),
];

export const DEMO_MEALS: PreBuiltMeal[] = [
  {
    id: 'demo-meal-skyr-oats',
    name: 'Morning Skyr Oats',
    description: 'Creamy skyr, oats and fresh blueberries — the current breakfast favorite.',
    slot: 'breakfast',
    createdAt: '2026-01-12T07:30:00.000Z',
    ingredients: [
      { foodId: 'lidl-07', amount: 60 },
      { foodId: 'lidl-01', amount: 150 },
      { foodId: 'gen-03', amount: 60 },
    ],
  },
  {
    id: 'demo-meal-chicken-rice',
    name: 'Chicken & Basmati Lunch',
    description: 'A simple balanced lunch with chicken breast, basmati rice and olive oil.',
    slot: 'lunch',
    createdAt: '2026-01-13T12:00:00.000Z',
    ingredients: [
      { foodId: 'gen-21', amount: 180 },
      { foodId: 'netto-04', amount: 75 },
      { foodId: 'gen-16', amount: 8 },
    ],
  },
  {
    id: 'demo-meal-salmon-broccoli',
    name: 'Salmon & Broccoli Dinner',
    description: 'Oven-ready salmon with a generous portion of broccoli.',
    slot: 'dinner',
    createdAt: '2026-01-14T18:30:00.000Z',
    ingredients: [
      { foodId: 'aldi-10', amount: 150 },
      { foodId: 'gen-06', amount: 200 },
    ],
  },
];

function cloneMeals(meals: DayLog['meals'], date: string): DayLog['meals'] {
  const clone = (items: DayLog['meals'][keyof DayLog['meals']] = []) =>
    items.map((item, index) => ({
      ...item,
      id: `${item.id}-${date}-${index}`,
      loggedAt: new Date(`${date}T12:00:00`).toISOString(),
    }));
  return {
    breakfast: clone(meals.breakfast),
    mid_morning: clone(meals.mid_morning),
    lunch: clone(meals.lunch),
    midday_snack: clone(meals.midday_snack),
    dinner: clone(meals.dinner),
    extra: clone(meals.extra),
  };
}

/** Add a week of varied, realistic entries without replacing the hand-written base meals. */
export function enrichDemoDayLogs(base: Record<string, DayLog>): Record<string, DayLog> {
  const today = getTodayDateString();
  const yesterday = addDaysToDateString(today, -1);
  const output = { ...base };
  const reference = base[yesterday] ?? base[today];

  for (let offset = 0; offset <= 6; offset += 1) {
    const date = addDaysToDateString(today, -offset);
    const current = output[date] ?? reference;
    if (!current) continue;
    const isAdditionalDay = offset >= 2;
    const day: DayLog = isAdditionalDay
      ? {
          ...current,
          date,
          meals: cloneMeals(current.meals, date),
          activities: current.activities.map((activity, index) => ({
            ...activity,
            id: `${activity.id}-${date}-${index}`,
            timestamp: new Date(`${date}T17:30:00`).toISOString(),
          })),
        }
      : current;

    const water = [
      { id: `demo-water-${date}-1`, ml: offset % 2 === 0 ? 500 : 250, timestamp: new Date(`${date}T08:20:00`).toISOString() },
      ...(offset % 3 !== 1
        ? [{ id: `demo-water-${date}-2`, ml: 250, timestamp: new Date(`${date}T13:10:00`).toISOString() }]
        : []),
    ];

    output[date] = {
      ...day,
      waterEntries: water,
      weightKg: Math.round((73 - offset * 0.2) * 10) / 10,
      poops: offset % 3 === 1
        ? []
        : [{
            id: `demo-poop-${date}`,
            size: offset % 2 === 0 ? 'normal' : 'little',
            bristol: offset % 2 === 0 ? 4 : 3,
            timestamp: new Date(`${date}T08:05:00`).toISOString(),
            description: offset === 0 ? 'Morning entry' : undefined,
          }],
      custom: {
        'demo-vitamin-d': offset % 3 !== 1,
      },
      customEntries: {
        'demo-magnesium': [
          { id: `demo-magnesium-${date}-1`, amount: 200, timestamp: new Date(`${date}T08:30:00`).toISOString() },
          ...(offset % 2 === 0
            ? [{ id: `demo-magnesium-${date}-2`, amount: 50, timestamp: new Date(`${date}T20:45:00`).toISOString() }]
            : []),
        ],
      },
    };
  }

  return output;
}

function periodDay(date: string, partial: Omit<PeriodDayLog, 'updatedAt'>): PeriodDayLog {
  return { ...partial, updatedAt: new Date(`${date}T21:00:00`).toISOString() };
}

export function createDemoPeriodData(defaultSettings: PeriodSettings): PeriodData {
  const today = getTodayDateString();
  const logs: PeriodData['logs'] = {};
  const cycleStarts = [-56, -28, -2];

  for (const [cycleIndex, offset] of cycleStarts.entries()) {
    const start = addDaysToDateString(today, offset);
    for (let day = 0; day < 5; day += 1) {
      const date = addDaysToDateString(start, day);
      logs[date] = periodDay(date, {
        isPeriod: true,
        flow: day === 0 ? 'heavy' : day < 3 ? 'medium' : 'light',
        moods: day === 0 ? ['mood.tired'] : day === 2 ? ['mood.calm'] : [],
        symptoms: day < 2 ? ['sym.cramps', 'sym.fatigue'] : day === 3 ? ['sym.bloating'] : [],
        notes: day === 0 ? `Cycle ${cycleIndex + 1}: heavier first day, used a heat pack.` : undefined,
      });
    }
  }

  // Cycle-specific daily details for testing markers, charts and nutrition correlations.
  for (let offset = 0; offset <= 20; offset += 1) {
    const date = addDaysToDateString(today, -offset);
    const previous = logs[date];
    logs[date] = periodDay(date, {
      isPeriod: previous?.isPeriod ?? false,
      flow: previous?.flow ?? 'none',
      moods: previous?.moods ?? (offset % 4 === 0 ? ['mood.calm'] : []),
      symptoms: previous?.symptoms ?? (offset % 5 === 0 ? ['sym.headache'] : []),
      pillTaken: offset < 14 && offset % 6 !== 0 ? true : undefined,
      notes: previous?.notes,
    });
  }

  for (const offset of [12, 2]) {
    const date = addDaysToDateString(today, -offset);
    logs[date] = periodDay(date, { ...logs[date], intercourse: true });
  }

  return {
    settings: {
      ...defaultSettings,
      trackPill: true,
      packStart: addDaysToDateString(today, -20),
      pillTrackingSince: addDaysToDateString(today, -20),
      showNutrition: true,
    },
    logs,
  };
}
