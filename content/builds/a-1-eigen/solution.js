// ===== A1 · Build: eigenvalues = natural frequency, damping, and simulator stability =====
// Complex numbers are plain objects { re, im }.

// @todo Eigenvalues of a 2x2 matrix with the "quick trick": m = trace/2, p = det, | lambda = m ± sqrt(m^2 - p). If m^2 - p < 0 the pair is complex: m ± i*sqrt(p - m^2). | Return an array of two { re, im } objects.
function eig2x2(M) {
  const m = (M[0][0] + M[1][1]) / 2;
  const p = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  const disc = m * m - p;
  if (disc >= 0) {
    const s = Math.sqrt(disc);
    return [{ re: m + s, im: 0 }, { re: m - s, im: 0 }];
  }
  const s = Math.sqrt(-disc);
  return [{ re: m, im: s }, { re: m, im: -s }];
}

// @todo Continuous-time A for the linearized compliant pendulum (lesson 1, Problem 4).
function continuousA(p) {
  const I = p.m * p.L * p.L;
  return [[0, 1], [-(p.k + p.m * p.g * p.L) / I, -p.c / I]];
}

// @todo For A = [[0, 1], [-wn^2, -2*zeta*wn]]: wn = sqrt(det A), zeta = -trace(A) / (2*wn). | Return { wn, zeta }.
function naturalFreqDamping(A) {
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const wn = Math.sqrt(det);
  return { wn, zeta: -(A[0][0] + A[1][1]) / (2 * wn) };
}

// @todo One explicit-Euler step as a matrix: I + dt*A.
function explicitEulerM(A, dt) {
  return [[1 + dt * A[0][0], dt * A[0][1]], [dt * A[1][0], 1 + dt * A[1][1]]];
}

// @todo One semi-implicit (symplectic) Euler step for A = [[0, 1], [a21, a22]]: | v' = v + dt*(a21*th + a22*v), then th' = th + dt*v'. Write th' and v' as a matrix times [th, v].
function semiImplicitM(A, dt) {
  const a21 = A[1][0], a22 = A[1][1];
  return [
    [1 + dt * dt * a21, dt * (1 + dt * a22)],
    [dt * a21, 1 + dt * a22],
  ];
}

// @todo Largest |eigenvalue| of a 2x2 matrix. Use eig2x2 and Math.hypot.
function spectralRadius(M) {
  return Math.max(...eig2x2(M).map((l) => Math.hypot(l.re, l.im)));
}

// @todo Largest dt (to ~1e-9 relative) for which spectralRadius(stepMatrix(A, dt)) <= 1 + 1e-9. | Bisection between lo = 0 and a hi that you first grow until it's unstable.
function maxStableDt(A, stepMatrix) {
  const stable = (dt) => spectralRadius(stepMatrix(A, dt)) <= 1 + 1e-9;
  let lo = 0, hi = 1e-3;
  while (stable(hi)) {
    lo = hi;
    hi *= 2;
    if (hi > 1e3) return Infinity;
  }
  while ((hi - lo) / hi > 1e-10) {
    const mid = (lo + hi) / 2;
    if (stable(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ---------- Demo ----------
try {
  const P = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 };
  const A = continuousA(P);
  const nom = naturalFreqDamping(A), bump = naturalFreqDamping(continuousA({ ...P, m: 1.5 }));
  console.log(`nominal: wn = ${nom.wn.toFixed(4)} rad/s, zeta = ${nom.zeta.toFixed(5)}`);
  console.log(`mass x1.5: wn = ${bump.wn.toFixed(4)} rad/s, zeta = ${bump.zeta.toFixed(5)}`);
  console.log(`(ignoring gravity you'd say sqrt(k/mL^2) = ${Math.sqrt(10).toFixed(4)} → ${Math.sqrt(10 / 1.5).toFixed(4)})`);

  // Root locus: where do the eigenvalues go as the mass changes?
  const ms = [], re = [], im = [];
  for (let m = 0.2; m <= 5; m += 0.05) {
    for (const l of eig2x2(continuousA({ ...P, m }))) { re.push(l.re); im.push(l.im); }
  }
  plot([{ name: "eigenvalues for m = 0.2 … 5 kg", x: re, y: im, points: true }], {
    title: "Root locus vs mass (heavier → closer to the origin = slower, less damped)",
    xlabel: "Re λ (1/s)",
    ylabel: "Im λ (rad/s)",
  });

  // Integrator stability vs time step
  const dts = [], rhoE = [], rhoS = [];
  for (let dt = 0.001; dt <= 0.5; dt *= 1.08) {
    dts.push(dt);
    rhoE.push(spectralRadius(explicitEulerM(A, dt)));
    rhoS.push(spectralRadius(semiImplicitM(A, dt)));
  }
  plot(
    [
      { name: "explicit Euler", x: dts, y: rhoE },
      { name: "semi-implicit Euler", x: dts, y: rhoS },
      { name: "stability limit (1)", x: [dts[0], dts[dts.length - 1]], y: [1, 1] },
    ],
    { title: "Spectral radius of one step (> 1 means the simulation blows up)", xlabel: "dt (s)", ylabel: "max |μ|" },
  );
  console.log("explicit Euler, dt = 0.01: |μ| =", spectralRadius(explicitEulerM(A, 0.01)), "→ amplitude ×", spectralRadius(explicitEulerM(A, 0.01)) ** 300, "after 3 s");
  const stiff = continuousA({ m: 0.1, L: 0.2, k: 50, c: 0, g: 9.81 });
  console.log("stiffest playground setting (m=0.1, L=0.2, k=50): max stable dt (semi-implicit) =", maxStableDt(stiff, semiImplicitM), "s");
} catch (e) {
  console.log("Demo skipped until your functions work:", e.message);
}
