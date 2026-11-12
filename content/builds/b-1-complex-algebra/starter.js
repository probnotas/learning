// ===== B1 · Build: complex numbers → the pendulum's frequency response =====
// A complex number is { re, im }. C(a, b) makes one.
const C = (re, im = 0) => ({ re, im });

function cadd(z, w) {
  // (a + bi) + (c + di)
  throw new Error("TODO: implement cadd");
}

function cmul(z, w) {
  // (a + bi)(c + di) = (ac - bd) + (ad + bc)i
  throw new Error("TODO: implement cmul");
}

function cdiv(z, w) {
  // z / w: multiply top and bottom by the conjugate of w; divide by |w|^2.
  throw new Error("TODO: implement cdiv");
}

function cabs(z) {
  // Magnitude |z|.
  throw new Error("TODO: implement cabs");
}

function carg(z) {
  // Angle of z in (-pi, pi]. Use Math.atan2(im, re).
  throw new Error("TODO: implement carg");
}

function cexpi(theta) {
  // e^{i theta} = cos(theta) + i sin(theta)
  throw new Error("TODO: implement cexpi");
}

function transferFn(p, w) {
  // Transfer function of the linearized compliant pendulum from motor angle to arm angle:
  // H(iw) = k / ((k + m g L) - I w^2 + i c w), with I = m L^2. Return a complex number.
  throw new Error("TODO: implement transferFn");
}

function steadyState(p, A, w) {
  // Steady-state response to theta_m = A sin(w t): amplitude A|H|, phase arg(H) (radians,
  // negative = lag). Return { amp, phase }.
  throw new Error("TODO: implement steadyState");
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
