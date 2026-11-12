export interface Project {
  id: string;
  title: string;
  summary: string;
  lessons: string[]; // lesson ids this project ties into
  file?: string; // optional static file under /public
}

export const PROJECTS: Project[] = [
  {
    id: "compliant-pendulum",
    title: "Compliant Pendulum Playground",
    summary:
      "Pendulum with a torsional spring between motor and arm. Drive it, sweep the frequency, bump the mass mid-run, and watch resonance detuning happen. This is where the AUC = 0.11 result becomes visible.",
    lessons: ["b-1-resonance-transients", "a-4-second-order-oscillators", "a-4-laplace-transform"],
    file: "/playground/compliant-pendulum-playground.html",
  },
];
