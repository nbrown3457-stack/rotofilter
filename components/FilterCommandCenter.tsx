/* =============================================================================
   src/components/FilterCommandCenter.tsx
   (Updated to match your page.tsx state exactly)
============================================================================= */
"use client";

import { useState } from "react";
import { CORE_STATS } from "../config/corestats"; 
import { STATS } from "../config/stats"; 
import type { StatKey } from "../config/stats"; // <--- ADD THIS LINE
import { Icons } from "./Icons";

const CATEGORY_GROUPS = {
  batting: ["std_hit", "power", "discipline", "quality", "speed"],
  pitching: ["std_pitch", "shape", "pitch_out"],
  common: ["profile", "defense"]
};

const LABELS: Record<string, string> = {
  std_hit: "Standard", power: "Power", discipline: "Discipline", quality: "Quality of Contact",
  speed: "Speed", std_pitch: "Standard", shape: "Stuff & Shape", pitch_out: "Expected Stats",
  profile: "Bio & Level", defense: "Defense"
};

type FilterCommandCenterProps = {
  viewMode: "batters" | "pitchers";
  setViewMode: (mode: "batters" | "pitchers") => void;
  // Connecting to your page.tsx state:
  statThresholds: Record<string, number>;
  setStatThresholds: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  selectedStatKeys: string[];
  setSelectedStatKeys: React.Dispatch<React.SetStateAction<string[]>>;
  leagueStatus: string;
  setLeagueStatus: (status: any) => void;
};

export default function FilterCommandCenter({ 
  viewMode, setViewMode, 
  statThresholds, setStatThresholds,
  selectedStatKeys, setSelectedStatKeys,
  leagueStatus, setLeagueStatus
}: FilterCommandCenterProps) {
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const visibleCategories = [
    ...CATEGORY_GROUPS[viewMode === "batters" ? "batting" : "pitching"],
    ...CATEGORY_GROUPS.common
  ];

  // Helper to check if a category has active filters (Green Dot logic)
  const isCategoryActive = (catKey: string) => {
    const stats = CORE_STATS[catKey];
    if (!stats) return false;
    // Returns true if ANY stat in this category is currently selected in the table
    return stats.some(stat => selectedStatKeys.includes(stat));
  };

const toggleStat = (key: string) => {
    if (selectedStatKeys.includes(key)) {
       setSelectedStatKeys(prev => prev.filter(k => k !== key));
    } else {
       setSelectedStatKeys(prev => [...prev, key]);
       // Initialize threshold if missing
       // FIX: Cast key to StatKey so TypeScript allows the lookup
       if (statThresholds[key] === undefined) {
          const config = STATS[key as StatKey];
          setStatThresholds(prev => ({ ...prev, [key]: config?.min || 0 }));
       }
    }
  };

  return (
    <div className="filter-command-center" style={{ background: "#1a1a1a", borderBottom: "1px solid #333", paddingBottom: "4px", borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
      
      {/* --- DECK 1: CONTEXT --- */}
      <div style={{ padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #333" }}>
        {/* Batters/Pitchers Toggle */}
        <div style={{ background: "#333", borderRadius: "8px", padding: "2px", display: "flex" }}>
          {["batters", "pitchers"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              style={{
                padding: "6px 12px", borderRadius: "6px", border: "none",
                background: viewMode === mode ? "#4caf50" : "transparent",
                color: viewMode === mode ? "white" : "#aaa",
                fontWeight: "bold", fontSize: "12px", cursor: "pointer"
              }}
            >
              {mode === "batters" ? "⚾ Batters" : "🧢 Pitchers"}
            </button>
          ))}
        </div>

        {/* Availability Dropdown */}
        <select 
          value={leagueStatus} 
          onChange={(e) => setLeagueStatus(e.target.value)}
          style={{ background: "#222", border: "1px solid #444", color: "#ddd", padding: "6px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold" }}
        >
          <option value="all">View: All Players</option>
          <option value="available">View: Free Agents</option>
          <option value="my_team">View: My Team</option>
          <option value="rostered">View: All Rostered</option>
        </select>
      </div>

      {/* --- DECK 2: FILTER STRIP --- */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "10px 12px" }}>
        {visibleCategories.map((catKey) => {
          const isActive = isCategoryActive(catKey);
          return (
            <button
              key={catKey}
              onClick={() => setActiveCategory(catKey)}
              style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: "20px",
                border: isActive ? "1px solid #4caf50" : "1px solid #444",
                background: isActive ? "rgba(76, 175, 80, 0.1)" : "#222",
                color: isActive ? "#4caf50" : "#ccc",
                fontSize: "12px", fontWeight: "bold", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "6px"
              }}
            >
              {isActive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf50" }} />}
              {LABELS[catKey] || catKey}
            </button>
          );
        })}
      </div>

      {/* --- THE MODAL (Pop-up Sliders) --- */}
      {activeCategory && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 100000, display: "flex", alignItems: "end" }} onClick={() => setActiveCategory(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#1a1a1a", borderTop: "1px solid #4caf50", borderRadius: "16px 16px 0 0", padding: "20px", maxHeight: "80vh", overflowY: "auto", animation: "slideUp 0.3s ease-out" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#fff" }}>{LABELS[activeCategory]} Filters</h3>
              <button onClick={() => setActiveCategory(null)} style={{ background: "none", border: "none", color: "#888", fontSize: "16px" }}>Close ✕</button>
            </div>

           <div style={{ display: "grid", gap: "20px" }}>
              {CORE_STATS[activeCategory]?.map((statKey) => {
                 // FIX: Cast here as well
                 const config = STATS[statKey as StatKey];
                 if (!config) return null;
                 const isSelected = selectedStatKeys.includes(statKey);
                 // Fix the lookup here too
                 const currentVal = statThresholds[statKey] ?? config.min ?? 0;

                 return (
                   <div key={statKey} style={{ opacity: isSelected ? 1 : 0.6 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {/* Toggle Switch */}
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={() => toggleStat(statKey)} 
                            style={{ width: 18, height: 18, accentColor: "#4caf50" }}
                          />
                          <span style={{ color: isSelected ? "#fff" : "#888", fontWeight: "bold", fontSize: "14px" }}>{config.label}</span>
                        </div>
                        {isSelected && <span style={{ color: "#4caf50", fontWeight: "bold" }}>{currentVal}{config.unit === "percent" ? "%" : ""}</span>}
                     </div>
                     {isSelected && (
                       <input 
                         type="range" 
                         min={config.min ?? 0} max={config.max ?? 100} step={config.step ?? 1}
                         value={currentVal}
                         onChange={(e) => setStatThresholds(p => ({ ...p, [statKey]: Number(e.target.value) }))}
                         style={{ width: "100%", accentColor: "#4caf50", height: "4px" }} 
                       />
                     )}
                   </div>
                 );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}