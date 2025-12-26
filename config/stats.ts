/* =============================================================================
   src/app/config/stats.ts
   (Updated to match corestats.ts keys exactly)
============================================================================= */

export type StatKey = 
  // TRADITIONAL (ROTO)
  | "g" | "pa" | "ab" | "hr" | "rbi" | "r" | "sb" | "avg" | "obp" | "slg" | "ops" | "w" | "l" | "sv" | "hld" | "era" | "whip" | "so" | "ip"
  // POWER (Renamed to match corestats: exit_velocity_avg, launch_angle_avg)
  | "exit_velocity_avg" | "hard_hit_pct" | "barrel_pct" | "max_exit_velocity" | "ev_90" | "barrels" | "barrels_per_pa" | "launch_angle_avg" | "iso" | "hr_per_600"
  // HIT
  | "xba" | "contact_pct" | "sweet_spot_pct" | "zone_contact_pct" | "o_contact_pct" | "launch_angle_dist" | "xwoba_con"
  // APPROACH
  | "bb_pct" | "k_pct" | "o_swing_pct" | "swing_pct" | "zone_swing_pct" | "whiff_pct" | "called_strike_pct" | "csw_pct"
  // SPEED
  | "sprint_speed" | "speed_percentile" | "top_speed" | "home_to_first" | "bsr" | "extra_base_pct" | "first_to_third_pct" | "second_to_home_pct" | "outs_on_bases" | "sb_per_pa"
  // PROFILE
  | "age" | "positions" | "handedness" | "level" | "mlb_eta" | "platoon_split" | "park_factor" | "adj_exit_velocity" | "matchup_profile"
  // DEFENSE
  | "oaa" | "arm_strength" | "arm_value" | "reaction_time" | "burst" | "jump" | "route_efficiency" | "exchange_time" | "pop_time"
  // PITCH SHAPE
  | "pitch_velocity" | "pitch_whiff_pct" | "spin_rate" | "spin_axis" | "vert_break" | "horiz_break" | "ivb" | "putaway_pct" | "gb_pct_pitch" | "xwoba_pitch"
  // OUTCOMES
  | "xslg" | "xwoba" | "xba_allowed" | "xslg_allowed" | "xwoba_allowed" | "xera" | "clutch_xwoba" | "risp_xstats" | "wrc_plus"
  // MECHANICS
  | "release_point_xyz" | "extension" | "release_consistency" | "arm_slot" | "tunneling_score"
  // PERCENTILES
  | "percentile_tier" | "percentile_rank";

export interface StatConfig {
  label: string;
  description: string;
  isPaid: boolean;
  unit: "raw" | "percent" | "index" | "time" | "count" | "degree" | "year" | "categorical";
  defaultValue: number;
  goodDirection: "higher" | "lower";
  step?: number;
  min?: number;
  max?: number;
  format?: string; // Added format for cleaner display logic
}

