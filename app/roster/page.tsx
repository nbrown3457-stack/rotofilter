"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useTeam } from "../../context/TeamContext";
import { 
  Flame, 
  Activity, 
  Snowflake, 
  Trophy, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search
} from "lucide-react";

/* --- 1. CONFIGURATION & TYPES --- */

type LeagueType = 'roto' | 'points' | 'dynasty' | 'redraft';

const COLORS = {
  GREEN: "#4caf50",
  RED: "#f44336",
  GOLD: "#FFD700",
  DARK_BG: "#1a1a1a",
  CARD_BG: "#ffffff",
};

interface StatCol {
  key: string;
  label: string;
  type: 'count' | 'ratio';
  weight?: string;
  lowIsGood?: boolean;
  baseTarget?: number; // Base target for 12-team standard
}

// 12-Team Standard Targets
const BATTER_COLS: StatCol[] = [
  { key: 'r', label: 'R', type: 'count', baseTarget: 1000 },
  { key: 'hr', label: 'HR', type: 'count', baseTarget: 280 },
  { key: 'rbi', label: 'RBI', type: 'count', baseTarget: 950 },
  { key: 'sb', label: 'SB', type: 'count', baseTarget: 120 },
  { key: 'avg', label: 'AVG', type: 'ratio', weight: 'ab', baseTarget: 0.265 },
  { key: 'ops', label: 'OPS', type: 'ratio', weight: 'ab', baseTarget: 0.785 },
];

const PITCHER_COLS: StatCol[] = [
  { key: 'w', label: 'W', type: 'count', baseTarget: 85 },
  { key: 'sv', label: 'SV', type: 'count', baseTarget: 60 },
  { key: 'so', label: 'K', type: 'count', baseTarget: 1300 },
  { key: 'era', label: 'ERA', type: 'ratio', weight: 'ip', lowIsGood: true, baseTarget: 3.50 },
  { key: 'whip', label: 'WHIP', type: 'ratio', weight: 'ip', lowIsGood: true, baseTarget: 1.15 },
];

/* --- 2. CUSTOM COMPONENTS --- */

// Reusing your Rainbow Icon for consistency
const RainbowDnaIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="dnaGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f44336" />
        <stop offset="25%" stopColor="#9c27b0" />
        <stop offset="50%" stopColor="#2196f3" />
        <stop offset="75%" stopColor="#4caf50" />
        <stop offset="100%" stopColor="#ffeb3b" />
      </linearGradient>
    </defs>
    <path 
      d="M2 15c6.667-6 13.333 0 20-6M9 22c1.798-1.998 2.518-3.995 2.807-5.993M15 2c-1.798 1.998-2.518 3.995-2.807 5.993m-2.386 8.014c.193 1.998-.527 3.995-2.324 5.993M12.193 7.993C12 5.995 12.72 3.998 14.517 2" 
      stroke="url(#dnaGradient2)" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

