import React from 'react';

interface SaltCrystalIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export const SaltCrystalIcon: React.FC<SaltCrystalIconProps> = ({
  size = 16,
  className = '',
  strokeWidth = 2,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
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
    <path d="M12 3l9 9-9 9-9-9z" />
    <path d="M12 8l4 4-4 4-4-4z" />
    <path d="M12 3v5M21 12h-5M12 21v-5M3 12h5" />
  </svg>
);
