"use client";

import { useState } from "react";
import { useTeam } from "../context/TeamContext"; 

export default function TeamSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeTeam, teams, setActiveTeam, refreshLeague } = useTeam(); // <--- IMPORT refreshLeague

  const buttonLabel = activeTeam ? `Viewing: ${activeTeam.team_name}` : "⚾ Sync League";

  return (
    <div style={{ position: "relative", zIndex: 99999, display: 'flex', gap: '8px' }}>
      
      {/* 1. THE DROPDOWN TOGGLE (Shows Name) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "white", 
          color: "#333", 
          border: "1px solid #ccc", 
          padding: "6px 12px", 
          borderRadius: "6px",
          fontWeight: "bold",
          cursor: "pointer",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <span>{buttonLabel}</span>
        <span style={{ fontSize: "10px", opacity: 0.7 }}>▼</span>
      </button>

      {/* 2. THE REAL SYNC BUTTON (Red/Green) */}
      {/* Clicking this now FORCES the sync to run */}
      <button 
        onClick={() => refreshLeague()} 
        style={{
          background: activeTeam ? "#1b5e20" : "#d32f2f", 
          color: "white", 
          border: "none", 
          padding: "6px 12px", 
          borderRadius: "6px",
          fontWeight: "bold",
          cursor: "pointer",
          fontSize: "13px"
        }}
      >
        ↻ Sync Now
      </button>

      {/* DROPDOWN MENU (Unchanged) */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "125%",
          left: 0,
          background: "white",
          border: "1px solid #ccc",
          borderRadius: "8px",
          width: "240px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          zIndex: 100000,
          color: "black"
        }}>
          {teams && teams.length > 0 && (
            <>
              <div style={{ padding: "8px", fontSize: "11px", color: "#666", fontWeight: "bold", textTransform: 'uppercase' }}>
                Your Leagues
              </div>
              {teams.map((team) => (
                <button
                  key={team.team_key}
                  onClick={() => {
                    setActiveTeam(team); 
                    setIsOpen(false);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "10px",
                    background: activeTeam?.team_key === team.team_key ? "#e8f5e9" : "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: activeTeam?.team_key === team.team_key ? "bold" : "normal",
                    color: "#333"
                  }}
                >
                  {team.team_name}
                </button>
              ))}
              <div style={{ borderBottom: "1px solid #eee", margin: "4px 0" }}></div>
            </>
          )}
           <button 
             onClick={() => {
               const url = new URL(window.location.href);
               url.searchParams.set('sync', 'true');
               window.history.pushState({}, '', url);
               window.location.reload(); 
             }}
             style={{
               background: "#f0f7ff",
               color: "#007bff",
               border: "1px dashed #007bff",
               padding: "10px",
               borderRadius: "6px",
               cursor: "pointer",
               fontWeight: "bold",
               fontSize: "12px",
               textAlign: "center"
             }}
          >
            + Link New League
          </button>
        </div>
      )}
    </div>
  );
}