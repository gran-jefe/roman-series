"use client";

import { useState } from "react";

// Palette — validated with the dataviz skill's six-checks script
// (node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#eda100,#e87ba4,#008300"
// --mode light), fixed hue order (slots 1-6 of the documented 8-hue default),
// same order as TYPE_META below so identity never gets re-shuffled by a filter.
// Light mode: aqua/yellow/magenta sit below 3:1 contrast — relief channel is the
// legend text (never colored) plus the "View as table" toggle.
const SERIES_ORDER = ["session", "feedback", "flag", "signup", "subscription", "analytics"] as const;
type SeriesType = (typeof SERIES_ORDER)[number];

const SERIES_META: Record<SeriesType, { label: string; color: string }> = {
  session: { label: "Practice", color: "#2a78d6" },
  feedback: { label: "Feedback", color: "#eb6834" },
  flag: { label: "Flag", color: "#1baf7a" },
  signup: { label: "Signup", color: "#eda100" },
  subscription: { label: "Payment", color: "#e87ba4" },
  analytics: { label: "Analytics", color: "#008300" },
};

export interface TimeseriesData {
  days: string[];
  series: { type: string; counts: number[] }[];
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

// Rounded top corners only, square baseline — SVG <rect> has no per-corner
// radius, so the topmost stacked segment gets a hand-built path instead.
function roundedTopRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h);
  if (radius <= 0) return `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
  return [
    `M ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `L ${x + w - radius} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + radius}`,
    `L ${x + w} ${y + h}`,
    `L ${x} ${y + h}`,
    `Z`,
  ].join(" ");
}

