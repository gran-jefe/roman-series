"use client";

import { useState } from "react";

// Palette — validated with the dataviz skill's six-checks script
// (node scripts/validate_palette.js) rather than eyeballed:
//  - Rating ramp: ordinal, single hue (brand forest), monotone light->dark,
//    light-end contrast >= 2:1, adjacent steps >= 0.06 lightness apart.
//  - Category bars: nominal, single hue (forest base) — comparing magnitude
//    across category identities, not a multi-series comparison.
//  - Mood: diverging, blue/red pair (CVD delta-E 21.6 protan / normal-vision
//    32.3 vs the brand's ember/forest pairing, which FAILs CVD separation at
//    4.4 — red/green is the classic colorblind confusion pair).
const RATING_RAMP = ["#8dbda5", "#63a584", "#3a8d63", "#197446", "#145d38"]; // 1★..5★
const CATEGORY_COLOR = "#1A7A4A";
const MOOD_POSITIVE = "#2a78d6";
const MOOD_NEGATIVE = "#e34948";
const MOOD_NEUTRAL_FILL = "#EAE8E1";
const MOOD_NEUTRAL_BORDER = "#D8D5CC";
const LINE_COLOR = "#0D1B2A";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  questions: "Questions",
  ui: "App Design",
  performance: "Performance",
  features: "Features",
  other: "Bug Report",
};

const MOOD_LABELS: Record<string, string> = {
  love: "😍 Love it",
  like: "😊 Like it",
  okay: "😐 Okay",
  better: "😕 Could be better",
  frustrated: "😤 Frustrated",
};

export interface FeedbackStats {
  total: number;
  average_rating: number;
  rating_counts: Record<string, number>;
  category_counts: Record<string, number>;
  mood_counts: Record<string, number>;
  volume_by_day: { date: string; count: number }[];
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-navy mt-1">{value}</p>
    </div>
  );
}

