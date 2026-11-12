test("forwardDiff: squares 0,1,4,9 with dt = 1", () => {
  assertArrayClose(forwardDiff([0, 1, 4, 9], 1), [1, 3, 5]);
});
test("forwardDiff: respects dt", () => {
  assertArrayClose(forwardDiff([0, 1, 4], 0.5), [2, 6]);
});
test("centralDiff: interior points only", () => {
  assertArrayClose(centralDiff([0, 1, 4, 9], 1), [2, 4]);
});
test("secondDiff: constant curvature of t²", () => {
  assertArrayClose(secondDiff([0, 1, 4, 9, 16], 1), [2, 2, 2]);
});
test("diffErrors: Problem 2 numbers at t = 0.5, h = 0.1", () => {
  const [r] = diffErrors(Math.sin, Math.cos, 0.5, [0.1]);
  assertClose(r.fwd, -0.02541321, 1e-6, "forward error");
  assertClose(r.cen, -0.00146191, 1e-6, "central error");
});
test("diffErrors: forward is first order, central is second order", () => {
  const [a, b] = diffErrors(Math.exp, Math.exp, 1, [0.01, 0.005]);
  assertClose(a.fwd / b.fwd, 2, 0.02, "halving h should halve the forward error");
  assertClose(a.cen / b.cen, 4, 0.02, "halving h should quarter the central error");
});
test("quantize: 4096 counts per revolution", () => {
  const res = (2 * Math.PI) / 4096;
  assertClose(quantize(0.001, 4096), res, 1e-12, "0.001 rounds up to one count");
  assertClose(quantize(0.0007, 4096), 0, 1e-12, "0.0007 rounds down to zero");
  assertClose(quantize(-0.3, 4096), -196 * res, 1e-12, "negative angles");
});
test("movingAverage: trailing window, same length", () => {
  assertArrayClose(movingAverage([1, 2, 3, 4, 5], 3), [1, 1.5, 2, 3, 4]);
});
