/* =============================================================================
   src/app/config/corestats.ts
   (Matches keys in src/app/config/stats.ts exactly)
============================================================================= */
import type { StatKey } from "./stats";

export const CORE_STATS: Record<string, StatKey[]> = {
  // Add this new section at the top
  standard: [
    "hr",
    "rbi",
    "r",
    "sb",
    "avg",
    "ops",
  ],
  power: [
    "exit_velocity_avg",
    "hard_hit_pct",
    "barrel_pct",
    "launch_angle_avg",
    "iso",
    "hr_per_600",
  ],
  hit: [
    "xba",
    "contact_pct",
    "sweet_spot_pct",
    "zone_contact_pct",
    "o_contact_pct",
    "launch_angle_dist",
    "xwoba_con",
  ],
  approach: [
    "bb_pct",
    "k_pct",
    "swing_pct",
    "o_swing_pct", // <--- CHANGED from "chase_pct"
    "whiff_pct",
    "csw_pct",
  ],
  speed: [
    "sprint_speed",
    "sb",
    "sb_per_pa",
    "speed_percentile",
  ],
  pitch_shape: [
    "pitch_velocity",
    "spin_rate",
    "ivb",
    "horiz_break",
    "pitch_whiff_pct",
  ],
  pitch_results: [
    "era",
    "xera",
    "so",
    "k_pct",
    "bb_pct",
    "whip",
  ]
};