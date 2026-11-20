import { BODY_ICON_ART, type BodyIconArt, type BodyIconId } from './bodyIconPaths';

/**
 * Icon of a body measure (waist, neck, hips, chest, forearms, biceps, thighs, calves) or the
 * `custom` tape measure. Same language as the other app icons: 24 px grid, round strokes,
 * `currentColor`. The silhouette (the body part with its joint / hand / foot) is soft, the measuring
 * band is bold.
 */
export function BodyPartIcon({ id, size = 20, className }: { id: string; size?: number; className?: string }) {
  const art: BodyIconArt = BODY_ICON_ART[(id in BODY_ICON_ART ? id : 'custom') as BodyIconId];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {art.extra?.map((d) => <path key={d} d={d} strokeWidth={1.6} fill="currentColor" fillOpacity={0.14} strokeOpacity={0.75} />)}
      <g transform={art.transform}>
        <path d={art.shape} strokeWidth={art.transform ? 2 : 1.6} fill="currentColor" fillOpacity={0.14} strokeOpacity={0.75} />
        {art.detail?.map((d) => <path key={d} d={d} strokeWidth={art.transform ? 2 : 1.5} opacity={0.6} />)}
      </g>
      <path d={art.band} strokeWidth={2.4} />
    </svg>
  );
}
