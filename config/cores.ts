export type CoreId = 
  | "profile"
  | "std_hit"
  | "power"
  | "discipline"
  | "quality"
  | "speed"
  | "std_pitch"
  | "shape"
  | "pitch_out"
  | "defense";

export const CORES: { id: CoreId; label: string }[] = [
  { id: "profile", label: "Profile & Context" },
  { id: "std_hit", label: "Standard Hitting" },
  { id: "power", label: "Power & Barrels" },
  { id: "discipline", label: "Plate Discipline" },
  { id: "quality", label: "Contact Quality & xStats" },
  { id: "speed", label: "Speed & Baserunning" },
  { id: "std_pitch", label: "Standard Pitching" },
  { id: "shape", label: "Pitch Shape & Velocity" },
  { id: "pitch_out", label: "Pitching Outcomes" },
  { id: "defense", label: "Defense" }
];