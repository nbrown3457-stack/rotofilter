/* =============================================================================
   src/app/utils/ratingAlgorithms.ts
   UPDATED: Added Multi-Year Blending ("Career Inertia")
============================================================================= */

import { STATS, StatKey } from "@/config/stats";

export interface Ratings {
  overall: number; 
  dyna: number;    
  roto: number;    
  points: number;  
}

// 1. NORMALIZATION
const normalize = (key: StatKey, val: number): number => {
  const config = STATS[key];
  if (!config || val === undefined || val === null) return 200;

  let min = config.min || 0;
  let max = config.max || 100;

  if (key === 'wrc_plus') { min = 75; max = 170; } 
  if (key === 'xwoba') { min = 0.280; max = 0.440; }
  if (key === 'avg') { min = 0.210; max = 0.330; }
  if (key === 'era') { min = 2.50; max = 5.00; } 
  if (key === 'whip') { min = 0.90; max = 1.45; }

  const isLowerBetter = config.goodDirection === "lower";
  const safeVal = Math.max(min, Math.min(val, max));

  let ratio = (safeVal - min) / (max - min);
  if (isLowerBetter) ratio = 1 - ratio;
  
  return ratio * 1000;
};

// 2. THE BLENDER (Stabilization Logic)
// Mixes Current Season with Prior Season based on volume.
// weight = 0.0 to 1.0 (How much we trust the CURRENT season)
const getBlendedStat = (key: string, current: any, prior: any, weight: number) => {
  const currVal = parseFloat(current?.[key]);
  const priorVal = parseFloat(prior?.[key]);

  // If we have no data for either, return null (so normalize returns baseline)
  if (isNaN(currVal) && isNaN(priorVal)) return null;

  // If current is missing, use prior (regressed slightly)
  if (isNaN(currVal)) return isNaN(priorVal) ? null : priorVal;

  // If prior is missing (Rookie), we rely 100% on current (which gets punished by reliability later)
  if (isNaN(priorVal)) return currVal;

  // BLEND: (Current * Weight) + (Prior * (1 - Weight))
  return (currVal * weight) + (priorVal * (1 - weight));
};

const getWeightedScore = (
  stats: any, 
  priorStats: any,
  weights: Partial<Record<StatKey, number>>,
  trustFactor: number, // 0.0 (Use Prior) to 1.0 (Use Current)
  reliability: number // Overall sample size penalty
): number => {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (typeof weight !== 'number') continue;

    // BLEND THE STAT
    const blendedVal = getBlendedStat(key, stats, priorStats, trustFactor);
    
    // Normalize the blended value
    // @ts-ignore
    let score = normalize(key as StatKey, blendedVal);

    // Hard Cap for small samples still applies
    if (['wrc_plus', 'xwoba', 'avg', 'ops', 'k_pct', 'era', 'whip'].includes(key)) {
       if (reliability < 0.5) score = Math.min(score, 700); // Cap "Luck"
    }

    totalScore += score * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? 200 : Math.round(totalScore / totalWeight);
};

// 3. TRUST FACTOR (How much do we trust 2025 data?)
const getTrustFactor = (rawStats: any, isPitcher: boolean): number => {
  if (isPitcher) {
    const ip = parseFloat(rawStats.ip || 0);
    // 100 IP needed to ignore last year completely
    return Math.min(1, ip / 100); 
  } else {
    const pa = parseFloat(rawStats.pa || 0);
    // 400 PA needed to ignore last year completely
    return Math.min(1, pa / 400);
  }
};

// ... (Keep getReliability, getDynastyMultiplier, getVolumeBonus exactly as before) ...
const getReliability = (rawStats: any, isPitcher: boolean): number => {
  if (isPitcher) {
    const ip = parseFloat(rawStats.ip || 0);
    if (ip < 15) return 0.0; 
    const ratio = Math.min(1, (ip - 15) / 135);
    return Math.pow(ratio, 2.0); 
  } else {
    const pa = parseFloat(rawStats.pa || 0);
    if (pa < 50) return 0.0;
    const ratio = Math.min(1, (pa - 50) / 550); 
    return Math.pow(ratio, 2.0);
  }
};

const getDynastyMultiplier = (age: number, isPitcher: boolean): number => {
  if (isPitcher) {
    if (age <= 23) return 1.10;
    if (age <= 27) return 1.00;
    if (age <= 30) return 0.85;
    if (age <= 33) return 0.50; 
    return 0.20; 
  }
  if (age <= 22) return 1.40; 
  if (age <= 25) return 1.25; 
  if (age <= 29) return 1.00; 
  if (age <= 31) return 0.80; 
  if (age <= 34) return 0.40; 
  return 0.15; 
};

const getVolumeBonus = (stats: any, isPitcher: boolean): number => {
  if (isPitcher) {
     const ip = parseFloat(stats.ip || 0);
     return Math.min(150, (ip / 180) * 150); 
  } else {
     const pa = parseFloat(stats.pa || 0);
     return Math.min(150, (pa / 600) * 150); 
  }
};

