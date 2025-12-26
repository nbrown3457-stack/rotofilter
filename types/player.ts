/**
 * Core physical and professional background data
 */
export type PlayerBio = {
  age: number;
  height: string;     // e.g., "6'6\""
  weight: number;     // in lbs
  draft: string;      // e.g., "2020, Rd 1, Pk 21"
  position: string;   // e.g., "SS", "SP", "OF"
  batsThrows: string; // e.g., "R/R"
};

/**
 * Filter categories
 */
export type DemoRole = 'batters' | 'pitchers';
export type DemoLevel = 'mlb' | 'prospects';

/**
 * The main Player object
 */
export interface DemoPlayer {
  id: string;
  name: string;
  team: string;
  role: DemoRole;
  level: DemoLevel;
  jerseyNumber: number;
  info: PlayerBio; 
  stats: Record<string, number>;
}

/**
 * UI Helper: Formats the small bio line
 * Returns: "STL • OF • 23yr • 6'6\"/250 • R/R"
 */
export const getShortBio = (player: DemoPlayer): string => {
  const { team, info } = player;
  return `${team} • ${info.position} • ${info.age}yr • ${info.height}/${info.weight} • ${info.batsThrows}`;
};