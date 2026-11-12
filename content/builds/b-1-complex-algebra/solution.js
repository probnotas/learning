// ===== B1 · Build: complex numbers → the pendulum's frequency response =====
// A complex number is { re, im }. C(a, b) makes one.
const C = (re, im = 0) => ({ re, im });

// @todo (a + bi) + (c + di)
function cadd(z, w) {
  return C(z.re + w.re, z.im + w.im);
}

// @todo (a + bi)(c + di) = (ac - bd) + (ad + bc)i
function cmul(z, w) {
  return C(z.re * w.re - z.im * w.im, z.re * w.im + z.im * w.re);
}

// @todo z / w: multiply top and bottom by the conjugate of w; divide by |w|^2.
function cdiv(z, w) {
  const d = w.re * w.re + w.im * w.im;
  return C((z.re * w.re + z.im * w.im) / d, (z.im * w.re - z.re * w.im) / d);
}

// @todo Magnitude |z|.
function cabs(z) {
  return Math.hypot(z.re, z.im);
}

// @todo Angle of z in (-pi, pi]. Use Math.atan2(im, re).
function carg(z) {
  return Math.atan2(z.im, z.re);
}

// @todo e^{i theta} = cos(theta) + i sin(theta)
function cexpi(theta) {
  return C(Math.cos(theta), Math.sin(theta));
}

// @todo Transfer function of the linearized compliant pendulum from motor angle to arm angle: | H(iw) = k / ((k + m g L) - I w^2 + i c w), with I = m L^2. Return a complex number.
function transferFn(p, w) {
  const I = p.m * p.L * p.L;
  return cdiv(C(p.k), C(p.k + p.m * p.g * p.L - I * w * w, p.c * w));
}

// @todo Steady-state response to theta_m = A sin(w t): amplitude A|H|, phase arg(H) (radians, | negative = lag). Return { amp, phase }.
function steadyState(p, A, w) {
  const H = transferFn(p, w);
  return { amp: A * cabs(H), phase: carg(H) };
}

// ---------- Given: time-domain check (linearized model, semi-implicit Euler) ----------
function simulateAmplitude(p, A, w, { dt = 0.002, settle = 60, measure = 10 } = {}) {
  const I = p.m * p.L * p.L, kap = p.k + p.m * p.g * p.L;
  let th = 0, v = 0, peak = 0;
  const n1 = Math.round(settle / dt), n2 = Math.round((settle + measure) / dt);
  for (let i = 0; i < n2; i++) {
    v += dt * (p.k * A * Math.sin(w * i * dt) - kap * th - p.c * v) / I;
    th += dt * v;
    if (i >= n1) peak = Math.max(peak, Math.abs(th));
  }
  return peak;
}

// ---------- Demo: the resonance curve, before and after the mass bump ----------
try {
  const P = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 }, Pb = { ...P, m: 1.5 }, A = 0.3;
  const ws = [];
  for (let w = 0.1; w <= 10; w += 0.02) ws.push(w);
  plot(
    [
      { name: "m = 1 kg", x: ws, y: ws.map((w) => Math.min(2, steadyState(P, A, w).amp)) },
      { name: "m = 1.5 kg", x: ws, y: ws.map((w) => Math.min(2, steadyState(Pb, A, w).amp)) },
    ],
    { title: "Linear steady-state arm amplitude, A_drive = 0.3 rad (clipped at 2 rad; true peaks ≈ 6.7 and 4.9)", xlabel: "ω_drive (rad/s)", ylabel: "amplitude (rad)" },
  );
  plot(
    [
      { name: "m = 1 kg", x: ws, y: ws.map((w) => (steadyState(P, A, w).phase * 180) / Math.PI) },
      { name: "m = 1.5 kg", x: ws, y: ws.map((w) => (steadyState(Pb, A, w).phase * 180) / Math.PI) },
    ],
    { title: "Phase of arm relative to motor (−90° marks resonance)", xlabel: "ω_drive (rad/s)", ylabel: "phase (deg)" },
  );
  const Pd = { ...P, c: 0.5 }; // more damping so the time-domain check settles quickly
  for (const w of [2, 3, 6]) {
    console.log(`ω = ${w}: complex-number prediction ${steadyState(Pd, A, w).amp.toFixed(4)} rad, simulation ${simulateAmplitude(Pd, A, w).toFixed(4)} rad (c = 0.5)`);
  }
} catch (e) {
  console.log("Demo skipped until your functions work:", e.message);
}
