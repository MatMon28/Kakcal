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
};

export const TrackerIcon: React.FC<{ icon?: string; size?: number; className?: string }> = ({
  icon,
  size = 18,
  className,
}) => {
  const Cmp = MAP[icon || 'sparkles'] || Sparkles;
  return <Cmp size={size} className={className} />;
};