export const STATS: Record<StatKey, StatConfig> = {
  /* 🟩 TRADITIONAL (ROTO) */
  g: { label: "Games", description: "Games Played", isPaid: false, unit: "count", defaultValue: 150, goodDirection: "higher", step: 1 },
  pa: { label: "PA", description: "Plate Appearances", isPaid: false, unit: "count", defaultValue: 600, goodDirection: "higher", step: 10 },
  ab: { label: "AB", description: "At Bats", isPaid: false, unit: "count", defaultValue: 500, goodDirection: "higher", step: 10 },
  hr: { label: "HR", description: "Home Runs", isPaid: false, unit: "count", defaultValue: 25, goodDirection: "higher", step: 1 },
  rbi: { label: "RBI", description: "Runs Batted In", isPaid: false, unit: "count", defaultValue: 80, goodDirection: "higher", step: 1 },
  r: { label: "Runs", description: "Runs Scored", isPaid: false, unit: "count", defaultValue: 80, goodDirection: "higher", step: 1 },
  sb: { label: "SB", description: "Stolen Bases", isPaid: false, unit: "count", defaultValue: 15, goodDirection: "higher", step: 1 },
  avg: { label: "AVG", description: "Batting Average", isPaid: false, unit: "raw", defaultValue: 0.275, goodDirection: "higher", step: 0.001 },
  obp: { label: "OBP", description: "On-Base Percentage", isPaid: false, unit: "raw", defaultValue: 0.340, goodDirection: "higher", step: 0.001 },
  slg: { label: "SLG", description: "Slugging Percentage", isPaid: false, unit: "raw", defaultValue: 0.450, goodDirection: "higher", step: 0.001 },
  ops: { label: "OPS", description: "On-Base + Slugging", isPaid: false, unit: "raw", defaultValue: 0.800, goodDirection: "higher", step: 0.001 },
  
  // Pitching Traditional
  w: { label: "Wins", description: "Wins", isPaid: false, unit: "count", defaultValue: 12, goodDirection: "higher", step: 1 },
  l: { label: "Losses", description: "Losses", isPaid: false, unit: "count", defaultValue: 8, goodDirection: "lower", step: 1 },
  sv: { label: "Saves", description: "Saves", isPaid: false, unit: "count", defaultValue: 25, goodDirection: "higher", step: 1 },
  hld: { label: "Holds", description: "Holds", isPaid: false, unit: "count", defaultValue: 15, goodDirection: "higher", step: 1 },
  era: { label: "ERA", description: "Earned Run Average", isPaid: false, unit: "raw", defaultValue: 3.50, goodDirection: "lower", step: 0.05 },
  whip: { label: "WHIP", description: "Walks+Hits per IP", isPaid: false, unit: "raw", defaultValue: 1.20, goodDirection: "lower", step: 0.01 },
  so: { label: "SO", description: "Strikeouts (Raw)", isPaid: false, unit: "count", defaultValue: 180, goodDirection: "higher", step: 5 },
  ip: { label: "IP", description: "Innings Pitched", isPaid: false, unit: "raw", defaultValue: 160, goodDirection: "higher", step: 5 },

  /* 🟩 POWER (Renamed keys to match corestats) */
  exit_velocity_avg: { label: "Avg Exit Velocity", description: "Average ball speed off the bat", isPaid: false, unit: "raw", defaultValue: 88, goodDirection: "higher", step: 0.1, min: 80, max: 100 },
  hard_hit_pct: { label: "Hard-Hit Rate", description: "% of balls hit 95+ mph", isPaid: false, unit: "percent", defaultValue: 40, goodDirection: "higher", step: 0.5, min: 0, max: 70 },
  barrel_pct: { label: "Barrel %", description: "% of contact hit perfectly", isPaid: false, unit: "percent", defaultValue: 8, goodDirection: "higher", step: 0.1, min: 0, max: 25 },
  max_exit_velocity: { label: "Max Exit Velocity", description: "Hardest ball hit", isPaid: true, unit: "raw", defaultValue: 105, goodDirection: "higher", step: 0.1 },
  ev_90: { label: "90th Percentile EV", description: "Typical hardest contact", isPaid: true, unit: "raw", defaultValue: 102, goodDirection: "higher", step: 0.1 },
  barrels: { label: "Barrels", description: "Total elite contacts", isPaid: true, unit: "count", defaultValue: 20, goodDirection: "higher", step: 1 },
  barrels_per_pa: { label: "Barrels / PA", description: "Barrels per plate appearance", isPaid: true, unit: "percent", defaultValue: 5, goodDirection: "higher", step: 0.1 },
  launch_angle_avg: { label: "Avg Launch Angle", description: "Vertical contact angle", isPaid: true, unit: "degree", defaultValue: 12, goodDirection: "higher", step: 0.5, min: -10, max: 30 },
  iso: { label: "ISO", description: "Isolated Power (Slugging - AVG)", isPaid: false, unit: "raw", defaultValue: 0.150, goodDirection: "higher", step: 0.001, min: 0, max: 0.400 },
  hr_per_600: { label: "HR / 600 PA", description: "Home Run pace per 600 PAs", isPaid: false, unit: "count", defaultValue: 20, goodDirection: "higher", step: 1, min: 0, max: 60 },

  /* 🟩 HIT */
  xba: { label: "Expected BA (xBA)", description: "Expected batting average", isPaid: false, unit: "percent", defaultValue: 250, goodDirection: "higher", step: 1 },
  contact_pct: { label: "Contact %", description: "Contact per swing", isPaid: false, unit: "percent", defaultValue: 75, goodDirection: "higher", step: 0.5 },
  sweet_spot_pct: { label: "Sweet Spot %", description: "Contact at ideal angles", isPaid: false, unit: "percent", defaultValue: 33, goodDirection: "higher", step: 0.5 },
  zone_contact_pct: { label: "Zone Contact %", description: "Contact on strikes", isPaid: true, unit: "percent", defaultValue: 85, goodDirection: "higher", step: 0.5 },
  o_contact_pct: { label: "O-Contact %", description: "Contact on balls", isPaid: true, unit: "percent", defaultValue: 60, goodDirection: "higher", step: 0.5 },
  launch_angle_dist: { label: "Launch Angle Spread", description: "Consistency of angles", isPaid: true, unit: "raw", defaultValue: 25, goodDirection: "lower", step: 0.1 },
  xwoba_con: { label: "xwOBA on Contact", description: "Quality of contact value", isPaid: true, unit: "index", defaultValue: 350, goodDirection: "higher", step: 1 },

  /* 🟩 APPROACH */
  bb_pct: { label: "Walk Rate", description: "Walks per PA", isPaid: false, unit: "percent", defaultValue: 8, goodDirection: "higher", step: 0.1 },
  k_pct: { label: "Strikeout Rate", description: "Strikeouts per PA", isPaid: false, unit: "percent", defaultValue: 22, goodDirection: "lower", step: 0.1 },
  o_swing_pct: { label: "Chase Rate", description: "Swings at bad pitches", isPaid: false, unit: "percent", defaultValue: 30, goodDirection: "lower", step: 0.5 },
  swing_pct: { label: "Swing %", description: "Overall aggressiveness", isPaid: true, unit: "percent", defaultValue: 47, goodDirection: "higher", step: 0.5 },
  zone_swing_pct: { label: "Zone Swing %", description: "Swings at strikes", isPaid: true, unit: "percent", defaultValue: 65, goodDirection: "higher", step: 0.5 },
  whiff_pct: { label: "Whiff %", description: "Misses per swing", isPaid: true, unit: "percent", defaultValue: 25, goodDirection: "lower", step: 0.5 },
  called_strike_pct: { label: "Called Strike %", description: "Taken strikes", isPaid: true, unit: "percent", defaultValue: 16, goodDirection: "lower", step: 0.1 },
  csw_pct: { label: "CSW %", description: "Called + swinging strikes", isPaid: true, unit: "percent", defaultValue: 28, goodDirection: "lower", step: 0.1 },

  /* 🟩 SPEED */
  sprint_speed: { label: "Sprint Speed", description: "Top running speed", isPaid: false, unit: "raw", defaultValue: 27, goodDirection: "higher", step: 0.1 },
  speed_percentile: { label: "Speed Percentiles", description: "Speed vs league", isPaid: false, unit: "percent", defaultValue: 50, goodDirection: "higher", step: 1 },
  top_speed: { label: "Top Speed", description: "Fastest recorded speed", isPaid: true, unit: "raw", defaultValue: 28, goodDirection: "higher", step: 0.1 },
  home_to_first: { label: "Home-to-First", description: "Acceleration from box", isPaid: true, unit: "time", defaultValue: 4.3, goodDirection: "lower", step: 0.01 },
  bsr: { label: "BsR", description: "Baserunning value", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1 },
  extra_base_pct: { label: "Extra Bases Taken %", description: "Aggressive baserunning", isPaid: true, unit: "percent", defaultValue: 40, goodDirection: "higher", step: 1 },
  first_to_third_pct: { label: "First-to-Third %", description: "Advancement ability", isPaid: true, unit: "percent", defaultValue: 45, goodDirection: "higher", step: 1 },
  second_to_home_pct: { label: "Second-to-Home %", description: "Scoring ability", isPaid: true, unit: "percent", defaultValue: 60, goodDirection: "higher", step: 1 },
  outs_on_bases: { label: "Outs on Basepaths", description: "Baserunning mistakes", isPaid: true, unit: "count", defaultValue: 2, goodDirection: "lower", step: 1 },
  sb_per_pa: { label: "SB / PA", description: "Stolen Bases per Plate Appearance", isPaid: false, unit: "raw", defaultValue: 0.05, goodDirection: "higher", step: 0.01 },

  /* 🟩 PROFILE */
  age: { label: "Age", description: "Player age", isPaid: false, unit: "year", defaultValue: 26, goodDirection: "lower", step: 1 },
  positions: { label: "Positions", description: "Defensive roles", isPaid: false, unit: "categorical", defaultValue: 0, goodDirection: "higher" },
  handedness: { label: "Handedness", description: "Bat/throw side", isPaid: false, unit: "categorical", defaultValue: 0, goodDirection: "higher" },
  level: { label: "Level", description: "MLB or MiLB", isPaid: false, unit: "categorical", defaultValue: 0, goodDirection: "higher" },
  mlb_eta: { label: "MLB ETA", description: "Estimated call-up", isPaid: true, unit: "year", defaultValue: 2025, goodDirection: "lower", step: 1 },
  platoon_split: { label: "Platoon Split", description: "L/R performance gap", isPaid: true, unit: "index", defaultValue: 100, goodDirection: "higher", step: 1 },
  park_factor: { label: "Park Factor", description: "Park run effect", isPaid: true, unit: "index", defaultValue: 100, goodDirection: "higher", step: 1 },
  adj_exit_velocity: { label: "Park-Adjusted EV", description: "EV normalized by park", isPaid: true, unit: "raw", defaultValue: 88, goodDirection: "higher", step: 0.1 },
  matchup_profile: { label: "Matchup Profile", description: "Pitch-type success", isPaid: true, unit: "index", defaultValue: 100, goodDirection: "higher", step: 1 },

  /* 🟩 DEFENSE */
  oaa: { label: "Outs Above Avg", description: "Defensive outs saved", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1 },
  arm_strength: { label: "Arm Strength", description: "Throwing velocity", isPaid: false, unit: "raw", defaultValue: 85, goodDirection: "higher", step: 1 },
  arm_value: { label: "Arm Value", description: "Arm run impact", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1 },
  reaction_time: { label: "Reaction Time", description: "Defensive response", isPaid: true, unit: "time", defaultValue: 1.5, goodDirection: "lower", step: 0.01 },
  burst: { label: "Burst", description: "Acceleration", isPaid: true, unit: "raw", defaultValue: 15, goodDirection: "higher", step: 0.1 },
  jump: { label: "Jump", description: "Initial read", isPaid: true, unit: "raw", defaultValue: 30, goodDirection: "higher", step: 0.1 },
  route_efficiency: { label: "Route Efficiency", description: "Directness to ball", isPaid: true, unit: "percent", defaultValue: 95, goodDirection: "higher", step: 0.5 },
  exchange_time: { label: "Exchange Time", description: "Glove-to-throw", isPaid: true, unit: "time", defaultValue: 0.7, goodDirection: "lower", step: 0.01 },
  pop_time: { label: "Pop Time", description: "Catcher release speed", isPaid: true, unit: "time", defaultValue: 2.0, goodDirection: "lower", step: 0.01 },

  /* 🟩 PITCH SHAPE */
  pitch_velocity: { label: "Velocity", description: "Pitch speed", isPaid: false, unit: "raw", defaultValue: 93, goodDirection: "higher", step: 0.5 },
  pitch_whiff_pct: { label: "Whiff Rate", description: "Miss rate", isPaid: false, unit: "percent", defaultValue: 25, goodDirection: "higher", step: 0.5 },
  spin_rate: { label: "Spin Rate", description: "Pitch rotation", isPaid: true, unit: "raw", defaultValue: 2200, goodDirection: "higher", step: 10 },
  spin_axis: { label: "Spin Axis", description: "Spin direction", isPaid: true, unit: "degree", defaultValue: 180, goodDirection: "higher", step: 1 },
  vert_break: { label: "Vertical Break", description: "Vertical movement", isPaid: true, unit: "raw", defaultValue: 15, goodDirection: "higher", step: 1 },
  horiz_break: { label: "Horizontal Break", description: "Lateral movement", isPaid: true, unit: "raw", defaultValue: 10, goodDirection: "higher", step: 1 },
  ivb: { label: "Induced Vert Break", description: "Gravity resistance", isPaid: true, unit: "raw", defaultValue: 16, goodDirection: "higher", step: 0.5 },
  putaway_pct: { label: "PutAway %", description: "Finishing ability", isPaid: true, unit: "percent", defaultValue: 15, goodDirection: "higher", step: 0.1 },
  gb_pct_pitch: { label: "GB % by Pitch", description: "Ground-ball rate", isPaid: true, unit: "percent", defaultValue: 45, goodDirection: "higher", step: 1 },
  xwoba_pitch: { label: "xwOBA by Pitch", description: "Expected damage", isPaid: true, unit: "index", defaultValue: 320, goodDirection: "lower", step: 1 },

  /* 🟩 OUTCOMES */
  xslg: { label: "Expected SLG", description: "Expected power", isPaid: false, unit: "percent", defaultValue: 400, goodDirection: "higher", step: 1 },
  xwoba: { label: "Expected wOBA", description: "Expected total value", isPaid: false, unit: "index", defaultValue: 320, goodDirection: "higher", step: 1 },
  xba_allowed: { label: "xBA Allowed", description: "Expected avg allowed", isPaid: true, unit: "percent", defaultValue: 240, goodDirection: "lower", step: 1 },
  xslg_allowed: { label: "xSLG Allowed", description: "Expected power allowed", isPaid: true, unit: "percent", defaultValue: 380, goodDirection: "lower", step: 1 },
  xwoba_allowed: { label: "xwOBA Allowed", description: "Expected damage allowed", isPaid: true, unit: "index", defaultValue: 300, goodDirection: "lower", step: 1 },
  xera: { label: "xERA", description: "Expected ERA", isPaid: true, unit: "raw", defaultValue: 3.75, goodDirection: "lower", step: 0.05 },
  clutch_xwoba: { label: "Clutch xwOBA", description: "High-leverage value", isPaid: true, unit: "index", defaultValue: 320, goodDirection: "higher", step: 1 },
  risp_xstats: { label: "RISP xStats", description: "RISP expected value", isPaid: true, unit: "index", defaultValue: 320, goodDirection: "higher", step: 1 },
  wrc_plus: { label: "wRC+", description: "Weighted Runs Created Plus", isPaid: false, unit: "index", defaultValue: 100, goodDirection: "higher", step: 1 },

  /* 🟩 MECHANICS */
  release_point_xyz: { label: "Release Point", description: "Ball release location", isPaid: true, unit: "raw", defaultValue: 6, goodDirection: "higher", step: 0.1 },
  extension: { label: "Extension", description: "Release distance", isPaid: true, unit: "raw", defaultValue: 6.5, goodDirection: "higher", step: 0.1 },
  release_consistency: { label: "Release Consistency", description: "Repeatability", isPaid: true, unit: "raw", defaultValue: 1.5, goodDirection: "lower", step: 0.1 },
  arm_slot: { label: "Arm Slot", description: "Arm angle", isPaid: true, unit: "degree", defaultValue: 45, goodDirection: "higher", step: 1 },
  tunneling_score: { label: "Pitch Tunneling", description: "Pitch deception", isPaid: true, unit: "index", defaultValue: 50, goodDirection: "higher", step: 1 },

  /* 🟩 PERCENTILES */
  percentile_tier: { label: "Tier Label", description: "Below / Avg / Above", isPaid: false, unit: "categorical", defaultValue: 0, goodDirection: "higher" },
  percentile_rank: { label: "Percentile Rank", description: "Rank vs league", isPaid: true, unit: "percent", defaultValue: 50, goodDirection: "higher", step: 1 },
};