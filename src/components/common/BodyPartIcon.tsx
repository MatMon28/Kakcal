import { BODY_ICON_ART, type BodyIconId } from './bodyIconPaths';

/**
 * Icon of a body measure (waist, neck, hips, chest, forearms, biceps, thighs, calves) or the
 * `custom` tape measure. Same language as the other app icons: 24 px grid, round strokes,
 * `currentColor`. The silhouette is soft, the measuring band is bold.
 */
export function BodyPartIcon({ id, size = 20, className }: { id: string; size?: number; className?: string }) {
  const art = BODY_ICON_ART[(id in BODY_ICON_ART ? id : 'custom') as BodyIconId] as {
    shape: string; detail?: string[]; band: string;
  };
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
      <path d={art.shape} strokeWidth={1.6} fill="currentColor" fillOpacity={0.14} strokeOpacity={0.75} />
      {art.detail?.map((d) => <path key={d} d={d} strokeWidth={1.5} opacity={0.6} />)}
      <path d={art.band} strokeWidth={2.4} />
    </svg>
  );
}
