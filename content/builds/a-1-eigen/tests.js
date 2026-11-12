const PE = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 };
const sortEig = (ls) => ls.slice().sort((a, b) => b.re - a.re || b.im - a.im).map((l) => [l.re, l.im]);

test("eig2x2: diagonal matrix", () => {
  assertArrayClose(sortEig(eig2x2([[2, 0], [0, 3]])), [[3, 0], [2, 0]]);
});
test("eig2x2: upper-triangular (Problem 1)", () => {
  assertArrayClose(sortEig(eig2x2([[2, 1], [0, 3]])), [[3, 0], [2, 0]]);
});
test("eig2x2: 90° rotation has eigenvalues ±i", () => {
  assertArrayClose(sortEig(eig2x2([[0, -1], [1, 0]])), [[0, 1], [0, -1]]);
});
test("eig2x2: pendulum A gives −0.05 ± 4.45056i (Problem 2)", () => {
  assertArrayClose(sortEig(eig2x2([[0, 1], [-19.81, -0.1]])), [[-0.05, 4.450561762], [-0.05, -4.450561762]], 1e-8);
});
test("continuousA: default pendulum", () => {
  assertArrayClose(continuousA(PE), [[0, 1], [-19.81, -0.1]], 1e-12);
});
test("naturalFreqDamping: nominal and mass ×1.5 (Problems 2 and 4)", () => {
  const a = naturalFreqDamping(continuousA(PE));
  assertClose(a.wn, 4.450842617, 1e-8, "wn");
  assertClose(a.zeta, 0.011233828, 1e-6, "zeta");
  const b = naturalFreqDamping(continuousA({ ...PE, m: 1.5 }));
  assertClose(b.wn, 4.059146051, 1e-8, "wn after bump");
  assertClose(b.zeta, 0.008211908, 1e-6, "zeta after bump");
});
test("explicitEulerM: spectral radius 1.00049 at dt = 0.01 (Problem 5)", () => {
  const M = explicitEulerM(continuousA(PE), 0.01);
  assertArrayClose(M, [[1, 0.01], [-0.1981, 0.999]], 1e-12, "matrix");
  assertClose(spectralRadius(M), 1.000490380, 1e-8, "spectral radius");
});
test("semiImplicitM: matrix entries and det = 1 − dt·c/I (Problem 6)", () => {
  const dt = 0.01, M = semiImplicitM(continuousA(PE), dt);
  assertArrayClose(M, [[1 - dt * dt * 19.81, dt * (1 - dt * 0.1)], [-dt * 19.81, 1 - dt * 0.1]], 1e-12, "matrix");
  assertClose(M[0][0] * M[1][1] - M[0][1] * M[1][0], 1 - dt * 0.1, 1e-12, "det");
  assert(spectralRadius(M) < 1, "semi-implicit should be stable here");
});
test("spectralRadius: real eigenvalues, pick the largest magnitude", () => {
  assertClose(spectralRadius([[0.5, 0], [0, -2]]), 2, 1e-12);
});
test("maxStableDt: undamped semi-implicit limit is 2/ωn", () => {
  const A = [[0, 1], [-12549.05, 0]];
  assertClose(maxStableDt(A, semiImplicitM), 2 / Math.sqrt(12549.05), 1e-6);
});
test("maxStableDt: explicit Euler is (essentially) never stable for an undamped oscillator", () => {
  const dt = maxStableDt([[0, 1], [-4, 0]], explicitEulerM);
  assert(dt < 1e-4, `expected ~0 (only the 1e-9 tolerance lets anything through), got ${dt}`);
});
