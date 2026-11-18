import React from 'react';

interface SaltCrystalIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * Clean mineral / salt crystal icon with faceted geometry.
 */
export const SaltCrystalIcon: React.FC<SaltCrystalIconProps> = ({
  size = 16,
  className = '',
  strokeWidth = 2,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2.5L3.5 8.5v7L12 21.5l8.5-6v-7L12 2.5z" />
    <path d="M12 2.5v19" />
    <path d="M3.5 8.5L12 14.5l8.5-6" />
    <path d="M3.5 15.5L12 9.5l8.5 6" />
  </svg>
);
