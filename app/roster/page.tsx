"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useTeam } from "../../context/TeamContext";
import { 
  Flame, 
  Activity, 
  Snowflake, 
  Info, 
  Trophy, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  Settings,
  Users,
  Eye,
  X,
  Undo2
} from "lucide-react";

/* --- 1. CONFIGURATION & TYPES --- */

type LeagueType = 'roto' | 'points' | 'dynasty';

const COLORS = {
  GREEN: "rgba(76, 175, 80, 1)",
  RED: "rgba(244, 67, 54, 1)",
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
  target?: number; 
}

// 12-Team Roto Targets (Baseline)
const BATTER_COLS: StatCol[] = [
  { key: 'r', label: 'R', type: 'count', target: 1000 },
  { key: 'hr', label: 'HR', type: 'count', target: 280 },
  { key: 'rbi', label: 'RBI', type: 'count', target: 950 },
  { key: 'sb', label: 'SB', type: 'count', target: 120 },
  { key: 'avg', label: 'AVG', type: 'ratio', weight: 'ab', target: 0.265 },
  { key: 'ops', label: 'OPS', type: 'ratio', weight: 'ab', target: 0.780 },
];

const PITCHER_COLS: StatCol[] = [
  { key: 'w', label: 'W', type: 'count', target: 85 },
  { key: 'sv', label: 'SV', type: 'count', target: 60 },
  { key: 'so', label: 'K', type: 'count', target: 1300 },
  { key: 'era', label: 'ERA', type: 'ratio', weight: 'ip', lowIsGood: true, target: 3.50 },
  { key: 'whip', label: 'WHIP', type: 'ratio', weight: 'ip', lowIsGood: true, target: 1.15 },
];

