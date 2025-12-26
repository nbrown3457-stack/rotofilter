/* =============================================================================
   src/app/components/PlayerDetailPopup.tsx
============================================================================= */
import React, { useState, useEffect } from "react";
import { Icons } from "./Icons";
import { PlayerNewsFeed } from "./PlayerNewsFeed";
import { getTools, getTrajectory } from "../app/utils/playerAnalysis";

export const PlayerDetailPopup = ({ player, onClose }: { player: any, onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'career' | 'splits'>('overview');
  const [newsSource, setNewsSource] = useState<'MLB' | 'Yahoo' | 'ESPN'>('MLB');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!player) return null;

  const tools = getTools(player);
  const trajectory = getTrajectory(player);
  const isPitcher = ['SP', 'RP', 'P'].includes(player.position);

  // --- DATA BUCKETS ---
  const rangeStats = player.popupData?.range || {};
  const seasonStats = player.popupData?.season || {}; // Can be empty if not passed
  const priorStats = player.popupData?.prior || {};   // Can be empty if not passed

  // --- HELPERS ---
  const getV = (obj: any, key: string) => {
    if (!obj || Object.keys(obj).length === 0) return "--";
    const val = obj[key];
    if (val === undefined || val === null) return "--";
    if (key === 'avg' || key === 'ops' || key === 'whip' || key === 'era') {
        return parseFloat(val).toFixed(key === 'era' || key === 'whip' ? 2 : 3).replace(/^0/, '');
    }
    return Math.round(parseFloat(val));
  };

  const fmt = (val: any, isPct: boolean = false) => {
      if(val === undefined || val === null) return "--";
      if(isPct) return parseFloat(val).toFixed(1) + "%";
      return val;
  };

  const ScoreBlock = ({ label, value, color }: any) => (
    <div style={{ textAlign: 'center', flex: 1, minWidth: '60px' }}>
      <div style={{ fontSize: '9px', fontWeight: 800, color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 900, color }}>{value ?? 0}</div>
    </div>
  );

  // --- FANTASY ANALYSIS TEXT ---
  const getFantasyAnalysis = () => {
    // Use season stats if available, otherwise range stats
    const s = Object.keys(seasonStats).length > 0 ? seasonStats : rangeStats;
    
    if (isPitcher) {
      return (
        <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#444' }}>
          {player.name} is showing {parseFloat(s.k_pct) > 25 ? "elite" : "solid"} stuff. 
          His <strong>K% of {fmt(s.k_pct, true)}</strong> pairs with a {getV(s, 'era')} ERA.
          {parseFloat(s.era) < 3.50 
            ? " He remains a must-start option." 
            : " Keep an eye on his command; he may be a matchup-dependent play."}
        </p>
      );
    }
    return (
      <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#444' }}>
        {player.name} is batting <strong>{getV(s, 'avg')}</strong> with {getV(s, 'hr')} HRs.
        {parseFloat(s.ops) > .800 
          ? " His OPS suggests he is locked in at the plate. Reliable everyday starter." 
          : " He is currently working through some mechanical adjustments."}
      </p>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px'
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: '#fff', width: '100%', maxWidth: '900px', height: '95vh',
        borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
      }}>

        {/* 1. HEADER */}
        <div style={{ background: '#111', color: 'white', padding: '20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
               <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #4caf50', fontWeight: 900 }}>{player.jerseyNumber || "#"}</div>
               <div>
                 <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900 }}>{player.name}</h1>
                 <div style={{ fontSize: '12px', color: '#888' }}>{player.team} • {player.position} • Age {player.info?.age}</div>
               </div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', background: '#222', padding: '10px 15px', borderRadius: '12px', flex: 1, maxWidth: '400px', justifyContent: 'space-around' }}>
                <ScoreBlock label="Dyna" value={player.dynaScore} color="#b388ff" />
                <ScoreBlock label="Roto" value={player.rotoScore} color="#4caf50" />
                <ScoreBlock label="Points" value={player.pointsScore} color="#0288d1" />
                <ScoreBlock label="Range" value={player.rangeScore} color="#ff9800" />
            </div>
            
            <button onClick={onClose} style={{ background: '#333', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* 2. BODY */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
          
          {/* TABS HEADER */}
          <div style={{ padding: '0 20px', background: 'white', borderBottom: '1px solid #eee' }}>
             <div style={{ display: 'flex', gap: '20px' }}>
                {['overview', 'career', 'splits'].map(tab => (
                   <button key={tab} onClick={() => setActiveTab(tab as any)} style={{
                      padding: '15px 0', background: 'none', border: 'none', 
                      fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', cursor: 'pointer',
                      color: activeTab === tab ? '#1b5e20' : '#888',
                      borderBottom: activeTab === tab ? '3px solid #1b5e20' : '3px solid transparent'
                   }}>{tab}</button>
                ))}
             </div>
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* OVERVIEW TAB CONTENT */}
            {activeTab === 'overview' && (
              <>
                 <div className="popup-grid" style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', gap: '20px' }}>
                    
                    {/* LEFT: SNAPSHOT TABLE */}
                    <div style={{ flex: 2, background: 'white', borderRadius: '15px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#aaa', marginBottom: '15px' }}>Performance Snapshot</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ color: '#888', borderBottom: '1px solid #eee' }}>
                            <th style={{ textAlign: 'left', padding: '8px 0' }}>Period</th>
                            <th style={{ textAlign: 'right' }}>{isPitcher ? "IP" : "AB"}</th>
                            <th style={{ textAlign: 'right' }}>{isPitcher ? "ERA" : "HR"}</th>
                            <th style={{ textAlign: 'right' }}>{isPitcher ? "K" : "RBI"}</th>
                            <th style={{ textAlign: 'right' }}>{isPitcher ? "WHIP" : "AVG"}</th>
                            <th style={{ textAlign: 'right' }}>{isPitcher ? "SV" : "SB"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: "Selected Range", data: rangeStats, bg: '#e3f2fd' },
                            { label: "2025 Season", data: seasonStats, bg: 'transparent' }, // Will show -- if empty
                            { label: "2024 Prior", data: priorStats, bg: 'transparent' }     // Will show -- if empty
                          ].map((row, i) => (
                            <tr key={i} style={{ background: row.bg, borderBottom: '1px solid #f1f1f1' }}>
                              <td style={{ padding: '10px 0', fontWeight: 600, fontSize: '11px' }}>{row.label}</td>
                              <td style={{ textAlign: 'right' }}>{getV(row.data, isPitcher ? 'ip' : 'ab')}</td>
                              <td style={{ textAlign: 'right', color: '#d32f2f', fontWeight: 700 }}>{getV(row.data, isPitcher ? 'era' : 'hr')}</td>
                              <td style={{ textAlign: 'right' }}>{getV(row.data, isPitcher ? 'so' : 'rbi')}</td>
                              <td style={{ textAlign: 'right', color: '#1b5e20', fontWeight: 700 }}>{getV(row.data, isPitcher ? 'whip' : 'avg')}</td>
                              <td style={{ textAlign: 'right' }}>{getV(row.data, isPitcher ? 'sv' : 'sb')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* RIGHT: SCOUTING & ANALYSIS */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Scouting Tools */}
                        <div style={{ background: 'white', borderRadius: '15px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#aaa', marginBottom: '15px' }}>Scouting Grade</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {tools.length === 0 && <div style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>No elite tools detected for this period.</div>}
                            {tools.map((t: any, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: `${t.color}10`, borderRadius: '8px', borderLeft: `4px solid ${t.color}` }}>
                                <span style={{ fontWeight: 800, fontSize: '12px' }}>{t.name}</span>
                                <span style={{ fontWeight: 900, color: t.color, fontSize: '11px' }}>ELITE</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Fantasy Implications */}
                        <div style={{ background: 'white', borderRadius: '15px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                           <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#aaa', marginBottom: '10px' }}>Fantasy Implications</h3>
                           {getFantasyAnalysis()}
                        </div>
                    </div>
                 </div>
              </>
            )}

            {activeTab === 'career' && <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>Career logs coming soon.</div>}
            {activeTab === 'splits' && <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>Splits data coming soon.</div>}

            {/* NEWS SECTION (Bottom of every tab) */}
            <div style={{ background: 'white', borderRadius: '15px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', background: '#eee' }}>
                {['MLB', 'Yahoo', 'ESPN'].map(s => (
                  <button key={s} onClick={() => setNewsSource(s as any)} style={{ flex: 1, padding: '12px', border: 'none', background: newsSource === s ? '#fff' : 'transparent', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}>{s} NEWS</button>
                ))}
              </div>
              <div style={{ padding: '20px', minHeight: '150px' }}>
                <PlayerNewsFeed mlbId={player.id} playerName={player.name} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};