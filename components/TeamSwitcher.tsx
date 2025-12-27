"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/utils/supabase/client";
import { Icons } from "./Icons"; // Ensure this path is correct for your setup

export default function TeamSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  
  // FORCE VISIBLE: No "if (!mounted) return null" checks here!
  
  return (
    <div style={{ position: "relative", zIndex: 200 }}>
      {/* THE BUTTON - Hardcoded to be White text on Green so you CANNOT miss it */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "#1b5e20", 
          color: "white", 
          border: "1px solid #4caf50", 
          padding: "8px 16px", 
          borderRadius: "8px",
          fontWeight: "bold",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <span>⚾ Sync League</span>
        <span>▼</span>
      </button>

      {/* THE DROPDOWN MENU */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "110%",
          right: 0,
          background: "white",
          border: "1px solid #ccc",
          borderRadius: "8px",
          width: "220px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}>
          <div style={{ padding: "8px", fontSize: "12px", color: "#666", borderBottom: "1px solid #eee" }}>
            Select a Yahoo League:
          </div>
          
          <button 
             onClick={() => {
               // This triggers the sync modal by URL parameter
               const url = new URL(window.location.href);
               url.searchParams.set('sync', 'true'); // This opens your existing modal
               window.history.pushState({}, '', url);
               window.location.reload(); // Quick way to force the modal open
             }}
             style={{
               background: "#f0f7ff",
               color: "#007bff",
               border: "1px dashed #007bff",
               padding: "10px",
               borderRadius: "6px",
               cursor: "pointer",
               fontWeight: "bold",
               textAlign: "center"
             }}
          >
            + Add New League
          </button>
        </div>
      )}
    </div>
  );
}