/* --- 3. STYLES --- */
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');

    /* Rainbow Text Utility */
    .rainbow-text {
      background: linear-gradient(90deg, #f44336, #9c27b0, #2196f3, #4caf50, #ffeb3b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 900;
    }

    @keyframes pulse-gold {
      0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(255, 215, 0, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
    }
    
    .sticky-container { 
        overflow-x: auto; 
        max-width: 100vw;
        -webkit-overflow-scrolling: touch;
        border-radius: 12px;
        border: 1px solid #333;
    }
    .sticky-table { 
        width: 100%; 
        border-collapse: separate; 
        border-spacing: 0;
        white-space: nowrap; 
    }
    
    /* Sticky Headers */
    .sticky-table thead th { position: sticky; top: 0; z-index: 20; background: #1a1a1a; border-bottom: 1px solid #444; }
    
    /* Sticky First Column (Player Name) */
    .sticky-table td:nth-child(1), .sticky-table th:nth-child(1) { 
        position: sticky; 
        left: 0; 
        z-index: 30; 
        background: #111; 
        border-right: 1px solid #333;
    }
    
    .dna-toggle { padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #888; transition: all 0.2s; }
    .dna-toggle.active { background: #4caf50; color: white; border-color: #4caf50; }
    
    .grade-badge { font-family: "Orbitron", sans-serif; font-weight: 900; font-size: 24px; padding: 4px 12px; border-radius: 8px; border: 2px solid; text-shadow: 0 0 10px rgba(0,0,0,0.5); }
    .grade-A { color: #4caf50; border-color: #4caf50; background: rgba(76, 175, 80, 0.1); }
    .grade-B { color: #8bc34a; border-color: #8bc34a; background: rgba(139, 195, 74, 0.1); }
    .grade-C { color: #ff9800; border-color: #ff9800; background: rgba(255, 152, 0, 0.1); }
    .grade-D { color: #f44336; border-color: #f44336; background: rgba(244, 67, 54, 0.1); }
    
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(5px); }
    .modal-card { background: #1a1a1a; padding: 24px; border-radius: 16px; width: 100%; max-width: 500px; border: 1px solid #333; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    
    /* Expansion Animation */
    @keyframes expandRow { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .expanded-content { animation: expandRow 0.2s ease-out; }

    @media (max-width: 768px) {
        .desktop-legend { display: none; }
        .sticky-table td:nth-child(1), .sticky-table th:nth-child(1) { max-width: 120px; min-width: 120px; }
    }
  `}} />
);

/* --- 4. LOGIC HELPERS --- */
const calculatePace = (val: number, gamesPlayed: number) => {
  if (!val || !gamesPlayed) return 0;
  return (val / Math.max(gamesPlayed, 1)) * 162;
};

const getHeatmapColor = (value: number, min: number, max: number, lowIsGood = false) => {
  if (value === 0) return 'transparent';
  let pct = (value - min) / (max - min);
  if (pct < 0) pct = 0; if (pct > 1) pct = 1;
  if (lowIsGood) pct = 1 - pct;
  const hue = pct * 120; // 0=Red, 120=Green
  return `hsla(${hue}, 70%, 40%, 0.2)`;
};

const checkOffSeason = () => {
    const month = new Date().getMonth(); 
    return month >= 9 || month <= 1; // Oct-Feb
};

// --- MOCK FUNCTION FOR FREE AGENT INTELLIGENCE ---
// In production, this would query your Supabase/Yahoo logic for "available" players
const getSmartSwap = (player: any, teamWeaknesses: string[]) => {
    // Mock logic: If player is underperforming, suggest a random trending player
    const isCold = Math.random() > 0.5;
    if (!isCold) return null;

    return {
        name: "Waiver Wire Gem",
        team: "FA",
        adds: "+12%",
        reason: `Trending up in ${teamWeaknesses[0] || 'Points'}`,
        diff: "+2.1 vs Current"
    };
};

/* =============================================================================
   MAIN COMPONENT
============================================================================= */
export default function RosterDNA() {
  const supabase = createClient();
  const { activeTeam } = useTeam();
  
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffSeason, setIsOffSeason] = useState(false);
  const [mode, setMode] = useState<'totals' | 'pace'>('totals'); 
  const [view, setView] = useState<'batters' | 'pitchers'>('batters');
  
  // Interaction State
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  // League State
  const [leagueType, setLeagueType] = useState<LeagueType>('roto');
  const [showLeaguePulse, setShowLeaguePulse] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [rivalTeams, setRivalTeams] = useState<any[]>([]);
  const [viewingTeamName, setViewingTeamName] = useState<string>("");

  // --- INITIALIZATION ---
  useEffect(() => {
      const _isOff = checkOffSeason();
      setIsOffSeason(_isOff);
      if (_isOff) setMode('pace');
      if (activeTeam) setViewingTeamName((activeTeam as any).name || "My Team");
  }, [activeTeam]);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      if (!activeTeam) return;
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('league_id', activeTeam.league_key);
      params.append('team_id', activeTeam.team_key);
      
      try {
        const response = await fetch(`/api/players?${params.toString()}`);
        const data = await response.json();
        const roster = Array.isArray(data) ? data : data.players;
        
        // Filter for specific team (My Team OR Rival if viewing them)
        const myRoster = roster.filter((p: any) => 
            (p.team_id && String(p.team_id) === String(activeTeam.team_key)) ||
            (p.availability === 'MY_TEAM' && !(activeTeam as any).is_rival_view)
        );
        setPlayers(myRoster);

        // Mock Rivals Logic
        if (rivalTeams.length === 0) {
             setRivalTeams([
                 { name: "The Bronx Bombers", team_key: "team_1", score: "A-" },
                 { name: "ShoTime 99", team_key: "team_2", score: "B+" },
                 { name: "Acuna Matata", team_key: "team_3", score: "C" },
             ]);
        }

      } catch (e) {
        console.error("Failed to load roster", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeTeam]);

  // --- AGGREGATION LOGIC ---
  const { tableData, totals, maxValues, minValues, report } = useMemo(() => {
    // FIX: Typed the empty return objects as Records to prevent indexing errors
    if (!players.length) return { 
        tableData: [], 
        totals: {} as Record<string, number>, 
        maxValues: {} as Record<string, number>, 
        minValues: {} as Record<string, number>, 
        report: null 
    };

    const filtered = players.filter(p => {
      const isPitcher = ['SP', 'RP', 'P'].includes(p.position);
      return view === 'batters' ? !isPitcher : isPitcher;
    });

    const activeCols = view === 'batters' ? BATTER_COLS : PITCHER_COLS;
    const computedStats: any[] = [];
    const teamTotals: Record<string, number> = {};
    const maxVals: Record<string, number> = {};
    const minVals: Record<string, number> = {};

    activeCols.forEach(col => {
      teamTotals[col.key] = 0;
      maxVals[col.key] = -Infinity;
      minVals[col.key] = Infinity;
    });

    let totalAB = 0;
    let totalIP = 0;

    filtered.forEach(p => {
      const stats: any = {};
      const gp = p.stats.g || p.stats.games || 1; 
      
      if (view === 'batters') totalAB += (p.stats.ab || 0);
      if (view === 'pitchers') totalIP += (p.stats.ip || 0);

      activeCols.forEach(col => {
        let val = parseFloat(p.stats[col.key] || 0);
        
        if (mode === 'pace' && col.type === 'count') {
           val = calculatePace(val, gp);
        }

        stats[col.key] = val;

        if (val > maxVals[col.key]) maxVals[col.key] = val;
        if (val < minVals[col.key]) minVals[col.key] = val;

        if (col.type === 'count') {
          teamTotals[col.key] += val;
        } 
        else if (col.key === 'era') {
           teamTotals['era_weight'] = (teamTotals['era_weight'] || 0) + (val * (p.stats.ip || 0));
        } else if (col.key === 'whip') {
           teamTotals['whip_weight'] = (teamTotals['whip_weight'] || 0) + (val * (p.stats.ip || 0));
        } else if (col.key === 'avg') {
           teamTotals['avg_weight'] = (teamTotals['avg_weight'] || 0) + (val * (p.stats.ab || 0));
        } else if (col.key === 'ops') {
           teamTotals['ops_weight'] = (teamTotals['ops_weight'] || 0) + (val * (p.stats.ab || 0));
        }
      });

      computedStats.push({ ...p, computed: stats });
    });

    if (view === 'pitchers' && totalIP > 0) {
      teamTotals['era'] = teamTotals['era_weight'] / totalIP;
      teamTotals['whip'] = teamTotals['whip_weight'] / totalIP;
    }
    if (view === 'batters' && totalAB > 0) {
      teamTotals['avg'] = teamTotals['avg_weight'] / totalAB;
      teamTotals['ops'] = teamTotals['ops_weight'] / totalAB;
    }

    // --- REPORT GENERATION INSIDE MEMO ---
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const tips: string[] = [];
    let scoreTotal = 0;
    let categoryCount = 0;

    activeCols.forEach(col => {
       let val = teamTotals[col.key] || 0;
       const target = col.baseTarget || 1;
       
       let ratio = val / target;
       if (col.lowIsGood) ratio = target / (val || 0.001);

       if (ratio >= 1.05) strengths.push(col.label);
       else if (ratio < 0.85) weaknesses.push(col.label);
       
       scoreTotal += Math.min(ratio, 1.2);
       categoryCount++;
    });

    // League Type Logic
    if (leagueType === 'dynasty') {
        if (players.length > 35) tips.push("Deep roster. Consolidate prospects.");
        if (teamTotals['so'] < 1000 && view === 'pitchers') tips.push("Prioritize high-K% arms.");
    } else if (leagueType === 'roto') {
        if (strengths.includes('HR') && weaknesses.includes('SB')) tips.push("Trade Power for Speed.");
    }

    const gradeScore = categoryCount > 0 ? scoreTotal / categoryCount : 0;
    let grade = 'C', gradeClass = 'grade-C';
    if (gradeScore > 1.0) { grade = 'A+'; gradeClass = 'grade-A'; }
    else if (gradeScore > 0.9) { grade = 'A'; gradeClass = 'grade-A'; }
    else if (gradeScore > 0.8) { grade = 'B'; gradeClass = 'grade-B'; }
    else if (gradeScore > 0.7) { grade = 'C'; gradeClass = 'grade-C'; }
    else { grade = 'D'; gradeClass = 'grade-D'; }

    return { 
        tableData: computedStats, 
        totals: teamTotals, 
        maxValues: maxVals, 
        minValues: minVals,
        report: { grade, gradeClass, strengths, weaknesses, tips }
    };
  }, [players, mode, view, leagueType]);


  return (
    <div style={{ minHeight: "100vh", background: "#111", paddingBottom: 100 }}>
      <GlobalStyles />
      
      {/* HEADER AREA */}
      <div style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #000 100%)", padding: "20px 16px", borderBottom: "1px solid #333" }}>
        <div className="wide-container">
          
          {/* USER TEAM NAME & CONTEXT */}
          <div style={{ marginBottom: 20 }}>
             {activeTeam && (
                 <div style={{ color: COLORS.GOLD, fontSize: 16, marginBottom: 4, fontFamily: '"Permanent Marker", cursive' }}>
                     {(activeTeam as any).name || (activeTeam as any).team_name || "My Team"}
                 </div>
             )}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                 <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Rainbow DNA Icon & Text */}
                    <RainbowDnaIcon size={28} />
                    <span style={{ fontFamily: '"Orbitron", sans-serif' }}>ROSTER <span className="rainbow-text">DNA</span></span>
                 </h1>
                 
                 {/* Off-season badge */}
                 {isOffSeason && (
                     <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(33, 150, 243, 0.15)', color: '#64b5f6', padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                         <Snowflake size={12} /> OFF-SEASON
                     </div>
                 )}
             </div>
          </div>

          {/* AI REPORT CARD */}
          {report && (
            <div style={{ background: "#222", borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', border: '1px solid #333' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className={`grade-badge ${report.gradeClass}`}>{report.grade}</div>
                    <div style={{ fontSize: 9, color: '#888', marginTop: 4 }}>DNA GRADE</div>
                </div>
                <div style={{ flex: 1 }}>
                    {report.strengths.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12, color: '#a5d6a7' }}>
                            <TrendingUp size={14} /> <span style={{ fontWeight: 700 }}>Strong:</span> {report.strengths.join(", ")}
                        </div>
                    )}
                    {report.weaknesses.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ef9a9a', marginBottom: 4 }}>
                            <AlertTriangle size={14} /> <span style={{ fontWeight: 700 }}>Weak:</span> {report.weaknesses.join(", ")}
                        </div>
                    )}
                    {report.tips.length > 0 && (
                        <div style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic', marginTop: 4 }}>
                            💡 AI: "{report.tips[0]}"
                        </div>
                    )}
                </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, background: "#222", padding: 4, borderRadius: 24 }}>
               <button className={`dna-toggle ${mode === 'totals' ? 'active' : ''}`} onClick={() => setMode('totals')}>Current Totals</button>
               <button className={`dna-toggle ${mode === 'pace' ? 'active' : ''}`} onClick={() => setMode('pace')}>Season Pace</button>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowRules(true)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><Settings size={16} /></button>
                <button onClick={() => setShowLeaguePulse(true)} style={{ background: 'none', border: 'none', color: '#4caf50', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    LEAGUE PULSE <ArrowRight size={12} />
                </button>
            </div>
          </div>

          {/* TEAM TOTALS ROW */}
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px", border: "1px solid #333", display: "flex", alignItems: "center", gap: 20, overflowX: "auto" }} className="hide-scrollbar">
             <div style={{ minWidth: 80, fontWeight: 900, color: "#fff", fontSize: 12 }}>
               PROJECTED<br/>FINISH
             </div>
             {(view === 'batters' ? BATTER_COLS : PITCHER_COLS).map(col => (
               <div key={col.key} style={{ flex: 1, minWidth: 70, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#888", fontWeight: 700, marginBottom: 4 }}>{col.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", textShadow: "0 0 10px rgba(255,255,255,0.1)" }}>
                    {col.type === 'ratio' ? totals[col.key]?.toFixed(2) : Math.round(totals[col.key] || 0)}
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* VIEW SWITCHER */}
      <div className="wide-container" style={{ marginTop: 10, display: "flex", gap: 20, borderBottom: "1px solid #333", paddingBottom: 0 }}>
         <button onClick={() => setView('batters')} style={{ background: "none", border: "none", color: view === 'batters' ? "#4caf50" : "#666", fontSize: 14, fontWeight: 900, padding: "12px 0", borderBottom: view === 'batters' ? "3px solid #4caf50" : "3px solid transparent", cursor: "pointer", flex: 1 }}>BATTERS</button>
         <button onClick={() => setView('pitchers')} style={{ background: "none", border: "none", color: view === 'pitchers' ? "#4caf50" : "#666", fontSize: 14, fontWeight: 900, padding: "12px 0", borderBottom: view === 'pitchers' ? "3px solid #4caf50" : "3px solid transparent", cursor: "pointer", flex: 1 }}>PITCHERS</button>
      </div>

      {/* MAIN TABLE */}
      <div className="wide-container" style={{ marginTop: 0 }}>
        {loading ? (
           <div style={{ padding: 60, textAlign: "center", color: "#666", fontStyle: "italic" }}>Extracting DNA...</div>
        ) : (
          <div className="sticky-container">
            <table className="sticky-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 16px", minWidth: 140, color: '#fff' }}>Player</th>
                  {(view === 'batters' ? BATTER_COLS : PITCHER_COLS).map(col => (
                    <th key={col.key} style={{ textAlign: "center", padding: "12px", minWidth: 60, fontSize: 11, color: "#888" }}>{col.label}</th>
                  ))}
                  {/* NEW TARGET COLUMN */}
                  <th style={{ textAlign: "center", padding: "12px", minWidth: 100, fontSize: 11, color: COLORS.GOLD }}>NEED / PACE</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((p, idx) => {
                  const isExpanded = expandedPlayerId === p.id;
                  
                  return (
                  <React.Fragment key={p.id}>
                    <tr 
                        onClick={() => setExpandedPlayerId(isExpanded ? null : p.id)}
                        style={{ borderBottom: isExpanded ? "none" : "1px solid #333", cursor: 'pointer', background: isExpanded ? '#222' : 'transparent' }}
                    >
                        <td style={{ padding: "12px 16px" }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <div>
                                   <div style={{ fontWeight: 800, fontSize: 13, color: "#fff" }}>{p.name}</div>
                                   <div style={{ fontSize: 10, color: "#888" }}>{p.position} • {p.team}</div>
                               </div>
                               {isExpanded ? <ChevronUp size={14} color="#666"/> : <ChevronDown size={14} color="#666"/>}
                           </div>
                        </td>
                        {(view === 'batters' ? BATTER_COLS : PITCHER_COLS).map(col => {
                           const val = p.computed[col.key];
                           const bg = getHeatmapColor(val, minValues[col.key], maxValues[col.key], col.lowIsGood);
                           return (
                             <td key={col.key} style={{ background: bg, textAlign: "center", padding: 10, color: '#eee', fontWeight: 700, fontSize: 13 }}>
                                {col.type === 'ratio' ? val.toFixed(2) : Math.round(val)}
                             </td>
                           );
                        })}
                        {/* NEED CALCULATION COLUMN */}
                        <td style={{ textAlign: "center", padding: 10, color: '#888', fontSize: 11 }}>
                            {/* Simple logic: Compare player avg to league need avg */}
                            <span style={{color: COLORS.GOLD, fontWeight: 700}}>
                                {view === 'batters' 
                                    ? (p.computed['hr'] > 25 ? '+PWR' : (p.computed['sb'] > 15 ? '+SPD' : 'AVG'))
                                    : (p.computed['era'] < 3.5 ? '+ACE' : 'Stream')}
                            </span>
                        </td>
                    </tr>
                    
                    {/* EXPANDED "SMART SWAP" ROW */}
                    {isExpanded && (
                        <tr style={{ background: '#222', borderBottom: "1px solid #333" }}>
                            <td colSpan={(view === 'batters' ? BATTER_COLS : PITCHER_COLS).length + 2} style={{ padding: 0 }}>
                                <div className="expanded-content" style={{ padding: "12px 16px" }}>
                                    {/* Intelligence Logic */}
                                    {(() => {
                                        const swap = getSmartSwap(p, report?.weaknesses || []);
                                        return swap ? (
                                            <div style={{ background: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4caf50', borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontSize: 10, color: '#4caf50', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>
                                                        <TrendingUp size={10} style={{display: 'inline', marginRight: 4}}/> Smart Swap Opportunity
                                                    </div>
                                                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                                                        Add <span style={{ color: '#fff', textDecoration: 'underline' }}>{swap.name}</span> <span style={{ color: '#888', fontSize: 11 }}>({swap.team})</span>
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#aaa' }}>{swap.reason} • {swap.diff}</div>
                                                </div>
                                                <button style={{ background: '#4caf50', color: '#fff', border: 'none', borderRadius: 20, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                                    View
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#666', fontSize: 11, fontStyle: 'italic', padding: 8 }}>
                                                No clear upgrades found on Waiver Wire. Hold tight.
                                            </div>
                                        );
                                    })()}
                                </div>
                            </td>
                        </tr>
                    )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LEAGUE PULSE MODAL */}
      {showLeaguePulse && (
          <div className="modal-overlay">
              <div className="modal-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h2 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                         <Trophy size={24} color="#FFD700" /> League Pulse
                      </h2>
                      <button onClick={() => setShowLeaguePulse(false)} style={{ background: 'none', border: 'none', color: '#666' }}><X /></button>
                  </div>

                  <p style={{ color: '#888', fontSize: 12, marginBottom: 20 }}>
                      Select a rival team to view their Roster DNA and spy on their strengths/weaknesses.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Your Team (Top) */}
                      <button 
                          onClick={() => { setViewingTeamName((activeTeam as any).name); setShowLeaguePulse(false); }}
                          style={{ background: '#333', border: '1px solid #4caf50', padding: 16, borderRadius: 8, textAlign: 'left', color: 'white', display: 'flex', justifyContent: 'space-between' }}
                      >
                          <span style={{ fontWeight: 700 }}>{(activeTeam as any).name} (Me)</span>
                          <span style={{ fontSize: 12, color: '#4caf50' }}>Active</span>
                      </button>

                      {/* Rivals Loop */}
                      {rivalTeams.map((t) => (
                          <button 
                             key={t.team_key}
                             onClick={() => { 
                                 setViewingTeamName(t.name); 
                                 setShowLeaguePulse(false); 
                             }}
                             style={{ background: '#2a2a2a', border: '1px solid #444', padding: 16, borderRadius: 8, textAlign: 'left', color: '#ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                             <span>{t.name}</span>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                 <span style={{ fontSize: 10, background: '#444', padding: '2px 6px', borderRadius: 4 }}>{t.score}</span>
                                 <ArrowRight size={14} color="#666" />
                             </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* RULES MODAL */}
      {showRules && (
          <div className="modal-overlay">
              <div className="modal-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h2 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                         <Settings size={24} color="#fff" /> League Rules
                      </h2>
                      <button onClick={() => setShowRules(false)} style={{ background: 'none', border: 'none', color: '#666' }}><X /></button>
                  </div>
                  
                  <div style={{ marginBottom: 20 }}>
                      <h4 style={{ color: '#aaa', fontSize: 12, textTransform: 'uppercase', marginBottom: 10 }}>League Type</h4>
                      <div style={{ display: 'flex', gap: 8 }}>
                          {(['roto', 'points', 'dynasty', 'redraft'] as LeagueType[]).map(type => (
                              <button 
                                key={type}
                                onClick={() => setLeagueType(type)}
                                style={{ 
                                    padding: '6px 12px', borderRadius: 4, 
                                    background: leagueType === type ? '#4caf50' : '#333', 
                                    color: leagueType === type ? '#fff' : '#888',
                                    border: 'none', fontSize: 11, fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer'
                                }}
                              >
                                {type}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                      <h4 style={{ color: '#aaa', fontSize: 12, textTransform: 'uppercase', marginBottom: 10 }}>Roster Positions</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'Util', 'SP', 'SP', 'RP', 'RP', 'P', 'P'].map((pos, i) => (
                              <span key={i} style={{ background: '#333', padding: '4px 8px', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 700 }}>{pos}</span>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}