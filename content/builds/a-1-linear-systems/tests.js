const PP = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 };
const mv = (M, v) => M.map((r) => r.reduce((s, a, j) => s + a * v[j], 0));
const mm = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));

test("forwardSub: Problem 2", () => {
  assertArrayClose(forwardSub([[2, 0, 0], [1, 3, 0], [-1, 2, 4]], [4, 5, 6]), [2, 1, 1.5]);
});
test("backSub: upper-triangular 3x3", () => {
  assertArrayClose(backSub([[1, 2, 3], [0, 4, 5], [0, 0, 6]], [14, 23, 18]), [1, 2, 3]);
});
test("luDecompose: P·A = L·U, L unit lower, U upper", () => {
  const A = [[2, 1, 1], [4, -6, 0], [-2, 7, 2]];
  const { L, U, perm } = luDecompose(A);
  for (let i = 0; i < 3; i++) {
    assertClose(L[i][i], 1, 1e-12, `L[${i}][${i}]`);
    for (let j = 0; j < 3; j++) {
      if (j > i) assertClose(L[i][j], 0, 1e-12, `L[${i}][${j}]`);
      if (j < i) assertClose(U[i][j], 0, 1e-12, `U[${i}][${j}]`);
    }
  }
  assertArrayClose(mm(L, U), perm.map((i) => A[i]), 1e-12, "L·U vs P·A");
});
test("luDecompose: pivots on the largest entry (first pivot row is the 4)", () => {
  const { perm } = luDecompose([[2, 1, 1], [4, -6, 0], [-2, 7, 2]]);
  assert(perm[0] === 1, `expected perm[0] = 1, got ${perm[0]}`);
});
test("luSolve: Problem 3", () => {
  assertArrayClose(luSolve([[2, 1], [4, 5]], [3, 9]), [1, 1]);
});
test("luSolve: survives a tiny pivot (Problem 7)", () => {
  assertArrayClose(luSolve([[1e-20, 1], [1, 1]], [1, 2]), [1, 1], 1e-9);
});
test("luSolve: random 4x4 round trip", () => {
  const A = [[4, -2, 1, 3], [3, 6, -4, 2], [2, 1, 8, -5], [1, -3, 2, 7]];
  const x = [1, -2, 0.5, 3];
  assertArrayClose(luSolve(A, mv(A, x)), x, 1e-10);
});
test("det: 3x3, a row swap, a singular matrix, and Ad", () => {
  assertClose(det([[2, 0, 1], [1, 3, 2], [1, 1, 4]]), 18, 1e-10, "3x3");
  assertClose(det([[0, 1], [1, 0]]), -1, 1e-12, "swap");
  assertClose(det([[1, 2], [2, 4]]), 0, 1e-12, "singular");
  assertClose(det([[1, 0.01], [-0.1981, 0.999]]), 1.000981, 1e-12, "Ad");
});
test("stepBackward: undoes one forward step exactly", () => {
  const Ad = [[1, 0.01], [-0.1981, 0.999]], Bd = [0, 0.1];
  const x = [0.25, -0.7], u = 0.2;
  const xNext = mv(Ad, x).map((v, i) => v + Bd[i] * u);
  assertArrayClose(stepBackward(Ad, Bd, xNext, u), x, 1e-12);
});
test("inverseDynamics: Problem 6 gives θm ≈ 0.29989 rad", () => {
  assertClose(inverseDynamics(PP, 0.2, 0.5, -1.0), 0.299894613, 1e-8);
});
test("inverseDynamics: consistent with the forward dynamics", () => {
  const p = { m: 0.7, L: 0.4, k: 3, c: 0.2, g: 9.81 }, I = p.m * p.L * p.L;
  const th = -0.4, w = 1.3, thm = 0.15;
  const acc = (p.k * (thm - th) - p.m * p.g * p.L * Math.sin(th) - p.c * w) / I;
  assertClose(inverseDynamics(p, th, w, acc), thm, 1e-10);
});
