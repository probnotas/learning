# Curriculum — Self-Model Robotics

**Goal:** Self-model robotics research, able to defend at research-lab level
(1X World Model Lab, Revzen-style conversations).

**Learning style:** Learn by doing. For every topic, video/reading = 50%,
problem sets or coded implementation = 50%. No topic counts as "done"
without problem sets completed.

**Ordering rule:** Hard dependencies first. Do not skip ahead. Finish one
resource before starting the next in the same track.

---

## Track A — Math Foundation

- **A1. Linear Algebra**
  - 3Blue1Brown "Essence of Linear Algebra" (intuition, 12 videos)
  - ROB 101 Computational Linear Algebra (UMich, Grizzle) — textbook + lectures free online, has problem sets
- **A2. Single-Variable Calculus**
  - 3Blue1Brown "Essence of Calculus" (intuition)
  - MIT OCW 18.01 Single Variable Calculus (Jerison) — problem sets
- **A3. Multivariable Calculus**
  - MIT OCW 18.02 Multivariable Calculus (Auroux) — problem sets
- **A4. Differential Equations**
  - MIT OCW 18.03 Differential Equations (Mattuck)
  - FOCUS: linear 2nd-order ODEs, damped/driven oscillators, resonance
  - Problem sets mandatory

## Track B — Physics Foundation

- **B1. Classical Mechanics — Intuition First**
  - Feynman Lectures Vol 1, chapters 21–25 (oscillations, resonance) — feynmanlectures.caltech.edu, free
- **B2. Classical Mechanics — Full Course**
  - MIT OCW 8.01 Physics I (Walter Lewin) — problem sets
  - Co-requisite: calculus (A2)

## Track C — Engineering Layer (Revzen's language)

- **C1. Signals and Systems** — MIT OCW 6.003 (Oppenheim). Prereq: A4
- **C2. Control Theory** — Steve Brunton "Control Bootcamp"; code each example in Python. Prereq: A1, A4 (C1 helpful, not required: the bootcamp needs eigenvalues + ODEs; Laplace is covered in 18.03)
- **C3. Probability & Statistics** — MIT OCW 6.041 (Tsitsiklis)

## Track D — Machine Learning

- **D1. ML Fundamentals** — Andrew Ng CS229; implement every algorithm from scratch in numpy. Prereq: Track A (incl. A3), C3
- **D2. Deep Learning** — MIT 6.S191; fast.ai Practical Deep Learning
- **D3. Reinforcement Learning** — David Silver lectures; Sutton & Barto; implement tabular Q-learning + DQN from scratch

## Track E — Robotics Core

- **E1. Robot Dynamics** — ROB 311 (UMich). Prereq: Track A (incl. A3), Track B
- **E2. Nonlinear Dynamics** — Strogatz textbook + MIT lectures
- **E3. Legged Locomotion (Revzen's area)** — ROB 450 (UMich) if available; Blickhan 1989 (spring-mass); Full & Koditschek 1999 (templates/anchors)

## Track F — Self-Model / World-Model Specific

- **F1. World Models** — Ha & Schmidhuber 2018; Hafner et al. Dreamer V1/V2/V3; LeCun 2022 (JEPA); 1X World Model Lab posts + papers
- **F2. Self-Modeling** — Bongard, Zykov & Lipson, "Resilient Machines Through Continuous Self-Modeling" (Science 2006); Lipson Creative Machines Lab papers (2023–2026); Cully et al. 2015 (Nature)
- **F3. Classical Fault Detection** — Isermann "Fault-Diagnosis Systems" (skim); change detection: CUSUM, GLR

---

## Dependency Graph

```
A1 → A2 → A4            (A4's oscillator units need only A2 + complex numbers)
A2 → A3                 (A3 is needed by D1 and E1, not by A4)
A1 → B1 → B2 (needs A2)
A1 + A4 → C2            (C1 recommended, not required)
A4 → C1
C3 (parallel)
A (incl. A3) + C3 → D1 → D2 → D3
A (incl. A3) + B → E1 → E2 → E3
F1, F2, F3 can be read at any point (papers, not courses)
```

## Minimum Viable Path — 5–6 months @ 6 hrs/week

Budget: 6 hrs/week ≈ 26 hrs/month. ROB 101, 18.01 and 18.03 are each
~120–150 hr semester courses, so "finish the resource" means **finish the
scoped units below**, readings + psets, not the whole course.

| Month | Focus | Scope (~26 hrs) |
|---|---|---|
| 1 | A1 (linear algebra) | All 12 3Blue1Brown videos; ROB 101 chapters on linear systems / LU, least squares, and eigenvalues, with their psets |
| 2 | B1 (Feynman oscillators) + start A2 (calculus) | 3Blue1Brown Essence of Calculus first (needed for Feynman); then Feynman Vol 1 ch 21–25 with worked problems |
| 3 | A2 continued | 18.01 units on derivatives, integration, and Taylor series, with psets |
| 4 | A4 (diff eq, focused on oscillators) | 18.03 Unit 2 (2nd-order linear ODEs, damping, forced response, resonance) + Laplace transform, with psets. Project: compliant-pendulum playground |
| 5 | C2 (Brunton control, applied) | Control Bootcamp, every example coded in Python |
| 6 | F1 + F2 + F3 (papers) | F1/F2 papers; F3: CUSUM + GLR, implement both and run them on the pendulum mass-change data (~6 hrs) |

Gets you: linear algebra, oscillator physics, enough calculus to not be lost,
differential equations for oscillators, control intuition, literacy in the
two literature camps the work sits between, and a classical change-detection
baseline to compare against.

Skipped (Year 2): full classical mechanics, multivariable calculus (A3),
signals and systems, formal ML courses, robotics dynamics, RL, nonlinear
dynamics, legged locomotion, and the unscoped remainder of A1/A2/A4.

---

## Progress

Mark a box only when **both** halves are done (watched/read **and** psets/code).

| ID | Topic | Reading/Video | Psets/Code | Notes |
|---|---|---|---|---|
| A1 | Linear Algebra | [ ] | [ ] | |
| A2 | Single-Variable Calculus | [ ] | [ ] | |
| A3 | Multivariable Calculus | [ ] | [ ] | |
| A4 | Differential Equations | [ ] | [ ] | |
| B1 | Feynman 21–25 | [ ] | [ ] | |
| B2 | 8.01 Physics I | [ ] | [ ] | |
| C1 | Signals and Systems | [ ] | [ ] | |
| C2 | Control Bootcamp | [ ] | [ ] | |
| C3 | Probability | [ ] | [ ] | |
| D1 | CS229 | [ ] | [ ] | |
| D2 | Deep Learning | [ ] | [ ] | |
| D3 | RL | [ ] | [ ] | |
| E1 | Robot Dynamics | [ ] | [ ] | |
| E2 | Nonlinear Dynamics | [ ] | [ ] | |
| E3 | Legged Locomotion | [ ] | [ ] | |
| F1 | World Models | [ ] | [ ] | |
| F2 | Self-Modeling | [ ] | [ ] | |
| F3 | Fault Detection | [ ] | [ ] | |
