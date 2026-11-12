// ===== A1 · Build: from matrix-vector multiply to a pendulum forward model =====
// Conventions: a vector is an array [a, b, ...]; a matrix is an array of rows [[...], [...]].
// State x = [thetaA, thetaDotA] (rad, rad/s). Input u = thetaM (rad).

// 1) Matrix times vector. Throw an Error if the shapes don't match.
// @todo Row picture: output[i] = dot(row i of M, v). Check M[0].length === v.length and throw if not.
function matVec(M, v) {
  if (M[0].length !== v.length) {
    throw new Error(`shape mismatch: ${M.length}x${M[0].length} matrix times length-${v.length} vector`);
  }
  return M.map((row) => row.reduce((sum, mij, j) => sum + mij * v[j], 0));
}

// 2) Matrix times matrix: (m x n)(n x p) -> (m x p).
// @todo Entry (i, j) = dot(row i of A, column j of B). Check A[0].length === B.length.
function matMul(A, B) {
  if (A[0].length !== B.length) {
    throw new Error(`shape mismatch: ${A.length}x${A[0].length} times ${B.length}x${B[0].length}`);
  }
  return A.map((row) => B[0].map((_, j) => row.reduce((sum, aik, k) => sum + aik * B[k][j], 0)));
}

// 3) One dense layer without activation: W x + b.
// @todo Reuse matVec, then add b elementwise.
function linear(W, b, x) {
  return matVec(W, x).map((yi, i) => yi + b[i]);
}

// 4) MLP forward pass. layers = [{ W, b }, ...]. tanh after every layer except the last.
// @todo h = linear(W, b, h) for each layer; Math.tanh elementwise after every layer except the last.
function mlpForward(layers, x) {
  let h = x;
  layers.forEach((layer, i) => {
    h = linear(layer.W, layer.b, h);
    if (i < layers.length - 1) h = h.map(Math.tanh);
  });
  return h;
}

// 5) Linearized compliant pendulum, discretized with explicit Euler:
//    A = [[0, 1], [-(k + m g L)/I, -c/I]],  B = [0, k/I],  I = m L^2
//    Ad = I2 + dt*A,  Bd = dt*B
// @todo Build A and B from Problem 4 (I = m L^2), then Ad = I2 + dt*A, Bd = dt*B. | Return { Ad, Bd }.
function eulerMatrices(p, dt) {
  const I = p.m * p.L * p.L;
  const A = [
    [0, 1],
    [-(p.k + p.m * p.g * p.L) / I, -p.c / I],
  ];
  const B = [0, p.k / I];
  const Ad = [
    [1 + dt * A[0][0], dt * A[0][1]],
    [dt * A[1][0], 1 + dt * A[1][1]],
  ];
  const Bd = [dt * B[0], dt * B[1]];
  return { Ad, Bd };
}

// 6) One-step prediction x_next = Ad x + Bd u.
// @todo x_next = Ad x + Bd u. Reuse matVec.
function predictNext(Ad, Bd, x, u) {
  return matVec(Ad, x).map((v, i) => v + Bd[i] * u);
}

// 7) Hand-build a 2-layer tanh MLP whose forward pass on z = [thetaA, thetaDotA, thetaM]
//    reproduces predictNext. Trick: tanh(eps*s) ≈ eps*s when eps is small,
//    so layer 1 = eps * identity, layer 2 = [Ad | Bd] / eps.
// @todo Layer 1: 3x3 with eps on the diagonal, zero bias. Layer 2: 2x3 = [Ad | Bd] / eps, zero bias. | Return [{ W: W1, b: b1 }, { W: W2, b: b2 }].
function physicsMLP(Ad, Bd, eps = 1e-3) {
  const W1 = [
    [eps, 0, 0],
    [0, eps, 0],
    [0, 0, eps],
  ];
  const W2 = [
    [Ad[0][0] / eps, Ad[0][1] / eps, Bd[0] / eps],
    [Ad[1][0] / eps, Ad[1][1] / eps, Bd[1] / eps],
  ];
  return [
    { W: W1, b: [0, 0, 0] },
    { W: W2, b: [0, 0] },
  ];
}

// ---------- Given: the true nonlinear pendulum (fine semi-implicit Euler sub-steps) ----------
const P = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 };
const DT = 0.01;
function trueStep(p, x, u, dt) {
  const I = p.m * p.L * p.L;
  let [th, w] = x;
  const n = 10, h = dt / n;
  for (let i = 0; i < n; i++) {
    const acc = (p.k * (u - th) - p.m * p.g * p.L * Math.sin(th) - p.c * w) / I;
    w += h * acc;
    th += h * w;
  }
  return [th, w];
}

// ---------- Demo: roll out three forward models for 3 s ----------
try {
  const { Ad, Bd } = eulerMatrices(P, DT);
  const net = physicsMLP(Ad, Bd);
  let xT = [0, 0], xL = [0, 0], xN = [0, 0];
  const t = [], truth = [], lin = [], mlp = [];
  for (let i = 0; i <= 300; i++) {
    const u = 0.3 * Math.sin(3 * i * DT); // motor command, rad
    t.push(i * DT); truth.push(xT[0]); lin.push(xL[0]); mlp.push(xN[0]);
    xT = trueStep(P, xT, u, DT);
    xL = predictNext(Ad, Bd, xL, u);
    xN = mlpForward(net, [xN[0], xN[1], u]);
  }
  plot(
    [
      { name: "true nonlinear sim", x: t, y: truth },
      { name: "linear Euler model", x: t, y: lin },
      { name: "MLP forward pass", x: t, y: mlp },
    ],
    { title: "Arm angle under drive 0.3·sin(3t): three forward models", xlabel: "t (s)", ylabel: "θa (rad)" },
  );
  console.log("Ad =", Ad, " Bd =", Bd);
  console.log("one-step prediction from x=[0.1, 0], u=0.3:", predictNext(Ad, Bd, [0.1, 0], 0.3));
} catch (e) {
  console.log("Demo skipped until your functions work:", e.message);
}
