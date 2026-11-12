// ===== B1 · Build: the harmonic oscillator, three integrators, one truth =====
// x'' = -w0^2 x  (per unit mass/inertia). For the compliant pendulum near θ = 0,
// x is θa and w0^2 = (k + m g L) / (m L^2).

function analytic(x0, v0, w0) {
  // Exact solution x(t) = A cos(w0 t + phi) for initial conditions x0, v0.
  // A = sqrt(x0^2 + (v0/w0)^2), phi = -atan2(v0/w0, x0). Return { A, phi }.
  throw new Error("TODO: implement analytic");
}

function energy(x, v, w0) {
  // Energy per unit mass: kinetic 0.5 v^2 plus potential 0.5 w0^2 x^2.
  throw new Error("TODO: implement energy");
}

function simulateSHO(method, { w0, x0, v0, dt, T }) {
  // Integrate from (x0, v0) for T seconds with step dt. method is "explicit", "semi" or "rk4".
  // explicit: x' = x + dt v,  v' = v - dt w0^2 x   (both from the OLD values)
  // semi:     v' = v - dt w0^2 x,  then x' = x + dt v'  (uses the NEW velocity)
  // rk4:      classic 4-stage Runge-Kutta on f(x, v) = [v, -w0^2 x]
  // Return { t, x, v } arrays including the initial state (length round(T/dt) + 1).
  throw new Error("TODO: implement simulateSHO");
}

function measurePeriod(t, x) {
  // Average period from upward zero crossings (x goes from < 0 to >= 0).
  // Locate each crossing time by linear interpolation between the two samples, then
  // return (last crossing - first crossing) / (number of crossings - 1).
  throw new Error("TODO: implement measurePeriod");
}

// ---------- Demo: a deliberately coarse dt so the differences are visible ----------
try {
  const w0 = Math.sqrt(19.81), opts = { w0, x0: 0.1, v0: 0.5, dt: 0.05, T: 12 };
  const runs = ["explicit", "semi", "rk4"].map((m) => ({ m, r: simulateSHO(m, opts) }));
  const { A, phi } = analytic(opts.x0, opts.v0, w0);
  const t = runs[0].r.t;
  plot(
    [
      ...runs.map(({ m, r }) => ({ name: m, x: r.t, y: r.x })),
      { name: "exact", x: t, y: t.map((s) => A * Math.cos(w0 * s + phi)) },
    ],
    { title: "Compliant pendulum near θ = 0, dt = 0.05 s (coarse on purpose)", xlabel: "t (s)", ylabel: "θa (rad)" },
  );
  const E0 = energy(opts.x0, opts.v0, w0);
  plot(
    runs.map(({ m, r }) => ({ name: m, x: r.t, y: r.x.map((x, i) => energy(x, r.v[i], w0) / E0) })),
    { title: "Energy / initial energy", xlabel: "t (s)", ylabel: "E / E0" },
  );
  console.log(`exact: A = ${A.toFixed(5)} rad, phi = ${phi.toFixed(5)} rad, period = ${(2 * Math.PI / w0).toFixed(5)} s`);
  for (const { m, r } of runs) console.log(`${m.padEnd(8)} measured period = ${measurePeriod(r.t, r.x).toFixed(5)} s`);
} catch (e) {
  console.log("Demo skipped until your functions work:", e.message);
}
