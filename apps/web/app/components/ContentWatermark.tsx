const TILE_SIZE = 240;

// A diagonally-repeating "ROMAN SERIES™" mark baked into the pattern tile
// itself (via patternTransform) rather than applied as a single rotated
// corner badge, so the mark repeats every ~240px across the whole screen -
// a screenshot cropped to just the question text still contains it.
// Opacity is tuned to read clearly on a deliberate look (so a screenshot of
// paid content is unambiguously stamped as Roman Series property) without
// competing with the actual content text at normal reading distance.
const WATERMARK_SVG = `
  <svg xmlns='http://www.w3.org/2000/svg' width='${TILE_SIZE}' height='${TILE_SIZE}'>
    <defs>
      <pattern id='wm' width='${TILE_SIZE}' height='${TILE_SIZE}' patternUnits='userSpaceOnUse' patternTransform='rotate(-30)'>
        <text x='0' y='${TILE_SIZE / 2}' font-family='Arial, Helvetica, sans-serif' font-size='19' font-weight='700' fill='rgba(13,27,42,0.13)'>ROMAN SERIES&#8482;</text>
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(#wm)'/>
  </svg>
`.trim();

const WATERMARK_DATA_URI = `data:image/svg+xml,${encodeURIComponent(WATERMARK_SVG)}`;

export function ContentWatermark() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] pointer-events-none select-none"
      style={{ backgroundImage: `url("${WATERMARK_DATA_URI}")` }}
    />
  );
}
