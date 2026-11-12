// ===== A2 · Build: exact derivatives by forward-mode autodiff (dual numbers) =====
// A dual number { v, d } carries a value v and its derivative d with respect to ONE chosen
// input. Every operation applies a derivative rule to d. Result: exact derivatives of any
// program built from these operations, including a whole pendulum rollout.
const D = (v, d = 0) => ({ v, d });
const lift = (x) => (typeof x === "number" ? D(x) : x);

// @todo Sum rule: (a + b)' = a' + b'.  Accept plain numbers too: wrap with lift().
function dadd(a, b) {
  a = lift(a); b = lift(b);
  return D(a.v + b.v, a.d + b.d);
}

// @todo Difference rule.
function dsub(a, b) {
  a = lift(a); b = lift(b);
  return D(a.v - b.v, a.d - b.d);
}

// @todo Product rule: (ab)' = a'b + ab'.
function dmul(a, b) {
  a = lift(a); b = lift(b);
  return D(a.v * b.v, a.d * b.v + a.v * b.d);
}

// @todo Quotient rule: (a/b)' = (a'b - ab') / b^2.
function ddiv(a, b) {
  a = lift(a); b = lift(b);
  return D(a.v / b.v, (a.d * b.v - a.v * b.d) / (b.v * b.v));
}

// @todo Chain rule: sin(a)' = cos(a) * a'.
function dsin(a) {
  a = lift(a);
  return D(Math.sin(a.v), Math.cos(a.v) * a.d);
}

// @todo cos(a)' = -sin(a) * a'.
function dcos(a) {
  a = lift(a);
  return D(Math.cos(a.v), -Math.sin(a.v) * a.d);
}

// @todo exp(a)' = exp(a) * a'.
function dexp(a) {
  a = lift(a);
  const e = Math.exp(a.v);
  return D(e, e * a.d);
}

// @todo sqrt(a)' = a' / (2 sqrt(a)).
function dsqrt(a) {
  a = lift(a);
  const s = Math.sqrt(a.v);
  return D(s, a.d / (2 * s));
}

// @todo f'(x): evaluate f at the dual number D(x, 1) and read off .d
function derivative(f, x) {
  return f(D(x, 1)).d;
}

// @todo Arm acceleration with dual arithmetic. Any of p.m, p.L, p.k, p.c, theta, thetaDot, thetaM | may be a dual or a number: (k (thetaM - theta) - m g L sin(theta) - c thetaDot) / (m L^2).
function accelDual(p, theta, thetaDot, thetaM) {
  const I = dmul(p.m, dmul(p.L, p.L));
  const spring = dmul(p.k, dsub(thetaM, theta));
  const grav = dmul(dmul(p.m, p.g), dmul(p.L, dsin(theta)));
  return ddiv(dsub(dsub(spring, grav), dmul(p.c, thetaDot)), I);
}

// @todo Roll out the pendulum (semi-implicit Euler) from rest for us.length steps with the | parameter named `param` seeded as D(p[param], 1). Return { theta, dtheta }: the angle and | d(angle)/d(param) at every step (arrays of numbers, length us.length).
function rolloutSensitivity(p, us, dt, param) {
  const q = { ...p, [param]: D(p[param], 1) };
  let th = D(0), w = D(0);
  const theta = [], dtheta = [];
  for (const u of us) {
    w = dadd(w, dmul(dt, accelDual(q, th, w, u)));
    th = dadd(th, dmul(dt, w));
    theta.push(th.v);
    dtheta.push(th.d);
  }
  return { theta, dtheta };
}

// @todo Fit one parameter to measured angles by Gauss-Newton: repeat `iters` times: | roll out with the current guess, r = predicted - measured, s = d(predicted)/d(param), | update guess -= sum(r*s) / sum(s*s). Return the final guess.
function fitParam(p, us, dt, measured, param, guess, iters = 8) {
  let g = guess;
  for (let it = 0; it < iters; it++) {
    const { theta, dtheta } = rolloutSensitivity({ ...p, [param]: g }, us, dt, param);
    let num = 0, den = 0;
    for (let i = 0; i < theta.length; i++) {
      num += (theta[i] - measured[i]) * dtheta[i];
      den += dtheta[i] * dtheta[i];
    }
    g -= num / den;
  }
  return g;
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
