/* =============================================================================
   src/app/utils/playerAnalysis.ts
============================================================================= */
import { STATS } from "../../config/stats"; 

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

export const getStatBounds = (key: string, unit: string) => {
  if (key === "age") return { min: 18, max: 45, step: 1 };
  const bounds: Record<string, any> = {
    exit_velocity_avg: { min: 80, max: 100, step: 0.1 },
    sprint_speed: { min: 20, max: 32, step: 0.1 },
    wrc_plus: { min: 50, max: 200, step: 1 },
    xwoba: { min: 0.200, max: 0.500, step: 0.005 },
    iso: { min: 0, max: 0.400, step: 0.005 },
  };
  return bounds[key] || { min: 0, max: 100, step: 1 }; 
};

// --- CORE LOGIC ---
export const enrichPlayerData = (p: any, dateRange: DateRangeOption) => {
  // SAFETY CHECK: Return basic structure if stats are missing
  if (!p.stats || Object.keys(p.stats).length === 0) {
      return { ...p, rotoScore: 0, dynaScore: 0, pointsScore: 0, rangeScore: 0, stats: {}, popupData: {} };
  }

  const s = p.stats;
  const isPitcher = ['SP', 'RP', 'P'].includes(p.position);
  const age = parseInt(p.info?.age || 27);

  // 1. DEFINE DATA BUCKETS
  // Season: Try to find actual season stats, otherwise use current stats 's'
  const season = dateRange === 'season_curr' ? s : (p.season_stats || s);
  
  // Prior: Try to find prior stats, default to empty
  const prior = p.prior_stats || {};

  // 2. PACE CALCULATION
  let ps = { ...s };
  const hasMinActivity = isPitcher ? parseFloat(s.ip || 0) > 2 : parseFloat(s.ab || 0) > 10;

  if (hasMinActivity) {
    if (isPitcher) {
      const targetIP = p.position === 'RP' ? 65 : 180;
      const mult = parseFloat(s.ip) > 0 ? targetIP / parseFloat(s.ip) : 0;
      if(mult > 0 && mult < 20) { // Safety cap on multiplier
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

  // 4. SCORING ENGINE
  const getVal = (obj: any, key: string, def: number = 0) => {
    if (!obj) return def;
    return parseFloat(obj[key] || def);
  };
  
  let rotoBase = 0;
  let pointsBase = 0;

  // Use 's' (actual stats) for calculations to ensure scores aren't 0
  const scoreStats = dateRange === 'pace_season' ? ps : s;

  if (isPitcher) {
    const kVal = getVal(scoreStats, 'k_pct') * 0.8;
    const eraVal = (4.5 - getVal(scoreStats, 'era', 4.5)) * 12; 
    rotoBase = kVal + eraVal + (getVal(scoreStats, 'w') * 1.5);
    
    pointsBase = ((getVal(scoreStats, 'ip') * 3) + (getVal(scoreStats, 'so') * 1) + (getVal(scoreStats, 'w') * 5)) / 8;
  } else {
    const pwr = (getVal(scoreStats, 'hr') * 1.1);
    const spd = (getVal(scoreStats, 'sb') * 0.9);
    const eff = (getVal(scoreStats, 'ops', 0.6) - 0.6) * 120; 
    rotoBase = pwr + spd + eff;

    pointsBase = ((getVal(scoreStats, 'hr') * 4) + (getVal(scoreStats, 'rbi') * 1) + (getVal(scoreStats, 'sb') * 2)) / 4.5;
  }

  let dynaBase = rotoBase;
  if (age <= 22) dynaBase *= 1.4; 
  else if (age <= 25) dynaBase *= 1.2; 
  else if (age >= 33) dynaBase *= 0.7;

  // Range score uses strictly raw recent stats
  const rangeBase = isPitcher 
    ? (getVal(s, 'so') * 1.5) + (getVal(s, 'w') * 5)
    : (getVal(s, 'hr') * 6) + (getVal(s, 'sb') * 3);

  const norm = (v: number) => Math.min(Math.max(Math.round(v), 0), 100);

  return { 
    ...p, 
    stats: displayStats, // Used by the Table
    popupData: {
        season: season,     
        prior: prior,       
        range: s            
    },
    rotoScore: norm(rotoBase), 
    dynaScore: norm(dynaBase), 
    pointsScore: norm(pointsBase),
    rangeScore: norm(rangeBase * 1.5) 
  };
};