// Where each unit lives on the campus image (public/world/campus.webp, 1672×941).
// x, y are fractions of the image width/height, at the building's footprint.
export const WORLD_IMAGE = { src: "/world/campus.webp", width: 1672, height: 941 };

export interface Site {
  x: number;
  y: number;
  zoom: number;
  building: string;
  color: string; // badge colour
}

export const SITES: Record<string, Site> = {
  A1: { x: 0.235, y: 0.68, zoom: 2.04, building: "Robotics Lab", color: "#f59e0b" },
  A2: { x: 0.16, y: 0.45, zoom: 2.04, building: "The Ring", color: "#38bdf8" },
  B1: { x: 0.5, y: 0.46, zoom: 1.87, building: "Resonance Dome", color: "#a78bfa" },
  A4: { x: 0.8, y: 0.82, zoom: 1.95, building: "Oscillator Hall", color: "#34d399" },
  C2: { x: 0.85, y: 0.49, zoom: 2.04, building: "Control Center", color: "#f472b6" },
  F1: { x: 0.63, y: 0.33, zoom: 2.21, building: "World Model Observatory", color: "#60a5fa" },
  F2: { x: 0.34, y: 0.3, zoom: 2.12, building: "Self-Model Institute", color: "#fb7185" },
  F3: { x: 0.6, y: 0.625, zoom: 2.2, building: "Lagoon Monitoring Station", color: "#facc15" },
};

// Year 2 units share one planned district on the forested hillside (top left).
export const YEAR2_SITE: Site = { x: 0.13, y: 0.235, zoom: 2.0, building: "Year 2 district · planned", color: "#94a3b8" };

export function siteFor(topic: string): Site {
  return SITES[topic] ?? YEAR2_SITE;
}

export function difficulty(month: number | null): { label: string; bars: number } {
  if (month === null) return { label: "Advanced", bars: 3 };
  if (month <= 2) return { label: "Beginner", bars: 1 };
  if (month <= 4) return { label: "Intermediate", bars: 2 };
  return { label: "Advanced", bars: 3 };
}

