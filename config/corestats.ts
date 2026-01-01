/* =============================================================================
   src/app/config/corestats.ts
   (Corrected Mapping for Page.tsx Compatibility)
============================================================================= */
import type { StatKey } from "./stats";

export const CORE_STATS: Record<string, StatKey[]> = {
  // --- 1. POPULAR (Matches 'popular' tab) ---
  popular: [
    "hr", "sb", "avg", "ops", "wrc_plus", 
    "era", "whip", "so", "sv", "stuff_plus", 
    "barrel_pct", "k_pct"
  ],

  // --- 2. BATTER PROFILE (Matches 'profile' tab) ---
  profile: [
    "age", "bats", "throws", "park_factor", "mlb_eta", "positions", "level"
  ],

  // --- 3. STANDARD BATTING (Matches 'std_hit' tab) ---
  std_hit: [
    "g", "pa", "ab", "hr", "rbi", "r", "sb", "avg", "ops", "obp", "slg", "iso"
  ],

  // --- 4. POWER (Matches 'power' tab) ---
  power: [
    "exit_velocity_avg", "hard_hit_pct", "barrel_pct", "max_exit_velocity", "ev_90", 
    "barrels", "barrels_per_pa", "launch_angle_avg", "hr_per_600", "adj_exit_velocity"
  ],

  // --- 5. DISCIPLINE (Matches 'discipline' tab) ---
  discipline: [
    "k_pct", "bb_pct", "chase_pct", "swing_pct", "zone_swing_pct", "called_strike_pct"
  ],

  // --- 6. CONTACT (Matches 'contact' tab - CRITICAL FIX) ---
  contact: [
    "contact_pct", "zone_contact_pct", "whiff_pct", "csw_pct", "sweet_spot_pct", "foul_percent"
  ],

  // --- 7. SPEED (Matches 'speed' tab) ---
  speed: [
    "sprint_speed", "bolts", "sb_per_pa", "speed_percentile", "top_speed", 
    "home_to_first", "bsr"
  ],

  // --- 8. STANDARD PITCHING (Matches 'std_pitch' tab) ---
  std_pitch: [
    "w", "l", "sv", "hld", "era", "whip", "so", "ip", "g", "k_bb_ratio"
  ],

  // --- 9. PITCH SHAPE (Matches 'pitch_shape' tab - CRITICAL FIX) ---
  pitch_shape: [
    "stuff_plus", "velocity", "spin_rate", "ivb", "h_break", "vert_break", "spin_axis", 
    "extension", "release_point_xyz"
  ],

  // --- 10. PITCH OUTCOMES (Matches 'pitch_outcomes' tab - CRITICAL FIX) ---
  pitch_outcomes: [
    "xera", "xba_allowed", "xwoba_allowed", "xslg_allowed", "xwoba_pitch", 
    "putaway_pct", "gb_pct_pitch", "csw_pct", "whiff_pct"
  ],

  // --- 11. QUALITY/EXPECTED (Optional extra) ---
  quality: [
    "xba", "xwoba", "xslg", "woba", "xwoba_con", "savant_ba", "savant_slg"
  ],

  // --- 12. DEFENSE (Optional extra) ---
  defense: [
    "oaa", "fielding_runs", "arm_strength", "arm_value", "pop_time", "route_efficiency"
  ]
};