/* --- 2. STYLES --- */
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');

    @keyframes throb-gold {
      0% { box-shadow: inset 0 0 0 0px rgba(255, 215, 0, 0); }
      50% { box-shadow: inset 0 0 0 2px rgba(255, 215, 0, 0.8); }
      100% { box-shadow: inset 0 0 0 0px rgba(255, 215, 0, 0); }
    }
    .carry-alert { animation: throb-gold 2s infinite; font-weight: 800 !important; }
    
    /* HORIZONTAL SCROLL FIXES */
    .sticky-container { 
        overflow-x: auto; 
        width: 100%;
        -webkit-overflow-scrolling: touch;
        position: relative;
    }
    .sticky-table { 
        width: 100%; 
        border-collapse: collapse; 
        min-width: 600px; /* Forces scroll on small screens */
    }
    .sticky-header th { 
        position: sticky; 
        top: 0; 
        z-index: 20; 
        background: #f5f5f5; 
        box-shadow: 0 1px 2px rgba(0,0,0,0.1); 
    }
    
    .dna-toggle { padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #888; transition: all 0.2s; }
    .dna-toggle.active { background: #4caf50; color: white; border-color: #4caf50; }
    
    .league-type-btn { padding: 4px 8px; font-size: 10px; border-radius: 4px; border: 1px solid #333; background: #222; color: #666; cursor: pointer; }
    .league-type-btn.active { background: #4caf50; color: white; border-color: #4caf50; }

    .team-name-font { font-family: "Permanent Marker", cursive; letter-spacing: 1px; }
    .dna-font { font-family: "Orbitron", sans-serif; }
    
    .grade-badge { font-family: "Orbitron", sans-serif; font-weight: 900; font-size: 24px; padding: 4px 12px; border-radius: 8px; border: 2px solid; text-shadow: 0 0 10px rgba(0,0,0,0.5); }
    .grade-A { color: #4caf50; border-color: #4caf50; background: rgba(76, 175, 80, 0.1); }
    .grade-B { color: #8bc34a; border-color: #8bc34a; background: rgba(139, 195, 74, 0.1); }
    .grade-C { color: #ff9800; border-color: #ff9800; background: rgba(255, 152, 0, 0.1); }
    .grade-D { color: #f44336; border-color: #f44336; background: rgba(244, 67, 54, 0.1); }
    
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-card { background: #222; padding: 24px; border-radius: 16px; width: 100%; max-width: 500px; border: 1px solid #444; max-height: 80vh; overflow-y: auto; }
    
    /* Scrollbar hiding */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}} />
);

/* --- 3. HELPER FUNCTIONS --- */
const calculatePace = (val: number, gamesPlayed: number) => {
  if (!val || !gamesPlayed) return 0;
  return (val / Math.max(gamesPlayed, 1)) * 162;
};

const getHeatmapColor = (value: number, min: number, max: number, lowIsGood = false) => {
  if (value === 0) return 'transparent';
  let pct = (value - min) / (max - min);
  if (pct < 0) pct = 0;
  if (pct > 1) pct = 1;
  if (lowIsGood) pct = 1 - pct;
  const hue = pct * 120;
  return `hsla(${hue}, 70%, 50%, 0.15)`;
};

const getTextColor = (value: number, min: number, max: number, lowIsGood = false) => {
    let pct = (value - min) / (max - min);
    if (lowIsGood) pct = 1 - pct;
    return pct > 0.5 ? '#1b5e20' : '#b71c1c';
}

const checkOffSeason = () => {
    const month = new Date().getMonth();
    return month >= 9 || month <= 1; 
};

const generateAnalysis = (totals: Record<string, number>, view: 'batters' | 'pitchers', leagueType: LeagueType, rosterSize: number) => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const tips: string[] = [];
    let scoreTotal = 0;
    let categoryCount = 0;

    const cols = view === 'batters' ? BATTER_COLS : PITCHER_COLS;

    cols.forEach(col => {
        let val = totals[col.key] || 0;
        const target = col.target || 1;
        let ratio = val / target;
        if (col.lowIsGood) ratio = target / (val || 0.001);

        if (ratio >= 1.05) strengths.push(col.label);
        else if (ratio < 0.85) weaknesses.push(col.label);
        
        scoreTotal += Math.min(ratio, 1.2);
        categoryCount++;
    });

    if (leagueType === 'dynasty') {
        if (rosterSize > 35) tips.push("Deep roster. Consolidate 2 prospects for 1 star.");
        if (totals['so'] < 1000 && view === 'pitchers') tips.push("Low K totals. Prioritize high-K% arms.");
    } 
    else if (leagueType === 'roto') {
        if (strengths.includes('HR') && weaknesses.includes('SB')) tips.push("Imbalanced. Trade Power for Speed.");
        if (totals['sv'] < 30 && view === 'pitchers') tips.push("Punting Saves? If not, add closers.");
    }
    else if (leagueType === 'points') {
        if (view === 'batters' && totals['so'] > 1000) tips.push("High K rate kills points value.");
        tips.push("Volume is King. Maximize Games Played.");
    }

    const gradeScore = scoreTotal / categoryCount;
    let grade = 'C';
    let gradeClass = 'grade-C';

    if (gradeScore > 1.0) { grade = 'A+'; gradeClass = 'grade-A'; }
    else if (gradeScore > 0.9) { grade = 'A'; gradeClass = 'grade-A'; }
    else if (gradeScore > 0.8) { grade = 'B'; gradeClass = 'grade-B'; }
    else if (gradeScore > 0.7) { grade = 'C'; gradeClass = 'grade-C'; }
    else { grade = 'D'; gradeClass = 'grade-D'; }

    return { grade, gradeClass, strengths, weaknesses, tips };
};

/* =============================================================================
   MAIN COMPONENT
============================================================================= */
export default function RosterDNA() {
  const supabase = createClient();
  const { activeTeam } = useTeam(); // Only reading activeTeam from context
  
  // Local state for the team currently being analyzed (My Team OR Rival)
  const [viewingTeam, setViewingTeam] = useState<any>(null);
  
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffSeason, setIsOffSeason] = useState(false);
  const [mode, setMode] = useState<'totals' | 'pace'>('totals'); 
  const [view, setView] = useState<'batters' | 'pitchers'>('batters');
  
  // League State
  const [leagueType, setLeagueType] = useState<LeagueType>('roto');
  const [showLeaguePulse, setShowLeaguePulse] = useState(false);
  const [showRules, setShowRules] = useState(false);
  
  // Real Data State
  const [rivalTeams, setRivalTeams] = useState<any[]>([]);

  // --- INITIALIZATION ---
  useEffect(() => {
      const _isOff = checkOffSeason();
      setIsOffSeason(_isOff);
      if (_isOff) setMode('pace');
  }, []);

  // --- SYNC VIEWING TEAM WITH ACTIVE TEAM ---
  useEffect(() => {
      if (activeTeam && !viewingTeam) {
          setViewingTeam(activeTeam);
      }
  }, [activeTeam]);

  // --- FETCH RIVALS (Once on load) ---
  useEffect(() => {
      const fetchRivals = async () => {
          if (!activeTeam) return;
          // Fetch all teams in this league
          const { data, error } = await supabase
              .from('teams')
              .select('*')
              .eq('league_id', activeTeam.league_key);
          
          if (data) {
              // Filter out my team from rivals list
              const rivals = data.filter((t: any) => t.team_key !== activeTeam.team_key);
              setRivalTeams(rivals);
          }
      };
      fetchRivals();
  }, [activeTeam]);

  // --- FETCH ROSTER (Depends on viewingTeam) ---
  useEffect(() => {
    const fetchData = async () => {
      if (!viewingTeam) return;
      setLoading(true);
      
      const params = new URLSearchParams();
      // Use the league_key from activeTeam (assuming same league)
      // Use team_key from the team we are VIEWING
      params.append('league_id', viewingTeam.league_key);
      params.append('team_id', viewingTeam.team_key);
      
      try {
        const response = await fetch(`/api/players?${params.toString()}`);
        const data = await response.json();
        const roster = Array.isArray(data) ? data : data.players;
        
        // Filter players belonging to the VIEWING team
        const teamRoster = roster.filter((p: any) => 
             String(p.team_id) === String(viewingTeam.team_key) ||
             (p.availability === 'MY_TEAM' && viewingTeam.team_key === activeTeam?.team_key)
        );

        setPlayers(teamRoster);
      } catch (e) {
        console.error("Failed to load roster", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [viewingTeam, activeTeam]);

  // --- AGGREGATION LOGIC ---
  const { tableData, totals, maxValues, minValues } = useMemo(() => {
    if (!players.length) return { tableData: [], totals: {}, maxValues: {}, minValues: {} };

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
        if (mode === 'pace' && col.type === 'count') val = calculatePace(val, gp);
        stats[col.key] = val;
        
        if (val > maxVals[col.key]) maxVals[col.key] = val;
        if (val < minVals[col.key]) minVals[col.key] = val;

        if (col.type === 'count') teamTotals[col.key] += val;
        else if (col.key === 'era') teamTotals['era_weight'] = (teamTotals['era_weight'] || 0) + (val * (p.stats.ip || 0));
        else if (col.key === 'whip') teamTotals['whip_weight'] = (teamTotals['whip_weight'] || 0) + (val * (p.stats.ip || 0));
        else if (col.key === 'avg') teamTotals['avg_weight'] = (teamTotals['avg_weight'] || 0) + (val * (p.stats.ab || 0));
        else if (col.key === 'ops') teamTotals['ops_weight'] = (teamTotals['ops_weight'] || 0) + (val * (p.stats.ab || 0));
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

    return { tableData: computedStats, totals: teamTotals, maxValues: maxVals, minValues: minVals };
  }, [players, mode, view]);

  const report = useMemo(() => generateAnalysis(totals, view, leagueType, players.length), [totals, view, leagueType, players.length]);

  // Helper to check if we are viewing a rival
  const isViewingRival = viewingTeam?.team_key !== activeTeam?.team_key;

  return (
    <div style={{ minHeight: "100vh", background: "#111", paddingBottom: 100 }}>
      <GlobalStyles />
      
      {/* HEADER AREA */}
      <div style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #000 100%)", padding: "20px 16px", borderBottom: "1px solid #333" }}>
        <div className="wide-container">
          
          {/* USER TEAM NAME & CONTEXT */}
          <div style={{ marginBottom: 20 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div>
                    {/* Unique Yellow Team Font */}
                    <div style={{ color: isViewingRival ? '#ff9800' : COLORS.GOLD, fontSize: 18, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }} className="team-name-font">
                        {viewingTeam ? (viewingTeam.name || viewingTeam.team_name) : "Loading..."}
                        {isViewingRival && <Eye size={16} />}
                    </div>
                    
                    {/* League Info Row */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, color: '#888' }}>
                        <span>{(activeTeam as any)?.league_name || "Major League"} • 12 Teams</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => setLeagueType('roto')} className={`league-type-btn ${leagueType === 'roto' ? 'active' : ''}`}>ROTO</button>
                            <button onClick={() => setLeagueType('points')} className={`league-type-btn ${leagueType === 'points' ? 'active' : ''}`}>PTS</button>
                            <button onClick={() => setLeagueType('dynasty')} className={`league-type-btn ${leagueType === 'dynasty' ? 'active' : ''}`}>DYN</button>
                        </div>
                        <button onClick={() => setShowRules(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><Info size={14} /></button>
                    </div>
                 </div>

                 {/* Off-season badge */}
                 {isOffSeason && (
                     <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(33, 150, 243, 0.15)', color: '#64b5f6', padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                         <Snowflake size={12} />
                     </div>
                 )}
             </div>
          </div>

          {/* AI REPORT CARD */}
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
                  {/* AI TIP */}
                  {report.tips.length > 0 && (
                      <div style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic', marginTop: 4 }}>
                         💡 AI: "{report.tips[0]}"
                      </div>
                  )}
              </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, background: "#222", padding: 4, borderRadius: 24 }}>
               <button className={`dna-toggle ${mode === 'totals' ? 'active' : ''}`} onClick={() => setMode('totals')}>Current Totals</button>
               <button className={`dna-toggle ${mode === 'pace' ? 'active' : ''}`} onClick={() => setMode('pace')}>Season Pace</button>
            </div>
            
            {isViewingRival ? (
                <button onClick={() => setViewingTeam(activeTeam)} style={{ background: '#333', border: '1px solid #666', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: "6px 12px", borderRadius: 20 }}>
                    <Undo2 size={12} /> Back to My Team
                </button>
            ) : (
                <button onClick={() => setShowLeaguePulse(true)} style={{ background: 'none', border: 'none', color: '#4caf50', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    LEAGUE PULSE <ArrowRight size={12} />
                </button>
            )}
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

      {/* LEGEND SECTION */}
      <div className="wide-container" style={{ padding: "12px 0", borderBottom: '1px solid #333' }}>
         <div style={{ display: 'flex', gap: 16, alignItems: 'center', overflowX: 'auto', fontSize: 10, color: '#888' }} className="hide-scrollbar">
             <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: 'rgba(76, 175, 80, 0.4)', borderRadius: 2 }}></div> Strong</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: 'rgba(244, 67, 54, 0.2)', borderRadius: 2 }}></div> Weak</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, border: '2px solid #FFD700', animation: 'throb-gold 2s infinite' }}></div> "Carry" (Risk)</div>
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
              <thead className="sticky-header">
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 16px", minWidth: 160, background: '#111', color: '#fff', borderBottom: '1px solid #333' }}>Player</th>
                  {(view === 'batters' ? BATTER_COLS : PITCHER_COLS).map(col => (
                    <th key={col.key} style={{ textAlign: "center", padding: "12px", minWidth: 70, fontSize: 11, color: "#888", background: '#111', borderBottom: '1px solid #333' }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((p, idx) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px 16px", background: "#fff", position: 'sticky', left: 0, zIndex: 10, boxShadow: "2px 0 5px rgba(0,0,0,0.05)" }}>
                       <div style={{ fontWeight: 800, fontSize: 13, color: "#333" }}>{p.name}</div>
                       <div style={{ fontSize: 10, color: "#999" }}>{p.position} • {p.team}</div>
                    </td>
                    {(view === 'batters' ? BATTER_COLS : PITCHER_COLS).map(col => {
                        const val = p.computed[col.key];
                        const total = totals[col.key];
                        
                        // "Carry" Logic: Is this player contributing > 20% of the team's total?
                        const contribution = col.type === 'count' && total > 0 ? (val / total) : 0;
                        const isCarry = contribution > 0.20;
                        
                        const bg = getHeatmapColor(val, minValues[col.key], maxValues[col.key], col.lowIsGood);
                        const textColor = getTextColor(val, minValues[col.key], maxValues[col.key], col.lowIsGood);

                        return (
                          <td key={col.key} className={`stat-cell ${isCarry ? 'carry-alert' : ''}`} style={{ background: bg, textAlign: "center", padding: 10, color: textColor, fontWeight: 700, fontSize: 13 }}>
                             {col.type === 'ratio' ? val.toFixed(2) : Math.round(val)}
                             {isCarry && <div style={{ fontSize: 8, color: "#b71c1c", marginTop: 2, fontWeight: 900 }}>CARRY</div>}
                          </td>
                        );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LEAGUE PULSE MODAL */}
      {showLeaguePulse && (
          <div className="modal-overlay" onClick={() => setShowLeaguePulse(false)}>
              <div className="modal-card" onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                     <h2 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Trophy size={24} color="#FFD700" /> League Pulse
                     </h2>
                     <button onClick={() => setShowLeaguePulse(false)} style={{ background: 'none', border: 'none', color: '#666' }}><X /></button>
                  </div>

                  <p style={{ color: '#888', fontSize: 12, marginBottom: 20 }}>
                      Spy on your rivals. Tap a team to analyze their Roster DNA.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {/* Your Team (Top) */}
                      <button 
                         onClick={() => { setViewingTeam(activeTeam); setShowLeaguePulse(false); }}
                         style={{ background: '#333', border: '1px solid #4caf50', padding: 16, borderRadius: 8, textAlign: 'left', color: 'white', display: 'flex', justifyContent: 'space-between' }}
                      >
                         <span style={{ fontWeight: 700 }}>{(activeTeam as any)?.name || "My Team"} (Me)</span>
                         <span style={{ fontSize: 12, color: '#4caf50' }}>Active</span>
                      </button>

                      {/* Real Rivals Loop */}
                      {rivalTeams.length > 0 ? rivalTeams.map((t) => (
                         <button 
                            key={t.team_key}
                            onClick={() => { 
                                setViewingTeam(t); 
                                setShowLeaguePulse(false); 
                            }}
                            style={{ background: '#2a2a2a', border: '1px solid #444', padding: 16, borderRadius: 8, textAlign: 'left', color: '#ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                         >
                            <span>{t.name || t.team_name || "Team " + t.team_key}</span>
                            <ArrowRight size={14} color="#666" />
                         </button>
                      )) : (
                          <div style={{ padding: 20, textAlign: 'center', color: '#666', fontStyle: 'italic', background: '#1a1a1a', borderRadius: 8 }}>
                             No other teams found in this league context.
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* RULES MODAL */}
      {showRules && (
          <div className="modal-overlay" onClick={() => setShowRules(false)}>
              <div className="modal-card" onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                     <h2 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Settings size={24} color="#fff" /> League Rules
                     </h2>
                     <button onClick={() => setShowRules(false)} style={{ background: 'none', border: 'none', color: '#666' }}><X /></button>
                  </div>
                  
                  <div style={{ marginBottom: 20 }}>
                      <h4 style={{ color: '#aaa', fontSize: 12, textTransform: 'uppercase', marginBottom: 10 }}>Roster Positions</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {['C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF', 'Util', 'SP', 'SP', 'RP', 'RP', 'P', 'P'].map((pos, i) => (
                              <span key={i} style={{ background: '#333', padding: '4px 8px', borderRadius: 4, color: '#fff', fontSize: 11, fontWeight: 700 }}>{pos}</span>
                          ))}
                      </div>
                  </div>

                  <div>
                      <h4 style={{ color: '#aaa', fontSize: 12, textTransform: 'uppercase', marginBottom: 10 }}>Scoring Categories</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div style={{ background: '#2a2a2a', padding: 10, borderRadius: 8 }}>
                              <div style={{ color: '#4caf50', fontWeight: 900, marginBottom: 4 }}>BATTERS</div>
                              <div style={{ fontSize: 11, color: '#ccc' }}>R, HR, RBI, SB, AVG, OPS</div>
                          </div>
                          <div style={{ background: '#2a2a2a', padding: 10, borderRadius: 8 }}>
                              <div style={{ color: '#2196f3', fontWeight: 900, marginBottom: 4 }}>PITCHERS</div>
                              <div style={{ fontSize: 11, color: '#ccc' }}>W, SV, K, ERA, WHIP</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}