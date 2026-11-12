// ===== A2 · Build: derivatives from encoder data =====
// Your robot measures angle only. Velocity and acceleration, which your self-model needs,
// come from differentiating samples. Here you build the tools and measure what they cost.

// @todo Forward difference: out[i] = (y[i+1] - y[i]) / dt, for i = 0 .. n-2 (length n-1).
function forwardDiff(y, dt) {
  const out = [];
  for (let i = 0; i + 1 < y.length; i++) out.push((y[i + 1] - y[i]) / dt);
  return out;
}

// @todo Central difference at interior points i = 1 .. n-2: (y[i+1] - y[i-1]) / (2 dt). Length n-2.
function centralDiff(y, dt) {
  const out = [];
  for (let i = 1; i + 1 < y.length; i++) out.push((y[i + 1] - y[i - 1]) / (2 * dt));
  return out;
}

// @todo Second difference at interior points: (y[i+1] - 2 y[i] + y[i-1]) / dt^2. Length n-2.
function secondDiff(y, dt) {
  const out = [];
  for (let i = 1; i + 1 < y.length; i++) out.push((y[i + 1] - 2 * y[i] + y[i - 1]) / (dt * dt));
  return out;
}

// @todo For each h in hs, return { h, fwd, cen }: the signed errors (estimate - truth) of the | forward and central difference estimates of f'(t0), where df is the exact derivative.
function diffErrors(f, df, t0, hs) {
  return hs.map((h) => ({
    h,
    fwd: (f(t0 + h) - f(t0)) / h - df(t0),
    cen: (f(t0 + h) - f(t0 - h)) / (2 * h) - df(t0),
  }));
}

// @todo Simulate an encoder: round theta to the nearest multiple of 2*pi / countsPerRev.
function quantize(theta, countsPerRev) {
  const res = (2 * Math.PI) / countsPerRev;
  return Math.round(theta / res) * res;
}

// @todo Causal (trailing) moving average over the last k samples; near the start, average | whatever samples exist. Output has the same length as y.
function movingAverage(y, k) {
  const out = [];
  let sum = 0;
  for (let i = 0; i < y.length; i++) {
    sum += y[i];
    if (i >= k) sum -= y[i - k];
    out.push(sum / Math.min(i + 1, k));
  }
  return out;
}

// ---------- Demo ----------
try {
  // 1) Error vs step size (log-log): the slope is the order of the method.
  const hs = [];
  for (let e = -4; e <= -0.5; e += 0.25) hs.push(10 ** e);
  const errs = diffErrors(Math.sin, Math.cos, 0.5, hs);
  plot(
    [
      { name: "forward diff, log10|error|", x: errs.map((r) => Math.log10(r.h)), y: errs.map((r) => Math.log10(Math.abs(r.fwd))) },
      { name: "central diff, log10|error|", x: errs.map((r) => Math.log10(r.h)), y: errs.map((r) => Math.log10(Math.abs(r.cen))) },
    ],
    { title: "Error vs step size for d/dt sin(t) at t = 0.5 (slope 1 vs slope 2)", xlabel: "log10 h", ylabel: "log10 |error|" },
  );

  // 2) A real encoder: 4096 counts/rev at 500 Hz, arm swinging 0.3 sin(3t).
  const dt = 0.002, t = [], th = [];
  for (let i = 0; i < 1500; i++) { t.push(i * dt); th.push(quantize(0.3 * Math.sin(3 * i * dt), 4096)); }
  const v = centralDiff(th, dt), tv = t.slice(1, -1);
  const vSmooth = movingAverage(v, 25);
  plot(
    [
      { name: "central diff of quantized θ", x: tv, y: v },
      { name: "trailing 25-sample average", x: tv, y: vSmooth },
      { name: "true θ̇ = 0.9 cos 3t", x: tv, y: tv.map((s) => 0.9 * Math.cos(3 * s)) },
    ],
    { title: "Velocity from a 4096-count encoder (notice the lag of the smoothed curve)", xlabel: "t (s)", ylabel: "rad/s" },
  );
  const a = secondDiff(th, dt);
  console.log("acceleration from double-differencing: min", Math.min(...a), "max", Math.max(...a), "(true amplitude 2.7 rad/s²)");
} catch (e) {
  console.log("Demo skipped until your functions work:", e.message);
}
