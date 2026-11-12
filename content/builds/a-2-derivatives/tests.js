const PD = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 };
test("dadd / dmul: product rule on x² sin x at x = 1.3", () => {
  const f = (x) => dmul(dmul(x, x), dsin(x));
  assertClose(derivative(f, 1.3), 2 * 1.3 * Math.sin(1.3) + 1.69 * Math.cos(1.3), 1e-12);
});
test("ddiv: quotient rule on sin(x)/x at x = 0.7", () => {
  const x = 0.7;
  assertClose(derivative((z) => ddiv(dsin(z), z), x), (x * Math.cos(x) - Math.sin(x)) / (x * x), 1e-12);
});
test("chain rule: exp(sin x) at x = 0.4", () => {
  assertClose(derivative((z) => dexp(dsin(z)), 0.4), Math.cos(0.4) * Math.exp(Math.sin(0.4)), 1e-12);
});
test("dcos and dsub", () => {
  assertClose(derivative((z) => dsub(dcos(z), z), 1), -Math.sin(1) - 1, 1e-12);
});
test("dsqrt: dωn/dk = 1/(2 ωn I) = 0.11234 (Problem 2)", () => {
  const wn = (k) => dsqrt(ddiv(dadd(k, 9.81), 1));
  assertClose(derivative(wn, 10), 1 / (2 * Math.sqrt(19.81)), 1e-12);
});
test("dωn/dm = −k / (2 ωn m² L²) = −1.1234 (Problem 3)", () => {
  const wnOfM = (m) => dsqrt(dadd(ddiv(10, m), 9.81));
  assertClose(derivative(wnOfM, 1), -10 / (2 * Math.sqrt(19.81)), 1e-12);
});
test("accelDual: ∂θ̈/∂k = (θm − θ)/I", () => {
  const a = accelDual({ ...PD, k: D(10, 1) }, 0.2, 0.5, 0.3);
  assertClose(a.v, (10 * 0.1 - 9.81 * Math.sin(0.2) - 0.05), 1e-12, "value");
  assertClose(a.d, 0.1, 1e-12, "derivative");
});
test("rolloutSensitivity: matches a central finite difference", () => {
  const us = []; for (let i = 0; i < 500; i++) us.push(0.3 * Math.sin(3 * i * 0.002));
  const { dtheta } = rolloutSensitivity(PD, us, 0.002, "k");
  const h = 1e-5;
  const up = rolloutSensitivity({ ...PD, k: 10 + h }, us, 0.002, "k").theta;
  const dn = rolloutSensitivity({ ...PD, k: 10 - h }, us, 0.002, "k").theta;
  assertClose(dtheta[499], (up[499] - dn[499]) / (2 * h), 1e-6);
});
test("fitParam: recovers k = 10 from a guess of 7", () => {
  const us = []; for (let i = 0; i < 1500; i++) us.push(0.3 * Math.sin(3 * i * 0.002));
  const meas = rolloutSensitivity(PD, us, 0.002, "k").theta;
  assertClose(fitParam(PD, us, 0.002, meas, "k", 7), 10, 1e-6);
});
