import React from 'react';

interface Props extends React.SVGProps<SVGSVGElement> {
  size?: number;
  strokeWidth?: number;
  face?: boolean;
}

export function PoopIcon({ size = 24, strokeWidth = 3.2, face = false, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Outer silhouette */}
      <path
        d="M32 5
           C37 9 39 12.5 36.5 15.5
           C41 16 44 18.5 44 22.5
           C44 25 43 27 42 28
           C46.5 28.5 50 31.5 50 35
           C50 37.5 49 39.5 48 41
           C52.5 41.5 56 44.5 56 48
           C56 52.5 52.5 56 48 56
           H16
           C11.5 56 8 52.5 8 48
           C8 44.5 11.5 41.5 16 41
           C15 39.5 14 37.5 14 35
           C14 31.5 17.5 28.5 22 28
           C21 27 20 25 20 22.5
           C20 18.5 23 16 27.5 15.5
           C25 12.5 27 9 32 5Z"
      />

      {/* Seams between tiers */}
      <path d="M27.5 15.5 Q32 18 36.5 15.5" />
      <path d="M22 28 Q32 31.5 42 28" />
      <path d="M16 41 Q32 45.5 48 41" />

      {face && (
        <>
          <circle cx="27" cy="34.5" r="1.2" fill="currentColor" />
          <circle cx="37" cy="34.5" r="1.2" fill="currentColor" />
          <path d="M29.5 38 Q32 40 34.5 38" />
        </>
      )}
    </svg>
  );
}
