// ===== A1 · Build: solving Ax = b, and running your forward model backwards =====
// Matrices are arrays of rows. Never form an explicit inverse: factor, then substitute.

// @todo Solve L y = b for lower-triangular L, top row first: | y[i] = (b[i] - sum_{j<i} L[i][j] * y[j]) / L[i][i]
function forwardSub(L, b) {
  const n = b.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let j = 0; j < i; j++) s -= L[i][j] * y[j];
    y[i] = s / L[i][i];
  }
  return y;
}

// @todo Solve U x = y for upper-triangular U, bottom row first.
function backSub(U, y) {
  const n = y.length;
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let j = i + 1; j < n; j++) s -= U[i][j] * x[j];
    x[i] = s / U[i][i];
  }
  return x;
}

// @todo LU with partial pivoting: P A = L U. Return { L, U, perm, swaps } where perm[i] is the | original row that ended up in row i, and swaps counts row exchanges. | For each column k: pick the row (k..n-1) with the largest |U[i][k]|, swap it into row k | (swap the already-computed part of L too), then eliminate below the pivot, storing multipliers in L. | Throw an Error if the pivot is exactly 0 (singular).
function luDecompose(A) {
  const n = A.length;
  const U = A.map((r) => r.slice());
  const L = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const perm = [...Array(n).keys()];
  let swaps = 0;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(U[i][k]) > Math.abs(U[p][k])) p = i;
    if (U[p][k] === 0) throw new Error("matrix is singular");
    if (p !== k) {
      [U[k], U[p]] = [U[p], U[k]];
      [perm[k], perm[p]] = [perm[p], perm[k]];
      for (let j = 0; j < k; j++) [L[k][j], L[p][j]] = [L[p][j], L[k][j]];
      swaps++;
    }
    for (let i = k + 1; i < n; i++) {
      const f = U[i][k] / U[k][k];
      L[i][k] = f;
      for (let j = k; j < n; j++) U[i][j] -= f * U[k][j];
    }
  }
  return { L, U, perm, swaps };
}

// @todo Permute b with perm, then forwardSub with L, then backSub with U.
function luSolve(A, b) {
  const { L, U, perm } = luDecompose(A);
  return backSub(U, forwardSub(L, perm.map((i) => b[i])));
}

// @todo det(A) = (-1)^swaps * product of U's diagonal. Return 0 if luDecompose says singular.
function det(A) {
  let f;
  try {
    f = luDecompose(A);
  } catch (e) {
    return 0;
  }
  return (f.swaps % 2 ? -1 : 1) * f.U.reduce((prod, row, i) => prod * row[i], 1);
}

// @todo Run the forward model backwards: find x_prev such that Ad x_prev + Bd u = xNext. | That's Ad x_prev = xNext - Bd u. Use luSolve.
function stepBackward(Ad, Bd, xNext, u) {
  return luSolve(Ad, xNext.map((v, i) => v - Bd[i] * u));
}

// @todo Inverse dynamics: which motor angle thetaM produced the measured acceleration? | I*thetaDDot = k*(thetaM - theta) - m*g*L*sin(theta) - c*thetaDot. Solve for thetaM.
function inverseDynamics(p, theta, thetaDot, thetaDDot) {
  const I = p.m * p.L * p.L;
  return theta + (I * thetaDDot + p.m * p.g * p.L * Math.sin(theta) + p.c * thetaDot) / p.k;
}

// ---------- Given (from lesson 1) ----------
function matVec(M, v) {
  return M.map((row) => row.reduce((s, mij, j) => s + mij * v[j], 0));
}
function eulerMatrices(p, dt) {
  const I = p.m * p.L * p.L;
  return {
    Ad: [[1, dt], [-dt * (p.k + p.m * p.g * p.L) / I, 1 - dt * p.c / I]],
    Bd: [0, dt * p.k / I],
  };
}
// Naive LU without pivoting, for comparison.
function luSolveNoPivot(A, b) {
  const n = A.length, U = A.map((r) => r.slice()), y = b.slice();
  for (let k = 0; k < n; k++)
    for (let i = k + 1; i < n; i++) {
      const f = U[i][k] / U[k][k];
      for (let j = k; j < n; j++) U[i][j] -= f * U[k][j];
      y[i] -= f * y[k];
    }
  return backSub(U, y);
}

// ---------- Demo: record 3 s forward, then rewind from the final state ----------
try {
  const P = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 }, DT = 0.01, N = 300;
  const { Ad, Bd } = eulerMatrices(P, DT);
  const us = [], fwd = [[0.1, 0]];
  for (let i = 0; i < N; i++) {
    us.push(0.3 * Math.sin(3 * i * DT));
    fwd.push(matVec(Ad, fwd[i]).map((v, j) => v + Bd[j] * us[i]));
  }
  const back = new Array(N + 1);
  back[N] = fwd[N];
  for (let i = N - 1; i >= 0; i--) back[i] = stepBackward(Ad, Bd, back[i + 1], us[i]);
  const t = fwd.map((_, i) => i * DT);
  plot(
    [
      { name: "forward rollout θa", x: t, y: fwd.map((x) => x[0]) },
      { name: "rewound with stepBackward (dots)", x: t.filter((_, i) => i % 10 === 0), y: back.filter((_, i) => i % 10 === 0).map((x) => x[0]), points: true },
    ],
    { title: "Inverting the forward model, one step at a time", xlabel: "t (s)", ylabel: "θa (rad)" },
  );
  console.log("recovered initial state:", back[0], "(true: [0.1, 0])");
  console.log("det(Ad) =", det(Ad), "→ each step scales phase-space area by this factor");
  const tiny = [[1e-20, 1], [1, 1]];
  console.log("pivoting test, true answer ≈ [1, 1]:  with pivoting", luSolve(tiny, [1, 2]), "  without", luSolveNoPivot(tiny, [1, 2]));
} catch (e) {
  console.log("Demo skipped until your functions work:", e.message);
}
