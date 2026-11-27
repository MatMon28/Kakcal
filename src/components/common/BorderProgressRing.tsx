import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettings } from '../../context/AppContext';

interface RingGeometry {
  w: number;
  h: number;
  d: string;
  strokeWidth: number;
  fallbackLen: number;
}

/** Builds a clockwise rounded-rectangle SVG path starting at the bottom-left edge (x0, y1 - r). */
function buildPerimeterPath(w: number, h: number, outerRadius: number, borderWidth: number): RingGeometry | null {
  const strokeWidth = h < 88 ? 4 : 5;
  const inset = strokeWidth / 2 + (borderWidth > 0 ? 1 : 0.5);
  const x0 = inset;
  const y0 = inset;
  const x1 = w - inset;
  const y1 = h - inset;
  if (x1 <= x0 || y1 <= y0) return null;

  const innerRadius = Math.max(0, outerRadius - borderWidth);
  const r = Math.max(0, Math.min(innerRadius - inset, (x1 - x0) / 2, (y1 - y0) / 2));

  const d =
    r > 0.25
      ? `M ${x0} ${y1 - r} L ${x0} ${y0 + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y0} L ${x1 - r} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y0 + r} L ${x1} ${y1 - r} A ${r} ${r} 0 0 1 ${x1 - r} ${y1} L ${x0 + r} ${y1} A ${r} ${r} 0 0 1 ${x0} ${y1 - r} Z`
      : `M ${x0} ${y1} L ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1} Z`;

  const straightW = Math.max(0, x1 - x0 - 2 * r);
  const straightH = Math.max(0, y1 - y0 - 2 * r);
  const fallbackLen = 2 * (straightW + straightH) + 2 * Math.PI * r;

  return { w, h, d, strokeWidth, fallbackLen };
}

/**
 * Clockwise perimeter border progress ring overlaid along a Today tile's outer edge.
 * Uses ResizeObserver (rAF-debounced) + computed border-radius so it adapts to every theme,
 * style (Angular, Pop, Glass, Material, Minimal, Mono, etc.), and Ultra-Minimal mode.
 */
export function BorderProgressRing({
  value,
  target,
  className = '',
}: {
  value: number;
  target: number;
  className?: string;
}) {
  const { settings } = useSettings();
  const { themeStyle, ultraMinimal } = settings;
  const svgRef = useRef<SVGSVGElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const [geom, setGeom] = useState<RingGeometry | null>(null);
  const [measuredLen, setMeasuredLen] = useState<number>(0);

  const measure = useCallback(() => {
    const svg = svgRef.current;
    const host = svg?.parentElement;
    if (!svg || !host) return;
    const w = svg.clientWidth;
    const h = svg.clientHeight;
    if (w <= 0 || h <= 0) return;

    const cs = getComputedStyle(host);
    const borderWidth = parseFloat(cs.borderLeftWidth) || 0;
    const outerRadius = parseFloat(cs.borderTopLeftRadius) || 0;
    const next = buildPerimeterPath(w, h, outerRadius, borderWidth);
    if (!next) return;

    setGeom((prev) =>
      prev &&
      prev.w === next.w &&
      prev.h === next.h &&
      prev.d === next.d &&
      prev.strokeWidth === next.strokeWidth
        ? prev
        : next,
    );
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let rafId = 0;
    const scheduleMeasure = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        measure();
      });
    };

    scheduleMeasure();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(scheduleMeasure);
      ro.observe(svg);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        ro.disconnect();
      };
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [measure, themeStyle, ultraMinimal]);

  useEffect(() => {
    const path = fillRef.current;
    if (!path || !geom) return;
    const len = typeof path.getTotalLength === 'function' ? path.getTotalLength() : geom.fallbackLen;
    if (Number.isFinite(len) && len > 0) setMeasuredLen(len);
  }, [geom]);

  const ratio = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  const totalLen = measuredLen > 0 ? measuredLen : geom?.fallbackLen ?? 0;

  return (
    <svg
      ref={svgRef}
      data-border-progress-ring
      aria-hidden="true"
      focusable="false"
      viewBox={geom ? `0 0 ${geom.w} ${geom.h}` : undefined}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {geom && (
        <>
          <path
            d={geom.d}
            fill="none"
            stroke="var(--ring-track, color-mix(in srgb, var(--ring-fill, currentColor) 16%, transparent))"
            strokeWidth={geom.strokeWidth}
            strokeLinejoin="round"
          />
          <path
            ref={fillRef}
            d={geom.d}
            fill="none"
            stroke="var(--ring-fill, currentColor)"
            strokeWidth={geom.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalLen > 0 ? `${totalLen * ratio} ${totalLen}` : undefined}
            className="kc-ring-fill"
            style={{ opacity: ratio === 0 ? 0 : 1 }}
          />
        </>
      )}
    </svg>
  );
}
