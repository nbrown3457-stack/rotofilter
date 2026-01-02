"use client";

import { useState } from "react";
import { useTeam } from "../context/TeamContext";
import { Icons } from "./Icons"; 

export default function TeamSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { activeTeam, teams, setActiveTeam } = useTeam();

  // Helper to render the provider badge
  const renderBadge = (provider: string | undefined) => {
    if (provider === 'ESPN') {
        return (
            <span style={{ 
                fontSize: '9px', fontWeight: 900, color: 'white', 
                background: '#d32f2f', padding: '2px 5px', borderRadius: '4px', 
                marginRight: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' 
            }}>
                ESPN
            </span>
        );
    }
    // Default to Yahoo (Purple)
    return (
        <span style={{ 
            fontSize: '9px', fontWeight: 900, color: 'white', 
            background: '#7b1fa2', padding: '2px 5px', borderRadius: '4px', 
            marginRight: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' 
        }}>
            Y!
        </span>
    );
  };

  return (
    <div style={{ position: "relative", zIndex: 99999 }}>
      
      {/* 1. THE TRIGGER BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        title={activeTeam ? `Viewing: ${activeTeam.team_name}` : "Select Team"}
        style={{
          width: '32px', 
          height: '32px', 
          borderRadius: '50%', 
          border: '1px solid rgba(255,255,255,0.2)', 
          background: activeTeam ? '#1b5e20' : '#333',
          color: 'white',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ transform: 'scale(0.7)' }}>
          <Icons.Rosters /> 
        </div>
      </button>

      {/* 2. THE DROPDOWN MENU */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "125%",
          right: 0,
          background: "white",
          border: "1px solid #ccc",
          borderRadius: "8px",
          width: "260px", // Slightly wider to fit badges
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          zIndex: 100000,
          color: "black"
        }}>
          
          {/* Header Info */}
          <div style={{ padding: "8px", borderBottom: "1px solid #eee", marginBottom: "4px" }}>
             <div style={{ fontSize: "10px", color: "#888", fontWeight: "bold", textTransform: "uppercase" }}>Current Team</div>
             <div style={{ fontWeight: "bold", color: "#1b5e20", display: 'flex', alignItems: 'center', marginTop: 4 }}>
                {activeTeam ? (
                    <>
                        {renderBadge(activeTeam.provider)}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {activeTeam.team_name}
                        </span>
                    </>
                ) : "None Selected"}
             </div>
          </div>

          {/* Team List */}
          {teams && teams.length > 0 && (
            <>
              <div style={{ padding: "4px 8px", fontSize: "10px", color: "#aaa", fontWeight: "bold", textTransform: 'uppercase' }}>
                Switch To:
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {teams.map((team) => (
                    <button
                      key={team.team_key}
                      onClick={() => {
                        setActiveTeam(team); 
                        setIsOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: "left",
                        padding: "10px",
                        background: activeTeam?.team_key === team.team_key ? "#f0f9ff" : "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: activeTeam?.team_key === team.team_key ? "bold" : "normal",
                        color: "#333",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = activeTeam?.team_key === team.team_key ? "#f0f9ff" : "white"}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                          {renderBadge(team.provider)}
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {team.team_name}
                          </span>
                      </div>
                      {activeTeam?.team_key === team.team_key && <span style={{color: "#1b5e20", flexShrink: 0}}>✓</span>}
                    </button>
                  ))}
              </div>
            </>
          )}

          {/* Add League Button */}
           <button 
             onClick={() => {
               const url = new URL(window.location.href);
               url.searchParams.set('sync', 'true');
               window.history.pushState({}, '', url);
               window.location.reload(); 
             }}
             style={{
               marginTop: "8px",
               background: "#fff",
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