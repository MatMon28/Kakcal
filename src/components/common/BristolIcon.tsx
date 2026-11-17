import React from 'react';
import { BristolType } from '../../types';

interface Props {
  type: BristolType;
  size?: number;
  className?: string;
}

// Simple pictograms for the 7 Bristol stool types
export const BristolIcon: React.FC<Props> = ({ type, size = 28, className = '' }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    fill: 'currentColor',
    className,
    'aria-hidden': true as const,
  };

  switch (type) {
    case 1: // separate hard lumps
      return (
        <svg {...common}>
          <circle cx="9" cy="10" r="3.2" />
          <circle cx="21" cy="9" r="3" />
          <circle cx="12" cy="21" r="3.4" />
          <circle cx="23" cy="22" r="2.8" />
        </svg>
      );
    case 2: // sausage, lumpy
      return (
        <svg {...common}>
          <path d="M6 12c0-3 2.4-5 5.4-5h9.2c3 0 5.4 2 5.4 5s-2.4 5-5.4 5H11.4C8.4 17 6 15 6 12Z" />
          <circle cx="11" cy="23" r="2.6" />
          <circle cx="18" cy="24" r="3" />
          <circle cx="25" cy="22" r="2.2" />
        </svg>
      );
    case 3: // sausage with cracks
      return (
        <svg {...common}>
          <path d="M5 16c0-3.4 2.7-6 6-6h10c3.3 0 6 2.6 6 6s-2.7 6-6 6H11c-3.3 0-6-2.6-6-6Z" />
          <path d="M12 10.5v11M20 10.5v11" stroke="#fff" strokeWidth="1.4" fill="none" opacity="0.6" />
        </svg>
      );
    case 4: // smooth soft snake
      return (
        <svg {...common}>
          <path d="M4 20c0-3.3 2.7-6 6-6h12c3.3 0 6 2.7 6 6s-2.7 6-6 6H10c-3.3 0-6-2.7-6-6Z" />
          <path d="M10 14c0-2.2 1.8-4 4-4h4c2.2 0 4 1.8 4 4" fill="currentColor" />
        </svg>
      );
    case 5: // soft blobs
      return (
        <svg {...common}>
          <ellipse cx="11" cy="14" rx="6" ry="5" />
          <ellipse cx="22" cy="18" rx="5.5" ry="4.5" />
          <ellipse cx="14" cy="24" rx="4.5" ry="3.5" />
        </svg>
      );
    case 6: // fluffy / mushy
      return (
        <svg {...common}>
          <path d="M5 22c0-3 2-5.5 5-6.5-.6-3 1.6-5.5 4.6-5.5 2.2 0 4 1.2 4.7 3 1-.5 2-.7 3.2-.7 3.4 0 6 2.6 6 5.7 0 3.1-2.6 5.5-6 5.5H10c-2.8 0-5-1.5-5-1.5Z" />
          <circle cx="27" cy="11" r="2" />
        </svg>
      );
    case 7: // watery
      return (
        <svg {...common}>
          <path d="M16 4c4.5 6.2 8 10.4 8 15a8 8 0 0 1-16 0c0-4.6 3.5-8.8 8-15Z" />
        </svg>
      );
  }
};
