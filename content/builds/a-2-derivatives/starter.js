// ===== A2 · Build: exact derivatives by forward-mode autodiff (dual numbers) =====
// A dual number { v, d } carries a value v and its derivative d with respect to ONE chosen
// input. Every operation applies a derivative rule to d. Result: exact derivatives of any
// program built from these operations, including a whole pendulum rollout.
const D = (v, d = 0) => ({ v, d });
const lift = (x) => (typeof x === "number" ? D(x) : x);

function dadd(a, b) {
  // Sum rule: (a + b)' = a' + b'.  Accept plain numbers too: wrap with lift().
  throw new Error("TODO: implement dadd");
}

function dsub(a, b) {
  // Difference rule.
  throw new Error("TODO: implement dsub");
}

function dmul(a, b) {
  // Product rule: (ab)' = a'b + ab'.
  throw new Error("TODO: implement dmul");
}

function ddiv(a, b) {
  // Quotient rule: (a/b)' = (a'b - ab') / b^2.
  throw new Error("TODO: implement ddiv");
}

function dsin(a) {
  // Chain rule: sin(a)' = cos(a) * a'.
  throw new Error("TODO: implement dsin");
}

function dcos(a) {
  // cos(a)' = -sin(a) * a'.
  throw new Error("TODO: implement dcos");
}

function dexp(a) {
  // exp(a)' = exp(a) * a'.
  throw new Error("TODO: implement dexp");
}

function dsqrt(a) {
  // sqrt(a)' = a' / (2 sqrt(a)).
  throw new Error("TODO: implement dsqrt");
}

function derivative(f, x) {
  // f'(x): evaluate f at the dual number D(x, 1) and read off .d
  throw new Error("TODO: implement derivative");
}

function accelDual(p, theta, thetaDot, thetaM) {
  // Arm acceleration with dual arithmetic. Any of p.m, p.L, p.k, p.c, theta, thetaDot, thetaM
  // may be a dual or a number: (k (thetaM - theta) - m g L sin(theta) - c thetaDot) / (m L^2).
  throw new Error("TODO: implement accelDual");
}

function rolloutSensitivity(p, us, dt, param) {
  // Roll out the pendulum (semi-implicit Euler) from rest for us.length steps with the
  // parameter named `param` seeded as D(p[param], 1). Return { theta, dtheta }: the angle and
  // d(angle)/d(param) at every step (arrays of numbers, length us.length).
  throw new Error("TODO: implement rolloutSensitivity");
}

function fitParam(p, us, dt, measured, param, guess, iters = 8) {
  // Fit one parameter to measured angles by Gauss-Newton: repeat `iters` times:
  // roll out with the current guess, r = predicted - measured, s = d(predicted)/d(param),
  // update guess -= sum(r*s) / sum(s*s). Return the final guess.
  throw new Error("TODO: implement fitParam");
}

// ---------- Demo ----------
try {
  const P = { m: 1, L: 1, k: 10, c: 0.1, g: 9.81 }, dt = 0.002;
  const wn = (k) => dsqrt(ddiv(dadd(k, P.m * P.g * P.L), P.m * P.L * P.L));
  console.log("dωn/dk at k = 10:", derivative(wn, 10), "(Problem 2: 0.11234)");
  const wnOfM = (m) => dsqrt(dadd(ddiv(P.k, dmul(m, P.L * P.L)), P.g / P.L));
  console.log("dωn/dm at m = 1:", derivative(wnOfM, 1), "(Problem 3: −1.1234)");

  const us = [];
  for (let i = 0; i < 2000; i++) us.push(0.3 * Math.sin(3 * i * dt));
  const { theta, dtheta } = rolloutSensitivity(P, us, dt, "m");
  const t = us.map((_, i) => (i + 1) * dt);
  plot(
    [
      { name: "θa(t)", x: t, y: theta },
      { name: "∂θa/∂m (rad per kg)", x: t, y: dtheta },
    ],
    { title: "A rollout and its exact sensitivity to the mass", xlabel: "t (s)", ylabel: "" },
  );
  // The heavier "true" body: can a self-model recover m from 4 s of encoder data?
  const truth = rolloutSensitivity({ ...P, m: 1.5 }, us, dt, "m").theta;
  console.log("fitted mass from a 1.0 kg guess:", fitParam(P, us, dt, truth, "m", 1.0), "kg (true 1.5)");
} catch (e) {
  console.log("Demo skipped until your functions work:", e.message);
}