function HorizontalBarChart({
  title,
  bars,
}: {
  title: string;
  bars: { label: string; value: number; color: string }[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="space-y-2">
        {bars.map((b, i) => {
          const pct = (b.value / max) * 100;
          return (
            <div
              key={b.label}
              className="flex items-center gap-3"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
            >
              <span className="w-28 flex-shrink-0 text-xs text-gray-600 text-right">{b.label}</span>
              <div className="flex-1 relative h-6 bg-gray-50 rounded">
                <div
                  className="h-6 rounded-r transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: b.color,
                    borderRadius: "0 4px 4px 0",
                    filter: hovered === i ? "brightness(1.08)" : undefined,
                  }}
                />
                {hovered === i && (
                  <div
                    className="absolute -top-8 px-2 py-1 bg-navy text-white text-xs rounded shadow-lg whitespace-nowrap z-10"
                    style={{ left: `min(${pct}%, 85%)` }}
                  >
                    {b.value.toLocaleString()}
                  </div>
                )}
              </div>
              <span className="w-10 flex-shrink-0 text-xs font-semibold text-gray-700 tabular-nums">
                {b.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MoodDivergingBar({ moodCounts }: { moodCounts: Record<string, number> }) {
  const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  const [hovered, setHovered] = useState<string | null>(null);

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Mood Breakdown</h3>
        <p className="text-sm text-gray-500">No mood data yet</p>
      </div>
    );
  }

  // Ordered furthest-negative -> furthest-positive so the bar reads as a
  // Likert scale centered on "okay".
  const segments: { key: string; value: number; color: string; border?: string; textDark?: boolean }[] = [
    { key: "frustrated", value: moodCounts.frustrated || 0, color: MOOD_NEGATIVE },
    { key: "better", value: moodCounts.better || 0, color: "#f2a4a3" },
    { key: "okay", value: moodCounts.okay || 0, color: MOOD_NEUTRAL_FILL, border: MOOD_NEUTRAL_BORDER, textDark: true },
    { key: "like", value: moodCounts.like || 0, color: "#8fb8e8" },
    { key: "love", value: moodCounts.love || 0, color: MOOD_POSITIVE },
  ].filter((s) => s.value > 0);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Mood Breakdown</h3>
      <div className="flex h-8 rounded overflow-hidden" style={{ gap: "2px" }}>
        {segments.map((s) => {
          const pct = (s.value / total) * 100;
          return (
            <div
              key={s.key}
              className="relative h-8 flex items-center justify-center transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: s.color,
                border: s.border ? `1px solid ${s.border}` : undefined,
                filter: hovered === s.key ? "brightness(1.08)" : undefined,
                minWidth: pct > 0 ? "2px" : 0,
              }}
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(s.key)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
            >
              {hovered === s.key && (
                <div className="absolute -top-9 px-2 py-1 bg-navy text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                  {MOOD_LABELS[s.key]}: <strong>{s.value}</strong> ({Math.round(pct)}%)
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend — always present for a multi-series (5-segment) chart */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: s.color, border: s.border ? `1px solid ${s.border}` : undefined }}
            />
            {MOOD_LABELS[s.key]} ({s.value})
          </div>
        ))}
      </div>
    </div>
  );
}

function VolumeLineChart({ points }: { points: { date: string; count: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 600;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 24, left: 28 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...points.map((p) => p.count));
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;
  const yFor = (v: number) => padding.top + plotH - (v / max) * plotH;
  const xFor = (i: number) => padding.left + i * stepX;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.count)}`).join(" ");

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const idx = Math.round((x - padding.left) / (stepX || 1));
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  };

  const tickIdxs = points.length > 1 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Response Volume — last 30 days</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "auto" }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label="Daily feedback response volume over the last 30 days"
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
        {/* Y-axis ticks (0 and max) */}
        <text x={4} y={padding.top + 4} fontSize="9" fill="#898781">
          {max}
        </text>
        <text x={4} y={padding.top + plotH} fontSize="9" fill="#898781">
          0
        </text>
        {/* Line */}
        <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* X-axis date ticks */}
        {tickIdxs.map((i) => (
          <text key={i} x={xFor(i)} y={height - 6} fontSize="9" fill="#898781" textAnchor="middle">
            {new Date(points[i].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}
        {/* Crosshair + end marker */}
        {hoverIdx !== null && (
          <>
            <line
              x1={xFor(hoverIdx)}
              y1={padding.top}
              x2={xFor(hoverIdx)}
              y2={padding.top + plotH}
              stroke="#c3c2b7"
              strokeWidth={1}
            />
            <circle
              cx={xFor(hoverIdx)}
              cy={yFor(points[hoverIdx].count)}
              r={4}
              fill={LINE_COLOR}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
      {hoverIdx !== null && (
        <div className="text-xs text-gray-600 mt-1">
          <strong className="text-navy">{points[hoverIdx].count}</strong> response
          {points[hoverIdx].count === 1 ? "" : "s"} on{" "}
          {new Date(points[hoverIdx].date).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
      )}
    </div>
  );
}

export function FeedbackCharts({ stats }: { stats: FeedbackStats }) {
  const [showTable, setShowTable] = useState(false);

  const ratingBars = [5, 4, 3, 2, 1].map((r) => ({
    label: `${r} ★`,
    value: stats.rating_counts[String(r)] || 0,
    color: RATING_RAMP[r - 1],
  }));

  const categoryBars = Object.entries(stats.category_counts)
    .map(([key, value]) => ({ label: CATEGORY_LABELS[key] || key, value, color: CATEGORY_COLOR }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="max-w-7xl mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-navy">Overview</h2>
        <button
          onClick={() => setShowTable((s) => !s)}
          className="text-sm text-forest font-medium hover:underline"
        >
          {showTable ? "Hide table view" : "View as table"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatTile label="Total responses" value={stats.total.toLocaleString()} />
        <StatTile label="Average rating" value={`${stats.average_rating.toFixed(1)} ★`} />
        <StatTile
          label="Last 7 days"
          value={stats.volume_by_day.slice(-7).reduce((a, p) => a + p.count, 0).toLocaleString()}
        />
        <StatTile
          label="Top category"
          value={categoryBars[0]?.value ? categoryBars[0].label : "—"}
        />
      </div>

      {showTable ? (
        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Metric</th>
                <th className="py-2">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ratingBars.map((b) => (
                <tr key={`rating-${b.label}`}>
                  <td className="py-1.5 pr-4 text-gray-600">Rating {b.label}</td>
                  <td className="py-1.5 font-medium text-navy">{b.value}</td>
                </tr>
              ))}
              {categoryBars.map((b) => (
                <tr key={`cat-${b.label}`}>
                  <td className="py-1.5 pr-4 text-gray-600">Category — {b.label}</td>
                  <td className="py-1.5 font-medium text-navy">{b.value}</td>
                </tr>
              ))}
              {Object.entries(stats.mood_counts).map(([key, value]) => (
                <tr key={`mood-${key}`}>
                  <td className="py-1.5 pr-4 text-gray-600">Mood — {MOOD_LABELS[key] || key}</td>
                  <td className="py-1.5 font-medium text-navy">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <HorizontalBarChart title="Rating Distribution" bars={ratingBars} />
          <HorizontalBarChart title="Category Breakdown" bars={categoryBars} />
          <MoodDivergingBar moodCounts={stats.mood_counts} />
          <VolumeLineChart points={stats.volume_by_day} />
        </div>
      )}
    </div>
  );
}
