/* =============================================================================
   src/app/utils/playerAnalysis.ts
   UPDATED: Now passes 'prior_stats' to the engine for Multi-Year Blending
============================================================================= */

import { STATS } from "../../config/stats"; 
import { calculateHitterRatings, calculatePitcherRatings } from "./ratingAlgorithms";

export type DateRangeOption = "custom" | "pace_season" | "yesterday" | "last_7" | "last_30" | "last_90" | "season_curr" | "season_last";

// --- HELPERS ---
export const toTitleCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

export const getTools = (p: any) => {
  const tools = [];
  const s = p.stats || {};
  const isPitcher = ['SP', 'RP', 'P'].includes(p.position);

  if (isPitcher) {
    if (parseFloat(s.k_pct) > 28.0) tools.push({ label: "K", color: "#d32f2f", name: "K-Artist" });
    if (parseFloat(s.era) < 3.20) tools.push({ label: "A", color: "#FFD700", name: "Ace" });
    if (parseFloat(s.bb_pct) < 6.0) tools.push({ label: "C", color: "#4caf50", name: "Control" });
    if (parseFloat(s.whip) < 1.10) tools.push({ label: "D", color: "#2196f3", name: "Dominant" });
    if (parseFloat(s.sv) >= 20) tools.push({ label: "S", color: "#e65100", name: "Stopper" });
  } else {
    if (parseFloat(s.avg) >= 0.275) tools.push({ label: "H", color: "#4caf50", name: "Hit" });
    if (parseFloat(s.iso) > 0.200) tools.push({ label: "P", color: "#f44336", name: "Power" });
    if (parseFloat(s.sprint_speed) > 28.0) tools.push({ label: "S", color: "#2196f3", name: "Speed" });
    if (parseFloat(s.bb_pct) > 10.0) tools.push({ label: "D", color: "#ff9800", name: "Discipline" });
    if (parseFloat(s.ops) > 0.800) tools.push({ label: "C", color: "#9c27b0", name: "Context" });
  }
  return tools;
};

export const getTrajectory = (p: any) => {
  const s = p.stats || {};
  if (['SP', 'RP', 'P'].includes(p.position)) {
      if (!s.era || !s.ip) return null;
      if (parseFloat(s.era) < 2.50 && parseFloat(s.ip) > 20) return { label: "CY YOUNG PACE", color: "#FFD700", bg: "#fff8e1" };
      if (parseFloat(s.k_pct) > 35) return { label: "ELITE K%", color: "#d32f2f", bg: "#ffebee" };
      return null;
  }
  if (s.hr === undefined) return null;
  const hr = parseFloat(s.hr);
  const ab = parseFloat(s.ab || 0); 
  if (ab < 50) return null;
  const pace = (hr / ab) * 600;
  if (pace >= 35) return { label: `ELITE PACE`, color: "#4caf50", bg: "#e8f5e9" }; 
  return null;
};

// --- CORE LOGIC ---
export const enrichPlayerData = (p: any, dateRange: DateRangeOption) => {
  // SAFETY CHECK: Return basic structure if stats are missing
  if (!p.stats || Object.keys(p.stats).length === 0) {
      return { ...p, rotoScore: 0, dynaScore: 0, pointsScore: 0, rangeScore: 0, stats: {}, popupData: {} };
  }

  const s = p.stats;
  const isPitcher = ['SP', 'RP', 'P'].includes(p.position) || (parseFloat(s.ip || 0) > 0);
  const age = parseInt(p.info?.age || 27);

  // 1. DEFINE DATA BUCKETS
  const season = dateRange === 'season_curr' ? s : (p.season_stats || s);
  const prior = p.prior_stats || {};

  // 2. PACE CALCULATION
  let ps = { ...s };
  const hasMinActivity = isPitcher ? parseFloat(s.ip || 0) > 2 : parseFloat(s.ab || 0) > 10;

  if (hasMinActivity) {
    if (isPitcher) {
      const targetIP = p.position === 'RP' ? 65 : 180;
      const mult = parseFloat(s.ip) > 0 ? targetIP / parseFloat(s.ip) : 0;
      if(mult > 0 && mult < 20) { 
        ps.so = Math.round(parseFloat(s.so || 0) * mult);
        ps.w = Math.round(parseFloat(s.w || 0) * mult);
        ps.sv = Math.round(parseFloat(s.sv || 0) * mult);
        ps.ip = targetIP;
      }
    } else {
      const targetAB = 600;
      const mult = parseFloat(s.ab) > 0 ? targetAB / parseFloat(s.ab) : 0;
      if(mult > 0 && mult < 20) {
        ps.hr = Math.round(parseFloat(s.hr || 0) * mult);
        ps.rbi = Math.round(parseFloat(s.rbi || 0) * mult);
        ps.sb = Math.round(parseFloat(s.sb || 0) * mult);
        ps.r = Math.round(parseFloat(s.r || 0) * mult);
        ps.ab = targetAB;
      }
    }
  }

  // 3. DETERMINE TABLE DISPLAY STATS
  const displayStats = dateRange === 'pace_season' ? ps : s;

  // 4. ✅ NEW SCORING ENGINE (Multi-Year Blended)
  // scoreStats = The stats we want to GRADE (Pace or Actual)
  // rawStats   = The stats we use to judge RELIABILITY (Always Actual 's')
  // priorStats = The stats we use to FILL GAPS (2024 data)
  
  const scoreStats = dateRange === 'pace_season' ? ps : s;
  const rawStats = s; 
  const priorStats = p.prior_stats || {}; 

  let ratings;

  if (isPitcher) {
    const g = parseFloat(s.g || 1);
    const ip = parseFloat(s.ip || 0);
    const isStarter = p.position === 'SP' || (ip / g > 3.0);
    
    // Pass ALL context to the Pitcher Engine
    ratings = calculatePitcherRatings(scoreStats, rawStats, priorStats, age, isStarter);
  } else {
    // Pass ALL context to the Hitter Engine
    ratings = calculateHitterRatings(scoreStats, rawStats, priorStats, age);
  }

  return { 
    ...p, 
    stats: displayStats,
    popupData: {
        season: season,     
        prior: prior,       
        range: s            
    },
    // Map the new engine results to your UI props
    rotoScore: ratings.roto, 
    dynaScore: ratings.dyna, 
    pointsScore: ratings.points,
    rangeScore: ratings.overall // Overall is the new Range
  };
};