const PC = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 };
const cz = (z, re, im, tol = 1e-12, msg = "") => { assertClose(z.re, re, tol, msg + " re"); assertClose(z.im, im, tol, msg + " im"); };

test("cadd and cmul: Problem 1", () => {
  cz(cadd(C(3, 4), C(1, -2)), 4, 2, 1e-12, "sum");
  cz(cmul(C(3, 4), C(1, -2)), 11, -2, 1e-12, "product");
});
test("cmul: i·i = −1", () => cz(cmul(C(0, 1), C(0, 1)), -1, 0));
test("cdiv: 1/(3+4i) = 0.12 − 0.16i (Problem 3)", () => cz(cdiv(C(1), C(3, 4)), 0.12, -0.16));
test("cabs and carg", () => {
  assertClose(cabs(C(3, 4)), 5);
  assertClose(carg(C(-1, 0)), Math.PI, 1e-12, "arg(−1)");
  assertClose(carg(C(0, -1)), -Math.PI / 2, 1e-12, "arg(−i)");
});
test("cexpi: e^{iπ/2} = i, and |e^{iθ}| = 1", () => {
  cz(cexpi(Math.PI / 2), 0, 1, 1e-12, "e^{iπ/2}");
  assertClose(cabs(cexpi(2.7)), 1, 1e-12, "unit magnitude");
});
test("(1 + i)^8 = 16 (Problem 2)", () => {
  let z = C(1);
  for (let i = 0; i < 8; i++) z = cmul(z, C(1, 1));
  cz(z, 16, 0, 1e-9);
});
test("transferFn: DC gain k/(k + mgL)", () => cz(transferFn(PC, 0), 0.504795558, 0, 1e-8));
test("transferFn at ω = 3: |H| = 0.92471, arg H = −0.02774 (Problem 5)", () => {
  const H = transferFn(PC, 3);
  assertClose(cabs(H), 0.924713352, 1e-8, "|H|");
  assertClose(carg(H), -0.027744960, 1e-8, "arg H");
});
test("transferFn at resonance: phase −90°, |H| = k/(c ωn) (Problem 6)", () => {
  const wn = Math.sqrt(19.81), H = transferFn(PC, wn);
  assertClose(carg(H), -Math.PI / 2, 1e-9, "phase");
  assertClose(cabs(H), 10 / (0.1 * wn), 1e-9, "magnitude");
});
test("steadyState: amplitude 0.27741 rad at ω = 3, A = 0.3", () => {
  const s = steadyState(PC, 0.3, 3);
  assertClose(s.amp, 0.277414006, 1e-8, "amp");
  assertClose(s.phase, -0.027744960, 1e-8, "phase");
});
test("steadyState: mass ×1.5 lowers amplitude at ω = 3 but raises it at ω = 4", () => {
  const b = { ...PC, m: 1.5 };
  assert(steadyState(b, 0.3, 3).amp < steadyState(PC, 0.3, 3).amp, "ω = 3 should go down");
  assert(steadyState(b, 0.3, 4).amp > steadyState(PC, 0.3, 4).amp, "ω = 4 should go up");
});
