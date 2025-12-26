export type CoreId = 
  | "standard"
  | "power"
  | "hit"
  | "approach"
  | "speed"
  | "defense"
  | "pitch_shape"
  | "outcomes";

export const CORES: { id: CoreId; label: string }[] = [
  { id: "standard", label: "Standard Stats" },
  { id: "power", label: "Power & Batted Ball" },
  { id: "hit", label: "Hit Tool & Expected" },
  { id: "approach", label: "Plate Discipline" },
  { id: "speed", label: "Speed" },
  { id: "defense", label: "Defense" },
  { id: "pitch_shape", label: "Pitch Shape" },
  { id: "outcomes", label: "Advanced Outcomes" }
];