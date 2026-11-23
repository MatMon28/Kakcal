import { DEMO_RECIPES } from './demoData';
import { addDaysToDateString, getTodayDateString } from '../utils/formatters';
import type { MealJournalData } from '../types/journal';

export function makeDemoJournal(): MealJournalData {
  const today = getTodayDateString();
  const yesterday = addDaysToDateString(today, -1);
  return {
    version: 1,
    plans: [
      { id: 'demo-plan-breakfast', date: today, slot: 'breakfast', title: 'A slow start', kind: 'food', items: [{ food: DEMO_RECIPES[0], amount: 260 }], note: 'Yogurt, berries & a quiet moment.', read: false },
      { id: 'demo-plan-lunch', date: today, slot: 'lunch', title: 'Lunch, already sorted', kind: 'food', items: [{ food: DEMO_RECIPES[1], amount: 350 }], note: 'Chicken bowl. Extra greens, please.', read: false },
      { id: 'demo-plan-dinner', date: today, slot: 'dinner', title: 'Something good together', kind: 'note', items: [], note: 'Homemade pasta with the family.', read: false },
      ...Array.from({ length: 5 }, (_, i) => ({ id: `demo-plan-next-${i}`, date: addDaysToDateString(today, i + 1), slot: 'lunch' as const, title: ['A colorful lunch', 'Leftovers, reimagined', 'A little meal prep', 'Keep it simple', 'Make something you love'][i], kind: 'note' as const, items: [], note: ['Roasted vegetables & a grain bowl.', 'Add fresh greens to last night\'s dinner.', 'Make an extra portion for tomorrow.', 'Soup and a good slice of bread.', 'Try that recipe you saved.'][i], read: false })),
    ],
    memories: {
      [`${today}:breakfast`]: { favorite: true, note: 'A slow morning, my favorite bowl.' },
      [`${today}:lunch`]: { favorite: false, note: 'Fresh, colorful, and just what I needed.' },
      [`${today}:dinner`]: { favorite: true, note: 'One to make again.' },
      [`${yesterday}:dinner`]: { favorite: true, note: 'Good food, even better company.' },
    },
    photos: [
      { id: 'demo-photo-1', date: today, slot: 'breakfast', src: `${import.meta.env.BASE_URL}images/demo-breakfast.jpg`, note: 'A good kind of morning', createdAt: `${today}T08:30:00.000Z` },
      { id: 'demo-photo-2', date: today, slot: 'lunch', src: `${import.meta.env.BASE_URL}images/demo-lunch.jpg`, note: 'A little color for lunch', createdAt: `${today}T12:30:00.000Z` },
      { id: 'demo-photo-3', date: yesterday, slot: 'dinner', src: `${import.meta.env.BASE_URL}images/demo-dinner.jpg`, note: 'Around the table', createdAt: `${yesterday}T19:00:00.000Z` },
    ],
  };
}