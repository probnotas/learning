const P0 = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 };

test("matVec: 2x2 times a 2-vector", () => {
  assertArrayClose(matVec([[1, 2], [3, 4]], [5, 6]), [17, 39]);
});
test("matVec: 2x3 times a 3-vector", () => {
  assertArrayClose(matVec([[1, 0, 2], [0, 1, -1]], [3, 4, 5]), [13, -1]);
});
test("matVec: throws a helpful Error on shape mismatch", () => {
  let threw = false;
  try { matVec([[1, 2]], [1, 2, 3]); } catch (e) { threw = !/TODO/.test(e.message); }
  assert(threw, "a 1x2 matrix times a length-3 vector should throw");
});
test("matMul: rotation·shear ≠ shear·rotation", () => {
  const R = [[0, -1], [1, 0]], S = [[1, 1], [0, 1]];
  assertArrayClose(matMul(R, S), [[0, -1], [1, 1]], 1e-9, "R·S");
  assertArrayClose(matMul(S, R), [[1, -1], [1, 0]], 1e-9, "S·R");
});
test("matMul: (2x3)(3x2) gives 2x2", () => {
  assertArrayClose(matMul([[1, 2, 3], [4, 5, 6]], [[1, 0], [0, 1], [1, 1]]), [[4, 5], [10, 11]]);
});
test("linear: W x + b", () => {
  assertArrayClose(linear([[1, 2], [3, 4]], [0.5, -1], [1, 1]), [3.5, 6]);
});
test("mlpForward: tanh on hidden layers, identity on the output layer", () => {
  const layers = [{ W: [[1, -1], [0.5, 2]], b: [0, 0.1] }, { W: [[1, 1]], b: [-0.2] }];
  const h = [Math.tanh(0.3 - 0.2), Math.tanh(0.15 + 0.4 + 0.1)];
  assertArrayClose(mlpForward(layers, [0.3, 0.2]), [h[0] + h[1] - 0.2]);
});
test("eulerMatrices: default pendulum at dt = 0.01 (Problem 5)", () => {
  const { Ad, Bd } = eulerMatrices(P0, 0.01);
  assertArrayClose(Ad, [[1, 0.01], [-0.1981, 0.999]], 1e-9, "Ad");
  assertArrayClose(Bd, [0, 0.1], 1e-9, "Bd");
});
test("eulerMatrices: m and L enter through I = mL²", () => {
  const { Ad, Bd } = eulerMatrices({ m: 2, L: 0.5, k: 10, c: 0.1, g: 9.81 }, 0.01); // I = 0.5
  assertArrayClose(Ad, [[1, 0.01], [-0.01 * (10 + 2 * 9.81 * 0.5) / 0.5, 1 - 0.01 * 0.1 / 0.5]], 1e-9, "Ad");
  assertArrayClose(Bd, [0, 0.01 * 10 / 0.5], 1e-9, "Bd");
});
test("predictNext: x=[0.1, 0], u=0.3 gives [0.1, 0.01019]", () => {
  const { Ad, Bd } = eulerMatrices(P0, 0.01);
  assertArrayClose(predictNext(Ad, Bd, [0.1, 0], 0.3), [0.1, 0.01019], 1e-9);
});
test("physicsMLP: its forward pass reproduces the linear model", () => {
  const { Ad, Bd } = eulerMatrices(P0, 0.01);
  const net = physicsMLP(Ad, Bd);
  assert(Array.isArray(net) && net.length === 2, "expected an array of 2 layers");
  const x = [0.2, -0.5], u = 0.1;
  assertArrayClose(mlpForward(net, [x[0], x[1], u]), predictNext(Ad, Bd, x, u), 1e-5);
});
