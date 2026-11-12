// ===== A1 · Build: least squares = fitting your self-model to data =====
// Model (linear in the parameters, nonlinear in the state):
//   thetaDDot = p1*(thetaM - theta) - p2*sin(theta) - p3*thetaDot
//   p1 = k/I, p2 = g/L, p3 = c/I, I = m L^2

// @todo Return the transpose of an (m x n) matrix as (n x m).
function transpose(A) {
  return A[0].map((_, j) => A.map((row) => row[j]));
}

// @todo Least squares via the normal equations: solve (A^T A) x = A^T y. | Use transpose, the given matVec / matMul, and the given solve().
function lstsq(A, y) {
  const At = transpose(A);
  return solve(matMul(At, A), matVec(At, y));
}

// @todo One regression row for sample i: [thetaM - theta, -sin(theta), -thetaDot].
function regressorRow(theta, thetaDot, thetaM) {
  return [thetaM - theta, -Math.sin(theta), -thetaDot];
}

// @todo Fit [p1, p2, p3] using samples i0 <= i < i1 of data = { th, w, acc, u }. | Build A from regressorRow, y from data.acc, call lstsq.
function fitParams(data, i0, i1) {
  const A = [], y = [];
  for (let i = i0; i < i1; i++) {
    A.push(regressorRow(data.th[i], data.w[i], data.u[i]));
    y.push(data.acc[i]);
  }
  return lstsq(A, y);
}

// @todo Root-mean-square of (measured acc - predicted acc) over i0 <= i < i1, using params.
function residualRMS(data, params, i0, i1) {
  let s = 0;
  for (let i = i0; i < i1; i++) {
    const row = regressorRow(data.th[i], data.w[i], data.u[i]);
    const pred = row[0] * params[0] + row[1] * params[1] + row[2] * params[2];
    s += (data.acc[i] - pred) ** 2;
  }
  return Math.sqrt(s / (i1 - i0));
}

// @todo Re-fit on a sliding window of `window` samples, moving `stride` samples at a time. | Return { t: [window end times], p: [[p1,p2,p3], ...] }. Use data.t for times.
function slidingFit(data, window, stride) {
  const t = [], p = [];
  for (let end = window; end <= data.th.length; end += stride) {
    p.push(fitParams(data, end - window, end));
    t.push(data.t[end - 1]);
  }
  return { t, p };
}

// ---------- Given ----------
function matVec(M, v) { return M.map((r) => r.reduce((s, a, j) => s + a * v[j], 0)); }
function matMul(A, B) { return A.map((r) => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0))); }
// Gaussian elimination with partial pivoting (what you built in the last lesson).
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    [M[k], M[p]] = [M[p], M[k]];
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / M[k][k];
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}
// Simulate the nonlinear compliant pendulum (semi-implicit Euler) and log only what an
// encoder would give you: theta at each tick. Velocity and acceleration are then
// recovered by finite differences, which is exact for this integrator.
function simulate(p0, { T = 20, dt = 0.002, drive, bumpAt = Infinity, bumpFactor = 1.5 } = {}) {
  const p = { ...p0 };
  const n = Math.round(T / dt);
  const t = [], thRaw = [], u = [];
  let th = 0, w = 0;
  for (let i = 0; i < n; i++) {
    const ti = i * dt;
    if (ti >= bumpAt && p.m === p0.m) p.m = p0.m * bumpFactor;
    const ui = drive(ti), I = p.m * p.L * p.L;
    t.push(ti); thRaw.push(th); u.push(ui);
    w += dt * (p.k * (ui - th) - p.m * p.g * p.L * Math.sin(th) - p.c * w) / I;
    th += dt * w;
  }
  // backward difference for velocity, central second difference for acceleration
  const out = { t: [], th: [], w: [], acc: [], u: [] };
  for (let i = 1; i < n - 1; i++) {
    out.t.push(t[i]); out.th.push(thRaw[i]); out.u.push(u[i]);
    out.w.push((thRaw[i] - thRaw[i - 1]) / dt);
    out.acc.push((thRaw[i + 1] - 2 * thRaw[i] + thRaw[i - 1]) / (dt * dt));
  }
  return out;
}
const multisine = (t) => 0.3 * Math.sin(3 * t) + 0.2 * Math.sin(7.3 * t) + 0.1 * Math.sin(1.1 * t);

// ---------- Demo: watch the self-model's parameters move when the mass is bumped ----------
try {
  const P = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 };
  const data = simulate(P, { T: 20, drive: multisine, bumpAt: 10 });
  const before = fitParams(data, 0, 4500), after = fitParams(data, 5500, data.th.length);
  console.log("fit before bump [k/I, g/L, c/I]:", before, " (true [10, 9.81, 0.1])");
  console.log("fit after bump  [k/I, g/L, c/I]:", after, " (true [6.667, 9.81, 0.0667])");
  const sf = slidingFit(data, 1000, 250); // 2 s windows
  plot(
    [
      { name: "k/I estimate", x: sf.t, y: sf.p.map((q) => q[0]) },
      { name: "g/L estimate", x: sf.t, y: sf.p.map((q) => q[1]) },
    ],
    { title: "Sliding-window self-model (2 s windows). Mass ×1.5 at t = 10 s", xlabel: "window end time (s)", ylabel: "rad/s²" },
  );
  const rms = [];
  for (let end = 1000; end <= data.th.length; end += 250) rms.push(residualRMS(data, before, end - 1000, end));
  plot([{ name: "residual RMS", x: sf.t, y: rms }], {
    title: "Prediction residual of the FROZEN pre-bump model",
    xlabel: "window end time (s)",
    ylabel: "rad/s²",
  });
  // Identifiability: motor held at 0, small free swing → spring and gravity columns blur together.
  const A = [];
  for (let i = 0; i < 5000; i++) {
    const th = 0.05 * Math.cos(4.45 * i * 0.002), w = -0.05 * 4.45 * Math.sin(4.45 * i * 0.002);
    A.push(regressorRow(th, w, 0));
  }
  const AtA = matMul(transpose(A), A);
  console.log("undriven, small swing: cosine between spring and gravity columns =",
    AtA[0][1] / Math.sqrt(AtA[0][0] * AtA[1][1]), "(1 = perfectly parallel → k/I and g/L not separately identifiable)");
} catch (e) {
  console.log("Demo skipped until your functions work:", e.message);
}
