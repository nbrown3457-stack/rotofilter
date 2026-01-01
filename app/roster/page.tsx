"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useTeam } from "../../context/TeamContext";
import { Icons } from "../../components/Icons";
import { 
  Flame, 
  Activity, 
  Snowflake, 
  Info, 
  Trophy, 
  AlertTriangle, 
  TrendingUp,
  ArrowRight // <--- Fixed: Added this import
} from "lucide-react";

/* --- 1. CONFIGURATION & TYPES --- */

// Fixed: Added COLORS constant back
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

// Targets based on standard 12-team 5x5 roto targets (approximate)
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
    .stat-cell { transition: all 0.2s; position: relative; }
    .sticky-header th { position: sticky; top: 0; z-index: 20; background: #f5f5f5; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    
    /* Custom Scrollbar for horizontal scrolling */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    .dna-toggle { padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #888; transition: all 0.2s; }
    .dna-toggle.active { background: #4caf50; color: white; border-color: #4caf50; }
    
    .team-name-font { font-family: "Permanent Marker", cursive; letter-spacing: 1px; }
    .dna-font { font-family: "Orbitron", sans-serif; }
    
    .grade-badge { font-family: "Orbitron", sans-serif; font-weight: 900; font-size: 24px; padding: 4px 12px; border-radius: 8px; border: 2px solid; text-shadow: 0 0 10px rgba(0,0,0,0.5); }
    .grade-A { color: #4caf50; border-color: #4caf50; background: rgba(76, 175, 80, 0.1); }
    .grade-B { color: #8bc34a; border-color: #8bc34a; background: rgba(139, 195, 74, 0.1); }
    .grade-C { color: #ff9800; border-color: #ff9800; background: rgba(255, 152, 0, 0.1); }
    .grade-D { color: #f44336; border-color: #f44336; background: rgba(244, 67, 54, 0.1); }
    
    @media (max-width: 768px) {
        .desktop-legend { display: none; }
    }
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
  const hue = pct * 120; // 0=Red, 120=Green
  return `hsla(${hue}, 70%, 50%, 0.15)`;
};

const getTextColor = (value: number, min: number, max: number, lowIsGood = false) => {
    let pct = (value - min) / (max - min);
    if (lowIsGood) pct = 1 - pct;
    return pct > 0.5 ? '#1b5e20' : '#b71c1c';
}

const checkOffSeason = () => {
    const month = new Date().getMonth(); // 0=Jan, 11=Dec
    // Offseason typically Oct (9) through Feb (1)
    return month >= 9 || month <= 1; 
};

// "AI" Logic for Summary
const generateAnalysis = (totals: Record<string, number>, view: 'batters' | 'pitchers') => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    let scoreTotal = 0;
    let categoryCount = 0;

    const cols = view === 'batters' ? BATTER_COLS : PITCHER_COLS;

    cols.forEach(col => {
        const val = totals[col.key] || 0;
        const target = col.target || 1;
        
        // Simple ratio: 1.0 = Hit Target
        let ratio = val / target;
        if (col.lowIsGood) ratio = target / (val || 0.001); // Invert for ERA

        if (ratio >= 1.05) strengths.push(col.label);
        else if (ratio < 0.85) weaknesses.push(col.label);
        
        scoreTotal += Math.min(ratio, 1.2); // Cap bonus credit
        categoryCount++;
    });

    const gradeScore = scoreTotal / categoryCount;
    let grade = 'C';
    let gradeClass = 'grade-C';

    if (gradeScore > 1.0) { grade = 'A+'; gradeClass = 'grade-A'; }
    else if (gradeScore > 0.9) { grade = 'A'; gradeClass = 'grade-A'; }
    else if (gradeScore > 0.8) { grade = 'B'; gradeClass = 'grade-B'; }
    else if (gradeScore > 0.7) { grade = 'C'; gradeClass = 'grade-C'; }
    else { grade = 'D'; gradeClass = 'grade-D'; }

    return { grade, gradeClass, strengths, weaknesses };
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
  const [showLeaguePulse, setShowLeaguePulse] = useState(false); // For modal

  // --- INITIALIZATION ---
  useEffect(() => {
      const _isOff = checkOffSeason();
      setIsOffSeason(_isOff);
      if (_isOff) setMode('pace'); // Default to Pace in winter
  }, []);

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
        
        const myRoster = roster.filter((p: any) => 
            p.availability === 'MY_TEAM' || 
            (p.team_id && String(p.team_id) === String((activeTeam as any).team_key))
        );

        setPlayers(myRoster);
      } catch (e) {
        console.error("Failed to load roster", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeTeam]);

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

    return { tableData: computedStats, totals: teamTotals, maxValues: maxVals, minValues: minVals };
  }, [players, mode, view]);

  // --- REPORT GENERATION ---
  const report = useMemo(() => generateAnalysis(totals, view), [totals, view]);


  return (
    <div style={{ minHeight: "100vh", background: "#111", paddingBottom: 100 }}>
      <GlobalStyles />
      
      {/* HEADER AREA */}
      <div style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #000 100%)", padding: "20px 16px", borderBottom: "1px solid #333" }}>
        <div className="wide-container">
          
          {/* USER TEAM NAME & DNA TITLE */}
          <div style={{ marginBottom: 20 }}>
             {activeTeam && (
                 <div style={{ color: COLORS.GOLD, fontSize: 16, marginBottom: 4 }} className="team-name-font">
                     {(activeTeam as any).name || (activeTeam as any).team_name || "My Team"}
                 </div>
             )}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                 <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                    <Activity color="#4caf50" /> <span className="dna-font">ROSTER <span style={{color: '#4caf50'}}>DNA</span></span>
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
          <div style={{ background: "#222", borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', border: '1px solid #333' }}>
              <div style={{ textAlign: 'center' }}>
                  <div className={`grade-badge ${report.gradeClass}`}>{report.grade}</div>
                  <div style={{ fontSize: 9, color: '#888', marginTop: 4 }}>TEAM GRADE</div>
              </div>
              <div style={{ flex: 1 }}>
                  {report.strengths.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12, color: '#a5d6a7' }}>
                          <TrendingUp size={14} /> <span style={{ fontWeight: 700 }}>Strong:</span> {report.strengths.join(", ")}
                      </div>
                  )}
                  {report.weaknesses.length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ef9a9a' }}>
                          <AlertTriangle size={14} /> <span style={{ fontWeight: 700 }}>Weak:</span> {report.weaknesses.join(", ")}
                      </div>
                  ) : (
                      <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>No major weaknesses detected.</div>
                  )}
              </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, background: "#222", padding: 4, borderRadius: 24 }}>
               <button className={`dna-toggle ${mode === 'totals' ? 'active' : ''}`} onClick={() => setMode('totals')}>Current Totals</button>
               <button className={`dna-toggle ${mode === 'pace' ? 'active' : ''}`} onClick={() => setMode('pace')}>Season Pace</button>
            </div>
            
            <button onClick={() => setShowLeaguePulse(true)} style={{ background: 'none', border: 'none', color: '#4caf50', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                LEAGUE PULSE <ArrowRight size={12} />
            </button>
          </div>

          {/* TEAM TOTALS ROW */}
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px", border: "1px solid #333", display: "flex", alignItems: "center", gap: 20, overflowX: "auto" }}>
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
             <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: 'rgba(76, 175, 80, 0.4)', borderRadius: 2 }}></div> Strong Contribution</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: 'rgba(244, 67, 54, 0.2)', borderRadius: 2 }}></div> Weak / Negative</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, border: '2px solid #FFD700' }}></div> "Carry" (Risk)</div>
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
          <div className="sticky-container" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
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

      {/* LEAGUE PULSE PLACEHOLDER MODAL */}
      {showLeaguePulse && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: '#222', padding: 30, borderRadius: 16, maxWidth: 400, width: '100%', textAlign: 'center', border: '1px solid #444' }}>
                  <Trophy size={48} color="#FFD700" style={{ marginBottom: 20 }} />
                  <h2 style={{ color: '#fff', margin: '0 0 10px 0' }}>League Pulse</h2>
                  <p style={{ color: '#888', fontSize: 14, lineHeight: 1.5 }}>
                      Full league analysis requires fetching all rosters. <br/><br/>
                      <strong>Coming in v1.3:</strong> Compare your DNA against every other team in your league to spot category deficits in real-time.
                  </p>
                  <button onClick={() => setShowLeaguePulse(false)} style={{ marginTop: 20, padding: "10px 24px", background: "#4caf50", color: "white", border: "none", borderRadius: 24, fontWeight: 700, cursor: 'pointer' }}>
                      Got it
                  </button>
              </div>
          </div>
      )}

    </div>
  );
}