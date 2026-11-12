const PR = { m: 1, L: 1, k: 10, c: 0.3, g: 9.81 };
test("steadyAmplitude: half the peak-to-peak inside the window only", () => {
  const t = [], th = [];
  for (let i = 0; i < 4000; i++) { t.push(i * 0.001); th.push(i < 1000 ? 5 : 0.5 * Math.sin(10 * i * 0.001)); }
  assertClose(steadyAmplitude(t, th, 1, 4), 0.5, 1e-3);
});
test("auc: perfect, chance, and inverted rankings", () => {
  assertClose(auc([3, 4], [1, 2]), 1);
  assertClose(auc([1], [1]), 0.5);
  assertClose(auc([1, 2], [3, 4]), 0);
  assertClose(auc([0.5, 2], [1]), 0.5);
});
test("sweep: simulated amplitudes match linear theory within 3% off resonance", () => {
  const ws = [2, 6];
  const a = sweep({ ...PR, c: 0.6 }, 0.3, ws, 20);
  ws.forEach((w, i) => assertClose(a[i], steadyAmpLinear({ ...PR, c: 0.6 }, 0.3, w), 0.03, `ω = ${w}`));
});
test("predictIncrease: down at 2 and 6 rad/s, up at 4 rad/s", () => {
  assert(predictIncrease(PR, 2) === false, "ω = 2");
  assert(predictIncrease(PR, 4) === true, "ω = 4");
  assert(predictIncrease(PR, 6) === false, "ω = 6");
});
test("predictIncrease: with ~no damping the band starts at √(g/L) ≈ 3.13 rad/s (Problem 4)", () => {
  const p = { ...PR, c: 1e-4 };
  assert(predictIncrease(p, 3.0) === false, "ω = 3.0 should shrink");
  assert(predictIncrease(p, 3.3) === true, "ω = 3.3 should grow");
});
test("bumpScore: ≈ 0 without a bump (at ω = 6, where 2 s spans ~2 drive periods)", () => {
  const s0 = bumpScore(PR, 0.3, 6, { tBump: 30, bump: false, seed: 3 });
  assert(Math.abs(s0) < 0.01, `expected ~0, got ${s0}`);
});
test("the window trap: at ω = 2 a 2-s window is shorter than one period (π s), so no-bump scores aren't 0", () => {
  const s0 = bumpScore(PR, 0.3, 2, { tBump: 30, bump: false, seed: 3 });
  assert(Math.abs(s0) > 0.02, `expected a clearly nonzero no-bump score, got ${s0}`);
});
test("bumpScore: clearly negative at ω = 5 (above both resonances)", () => {
  const s5 = bumpScore(PR, 0.3, 5, { tBump: 30, bump: true, seed: 2 });
  assert(s5 < -0.1, `expected < −0.1, got ${s5}`);
});
test("the transient trap: at ω = 4.2 steady state grows, but the 2-s window says it shrank", () => {
  assert(predictIncrease(PR, 4.2) === true, "theory: steady-state amplitude should grow at 4.2");
  const s42 = bumpScore(PR, 0.3, 4.2, { tBump: 30, bump: true, seed: 1 });
  assert(s42 < 0, `expected the early window to show a DROP, got ${s42}`);
});
