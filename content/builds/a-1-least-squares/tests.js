const P1 = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 };
const ms = (t) => 0.3 * Math.sin(3 * t) + 0.2 * Math.sin(7.3 * t) + 0.1 * Math.sin(1.1 * t);

test("transpose: 2x3 → 3x2", () => {
  assertArrayClose(transpose([[1, 2, 3], [4, 5, 6]]), [[1, 4], [2, 5], [3, 6]]);
});
test("lstsq: Problem 1 line fit gives a = 7/6, b = 1/2", () => {
  assertArrayClose(lstsq([[1, 0], [1, 1], [1, 2]], [1, 2, 2]), [7 / 6, 0.5], 1e-10);
});
test("lstsq: residual is orthogonal to every column", () => {
  const A = [[1, 0.5], [1, -1], [1, 2], [1, 3.5]], y = [2, -1, 4, 3];
  const x = lstsq(A, y);
  const r = y.map((yi, i) => yi - (A[i][0] * x[0] + A[i][1] * x[1]));
  for (let j = 0; j < 2; j++) assertClose(A.reduce((s, row, i) => s + row[j] * r[i], 0), 0, 1e-10, `column ${j}·r`);
});
test("regressorRow: [θm − θ, −sin θ, −θ̇]", () => {
  assertArrayClose(regressorRow(0.5, -2, 0.1), [-0.4, -Math.sin(0.5), 2]);
});
test("fitParams: recovers [10, 9.81, 0.1] from clean simulated data", () => {
  const d = simulate(P1, { T: 6, drive: ms });
  assertArrayClose(fitParams(d, 0, d.th.length), [10, 9.81, 0.1], 1e-5);
});
test("fitParams: after a ×1.5 mass bump, k/I and c/I drop by 1/1.5, g/L doesn't move", () => {
  const d = simulate(P1, { T: 8, drive: ms, bumpAt: 2 });
  assertArrayClose(fitParams(d, 1100, d.th.length), [10 / 1.5, 9.81, 0.1 / 1.5], 1e-5);
});
test("residualRMS: ~0 with the right params, clearly > 0 after the bump", () => {
  const d = simulate(P1, { T: 8, drive: ms, bumpAt: 4 });
  const pre = residualRMS(d, [10, 9.81, 0.1], 0, 1900);
  const post = residualRMS(d, [10, 9.81, 0.1], 2100, d.th.length);
  assert(pre < 1e-6, `pre-bump RMS should be ~0, got ${pre}`);
  assert(post > 0.1, `post-bump RMS should be clearly nonzero, got ${post}`);
});
test("slidingFit: window count, timing, and tracking the change", () => {
  const d = simulate(P1, { T: 6, drive: ms, bumpAt: 3 });
  const sf = slidingFit(d, 500, 250);
  const expected = Math.floor((d.th.length - 500) / 250) + 1;
  assert(sf.p.length === expected && sf.t.length === expected, `expected ${expected} windows, got ${sf.p.length}`);
  assertClose(sf.t[0], d.t[499], 1e-12, "first window end time");
  assertClose(sf.p[0][0], 10, 1e-5, "first window k/I");
  assertClose(sf.p[sf.p.length - 1][0], 10 / 1.5, 1e-5, "last window k/I");
});
