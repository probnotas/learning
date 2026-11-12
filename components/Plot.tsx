"use client";
import type { PlotData } from "@/lib/runner";

const COLORS = ["#7cc4ff", "#f0a35e", "#7ad3a0", "#d79ef0", "#f08a8a", "#e8d77a"];

function niceRange(lo: number, hi: number): [number, number] {
  if (!isFinite(lo) || !isFinite(hi)) return [0, 1];
  if (lo === hi) return [lo - 1, hi + 1];
  const pad = (hi - lo) * 0.05;
  return [lo - pad, hi + pad];
}

function fmt(v: number) {
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-3 || a >= 1e4)) return v.toExponential(1);
  return String(+v.toPrecision(3));
}

export function Plot({ data }: { data: PlotData }) {
  const W = 640, H = 260, L = 56, R = 12, T = 24, B = 36;
  const xs = data.series.flatMap((s) => s.x).filter(isFinite);
  const ys = data.series.flatMap((s) => s.y).filter(isFinite);
  const [x0, x1] = niceRange(Math.min(...xs), Math.max(...xs));
  const [y0, y1] = niceRange(Math.min(...ys), Math.max(...ys));
  const sx = (x: number) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const sy = (y: number) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const ticks = (a: number, b: number) => [0, 0.25, 0.5, 0.75, 1].map((t) => a + t * (b - a));

  return (
    <figure className="rounded-md border border-ink-800 bg-ink-950 p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={data.opts.title ?? "plot"}>
        {data.opts.title && (
          <text x={L} y={15} className="fill-ink-200" fontSize="12" fontFamily="system-ui">
            {data.opts.title}
          </text>
        )}
        {ticks(y0, y1).map((v, i) => (
          <g key={`y${i}`}>
            <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke="#212836" />
            <text x={L - 6} y={sy(v) + 4} textAnchor="end" fontSize="10" className="fill-ink-400" fontFamily="ui-monospace">
              {fmt(v)}
            </text>
          </g>
        ))}
        {ticks(x0, x1).map((v, i) => (
          <text key={`x${i}`} x={sx(v)} y={H - B + 14} textAnchor="middle" fontSize="10" className="fill-ink-400" fontFamily="ui-monospace">
            {fmt(v)}
          </text>
        ))}
        {y0 < 0 && y1 > 0 && <line x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} stroke="#43506a" />}
        {data.opts.xlabel && (
          <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize="11" className="fill-ink-300" fontFamily="system-ui">
            {data.opts.xlabel}
          </text>
        )}
        {data.opts.ylabel && (
          <text x={12} y={(T + H - B) / 2} textAnchor="middle" fontSize="11" className="fill-ink-300" fontFamily="system-ui" transform={`rotate(-90 12 ${(T + H - B) / 2})`}>
            {data.opts.ylabel}
          </text>
        )}
        {data.series.map((s, i) =>
          s.points ? (
            <g key={i} fill={COLORS[i % COLORS.length]}>
              {s.x.map((x, j) => (isFinite(x) && isFinite(s.y[j]) ? <circle key={j} cx={sx(x)} cy={sy(s.y[j])} r={2.5} /> : null))}
            </g>
          ) : (
            <polyline
              key={i}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={1.6}
              points={s.x
                .map((x, j) => (isFinite(x) && isFinite(s.y[j]) ? `${sx(x).toFixed(1)},${sy(s.y[j]).toFixed(1)}` : ""))
                .filter(Boolean)
                .join(" ")}
            />
          ),
        )}
      </svg>
      {data.series.length > 1 && (
        <figcaption className="flex flex-wrap gap-3 px-2 pb-1 font-sans text-xs text-ink-300">
          {data.series.map((s, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
