"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { useTeam } from "../../context/TeamContext"; // Adjust path as needed
import { Icons } from "../../components/Icons"; // Adjust path as needed
import { Flame, AlertTriangle, TrendingUp, Activity, ArrowRight } from "lucide-react";

/* --- 1. CONFIGURATION & TYPES --- */

// Fix for "lowIsGood" red squiggly: Define a shape for our columns
interface StatCol {
  key: string;
  label: string;
  type: 'count' | 'ratio';
  weight?: string;
  lowIsGood?: boolean;
}

const BATTER_COLS: StatCol[] = [
  { key: 'r', label: 'R', type: 'count' },
  { key: 'hr', label: 'HR', type: 'count' },
  { key: 'rbi', label: 'RBI', type: 'count' },
  { key: 'sb', label: 'SB', type: 'count' },
  { key: 'avg', label: 'AVG', type: 'ratio', weight: 'ab' },
  { key: 'ops', label: 'OPS', type: 'ratio', weight: 'ab' },
];

const PITCHER_COLS: StatCol[] = [
  { key: 'w', label: 'W', type: 'count' },
  { key: 'sv', label: 'SV', type: 'count' },
  { key: 'so', label: 'K', type: 'count' },
  { key: 'era', label: 'ERA', type: 'ratio', weight: 'ip', lowIsGood: true },
  { key: 'whip', label: 'WHIP', type: 'ratio', weight: 'ip', lowIsGood: true },
];

const COLORS = {
  GREEN: "rgba(76, 175, 80, 1)",
  RED: "rgba(244, 67, 54, 1)",
  GOLD: "#FFD700",
  DARK_BG: "#1a1a1a",
  CARD_BG: "#ffffff",
};

/* --- 2. STYLES --- */
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes throb-gold {
      0% { box-shadow: inset 0 0 0 0px rgba(255, 215, 0, 0); }
      50% { box-shadow: inset 0 0 0 2px rgba(255, 215, 0, 1); }
      100% { box-shadow: inset 0 0 0 0px rgba(255, 215, 0, 0); }
    }
    .carry-alert { animation: throb-gold 2s infinite; font-weight: 900 !important; color: #bcaaa4; }
    .stat-cell { transition: all 0.2s; position: relative; }
    .sticky-header th { position: sticky; top: 0; z-index: 20; background: #f5f5f5; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .dna-toggle { padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #888; transition: all 0.2s; }
    .dna-toggle.active { background: #4caf50; color: white; border-color: #4caf50; }
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

/* =============================================================================
   MAIN COMPONENT
============================================================================= */
export default function RosterDNA() {
  const supabase = createClient();
  const { activeTeam } = useTeam();
  
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'totals' | 'pace'>('totals'); 
  const [view, setView] = useState<'batters' | 'pitchers'>('batters');

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
        
        // FIX for team_id error: 
        // 1. Used 'any' cast on activeTeam to avoid TS error if types mismatch
        // 2. Prioritized 'availability' check which is cleaner
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


  return (
    <div style={{ minHeight: "100vh", background: "#111", paddingBottom: 100 }}>
      <GlobalStyles />
      
      {/* HEADER AREA */}
      <div style={{ background: "linear-gradient(180deg, #1a1a1a 0%, #000 100%)", padding: "20px 16px", borderBottom: "1px solid #333" }}>
        <div className="wide-container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                <Activity color="#4caf50" /> Roster DNA
              </h1>
              <p style={{ margin: "4px 0 0 0", color: "#888", fontSize: 12 }}>
                Analyze category strengths, weaknesses, and projected finish.
              </p>
            </div>
            
            <div style={{ display: "flex", gap: 8, background: "#222", padding: 4, borderRadius: 24 }}>
               <button className={`dna-toggle ${mode === 'totals' ? 'active' : ''}`} onClick={() => setMode('totals')}>Current Totals</button>
               <button className={`dna-toggle ${mode === 'pace' ? 'active' : ''}`} onClick={() => setMode('pace')}>Season Pace</button>
            </div>
          </div>

          {/* TEAM TOTALS ROW (THE CROWN) */}
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "16px", border: "1px solid #333", display: "flex", alignItems: "center", gap: 20, overflowX: "auto" }}>
             <div style={{ minWidth: 100, fontWeight: 900, color: "#fff", fontSize: 14 }}>
                TEAM<br/>TOTALS
             </div>
             {(view === 'batters' ? BATTER_COLS : PITCHER_COLS).map(col => (
               <div key={col.key} style={{ flex: 1, minWidth: 80, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#888", fontWeight: 700, marginBottom: 4 }}>{col.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#4caf50", textShadow: "0 0 10px rgba(76,175,80,0.3)" }}>
                    {col.type === 'ratio' ? totals[col.key]?.toFixed(3) : Math.round(totals[col.key] || 0)}
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* VIEW SWITCHER */}
      <div className="wide-container" style={{ marginTop: 20, display: "flex", gap: 20, borderBottom: "1px solid #333", paddingBottom: 10 }}>
         <button onClick={() => setView('batters')} style={{ background: "none", border: "none", color: view === 'batters' ? "#4caf50" : "#666", fontSize: 16, fontWeight: 900, paddingBottom: 8, borderBottom: view === 'batters' ? "3px solid #4caf50" : "3px solid transparent", cursor: "pointer" }}>Batters</button>
         <button onClick={() => setView('pitchers')} style={{ background: "none", border: "none", color: view === 'pitchers' ? "#4caf50" : "#666", fontSize: 16, fontWeight: 900, paddingBottom: 8, borderBottom: view === 'pitchers' ? "3px solid #4caf50" : "3px solid transparent", cursor: "pointer" }}>Pitchers</button>
      </div>

      {/* MAIN TABLE */}
      <div className="wide-container" style={{ marginTop: 20 }}>
        {loading ? (
           <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Analysis in progress...</div>
        ) : (
          <div className="sticky-container" style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #333" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <thead className="sticky-header">
                <tr>
                  <th style={{ textAlign: "left", padding: "12px 16px", minWidth: 180 }}>Player</th>
                  {(view === 'batters' ? BATTER_COLS : PITCHER_COLS).map(col => (
                    <th key={col.key} style={{ textAlign: "center", padding: "12px", minWidth: 80, fontSize: 12, color: "#555" }}>{col.label}</th>
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
                        // Is this player carrying the team? (>20% contribution for counts)
                        const contribution = col.type === 'count' ? (val / total) : 0;
                        const isCarry = contribution > 0.20 && col.type === 'count';
                        
                        const bg = getHeatmapColor(val, minValues[col.key], maxValues[col.key], col.lowIsGood);
                        const textColor = getTextColor(val, minValues[col.key], maxValues[col.key], col.lowIsGood);

                        return (
                          <td key={col.key} className={`stat-cell ${isCarry ? 'carry-alert' : ''}`} style={{ background: bg, textAlign: "center", padding: 10, color: textColor, fontWeight: 700, fontSize: 13 }}>
                             {col.type === 'ratio' ? val.toFixed(2) : Math.round(val)}
                             {isCarry && <div style={{ fontSize: 8, color: "#b71c1c", marginTop: 2 }}>CARRY</div>}
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
    </div>
  );
}