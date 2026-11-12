// ===== B1 · Build: resonance, transients, and where AUC = 0.11 comes from =====
// The full nonlinear compliant pendulum, driven by θm = A sin(ω t), with an optional
// mass bump at t = bumpAt. Then a mass-bump "detector" and its AUC.

// @todo Half the peak-to-peak swing of th over samples whose time lies in [t0, t1).
function steadyAmplitude(t, th, t0, t1) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < t.length; i++) {
    if (t[i] >= t0 && t[i] < t1) {
      lo = Math.min(lo, th[i]);
      hi = Math.max(hi, th[i]);
    }
  }
  return (hi - lo) / 2;
}

// @todo Resonance curve by simulation: for each ω in ws, simulate for `settle + 6` seconds | (no bump) and return steadyAmplitude over the last 6 s. Return an array of amplitudes.
function sweep(p, A, ws, settle) {
  return ws.map((w) => {
    const r = simulate(p, { A, w, T: settle + 6 });
    return steadyAmplitude(r.t, r.th, settle, settle + 6);
  });
}

// @todo The naive detector: amplitude in [tBump + 2, tBump + 4) minus amplitude in [tBump - 2, tBump). | (Your original "steady-state amplitude over the last 2 seconds", compared before vs after.) | Simulate with bumpAt = bump ? tBump : Infinity, T = tBump + 4, and the given noise seed.
function bumpScore(p, A, w, { tBump, bump, seed }) {
  const r = simulate(p, { A, w, T: tBump + 4, bumpAt: bump ? tBump : Infinity, noise: 0.002, seed });
  return steadyAmplitude(r.t, r.th, tBump + 2, tBump + 4) - steadyAmplitude(r.t, r.th, tBump - 2, tBump);
}

// @todo AUC = probability a random positive scores higher than a random negative (ties count 1/2). | Compare every pair: O(n·m) is fine here.
function auc(pos, neg) {
  let s = 0;
  for (const a of pos) for (const b of neg) s += a > b ? 1 : a === b ? 0.5 : 0;
  return s / (pos.length * neg.length);
}

// @todo Use linear theory (the given steadyAmpLinear) to predict whether a mass ×factor bump | INCREASES the steady-state amplitude at drive frequency w. Return true/false.
function predictIncrease(p, w, factor = 1.5) {
  return steadyAmpLinear({ ...p, m: p.m * factor }, 1, w) > steadyAmpLinear(p, 1, w);
}

// ---------- Given ----------
// Nonlinear compliant pendulum, semi-implicit Euler, encoder noise from a seeded generator.
function simulate(p0, { A, w, T, dt = 0.002, bumpAt = Infinity, factor = 1.5, noise = 0, seed = 1 }) {
  let s = seed >>> 0 || 1;
  const rand = () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296) - 0.5;
  const p = { ...p0 }, n = Math.round(T / dt), t = new Array(n), th = new Array(n);
  let x = 0, v = 0;
  for (let i = 0; i < n; i++) {
    const ti = i * dt;
    if (ti >= bumpAt && p.m === p0.m) p.m = p0.m * factor;
    const I = p.m * p.L * p.L;
    v += dt * (p.k * (A * Math.sin(w * ti) - x) - p.m * p.g * p.L * Math.sin(x) - p.c * v) / I;
    x += dt * v;
    t[i] = ti;
    th[i] = x + noise * 2 * Math.sqrt(3) * rand(); // uniform noise with std = noise
  }
  return { t, th };
}
// Linear steady-state amplitude A·|H(iω)| from the last lesson.
function steadyAmpLinear(p, A, w) {
  const I = p.m * p.L * p.L, re = p.k + p.m * p.g * p.L - I * w * w, im = p.c * w;
  return (A * p.k) / Math.hypot(re, im);
}

// ---------- Demo ----------
try {
  const P = { m: 1, L: 1, k: 10, c: 0.3, g: 9.81 }; // c = 0.3 so runs settle in ~30 s
  const A = 0.3;

  // 1) Resonance curve: simulation dots vs linear theory, before and after the bump.
  const wsDots = [], wsLine = [];
  for (let w = 1; w <= 8.01; w += 0.5) wsDots.push(w);
  for (let w = 1; w <= 8; w += 0.02) wsLine.push(w);
  const Pb = { ...P, m: 1.5 };
  plot(
    [
      { name: "theory, m = 1", x: wsLine, y: wsLine.map((w) => steadyAmpLinear(P, A, w)) },
      { name: "theory, m = 1.5", x: wsLine, y: wsLine.map((w) => steadyAmpLinear(Pb, A, w)) },
      { name: "simulated, m = 1", x: wsDots, y: sweep(P, A, wsDots, 30), points: true },
      { name: "simulated, m = 1.5", x: wsDots, y: sweep(Pb, A, wsDots, 30), points: true },
    ],
    { title: "Resonance curve (c = 0.3): nonlinear simulation vs linear theory", xlabel: "ω_drive (rad/s)", ylabel: "arm amplitude (rad)" },
  );

  // 2) What the arm actually does around the bump.
  for (const w of [3, 4.2]) {
    const r = simulate(P, { A, w, T: 80, bumpAt: 30 });
    const i0 = Math.round(24 / 0.002);
    plot([{ name: `ω = ${w}`, x: r.t.slice(i0), y: r.th.slice(i0) }], {
      title: `ω = ${w} rad/s, mass ×1.5 at t = 30 s. Steady state should ${predictIncrease(P, w) ? "GROW" : "SHRINK"}. Look at t = 32–34 s vs t > 60 s`,
      xlabel: "t (s)",
      ylabel: "θa (rad)",
    });
  }

  // 3) The detector: 30 drive frequencies, bump vs no bump.
  const ws = [], pos = [], neg = [];
  for (let i = 0; i < 30; i++) ws.push(1 + (7 * i) / 29);
  ws.forEach((w, i) => {
    pos.push(bumpScore(P, A, w, { tBump: 30, bump: true, seed: 100 + i }));
    neg.push(bumpScore(P, A, w, { tBump: 30, bump: false, seed: 900 + i }));
  });
  plot(
    [
      { name: "score with bump", x: ws, y: pos, points: true },
      { name: "score without bump", x: ws, y: neg, points: true },
    ],
    { title: "Naive score: amp(after) − amp(before)", xlabel: "ω_drive (rad/s)", ylabel: "Δ amplitude (rad)" },
  );
  console.log("AUC of naive score (assumes the bump INCREASES amplitude):", auc(pos, neg).toFixed(3));
  console.log("AUC of |score| (direction-agnostic):", auc(pos.map(Math.abs), neg.map(Math.abs)).toFixed(3));
  console.log("fraction of drive frequencies where theory says amplitude grows:", ws.filter((w) => predictIncrease(P, w)).length / ws.length);
} catch (e) {
  console.log("Demo skipped until your functions work:", e.message);
}
