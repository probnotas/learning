const W0 = Math.sqrt(19.81);
test("analytic: Problem 2 amplitude and phase", () => {
  const { A, phi } = analytic(0.1, 0.5, W0);
  assertClose(A, 0.150400, 1e-5, "A");
  assertClose(phi, -0.843440, 1e-5, "phi");
});
test("analytic: reproduces the initial conditions", () => {
  const { A, phi } = analytic(-0.2, 1.3, 3);
  assertClose(A * Math.cos(phi), -0.2, 1e-12, "x(0)");
  assertClose(-A * 3 * Math.sin(phi), 1.3, 1e-12, "v(0)");
});
test("energy: Problem 3", () => {
  assertClose(energy(0.1, 0.5, W0), 0.22405, 1e-9);
});
test("simulateSHO: output length and initial state", () => {
  const r = simulateSHO("semi", { w0: 2, x0: 0.3, v0: 0, dt: 0.01, T: 1 });
  assert(r.t.length === 101 && r.x.length === 101 && r.v.length === 101, `expected 101 samples, got ${r.t.length}`);
  assertClose(r.x[0], 0.3, 1e-12); assertClose(r.t[100], 1, 1e-9);
});
test("explicit Euler: energy grows by exactly (1 + dt²w0²) per step", () => {
  const dt = 0.01, r = simulateSHO("explicit", { w0: W0, x0: 0.1, v0: 0.5, dt, T: 2 });
  const ratio = energy(r.x[200], r.v[200], W0) / energy(0.1, 0.5, W0);
  assertClose(ratio, (1 + dt * dt * 19.81) ** 200, 1e-9);
});
test("semi-implicit Euler: energy stays within 1% for 20 s at dt = 0.002", () => {
  const r = simulateSHO("semi", { w0: W0, x0: 0.1, v0: 0.5, dt: 0.002, T: 20 });
  const E0 = energy(0.1, 0.5, W0);
  const worst = Math.max(...r.x.map((x, i) => Math.abs(energy(x, r.v[i], W0) / E0 - 1)));
  assert(worst < 0.01, `max relative energy error ${worst}`);
});
test("rk4: matches the exact solution to 1e-6 after 10 s at dt = 0.01", () => {
  const r = simulateSHO("rk4", { w0: W0, x0: 0.1, v0: 0.5, dt: 0.01, T: 10 });
  const { A, phi } = analytic(0.1, 0.5, W0);
  assertClose(r.x[1000], A * Math.cos(W0 * 10 + phi), 1e-6);
});
test("measurePeriod: within 0.05% of 2π/ω0", () => {
  const r = simulateSHO("rk4", { w0: W0, x0: 0.1, v0: 0, dt: 0.002, T: 15 });
  assertClose(measurePeriod(r.t, r.x), (2 * Math.PI) / W0, 5e-4);
});
