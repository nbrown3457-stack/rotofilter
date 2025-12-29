/* =============================================================================
   src/app/config/stats.ts
   (Full File: Types + Safe Range Configs)
============================================================================= */

export type StatKey = 
  // TRADITIONAL (ROTO)
  | "g" | "pa" | "ab" | "hr" | "rbi" | "r" | "sb" | "avg" | "obp" | "slg" | "ops" | "w" | "l" | "sv" | "hld" | "era" | "whip" | "so" | "ip"
  // POWER
  | "exit_velocity_avg" | "hard_hit_pct" | "barrel_pct" | "max_exit_velocity" | "ev_90" | "barrels" | "barrels_per_pa" | "launch_angle_avg" | "iso" | "hr_per_600"
  // HIT & EXPECTED
  | "xba" | "xslg" | "xwoba" | "woba" | "savant_ba" | "savant_slg" | "contact_pct" | "sweet_spot_pct" | "zone_contact_pct" | "launch_angle_dist" | "xwoba_con"
  // APPROACH
  | "bb_pct" | "k_pct" | "chase_pct" | "swing_pct" | "whiff_pct" | "called_strike_pct" | "csw_pct" | "zone_swing_pct"
  // SPEED
  | "sprint_speed" | "bolts" | "speed_percentile" | "top_speed" | "home_to_first" | "bsr" | "extra_base_pct" | "sb_per_pa"
  // PROFILE
  | "age" | "bats" | "throws" | "positions" | "level" | "mlb_eta" | "park_factor" | "adj_exit_velocity"
  // DEFENSE
  | "oaa" | "fielding_runs" | "arm_strength" | "arm_value" | "reaction_time" | "burst" | "route_efficiency" | "pop_time"
  // PITCH SHAPE
  | "velocity" | "spin_rate" | "ivb" | "h_break" | "vert_break" | "spin_axis" | "putaway_pct" | "gb_pct_pitch" | "xwoba_pitch"
  // OUTCOMES
  | "xba_allowed" | "xslg_allowed" | "xwoba_allowed" | "xera" | "clutch_xwoba" | "wrc_plus"
  // MECHANICS & MISC
  | "release_point_xyz" | "extension" | "percentile_rank";

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
  format?: string;
}

