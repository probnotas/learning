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
- **C2. Control Theory** — Steve Brunton "Control Bootcamp"; code each example in Python. Prereq: A4, C1
- **C3. Probability & Statistics** — MIT OCW 6.041 (Tsitsiklis)

## Track D — Machine Learning

- **D1. ML Fundamentals** — Andrew Ng CS229; implement every algorithm from scratch in numpy. Prereq: Track A, C3
- **D2. Deep Learning** — MIT 6.S191; fast.ai Practical Deep Learning
- **D3. Reinforcement Learning** — David Silver lectures; Sutton & Barto; implement tabular Q-learning + DQN from scratch

## Track E — Robotics Core

- **E1. Robot Dynamics** — ROB 311 (UMich). Prereq: Track A, Track B
- **E2. Nonlinear Dynamics** — Strogatz textbook + MIT lectures
- **E3. Legged Locomotion (Revzen's area)** — ROB 450 (UMich) if available; Blickhan 1989 (spring-mass); Full & Koditschek 1999 (templates/anchors)

## Track F — Self-Model / World-Model Specific

- **F1. World Models** — Ha & Schmidhuber 2018; Hafner et al. Dreamer V1/V2/V3; LeCun 2022 (JEPA); 1X World Model Lab posts + papers
- **F2. Self-Modeling** — Bongard, Zykov & Lipson, "Resilient Machines Through Continuous Self-Modeling" (Science 2006); Lipson Creative Machines Lab papers (2023–2026); Cully et al. 2015 (Nature)
- **F3. Classical Fault Detection** — Isermann "Fault-Diagnosis Systems" (skim); change detection: CUSUM, GLR

---

## Dependency Graph

```
A1 → A2 → A3 → A4
A1 → B1 → B2 (needs A2)
A4 → C1 → C2
C3 (parallel)
A + C3 → D1 → D2 → D3
A + B → E1 → E2 → E3
F1, F2, F3 can be read at any point (papers, not courses)
```

## Minimum Viable Path — 5–6 months @ 6 hrs/week

| Month | Focus |
|---|---|
| 1 | A1 (linear algebra) |
| 2 | B1 (Feynman oscillators) + start A2 (calculus) |
| 3 | A2 continued |
| 4 | A4 (diff eq, focused on oscillators) |
| 5 | C2 (Brunton control, applied) |
| 6 | F1 + F2 (self-model + world-model papers) |

Gets you: linear algebra, oscillator physics, enough calculus to not be lost,
differential equations for oscillators, control intuition, and literacy in the
two literature camps the work sits between.

Skipped (Year 2): full classical mechanics, signals and systems, formal ML
courses, robotics dynamics, RL, nonlinear dynamics, legged locomotion.

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