export function ActivityChart({ data, loading }: { data: TimeseriesData | null; loading: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  if (loading && !data) {
    return (
      <div className="bg-white border rounded-lg shadow-sm p-8 text-center text-gray-500 mb-6">
        Loading chart...
      </div>
    );
  }

  if (!data || data.days.length === 0) {
    return null;
  }

  const activeTypes = SERIES_ORDER.filter((t) => data.series.some((s) => s.type === t));
  const countsByType = new Map(data.series.map((s) => [s.type, s.counts]));

  const totals = data.days.map((_, i) =>
    activeTypes.reduce((sum, t) => sum + (countsByType.get(t)?.[i] || 0), 0)
  );
  const maxTotal = niceMax(Math.max(1, ...totals));

  const width = 760;
  const height = 240;
  const padding = { top: 12, right: 12, bottom: 28, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const dayCount = data.days.length;
  const slotW = plotW / dayCount;
  const barW = Math.max(1, Math.min(24, slotW - 2));
  const yFor = (v: number) => padding.top + plotH - (v / maxTotal) * plotH;

  const tickIdxs =
    dayCount > 1 ? Array.from(new Set([0, Math.floor((dayCount - 1) / 2), dayCount - 1])) : [0];

  const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

  return (
    <div className="bg-white border rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Activity Volume — last {dayCount} days
        </h3>
        <button
          onClick={() => setShowTable((s) => !s)}
          className="text-xs text-forest font-medium hover:underline"
        >
          {showTable ? "Hide table view" : "View as table"}
        </button>
      </div>

      {!showTable && (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            style={{ height: "auto" }}
            onMouseLeave={() => setHoveredIdx(null)}
            role="img"
            aria-label={`Daily activity volume by type over the last ${dayCount} days`}
          >
            {/* Baseline */}
            <line
              x1={padding.left}
              y1={padding.top + plotH}
              x2={width - padding.right}
              y2={padding.top + plotH}
              stroke="#c3c2b7"
              strokeWidth={1}
            />
            {/* Y-axis ticks */}
            <text x={2} y={padding.top + 4} fontSize="9" fill="#898781">
              {maxTotal.toLocaleString()}
            </text>
            <text x={2} y={padding.top + plotH} fontSize="9" fill="#898781">
              0
            </text>

            {/* Stacked bars */}
            {data.days.map((day, i) => {
              const x = padding.left + i * slotW + (slotW - barW) / 2;
              let cursorY = padding.top + plotH;
              const segments = activeTypes
                .map((type) => ({ type, value: countsByType.get(type)?.[i] || 0 }))
                .filter((s) => s.value > 0);

              return (
                <g
                  key={day}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onFocus={() => setHoveredIdx(i)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${formatDate(day, { month: "short", day: "numeric" })}: ${totals[i]} event${totals[i] === 1 ? "" : "s"}`}
                >
                  {/* Wider invisible hit target than the thin bar itself */}
                  <rect
                    x={padding.left + i * slotW}
                    y={padding.top}
                    width={slotW}
                    height={plotH}
                    fill="transparent"
                  />
                  {segments.map((seg, segIdx) => {
                    const segH = (seg.value / maxTotal) * plotH;
                    const segY = cursorY - segH;
                    const isTop = segIdx === segments.length - 1;
                    cursorY = segY - 2; // 2px surface gap between stacked segments
                    return isTop ? (
                      <path
                        key={seg.type}
                        d={roundedTopRectPath(x, segY, barW, segH, 3)}
                        fill={SERIES_META[seg.type as SeriesType].color}
                        opacity={hoveredIdx === null || hoveredIdx === i ? 1 : 0.5}
                      />
                    ) : (
                      <rect
                        key={seg.type}
                        x={x}
                        y={segY}
                        width={barW}
                        height={segH}
                        fill={SERIES_META[seg.type as SeriesType].color}
                        opacity={hoveredIdx === null || hoveredIdx === i ? 1 : 0.5}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* Crosshair on hover */}
            {hoveredIdx !== null && (
              <line
                x1={padding.left + hoveredIdx * slotW + slotW / 2}
                y1={padding.top}
                x2={padding.left + hoveredIdx * slotW + slotW / 2}
                y2={padding.top + plotH}
                stroke="#c3c2b7"
                strokeWidth={1}
                strokeDasharray="2,2"
                pointerEvents="none"
              />
            )}

            {/* X-axis date ticks */}
            {tickIdxs.map((i) => (
              <text
                key={i}
                x={padding.left + i * slotW + slotW / 2}
                y={height - 8}
                fontSize="9"
                fill="#898781"
                textAnchor="middle"
              >
                {formatDate(data.days[i], { month: "short", day: "numeric" })}
              </text>
            ))}
          </svg>

          {/* Tooltip */}
          {hoveredIdx !== null && (
            <div className="mt-2 p-3 bg-navy text-white rounded-lg text-xs max-w-xs">
              <p className="font-semibold mb-1.5">
                {formatDate(data.days[hoveredIdx], { weekday: "short", month: "short", day: "numeric" })}{" "}
                · <strong>{totals[hoveredIdx]}</strong> total
              </p>
              <div className="space-y-0.5">
                {activeTypes.map((type) => {
                  const value = countsByType.get(type)?.[hoveredIdx] || 0;
                  if (value === 0) return null;
                  return (
                    <div key={type} className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-0.5 flex-shrink-0"
                        style={{ backgroundColor: SERIES_META[type].color }}
                      />
                      <span className="text-white/70">{SERIES_META[type].label}</span>
                      <span className="ml-auto font-semibold tabular-nums">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend — always present for 2+ series */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-gray-100">
            {activeTypes.map((type) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: SERIES_META[type].color }}
                />
                {SERIES_META[type].label}
              </div>
            ))}
          </div>
        </>
      )}

      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Date</th>
                {activeTypes.map((type) => (
                  <th key={type} className="py-2 pr-4">
                    {SERIES_META[type].label}
                  </th>
                ))}
                <th className="py-2 pr-4">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.days.map((day, i) => (
                <tr key={day}>
                  <td className="py-1.5 pr-4 text-gray-600">
                    {formatDate(day, { month: "short", day: "numeric" })}
                  </td>
                  {activeTypes.map((type) => (
                    <td key={type} className="py-1.5 pr-4 text-navy tabular-nums">
                      {countsByType.get(type)?.[i] || 0}
                    </td>
                  ))}
                  <td className="py-1.5 pr-4 font-semibold text-navy tabular-nums">{totals[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