export const STATS: Record<StatKey, StatConfig> = {
  /* 🟩 TRADITIONAL (ROTO) */
  g:   { label: "Games", description: "Games Played", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 163 },
  pa:  { label: "PA", description: "Plate Appearances", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 10, min: 0, max: 750 },
  ab:  { label: "AB", description: "At Bats", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 10, min: 0, max: 700 },
  hr:  { label: "HR", description: "Home Runs", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 80 },
  rbi: { label: "RBI", description: "Runs Batted In", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 160 },
  r:   { label: "Runs", description: "Runs Scored", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 150 },
  sb:  { label: "SB", description: "Stolen Bases", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 100 },
  avg: { label: "AVG", description: "Batting Average", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 0.450 },
  obp: { label: "OBP", description: "On-Base Percentage", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 0.600 },
  slg: { label: "SLG", description: "Slugging Percentage", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 0.900 },
  ops: { label: "OPS", description: "On-Base + Slugging", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 1.500 },

  /* PITCHING TRADITIONAL */
  w:    { label: "Wins", description: "Wins", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 25 },
  l:    { label: "Losses", description: "Losses", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "lower", step: 1, min: 0, max: 25 },
  sv:   { label: "Saves", description: "Saves", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 65 },
  hld:  { label: "Holds", description: "Holds", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 50 },
  era:  { label: "ERA", description: "Earned Run Average", isPaid: false, unit: "raw", defaultValue: 10, goodDirection: "lower", step: 0.05, min: 0, max: 15.00 },
  whip: { label: "WHIP", description: "Walks+Hits per IP", isPaid: false, unit: "raw", defaultValue: 3, goodDirection: "lower", step: 0.01, min: 0, max: 3.00 },
  so:   { label: "SO", description: "Strikeouts (Raw)", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 5, min: 0, max: 350 },
  ip:   { label: "IP", description: "Innings Pitched", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 5, min: 0, max: 250 },

  /* 🟩 POWER */
  exit_velocity_avg: { label: "Avg EV", description: "Average Exit Velocity", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 110 },
  hard_hit_pct:      { label: "Hard-Hit %", description: "% of balls hit 95+ mph", isPaid: false, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.5, min: 0, max: 80 },
  barrel_pct:        { label: "Barrel %", description: "% of contact hit perfectly", isPaid: false, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 40 },
  max_exit_velocity: { label: "Max EV", description: "Hardest ball hit", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 130 },
  ev_90:             { label: "90th EV", description: "Typical hardest contact", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 120 },
  barrels:           { label: "Barrels", description: "Total elite contacts", isPaid: true, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 100 },
  barrels_per_pa:    { label: "Barrels/PA", description: "Barrels per plate appearance", isPaid: true, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 25 },
  launch_angle_avg:  { label: "Launch Angle", description: "Avg Vertical contact angle", isPaid: true, unit: "degree", defaultValue: 0, goodDirection: "higher", step: 0.5, min: -30, max: 40 },
  iso:               { label: "ISO", description: "Isolated Power", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 0.500 },
  hr_per_600:        { label: "HR/600", description: "Home Run pace per 600 PAs", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 100 },

  /* 🟩 HIT & EXPECTED */
  xba: { label: "xBA", description: "Expected Batting Average", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 0.500 },
  xslg: { label: "xSLG", description: "Expected Slugging", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 1.000 },
  xwoba: { label: "xwOBA", description: "Expected wOBA", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 0.600 },
  woba: { label: "wOBA", description: "Weighted On-Base Average", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 0.600 },
  savant_ba: { label: "BA (Savant)", description: "Batting Average (Savant Source)", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 0.500 },
  savant_slg: { label: "SLG (Savant)", description: "Slugging (Savant Source)", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 1.000 },
  
  contact_pct: { label: "Contact %", description: "Contact per swing", isPaid: false, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.5, min: 0, max: 100 },
  sweet_spot_pct: { label: "SwSpot %", description: "Sweet Spot %", isPaid: false, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.5, min: 0, max: 70 },
  zone_contact_pct: { label: "Zone Con %", description: "Contact on strikes", isPaid: true, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.5, min: 0, max: 100 },
  launch_angle_dist: { label: "LA Spread", description: "Consistency of angles", isPaid: true, unit: "raw", defaultValue: 50, goodDirection: "lower", step: 0.1, min: 0, max: 100 },
  xwoba_con: { label: "xwOBAcon", description: "xwOBA on Contact", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.001, min: 0, max: 0.800 },

  /* 🟩 APPROACH */
  bb_pct: { label: "BB %", description: "Walk Rate", isPaid: false, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 40 },
  k_pct: { label: "K %", description: "Strikeout Rate", isPaid: false, unit: "percent", defaultValue: 100, goodDirection: "lower", step: 0.1, min: 0, max: 100 },
  chase_pct: { label: "Chase %", description: "O-Swing %", isPaid: false, unit: "percent", defaultValue: 100, goodDirection: "lower", step: 0.5, min: 0, max: 100 },
  swing_pct: { label: "Swing %", description: "Overall Swing Rate", isPaid: true, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.5, min: 0, max: 100 },
  zone_swing_pct: { label: "Z-Swing %", description: "Swings at strikes", isPaid: true, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.5, min: 0, max: 100 },
  whiff_pct: { label: "Whiff %", description: "Misses per swing", isPaid: true, unit: "percent", defaultValue: 100, goodDirection: "lower", step: 0.5, min: 0, max: 100 },
  called_strike_pct: { label: "C-Strike %", description: "Taken strikes", isPaid: true, unit: "percent", defaultValue: 100, goodDirection: "lower", step: 0.1, min: 0, max: 100 },
  csw_pct: { label: "CSW %", description: "Called + swinging strikes", isPaid: true, unit: "percent", defaultValue: 100, goodDirection: "lower", step: 0.1, min: 0, max: 100 },

  /* 🟩 SPEED */
  sprint_speed: { label: "Sprint Spd", description: "Top running speed (ft/s)", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 10, max: 32 },
  bolts: { label: "Bolts", description: "Sprints > 30ft/s", isPaid: true, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 100 },
  speed_percentile: { label: "Spd %tile", description: "Speed vs league", isPaid: false, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 100 },
  top_speed: { label: "Top Speed", description: "Fastest recorded speed", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 35 },
  home_to_first: { label: "Home-1st", description: "Seconds home to first", isPaid: true, unit: "time", defaultValue: 6.0, goodDirection: "lower", step: 0.01, min: 3.5, max: 6.0 },
  bsr: { label: "BsR", description: "Baserunning Runs", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: -20, max: 20 },
  extra_base_pct: { label: "X-Base %", description: "Taking extra bases", isPaid: true, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 100 },
  sb_per_pa: { label: "SB/PA", description: "Stolen Bases per PA", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.01, min: 0, max: 0.50 },

  /* 🟩 PROFILE */
  age: { label: "Age", description: "Player age", isPaid: false, unit: "year", defaultValue: 45, goodDirection: "lower", step: 1, min: 16, max: 50 },
  bats: { label: "Bats", description: "Batting Side", isPaid: false, unit: "categorical", defaultValue: 0, goodDirection: "higher", min: 0, max: 1 },
  throws: { label: "Throws", description: "Pitching Hand", isPaid: false, unit: "categorical", defaultValue: 0, goodDirection: "higher", min: 0, max: 1 },
  positions: { label: "Pos", description: "Defensive roles", isPaid: false, unit: "categorical", defaultValue: 0, goodDirection: "higher", min: 0, max: 10 },
  level: { label: "Lvl", description: "Level", isPaid: false, unit: "categorical", defaultValue: 0, goodDirection: "higher", min: 0, max: 10 },
  mlb_eta: { label: "ETA", description: "Estimated call-up", isPaid: true, unit: "year", defaultValue: 2025, goodDirection: "lower", step: 1, min: 2024, max: 2030 },
  park_factor: { label: "Park Fac", description: "Park Factor (100 = Avg)", isPaid: true, unit: "index", defaultValue: 0, goodDirection: "higher", step: 1, min: 80, max: 120 },
  adj_exit_velocity: { label: "Adj EV", description: "Park-Adjusted EV", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 110 },

  /* 🟩 DEFENSE */
  oaa: { label: "OAA", description: "Outs Above Average", isPaid: false, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: -30, max: 30 },
  fielding_runs: { label: "Field Run", description: "Fielding Runs Prevented", isPaid: true, unit: "count", defaultValue: 0, goodDirection: "higher", step: 1, min: -30, max: 30 },
  arm_strength: { label: "Arm Str", description: "Arm Strength (mph)", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 1, min: 50, max: 105 },
  arm_value: { label: "Arm Val", description: "Arm Value (runs)", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: -20, max: 20 },
  reaction_time: { label: "Reaction", description: "Reaction Time (ft)", isPaid: true, unit: "time", defaultValue: 3.0, goodDirection: "lower", step: 0.01, min: 0, max: 5.0 },
  burst: { label: "Burst", description: "Burst (ft)", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 25 },
  route_efficiency: { label: "Route %", description: "Route Efficiency", isPaid: true, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.5, min: 0, max: 100 },
  pop_time: { label: "Pop Time", description: "Pop Time (sec)", isPaid: true, unit: "time", defaultValue: 2.5, goodDirection: "lower", step: 0.01, min: 1.80, max: 2.50 },

  /* 🟩 PITCH SHAPE */
  velocity: { label: "Velo", description: "Fastball Velocity", isPaid: false, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.5, min: 60, max: 106 },
  spin_rate: { label: "Spin", description: "Spin Rate (rpm)", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 10, min: 0, max: 3500 },
  ivb: { label: "IVB", description: "Induced Vertical Break", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.5, min: -10, max: 25 },
  h_break: { label: "H-Break", description: "Horizontal Break", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.5, min: 0, max: 30 },
  vert_break: { label: "Vert", description: "Vertical Break", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 60 },
  spin_axis: { label: "Axis", description: "Spin Axis", isPaid: true, unit: "degree", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 360 },
  putaway_pct: { label: "PutAway%", description: "PutAway Percent", isPaid: true, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 50 },
  gb_pct_pitch: { label: "GB%", description: "Ground Ball %", isPaid: true, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 100 },
  xwoba_pitch: { label: "xwOBA (P)", description: "xwOBA by Pitch", isPaid: true, unit: "index", defaultValue: 500, goodDirection: "lower", step: 1, min: 0, max: 600 },

  /* 🟩 OUTCOMES & MISC */
  xba_allowed: { label: "xBA Against", description: "Expected Avg Allowed", isPaid: true, unit: "percent", defaultValue: 500, goodDirection: "lower", step: 1, min: 0, max: 500 },
  xslg_allowed: { label: "xSLG Against", description: "Expected SLG Allowed", isPaid: true, unit: "percent", defaultValue: 1000, goodDirection: "lower", step: 1, min: 0, max: 1000 },
  xwoba_allowed: { label: "xwOBA Against", description: "Expected wOBA Allowed", isPaid: true, unit: "index", defaultValue: 500, goodDirection: "lower", step: 1, min: 0, max: 600 },
  xera: { label: "xERA", description: "Expected ERA", isPaid: true, unit: "raw", defaultValue: 10, goodDirection: "lower", step: 0.05, min: 0, max: 10.00 },
  clutch_xwoba: { label: "Clutch", description: "Clutch xwOBA", isPaid: true, unit: "index", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 600 },
  wrc_plus: { label: "wRC+", description: "Weighted Runs Created +", isPaid: false, unit: "index", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 250 },
  
  release_point_xyz: { label: "Rel Pt", description: "Release Point", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 0, max: 8.0 },
  extension: { label: "Extension", description: "Extension", isPaid: true, unit: "raw", defaultValue: 0, goodDirection: "higher", step: 0.1, min: 4.0, max: 8.0 },
  percentile_rank: { label: "Rank", description: "Percentile Rank", isPaid: true, unit: "percent", defaultValue: 0, goodDirection: "higher", step: 1, min: 0, max: 100 },
};