// =============================================================================
// HITTER ALGORITHMS (BLENDED)
// =============================================================================
export const calculateHitterRatings = (stats: any, rawStats: any, priorStats: any, age: number): Ratings => {
  
  const reliability = getReliability(rawStats, false);
  const trustFactor = getTrustFactor(rawStats, false); // New blending factor

  // A. OVERALL
  // We pass 'trustFactor' to blend 2025 vs 2024 stats
  let overall = getWeightedScore(stats, priorStats, {
    wrc_plus: 3.5, xwoba: 2.5, oaa: 0.5, bsr: 0.5, k_pct: 0.5
  }, trustFactor, reliability);

  // If we rely heavily on prior stats (trustFactor < 0.5), we INCREASE reliability
  // because we are using a larger sample size (Last Year).
  // "Effective Reliability" = Current Reliability + (Base Reliability of Prior Stats * (1-Trust))
  const effectiveReliability = Math.max(reliability, 0.8 * (1 - trustFactor));

  // Blend with baseline using the NEW effective reliability
  // This saves Veterans early in the season!
  overall = (overall * effectiveReliability) + (250 * (1 - effectiveReliability));
  overall += getVolumeBonus(stats, false);

  // B. DYNASTY
  let tools = getWeightedScore(stats, priorStats, {
    max_exit_velocity: 2.0, sprint_speed: 1.5, barrel_pct: 1.5
  }, trustFactor, reliability);

  const toolsTrust = 0.2 + (0.8 * effectiveReliability); 
  const regressedTools = (tools * toolsTrust) + (250 * (1 - toolsTrust));

  let talentBase = (overall * effectiveReliability) + (regressedTools * (1 - effectiveReliability));

  // Synergy Bonus
  const power = normalize('barrel_pct', parseFloat(stats.barrel_pct));
  const speed = normalize('sprint_speed', parseFloat(stats.sprint_speed));
  if (power > 600 && speed > 600 && effectiveReliability > 0.5) talentBase += 75;

  const ageMult = getDynastyMultiplier(age, false);
  let dyna = 200 + ((talentBase - 200) * ageMult);

  // C. ROTO & POINTS (Usually focused on CURRENT year, so we trust 'stats' more)
  // But we still blend slightly to prevent wild swings.
  const roto = getWeightedScore(stats, priorStats, {
    avg: 1.5, hr: 2.0, sb: 2.5, r: 1.0, rbi: 1.0
  }, Math.max(trustFactor, 0.5), reliability); // Floor trust at 50% for Redraft

  const points = getWeightedScore(stats, priorStats, {
    woba: 3.0, k_pct: 2.0, bb_pct: 1.0, pa: 1.0 
  }, Math.max(trustFactor, 0.5), reliability);

  return { 
    overall: Math.floor(Math.min(1000, overall)), 
    dyna: Math.floor(Math.min(1000, dyna)), 
    roto: Math.floor(Math.min(1000, roto)), 
    points: Math.floor(Math.min(1000, points)) 
  };
};

// =============================================================================
// PITCHER ALGORITHMS (BLENDED)
// =============================================================================
export const calculatePitcherRatings = (stats: any, rawStats: any, priorStats: any, age: number, isStarter: boolean): Ratings => {
  
  const reliability = getReliability(rawStats, true);
  const trustFactor = getTrustFactor(rawStats, true);

  let overall = getWeightedScore(stats, priorStats, {
    xera: 2.5, whip: 2.0, so: 1.5, xwoba_allowed: 1.0
  }, trustFactor, reliability);

  const effectiveReliability = Math.max(reliability, 0.8 * (1 - trustFactor));

  overall = (overall * effectiveReliability) + (250 * (1 - effectiveReliability));
  overall = overall * 0.70; // Pitcher Tax
  overall += getVolumeBonus(stats, true);

  let stuff = getWeightedScore(stats, priorStats, {
    velocity: 2.5, spin_rate: 1.0, ivb: 1.5, k_pct: 2.0
  }, trustFactor, reliability);

  const stuffTrust = 0.3 + (0.7 * effectiveReliability);
  const regressedStuff = (stuff * stuffTrust) + (250 * (1 - stuffTrust));

  let talentBase = (overall * effectiveReliability) + (regressedStuff * (1 - effectiveReliability));
  
  const ageMult = getDynastyMultiplier(age, true);
  let dyna = 200 + ((talentBase - 200) * ageMult);
  dyna = dyna * 0.90; 

  let roto = getWeightedScore(stats, priorStats, {
    era: 1.2, whip: 1.2, so: 1.0,
    w: isStarter ? 2.0 : 0.5,
    sv: isStarter ? 0 : 3.0,
    hld: isStarter ? 0 : 1.5
  }, Math.max(trustFactor, 0.5), reliability);
  
  roto = roto * 0.85;

  const points = getWeightedScore(stats, priorStats, {
    ip: isStarter ? 4.0 : 1.0, so: 2.0, w: 1.0, bb_pct: 1.5, era: 1.0
  }, Math.max(trustFactor, 0.5), reliability);

  return { 
    overall: Math.floor(Math.min(1000, overall)), 
    dyna: Math.floor(Math.min(1000, dyna)), 
    roto: Math.floor(Math.min(1000, roto)), 
    points: Math.floor(Math.min(1000, points)) 
  };
};