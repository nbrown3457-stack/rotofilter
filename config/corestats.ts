/* =============================================================================
   src/app/config/corestats.ts
   (Maps Stats to the New "Pro Layout" Categories)
============================================================================= */
import type { StatKey } from "./stats";

export const CORE_STATS: Record<string, StatKey[]> = {
  profile: [
    "age", "bats", "throws", "park_factor", "mlb_eta", "positions", "level"
  ],
  std_hit: [
    "g", "pa", "ab", "hr", "rbi", "r", "sb", "avg", "ops", "obp", "slg", "iso"
  ],
  power: [
    "exit_velocity_avg", "hard_hit_pct", "barrel_pct", "max_exit_velocity", "ev_90", 
    "barrels", "barrels_per_pa", "launch_angle_avg", "hr_per_600", "adj_exit_velocity"
  ],
  discipline: [ // Approach
    "k_pct", "bb_pct", "chase_pct", "whiff_pct", "swing_pct", "zone_swing_pct", 
    "contact_pct", "zone_contact_pct", "csw_pct"
  ],
  quality: [ // Expected Stats
    "xba", "xwoba", "xslg", "woba", "xwoba_con", "sweet_spot_pct", "savant_ba", "savant_slg"
  ],
  speed: [
    "sprint_speed", "bolts", "sb_per_pa", "speed_percentile", "top_speed", 
    "home_to_first", "bsr"
  ],
  std_pitch: [
    "w", "l", "sv", "hld", "era", "whip", "so", "ip", "g"
  ],
  shape: [ // Pitch Characteristics
    "velocity", "spin_rate", "ivb", "h_break", "vert_break", "spin_axis", 
    "extension", "release_point_xyz"
  ],
  pitch_out: [ // Advanced Pitching Results
    "xera", "xba_allowed", "xwoba_allowed", "xslg_allowed", "xwoba_pitch", 
    "putaway_pct", "gb_pct_pitch"
  ],
  defense: [
    "oaa", "fielding_runs", "arm_strength", "arm_value", "pop_time", "route_efficiency"
  ]
};