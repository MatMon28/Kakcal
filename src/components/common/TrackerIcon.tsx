import React from 'react';
import {
  Sparkles,
  Pill,
  Droplets,
  Heart,
  Moon,
  Sun,
  Brain,
  Zap,
  Bed,
  Flame,
  Leaf,
  Activity,
  Apple, Coffee, Soup, Utensils, Cookie, Salad, Flower2, Bike, Dumbbell, GlassWater, BookOpen, Smile,
} from 'lucide-react';

export const TRACKER_ICONS = [
  'sparkles',
  'pill',
  'droplets',
  'heart',
  'moon',
  'sun',
  'brain',
  'zap',
  'bed',
  'flame',
  'leaf',
  'activity',
  'apple', 'coffee', 'soup', 'utensils', 'cookie', 'salad', 'flower', 'bike', 'dumbbell', 'water', 'book', 'smile',
] as const;

export type TrackerIconKey = (typeof TRACKER_ICONS)[number];

const MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  sparkles: Sparkles,
  pill: Pill,
  droplets: Droplets,
  heart: Heart,
  moon: Moon,
  sun: Sun,
  brain: Brain,
  zap: Zap,
  bed: Bed,
  flame: Flame,
  leaf: Leaf,
  activity: Activity,
  apple: Apple, coffee: Coffee, soup: Soup, utensils: Utensils, cookie: Cookie, salad: Salad,
  flower: Flower2, bike: Bike, dumbbell: Dumbbell, water: GlassWater, book: BookOpen, smile: Smile,
};

export const TrackerIcon: React.FC<{ icon?: string; size?: number; className?: string }> = ({
  icon,
  size = 18,
  className,
}) => {
  if (icon && /^data:image\/(png|jpeg|webp);base64,/.test(icon) && icon.length < 100000) {
    return <img src={icon} alt="" aria-hidden="true" width={size} height={size} className={className} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
  }
  const Cmp = MAP[icon || 'sparkles'] || Sparkles;
  return <Cmp size={size} className={className} />;
};
