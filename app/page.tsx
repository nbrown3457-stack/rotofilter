"use client";

import { createClient } from "@/app/utils/supabase/client"; 

/* =============================================================================
   SECTION 0 — Imports
============================================================================= */
//test note on 12/28 after crash

// 1. GO UP ONE LEVEL (..) to find components
import { PlayerDetailPopup } from "../components/PlayerDetailPopup";
import { PlayerNewsFeed } from "../components/PlayerNewsFeed";
import LeagueSyncModal from "../components/LeagueSyncModal"; 
import { Icons } from "../components/Icons"; 
import { UserMenu } from "../components/UserMenu"; 
import TeamSwitcher from "../components/TeamSwitcher"; // NEW: League Integration
import { useTeam } from '../context/TeamContext';

// 2. GO UP ONE LEVEL (..) to find config
import type { CoreId } from "../config/cores";
import { CORES } from "../config/cores";
import { CORE_STATS } from "../config/corestats";
import { STATS } from "../config/stats";
import type { StatKey } from "../config/stats";

// 3. LOOK INSIDE CURRENT FOLDER (.) to find utils
import { 
  toTitleCase, 
  getTools, 
  getTrajectory, 
  getStatBounds, 
  enrichPlayerData,
  type DateRangeOption 
} from "./utils/playerAnalysis";

// 4. Standard Libraries
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";

const PulseStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes pulse-ring { 0% { transform: scale(0.33); opacity: 1; } 80%, 100% { opacity: 0; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .news-pulse { position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background-color: #ff1744; border-radius: 50%; border: 2px solid white; z-index: 10; }
    .news-pulse::after { content: ''; position: absolute; top: -2px; left: -2px; width: 12px; height: 12px; background-color: #ff1744; border-radius: 50%; animation: pulse-ring 1.25s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; }
    .active-row { background-color: #f0f7ff !important; }
    .sticky-container { overflow: auto; max-height: 800px; position: relative; }
    .sticky-table { border-collapse: separate; border-spacing: 0; width: 100%; }
    .sticky-table thead th { position: sticky; top: 0; z-index: 20; background: #fafafa; box-shadow: inset 0 -1px 0 #eee; cursor: pointer; user-select: none; }
    .sticky-table td:nth-child(1), .sticky-table th:nth-child(1) { position: sticky; left: 0; z-index: 30; background: white; width: 32px; min-width: 32px; }
    .sticky-table td:nth-child(2), .sticky-table th:nth-child(2) { position: sticky; left: 32px; z-index: 30; background: white; }
    .sticky-table th:nth-child(1), .sticky-table th:nth-child(2) { z-index: 40; background: #fafafa; }
    .sticky-table td:nth-child(2)::after, .sticky-table th:nth-child(2)::after { content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: 1px; background: #eee; }
    .active-row td:nth-child(1), .active-row td:nth-child(2) { background-color: #f0f7ff !important; }
    footer a:hover { color: #4caf50 !important; text-decoration: underline; }
    .preset-card { transition: all 0.2s ease; border: 1px solid rgba(255,255,255,0.1); }
    .preset-card:hover { transform: translateY(-4px); border-color: #1b5e20; box-shadow: 0 12px 30px rgba(0,0,0,0.5); }
    .compare-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 2000; display: flex; justify-content: center; align-items: center; padding: 20px; backdrop-filter: blur(5px); }
    .compare-modal-content { background: #fff; width: 100%; max-width: 1000px; max-height: 90vh; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
    .custom-checkbox { width: 16px; height: 16px; border: 2px solid #ccc; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; background: #fff; }
    .custom-checkbox.checked { background: #1b5e20; border-color: #1b5e20; }
    .beta-banner { background: linear-gradient(90deg, #1b5e20 0%, #2e7d32 100%); color: rgba(255,255,255,0.9); text-align: center; padding: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .nav-link { color: rgba(255,255,255,0.7); text-decoration: none; font-size: 13px; font-weight: 700; padding: 8px 12px; border-radius: 6px; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
    .nav-link:hover { color: #fff; background: rgba(255,255,255,0.1); }
    .nav-link.active { color: #fff; background: #1b5e20; }
    .mobile-floating-bar { display: none; }
    .desktop-nav-links { display: flex; }
    .mobile-bottom-nav { display: none; }
    @media (max-width: 768px) {
      .desktop-nav-links { display: none !important; }
      .mobile-floating-bar { display: flex; position: fixed; top: 64px; left: 0; right: 0; z-index: 90; background: rgba(27, 94, 32, 0.95); backdrop-filter: blur(8px); padding: 10px 20px; align-items: center; justify-content: space-between; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.2); animation: slideDown 0.3s ease-out; }
      @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .mobile-bottom-nav { display: flex !important; position: fixed; bottom: 0; left: 0; right: 0; background: #121212; border-top: 1px solid #2a2a2a; z-index: 1000; padding-bottom: env(safe-area-inset-bottom); height: 60px; align-items: center; overflow-x: auto; justify-content: flex-start; box-shadow: 0 -4px 15px rgba(0,0,0,0.5); }
      .mobile-bottom-nav::-webkit-scrollbar { display: none; }
      .mobile-nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #777; font-size: 9px; font-weight: 600; text-decoration: none; min-width: 72px; height: 100%; gap: 4px; transition: color 0.2s ease; }
      .mobile-nav-item.active { color: #fff; }
      .mobile-nav-item.active svg { stroke: #4caf50; }
      footer { padding-bottom: 80px !important; }
    }
    * { box-sizing: border-box; }
    html, body { overflow-x: hidden; width: 100%; margin: 0; padding: 0; }
    @media (max-width: 600px) {
      .upgrade-btn {
        padding: 4px 10px !important;
        font-size: 10px !important;
        border-radius: 12px !important;
      }
      .nav-logo-text {
        font-size: 16px !important;
      }
      .nav-logo-subtext {
        display: none; /* Hide the tagline on tiny screens to save space */
      }
    }
  `}} />
);

/* =============================================================================
   SECTION 1 — Types & Constants
============================================================================= */
type BatterPos = "C" | "1B" | "2B" | "3B" | "SS" | "OF" | "DH";
type PitcherPos = "SP" | "RP";
type Position = BatterPos | PitcherPos | "batters" | "pitchers";
type Level = "all" | "mlb" | "prospects";
// Added "my_team" so we can distinguish between "My Guys" and "All Taken Players"
type LeagueStatus = "all" | "available" | "rostered" | "my_team";
type FilterTab = "recommended" | "expert" | "my_filters";
type StatViewMode = "actual" | "pace";

const AL_TEAMS = ["BAL","BOS","CWS","CLE","DET","HOU","KC","LAA","MIN","NYY","OAK","SEA","TB","TEX","TOR"] as const;
const NL_TEAMS = ["ARI","ATL","CHC","CIN","COL","LAD","MIA","MIL","NYM","PHI","PIT","SD","SF","STL","WSH"] as const;
const ALL_TEAMS = [...AL_TEAMS, ...NL_TEAMS];
const BATTER_POSITIONS: Position[] = ["C", "1B", "2B", "3B", "SS", "OF", "DH"];
const PITCHER_POSITIONS: Position[] = ["SP", "RP"];
const ALL_POSITIONS: Position[] = [...BATTER_POSITIONS, ...PITCHER_POSITIONS];

type TeamAbbr = (typeof ALL_TEAMS)[number];

const TEAM_PRIMARY: Record<TeamAbbr, string> = {
  ARI: "#A71930", ATL: "#CE1141", BAL: "#DF4601", BOS: "#BD3039", CHC: "#0E3386",
  CWS: "#27251F", CIN: "#C6011F", CLE: "#0C2340", COL: "#33006F", DET: "#0C2340",
  HOU: "#002D62", KC:  "#004687", LAA: "#BA0021", LAD: "#005A9C", MIA: "#00A3E0",
  MIL: "#12284B", MIN: "#002B5C", NYM: "#002D72", NYY: "#0C2340", OAK: "#003831",
  PHI: "#E81828", PIT: "#FDB827", SD:  "#2F241D", SEA: "#0C2C56", SF:  "#FD5A1E",
  STL: "#C41E3A", TB:  "#092C5C", TEX: "#003278", TOR: "#134A8E", WSH: "#AB0003",
};

// 🔥 DEFINE ALL COLORS
const BUTTON_DARK_GREEN = "#1b5e20";
const BUTTON_DYNASTY_PURPLE = "#6a1b9a"; 
const BUTTON_RANGE_ORANGE = "#e65100";

// UPDATED: Complete list of stats to prevent "Ghost Zeros"
const BATTER_STATS = [
  'hr', 'rbi', 'sb', 'avg', 'ops', 'obp', 'slg', 'iso', 'wrc_plus',
  'xwoba', 'xba', 'xslg', 'woba', 'savant_ba', 'savant_slg', 'xwoba_con',
  'barrel_pct', 'hard_hit_pct', 'exit_velocity_avg', 'launch_angle_avg', 
  'sweet_spot_pct', 'max_exit_velocity', 'ev_90', 'barrels', 'barrels_per_pa', 'launch_angle_dist',
  'chase_pct', 'zone_contact_pct', 'contact_pct', 'swing_pct', 'whiff_pct', 
  'bb_pct', 'k_pct', 'zone_swing_pct', 'called_strike_pct', 'csw_pct',
  'sprint_speed', 'bolts', 'speed_percentile', 'top_speed', 'home_to_first', 'bsr', 'extra_base_pct', 'sb_per_pa'
];

const PITCHER_STATS = [
  'w', 'l', 'sv', 'hld', 'era', 'whip', 'so', 'ip', 'g',
  'xera', 'xba_allowed', 'xslg_allowed', 'xwoba_allowed', 'clutch_xwoba',
  'velocity', 'spin_rate', 'ivb', 'h_break', 'vert_break', 'spin_axis', 
  'extension', 'release_point_xyz', 'putaway_pct', 'gb_pct_pitch', 'xwoba_pitch',
  'arm_value', 'arm_strength', 'fielding_runs' // (Fielding can be both, but often relevant here)
];
/* =============================================================================
   SECTION 3 — Sub-Components
============================================================================= */
const baseButtonStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, borderWidth: "1px", borderStyle: "solid",
  borderColor: "rgba(0,0,0,0.12)", background: "#ffffff", color: "#333",
  cursor: "pointer", fontWeight: 600, fontSize: "12px", transition: "all 0.1s ease",
};
const selectedButtonStyle: React.CSSProperties = { background: BUTTON_DARK_GREEN, borderColor: BUTTON_DARK_GREEN, color: "#ffffff" };
const clearButtonStyle: React.CSSProperties = { ...baseButtonStyle, fontSize: 10, padding: "2px 8px", background: "#fdecea", borderColor: "#f5c6cb", color: "#721c24" };

const compactCardStyle: React.CSSProperties = { 
  borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.1)", 
  borderRadius: 12, background: "rgba(255,255,255,0.98)", padding: "12px 14px", 
  boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", width: "100%",
  gap: "8px", transition: "all 0.2s ease"
};
const cardStyle: React.CSSProperties = { 
  borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.1)", 
  borderRadius: 16, background: "rgba(255,255,255,0.98)", padding: 20, 
  boxShadow: "0 10px 40px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", width: "100%"
};
const labelStyle: React.CSSProperties = { fontWeight: 800, fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: "0.8px" };

const CardHeader = ({ title, onClear, onToggle, isCollapsed, isActive }: any) => (
  <div onClick={onToggle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={labelStyle}>{title}</div>
      {isCollapsed && isActive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4caf50", boxShadow: "0 0 4px #4caf50" }} />}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {!isCollapsed && <button onClick={onClear} style={{...clearButtonStyle, fontSize: 9, padding: "2px 6px"}}>Reset</button>}
      <div style={{ color: "#999" }}>{isCollapsed ? <Icons.ChevronDown /> : <Icons.ChevronUp />}</div>
    </div>
  </div>
);

const PlayerAvatar = ({ team, jerseyNumber, hasNews, headline, availability }: any) => {
  const teamColor = TEAM_PRIMARY[team as TeamAbbr] || "#444";
  return (
    <div style={{ position: 'relative', flexShrink: 0 }} title={headline}>
      <div style={{ width: 32, height: 32, backgroundColor: teamColor, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%)' }} />
        <span style={{ color: "#fff", fontSize: "14px", fontWeight: 900, fontFamily: "ui-monospace, monospace", position: 'relative', zIndex: 2, textShadow: "1px 1px 2px rgba(0,0,0,0.4)" }}>{jerseyNumber || "--"}</span>
      </div>
      {hasNews && <div className="news-pulse" />}
      {/* NEW: Visual ownership indicator (green dot) */}
      {availability === 'MY_TEAM' && (
        <div style={{ position: 'absolute', top: -2, left: -2, width: 10, height: 10, background: '#4caf50', borderRadius: '50%', border: '2px solid white', zIndex: 10 }} />
      )}
      <div style={{ position: 'absolute', bottom: -2, right: -4, background: '#fff', color: teamColor, fontSize: '8px', fontWeight: 900, padding: '1px 3px', borderRadius: '4px', border: `1px solid ${teamColor}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', zIndex: 5 }}>{team}</div>
    </div>
  );
};

const ToolLegend = () => (
  <div style={{ display: "flex", gap: 16, padding: "10px 16px", background: "#f5f5f5", borderRadius: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase" }}>Key:</div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 900, color: "#4caf50", background: "#e8f5e9", padding: "2px 6px", borderRadius: 4 }}>H</span><span style={{ fontSize: 10, color: "#555" }}>Hit (AVG &gt; .275)</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 900, color: "#f44336", background: "#ffebee", padding: "2px 6px", borderRadius: 4 }}>P</span><span style={{ fontSize: 10, color: "#555" }}>Power (ISO &gt; .200)</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 900, color: "#2196f3", background: "#e3f2fd", padding: "2px 6px", borderRadius: 4 }}>S</span><span style={{ fontSize: 10, color: "#555" }}>Speed (Spd &gt; 28)</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 900, color: "#ff9800", background: "#fff3e0", padding: "2px 6px", borderRadius: 4 }}>D</span><span style={{ fontSize: 10, color: "#555" }}>Disc (BB% &gt; 10)</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 900, color: "#9c27b0", background: "#f3e5f5", padding: "2px 6px", borderRadius: 4 }}>C</span><span style={{ fontSize: 10, color: "#555" }}>Context (OPS &gt; .800)</span></div>
    {/* NEW: Season Anchor Legend Entry */}
    <div style={{ display: "flex", alignItems: "center", gap: 6, borderLeft: "1px solid #ddd", paddingLeft: 12, marginLeft: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 900, color: '#999', border: '1px solid #ccc', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>S</span>
        <span style={{ fontSize: 10, color: "#555" }}>Season Anchor</span>
    </div>
  </div>
);

/* =============================================================================
   SECTION 4 — Main Page
============================================================================= */
export default function Home() {
  const supabase = createClient();

  // --- 1. STANDARD STATE ---
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeOption>("season_curr");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [compareList, setCompareList] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [orderedCores, setOrderedCores] = useState<{ id: CoreId; label: string }[]>([...CORES]);
  const [openGroup, setOpenGroup] = useState<CoreId | null>(null);
  const [isUserPaid, setIsUserPaid] = useState(true); 
  const [isMounted, setIsMounted] = useState(false);
  const resultsTableRef = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState({ league: true, positions: true, al: true, nl: true });
    
  // --- 2. NEW TEAM CONTEXT & FILTER STATE ---
  const { activeTeam } = useTeam(); // <--- CONNECTS TO THE BRAIN
  // --- HELPER: Identify Season-Locked Stats ---
  // If a stat is NOT in "Standard Hitting" or "Standard Pitching", it comes from Savant
  // and is currently locked to the full season.
  const isSeasonLocked = (key: string) => {
    // We cast to 'any' to avoid strict type checks on the config import for now
    const isStandardHit = CORE_STATS.std_hit?.includes(key as any);
    const isStandardPitch = CORE_STATS.std_pitch?.includes(key as any);
    return !isStandardHit && !isStandardPitch;
  };
  const [leagueScope, setLeagueScope] = useState('all'); 
  const [search, setSearch] = useState(''); 
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // --- 3. FILTER SETTINGS ---
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<StatKey[]>([]);
  const [level, setLevel] = useState<Level>("all");
  const [leagueStatus, setLeagueStatus] = useState<LeagueStatus>("all");
  const [selectedTeams, setSelectedTeams] = useState<TeamAbbr[]>([...ALL_TEAMS]);
  const [searchQuery, setSearchQuery] = useState(""); // (Note: We use 'search' for API, this might be redundant but safe to keep for now)
  const [sortKey, setSortKey] = useState<string | null>("rotoScore"); 
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statThresholds, setStatThresholds] = useState<Record<string, number>>({});
  const [minTools, setMinTools] = useState<number>(0);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("filters");
  const [presetTab, setPresetTab] = useState<FilterTab>("recommended");
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  // --- 4. SYNC LISTENER (Opens Modal on URL Param) ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('sync') === 'true') {
        setIsSyncModalOpen(true); 
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('sync');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

// --- 5. AUTH & FILTERS LOAD (Now with Logout Cleaner) ---
  const fetchSavedFilters = async (currentUser: any) => {
    if (!currentUser) return; 
    const { data, error } = await supabase.from('saved_filters').select('*').order('created_at', { ascending: false });
    if (data) {
      const cloudFilters = data.map((f: any) => ({ id: f.id, name: f.name, ...f.config }));
      setSavedFilters(cloudFilters);
    }
  };

useEffect(() => {
    // Check initial session
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // --- LIFT OFF UPDATE: FORCE UNLOCK ---
      setIsUserPaid(true); 
      // Original Logic (Saved for later):
      // if (currentUser?.user_metadata?.is_paid) setIsUserPaid(true);
      // -------------------------------------

      if (currentUser) fetchSavedFilters(currentUser); 
    };
    checkUser();

    // Listen for changes (Login / Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // --- LIFT OFF UPDATE: FORCE UNLOCK ---
      setIsUserPaid(true);
      // Original Logic (Saved for later):
      // if (currentUser?.user_metadata?.is_paid) setIsUserPaid(true);
      // else setIsUserPaid(false);
      // -------------------------------------
      
      // Handle Data Load vs. Cleanup
      if (currentUser) {
        fetchSavedFilters(currentUser); 
      } else {
        // --- LOGOUT DETECTED: WIPE THE MEMORY ---
        // This forces the "Viewing: Team" to reset to default
        document.cookie = "active_team_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        document.cookie = "active_league_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        
        // Restore local defaults
        const saved = localStorage.getItem('rotofilter_presets');
        if (saved) setSavedFilters(JSON.parse(saved));
        else setSavedFilters([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 6. HANDLE SYNC SUCCESS (Simplified) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const syncStatus = params.get('sync');
    const errorMsg = params.get('msg');

    if (syncStatus === 'success') {
      setIsSyncModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
      // Note: We don't need to manually fetch teams here anymore; Context handles it on reload.
    } else if (syncStatus === 'error') {
      alert(`Yahoo Connection Failed: ${decodeURIComponent(errorMsg || "Unknown error")}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('rotofilter_presets');
    if (saved) setSavedFilters(JSON.parse(saved));
  }, []);
  // ----------------------------------------

  // --- UPDATED FETCH PLAYERS (With My Team Filter & Safety Timeout) ---
  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // 1. CONTEXT: Always send League & Team Key if they exist
      // This allows the backend to tag players as 'MY_TEAM' vs 'ROSTERED' vs 'AVAILABLE'
      // without filtering them out of the list immediately.
      if (activeTeam) {
          params.append('league_id', activeTeam.league_key);
          params.append('team_id', activeTeam.team_key);
      }

      // 2. Handle Search
      if (search) params.append('search', search);

      // 3. Handle Date Ranges 
      if (dateRange !== 'custom') {
         const rangeValue = dateRange === 'pace_season' ? 'season_curr' : dateRange;
         params.append('range', rangeValue);
      } else {
         if (customStart) params.append('start_date', customStart);
         if (customEnd) params.append('end_date', customEnd);
      }
      
      // 4. Handle Positions
      if (selectedPositions.length > 0 && !selectedPositions.includes('All')) {
        params.append('position', selectedPositions.join(','));
      }
      
      // 5. The Fetch (with a built-in 8-second safety timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`/api/players?${params.toString()}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Failed to fetch players');
      
      const data = await response.json();
      // "Handshake Fix": Check if data IS the array, or if it HAS a .players property
      const safeList = Array.isArray(data) ? data : (data.players || []);
      setPlayers(safeList); 
      
    } catch (error) {
      console.error('Error fetching players:', error);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [leagueScope, activeTeam, search, dateRange, customStart, customEnd, selectedPositions]); 

  // --- TRIGGER FETCH ON FILTER CHANGE ---
  useEffect(() => {
    // Only fetch if we aren't partially through selecting custom dates
    if (dateRange !== 'custom' || (customStart && customEnd)) {
      fetchPlayers();
    }
  }, [fetchPlayers, dateRange, customStart, customEnd]);


  const applyCustomDates = () => {
    if (dateRange === 'custom' && customStart && customEnd) {
      fetchPlayers();
    }
  };

  const toggleSection = (key: keyof typeof sections) => setSections(prev => ({ ...prev, [key]: !prev[key] }));
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(orderedCores);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setOrderedCores(items);
  };

  const handleGlobalReset = () => {
    setOpenGroup(null); setSelectedPositions([]); setSelectedStatKeys([]); setLevel("all"); setLeagueStatus("all");
    setSelectedTeams([...ALL_TEAMS]); setSearchQuery(""); setStatThresholds({}); setMinTools(0);
    setActivePlayerId(null); setDateRange("season_curr"); setCustomStart(""); setCustomEnd(""); setCompareList([]);
    setSortKey("rotoScore"); setSortDir("desc");
  };

  const scrollToResults = () => { if (resultsTableRef.current) resultsTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const applyQuickFilter = (preset: any) => {
    handleGlobalReset();
    if (preset.pos) setSelectedPositions(preset.pos);
    if (preset.stats) setSelectedStatKeys(preset.stats);
    if (preset.thresholds) setStatThresholds(preset.thresholds);
    if (preset.minTools) setMinTools(preset.minTools);
    if (preset.level) setLevel(preset.level);

    if (preset.dateRange) {
        setDateRange(preset.dateRange);
        if (preset.customStart) setCustomStart(preset.customStart);
        if (preset.customEnd) setCustomEnd(preset.customEnd);
    }
    scrollToResults();
  };

  const saveCurrentFilter = async () => {
    const name = window.prompt("Name your filter:");
    if (!name) return;

    const newFilterConfig = { 
        pos: selectedPositions, 
        stats: selectedStatKeys, 
        thresholds: statThresholds, 
        minTools, 
        level,
        dateRange,
        customStart: dateRange === 'custom' ? customStart : null,
        customEnd: dateRange === 'custom' ? customEnd : null
    };

    if (user) {
      const { error } = await supabase
        .from('saved_filters')
        .insert({
          user_id: user.id,
          name: name,
          config: newFilterConfig
        });

      if (error) {
        alert("Error saving to cloud: " + error.message);
      } else {
        alert("Saved to Cloud! ☁️");
        fetchSavedFilters(user); 
      }
    } 
    else {
      const newFilter = { id: Date.now(), name, ...newFilterConfig };
      const updated = [...savedFilters, newFilter];
      setSavedFilters(updated);
      localStorage.setItem('rotofilter_presets', JSON.stringify(updated));
      alert("Saved to Local Storage (Login to save to cloud!)");
    }
  };

  const deleteFilter = (id: number, e: any) => {
    e.stopPropagation();
    if (!window.confirm("Delete this filter?")) return;
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('rotofilter_presets', JSON.stringify(updated));
  };

  const toggleCompare = (pid: string) => {
    setCompareList(prev => {
      if (prev.includes(pid)) return prev.filter(id => id !== pid);
      if (prev.length >= 5) { alert("Maximum 5 players allowed."); return prev; }
      return [...prev, pid];
    });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  // 🔥 UPDATED FILTERING LOGIC: Uses availability data from the backend API
  const filteredPlayers = useMemo(() => {
    const scoredData = players.map((p: any) => enrichPlayerData(p, dateRange));

    return scoredData.filter((p: any) => {
      // --- SMART ISOLATION: Auto-hide batters if looking at Pitching Stats ---
    const hasPitchingStats = selectedStatKeys.some(k => PITCHER_STATS.includes(k));
    const hasBattingStats = selectedStatKeys.some(k => BATTER_STATS.includes(k));

    // If I selected "Velocity" (Pitching) but NOT "Home Runs" (Batting), hide Batters.
    if (hasPitchingStats && !hasBattingStats) {
      if (p.type !== 'pitcher' && p.position !== 'P' && p.position !== 'SP' && p.position !== 'RP') return false;
    }
    
    // If I selected "Exit Velo" (Batting) but NOT "ERA" (Pitching), hide Pitchers.
    if (hasBattingStats && !hasPitchingStats) {
      if (p.type === 'pitcher' || ['SP', 'RP', 'P'].includes(p.position)) return false;
    }
    // -----------------------------------------------------------------------
    
      // 1. LEAGUE STATUS FILTERS
// "Available" = Not owned by anyone (Free Agents)
if (leagueStatus === "available") {
    if (p.availability !== "AVAILABLE") return false;
}

// "My Team" = Only players on YOUR roster
if (leagueStatus === "my_team") {
    if (p.availability !== "MY_TEAM") return false;
}

// "Rostered" = Players owned by YOU or OPPONENTS (Anyone taken)
if (leagueStatus === "rostered") {
    if (p.availability !== "MY_TEAM" && p.availability !== "ROSTERED") return false;
}

      if (selectedPositions.length > 0 && !selectedPositions.includes(p.position as Position)) return false;
      if (level !== "all" && p.level !== level) return false;
      if (!selectedTeams.includes(p.team as TeamAbbr)) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (minTools > 0 && getTools(p).length < minTools) return false;
      
      for (const key of selectedStatKeys) {
        const threshold = statThresholds[key];
        const val = parseFloat(p.stats?.[key] || 0); 
        const config = STATS[key];
        if (threshold !== undefined) {
          if (config.goodDirection === "higher" ? val < threshold : val > threshold) return false;
        }
      }
      return true;
    }).sort((a: any, b: any) => {
      if (!sortKey) return 0;
      
      // 1. Get Values
      let valA = sortKey.includes('Score') ? a[sortKey] : parseFloat(a.stats[sortKey] || 0);
      let valB = sortKey.includes('Score') ? b[sortKey] : parseFloat(b.stats[sortKey] || 0);
      
      // 2. QUALIFIER CHECK (The Magic Fix)
      // Only apply this penalty if we are sorting by a Rate Stat
      const rateStats = ['avg', 'obp', 'slg', 'ops', 'era', 'whip', 'k_pct', 'bb_pct', 'xwoba', 'hard_hit_pct'];
      if (rateStats.includes(sortKey)) {
          // Define Thresholds (Lower for Last 7 Days)
          const minPA = dateRange === 'last_7' ? 5 : 25;
          const minIP = dateRange === 'last_7' ? 2 : 10;
          
          const aQualified = (a.type === 'pitcher' || ['SP','RP','P'].includes(a.position)) ? (a.stats.ip || 0) >= minIP : (a.stats.pa || 0) >= minPA;
          const bQualified = (b.type === 'pitcher' || ['SP','RP','P'].includes(b.position)) ? (b.stats.ip || 0) >= minIP : (b.stats.pa || 0) >= minPA;

          // Always push Qualified players to the top (-1), regardless of sort direction
          // This ensures that when you sort by OPS, you see Judge/Soto, not the 1-for-1 rookie.
          if (aQualified && !bQualified) return -1;
          if (!aQualified && bQualified) return 1;
      }

      // 3. Standard Sort for everyone else
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
  }, [players, selectedPositions, level, leagueStatus, selectedTeams, searchQuery, sortKey, sortDir, selectedStatKeys, statThresholds, minTools, dateRange]);

const toggleStat = (key: StatKey) => {
    if (selectedStatKeys.includes(key)) {
      // If turning OFF, remove it from list
      setSelectedStatKeys(prev => prev.filter(k => k !== key));
    } else { 
      // If turning ON, add it to list
      setSelectedStatKeys(prev => [...prev, key]); 
      
      // Look up the "Min" value in your new config and start there.
      // This will be 0 for almost everything now, but -30 for Launch Angle, etc.
      if (statThresholds[key] === undefined) {
        const startValue = STATS[key].min ?? 0;
        setStatThresholds(prev => ({ ...prev, [key]: startValue })); 
      }
    }
  };

  const TeamGrid = ({ teams }: { teams: readonly TeamAbbr[] }) => {
    const isAllSelected = teams.every(t => selectedTeams.includes(t));
    const toggleAll = () => {
      if (isAllSelected) setSelectedTeams(prev => prev.filter(t => !teams.includes(t)));
      else setSelectedTeams(prev => [...new Set([...prev, ...teams])]);
    };
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(32px, 1fr))", gap: 6 }}>
        <button onClick={toggleAll} style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${isAllSelected ? BUTTON_DARK_GREEN : "#ddd"}`, fontSize: 9, fontWeight: 900, background: isAllSelected ? BUTTON_DARK_GREEN : "#fff", color: isAllSelected ? "#fff" : "#999", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>ALL</button>
        {teams.map(t => {
          const isSel = selectedTeams.includes(t);
          return <button key={t} onClick={() => setSelectedTeams(prev => isSel ? prev.filter(x => x !== t) : [...prev, t])} style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid " + TEAM_PRIMARY[t], fontSize: 9, fontWeight: 900, background: isSel ? TEAM_PRIMARY[t] : "#fff", color: isSel ? "#fff" : TEAM_PRIMARY[t], cursor: "pointer" }}>{t}</button>;
        })}
      </div>
    );
  };

  const renderCompareModal = () => {
    if (!isCompareOpen) return null;
    const comparePlayers = players.filter(p => compareList.includes(p.id.toString()));
    const calculateTopChoice = () => {
      const scores: Record<string, number> = {};
      const allKeys = ["avg", "hr", "rbi", "sb", "ops", "wrc_plus", "iso", "xwoba", "k_pct", "bb_pct"];
      allKeys.forEach(key => {
        const isLowerBetter = ["era", "whip", "k_pct"].includes(key);
        const values = comparePlayers.map(p => ({ id: p.id, val: p.stats[key] ?? 0 })).filter(x => x.val !== 0);
        if (values.length === 0) return;
        const bestVal = isLowerBetter ? Math.min(...values.map(v => v.val)) : Math.max(...values.map(v => v.val));
        values.forEach(v => { if (v.val === bestVal) scores[v.id] = (scores[v.id] || 0) + 1; });
      });
      return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b, "");
    };
    const topChoiceId = calculateTopChoice();
    const standardStats = ["avg", "hr", "rbi", "sb", "ops"];
    const advStats = ["wrc_plus", "iso", "xwoba", "k_pct", "bb_pct"];
    const statcast = ["exit_velocity_avg", "barrel_pct", "hard_hit_pct", "sprint_speed"];
    return (
      <div className="compare-modal-overlay" onClick={() => setIsCompareOpen(false)}>
        <div className="compare-modal-content" onClick={e => e.stopPropagation()}>
          <div style={{ padding: "20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontWeight: 900 }}>Head-to-Head Comparison</h2>
            <button onClick={() => setIsCompareOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}><Icons.X /></button>
          </div>
          <div style={{ overflow: "auto", padding: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr><th style={{ textAlign: "left", padding: 10 }}>Stat</th>{comparePlayers.map(p => (<th key={p.id} style={{ textAlign: "center", padding: 10 }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>{p.id.toString() === topChoiceId && <div style={{ background: "#FFD700", color: "#000", fontSize: 10, fontWeight: 900, padding: "2px 8px", borderRadius: 12, display: "flex", alignItems: "center", gap: 4, marginBottom: -4 }}><Icons.Trophy /> TOP CHOICE</div>}<PlayerAvatar team={p.team as TeamAbbr} jerseyNumber={p.jerseyNumber} availability={p.availability} /><span style={{ fontSize: 12, fontWeight: 800 }}>{p.name}</span></div></th>))}</tr>
              </thead>
              <tbody>
                <tr style={{ background: "#f5f5f5" }}><td colSpan={comparePlayers.length + 1} style={{ padding: "8px 10px", fontWeight: 800, fontSize: 11, color: "#666" }}>STANDARD</td></tr>
                {standardStats.map(key => renderStatRow(key, comparePlayers))}
                <tr style={{ background: "#f5f5f5" }}><td colSpan={comparePlayers.length + 1} style={{ padding: "8px 10px", fontWeight: 800, fontSize: 11, color: "#666" }}>ADVANCED</td></tr>
                {advStats.map(key => renderStatRow(key, comparePlayers))}
                <tr style={{ background: "#f5f5f5" }}><td colSpan={comparePlayers.length + 1} style={{ padding: "8px 10px", fontWeight: 800, fontSize: 11, color: "#666" }}>STATCAST</td></tr>
                {statcast.map(key => renderStatRow(key, comparePlayers))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStatRow = (key: string, players: any[]) => {
    const isLowerBetter = ["era", "whip", "k_pct", "bb_pct"].includes(key); 
    const config = STATS[key as StatKey] || { label: key.toUpperCase(), unit: "" };
    const values = players.map(p => p.stats[key] ?? 0);
    const validValues = values.filter(v => v !== 0);
    const bestValue = validValues.length > 0 ? (isLowerBetter ? Math.min(...validValues) : Math.max(...validValues)) : 0;
    return (
      <tr key={key} style={{ borderBottom: "1px solid #f0f0f0" }}>
        <td style={{ padding: "12px 10px", fontWeight: 600, color: "#555", fontSize: 13 }}>{config.label}</td>
        {players.map(p => {
          const val = p.stats[key] ?? 0;
          const isBest = val === bestValue && val !== 0;
          const isP = ['SP', 'RP', 'P'].includes(p.position);
          const isBatterStat = BATTER_STATS.includes(key);
          const isPitcherStat = PITCHER_STATS.includes(key);
          
          if ((isP && isBatterStat) || (!isP && isPitcherStat)) {
            return <td key={p.id} style={{ textAlign: "center", padding: "12px 10px", color: "#ccc" }}>-</td>;
          }
          return <td key={p.id} style={{ textAlign: "center", padding: "12px 10px", fontWeight: isBest ? 900 : 500, background: isBest ? "rgba(76, 175, 80, 0.15)" : "transparent", color: isBest ? "#1b5e20" : "#333" }}>{val}{config.unit === "percent" ? "%" : ""}</td>;
        })}
      </tr>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.85) 100%), url('/bg-grass.png')`, backgroundAttachment: "fixed", backgroundSize: "cover", display: "flex", flexDirection: "column", width: "100%" }}>
      <PulseStyles />
      <div className="beta-banner">BETA • v1.2 • Dec 2025</div>
      {renderCompareModal()}
      
      {/* TOP NAV: Integrated Switcher & NO CONDITIONAL LOCKS */}
<nav style={{ 
  position: 'sticky', 
  top: 0, 
  zIndex: 99999, /* NUCLEAR OPTION: Force this to be the top layer */
  background: '#1a1a1a', 
  borderBottom: '1px solid #333', 
  height: '64px', 
  display: 'flex', 
  alignItems: 'center', 
  padding: '0 24px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)' 
}}>
        <div style={{ maxWidth: 1600, margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div onClick={handleGlobalReset} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img 
  src="/rf-logo.svg" 
  alt="RF" 
  style={{ 
    width: '32px',       // A bit bigger than the 24px text to stand out
    height: '32px', 
    marginRight: '1px', // Adds breathing room between logo and text
    display: 'inline-block',
    verticalAlign: 'middle' // Keeps it centered with the letters
  }} 
/>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="nav-logo-text" style={{ fontWeight: 900, fontSize: '20px', color: '#fff', letterSpacing: '-0.5px', lineHeight: '1' }}>ROTO<span style={{ color: '#4caf50' }}>FILTER</span></span>
                <span className="nav-logo-subtext" style={{ fontSize: '10px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', lineHeight: '1' }}>Data Driving Dominance</span>
              </div>
            </div>
            {/* NEW: Integrated Navigation Menu */}
            <div className="desktop-nav-links" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <a href="#" className="nav-link active">Filters</a>
              <a href="#" className="nav-link">Rosters</a>
              <a href="#" className="nav-link">Closers</a>
              <a href="#" className="nav-link">Prospects</a>
              <a href="#" className="nav-link">Community</a>
              {/* --- INTEGRATED SYNC BUTTON --- */}
              <div style={{ marginLeft: '20px', paddingLeft: '20px', borderLeft: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center' }}>
                 <TeamSwitcher />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <button className="upgrade-btn" style={{ ...baseButtonStyle, background: isUserPaid ? 'rgba(255,255,255,0.1)' : '#fff', color: isUserPaid ? '#fff' : '#000', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
               {isUserPaid ? '✔ Pro' : 'Upgrade'}
             </button>
             <UserMenu />
          </div>
        </div>
      </nav>

{/* MOBILE FLOATING RESULTS */}

      <div className="mobile-floating-bar">

        {compareList.length > 0 ? (

          <button onClick={() => setIsCompareOpen(true)} style={{ flex: 1, background: "#1b5e20", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "8px", fontWeight: 900, fontSize: 13, boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}>COMPARE ({compareList.length})</button>

        ) : (

          <>

            <div style={{ fontWeight: 900, fontSize: 13 }}>{filteredPlayers.length} Players</div>

            <button onClick={scrollToResults} style={{ background: "white", color: "#1b5e20", border: "none", borderRadius: 20, padding: "6px 14px", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>Results ⬇</button>

          </>

        )}

      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-bottom-nav">
        {[{ id: "filters", label: "Filters", Icon: Icons.Filters }, { id: "rosters", label: "Rosters", Icon: Icons.Rosters }, { id: "closers", label: "Closers", Icon: Icons.Closers }, { id: "prospects", label: "Prospects", Icon: Icons.Prospects }, { id: "grade", label: "Grade", Icon: Icons.Grade }, { id: "trade", label: "Trade", Icon: Icons.Trade }, { id: "community", label: "Community", Icon: Icons.Community }, { id: "sync", label: "Sync", Icon: Icons.Sync }].map((item) => (
          <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); setActiveTab(item.id); if(item.id === 'sync') setIsSyncModalOpen(true); }} className={`mobile-nav-item ${activeTab === item.id ? "active" : ""}`}><item.Icon />{item.label}</a>
        ))}
      </div>

      {/* MAIN CONTAINER FIXED FOR WHITE BORDER ISSUE */}
      <main style={{ 
  padding: "24px", 
  maxWidth: "100%", /* Allow it to fill the screen */
  width: "1600px", /* Target width */
  margin: "0 auto", 
  fontFamily: "system-ui", 
  flex: "1 0 auto", 
  display: "flex", 
  flexDirection: "column",
  background: "transparent" /* Remove any white background on the container itself */
}}>
        
        {/* PRESET TABS */}
        <div style={{ marginBottom: 24, marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ ...labelStyle, color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>⚡</span> Scouting Quick Presets</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["recommended", "expert", "my_filters"] as const).map(t => (
                <button key={t} onClick={() => setPresetTab(t)} style={{ padding: "4px 12px", borderRadius: 16, border: "none", background: presetTab === t ? "#4caf50" : "rgba(255,255,255,0.1)", color: presetTab === t ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 11, cursor: "pointer", textTransform: "capitalize" }}>{t.replace("_", " ")}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 10, WebkitOverflowScrolling: 'touch' }}>
            {presetTab === "recommended" && (
              <>
                <div className="preset-card" onClick={() => applyQuickFilter({ name: "Young Speed Power", pos: BATTER_POSITIONS, stats: ["xwoba", "sprint_speed"], thresholds: { xwoba: 0.330, sprint_speed: 28.5 }, minTools: 2 })} style={{ ...compactCardStyle, flex: "0 0 200px", cursor: "pointer", background: "rgba(255,255,255,0.95)" }}><div style={{ fontWeight: 900, color: BUTTON_DARK_GREEN, fontSize: 12 }}>Young Speed-Power</div><div style={{ fontSize: 10, color: "#666" }}>xwOBA &gt; .330 + Speed &gt; 28.5</div></div>
                <div className="preset-card" onClick={() => applyQuickFilter({ name: "Strikeout Artisans", pos: PITCHER_POSITIONS, stats: ["k_pct", "bb_pct"], thresholds: { k_pct: 29, bb_pct: 6 }, minTools: 1 })} style={{ ...compactCardStyle, flex: "0 0 200px", cursor: "pointer", background: "rgba(255,255,255,0.95)" }}><div style={{ fontWeight: 900, color: "#9c27b0", fontSize: 12 }}>The K-Artisans</div><div style={{ fontSize: 10, color: "#666" }}>K% &gt; 29% + BB &lt; 6%</div></div>
                <div className="preset-card" onClick={() => applyQuickFilter({ name: "2026 OF Prospects", pos: ["OF"], stats: ["sprint_speed"], thresholds: { sprint_speed: 28.0 }, minTools: 1, level: "prospects" })} style={{ ...compactCardStyle, flex: "0 0 200px", cursor: "pointer", background: "rgba(255,255,255,0.95)" }}><div style={{ fontWeight: 900, color: "#005A9C", fontSize: 12 }}>2026 OF Prospects</div><div style={{ fontSize: 10, color: "#666" }}>Speed &gt; 28.0 (MiLB)</div></div>
                <div className="preset-card" onClick={() => applyQuickFilter({ name: "Prospect Triple Threat", pos: [], stats: [], thresholds: {}, minTools: 3, level: "prospects" })} style={{ ...compactCardStyle, flex: "0 0 200px", cursor: "pointer", background: "rgba(255,255,255,0.95)" }}><div style={{ fontWeight: 900, color: "#d32f2f", fontSize: 12 }}>Triple Threat MiLB</div><div style={{ fontSize: 10, color: "#666" }}>3+ Elite Tools (Power/Speed)</div></div>
              </>
            )}
            {presetTab === "expert" && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, padding: 10 }}>Expert Filters coming in next update...</div>}
            {presetTab === "my_filters" && (
              <>
                {savedFilters.length === 0 ? <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, padding: 10 }}>No saved filters yet. Create one below!</div> : savedFilters.map((filter) => (
                  <div key={filter.id} className="preset-card" onClick={() => applyQuickFilter(filter)} style={{ ...compactCardStyle, flex: "0 0 200px", cursor: "pointer", background: "#e8f5e9", borderColor: "#4caf50" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ fontWeight: 900, color: "#2e7d32", fontSize: 12 }}>{filter.name}</div><button onClick={(e) => deleteFilter(filter.id, e)} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}><Icons.Trash /></button></div>
                    <div style={{ fontSize: 10, color: "#555" }}>{filter.stats?.length || 0} Stats • {filter.dateRange || 'Season'}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 🎛️ FILTERS ROW */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div style={{ ...compactCardStyle, flex: "1 1 200px" }}>
            <CardHeader title="League & Level" isCollapsed={!sections.league} onToggle={() => toggleSection('league')} isActive={level !== "all" || leagueStatus !== "all"} onClear={(e:any) => { e.stopPropagation(); setLeagueStatus("all"); setLevel("all"); }} />
         {sections.league && (
                    <>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {[
                          { key: "all", label: "All Players" },
                          { key: "available", label: "Free Agents" },    // Shows unowned
                          { key: "my_team", label: "My Team" },          // Shows yours
                          { key: "rostered", label: "All Rostered" }     // Shows all taken
                        ].map((opt) => { 
                          const isLocked = !isUserPaid && opt.key !== "all"; 
                          return (
                            <button 
                              key={opt.key} 
                              onClick={() => !isLocked && setLeagueStatus(opt.key as LeagueStatus)} 
                              style={{ 
                                ...baseButtonStyle, 
                                flex: 1, 
                                padding: "6px 8px", // Slightly wider padding
                                fontSize: 11, 
                                ...(leagueStatus === opt.key ? selectedButtonStyle : null), 
                                opacity: isLocked ? 0.6 : 1, 
                                cursor: isLocked ? "not-allowed" : "pointer", 
                                display: "flex", 
                                alignItems: "center", 
                                justifyContent: "center", 
                                gap: "4px",
                                whiteSpace: "nowrap" // Keep text on one line
                              }}
                            >
                              {opt.label}
                              {isLocked && <Icons.LockSmall />}
                            </button>
                          ); 
                        })}
                      </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(["all", "mlb", "prospects"] as const).map(v => (
                    <button key={v} onClick={() => setLevel(v)} style={{ ...baseButtonStyle, flex: 1, padding: "6px 4px", fontSize: 11, ...(level === v ? selectedButtonStyle : null) }}>
                      {toTitleCase(v)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ ...compactCardStyle, flex: "1.4 1 260px" }}>
            <CardHeader title="Positions" isCollapsed={!sections.positions} onToggle={() => toggleSection('positions')} isActive={selectedPositions.length > 0} onClear={(e:any) => { e.stopPropagation(); setSelectedPositions([]); }} />
            {sections.positions && (<><div style={{ display: "flex", gap: 8, marginBottom: 4 }}><button onClick={() => setSelectedPositions([])} style={{ ...baseButtonStyle, flex: 1, ...(selectedPositions.length === 0 ? selectedButtonStyle : null) }}>All</button><button onClick={() => setSelectedPositions([...BATTER_POSITIONS])} style={{ ...baseButtonStyle, flex: 1, ...(BATTER_POSITIONS.every(p => selectedPositions.includes(p)) && selectedPositions.length > 0 ? selectedButtonStyle : null) }}>Batters</button><button onClick={() => setSelectedPositions([...PITCHER_POSITIONS])} style={{ ...baseButtonStyle, flex: 1, ...(PITCHER_POSITIONS.every(p => selectedPositions.includes(p)) && selectedPositions.length > 0 ? selectedButtonStyle : null) }}>Pitchers</button></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{ALL_POSITIONS.map(p => <button key={p} onClick={() => setSelectedPositions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} style={{ ...baseButtonStyle, width: 30, height: 30, padding: 0, borderRadius: "50%", fontSize: 10, ...(selectedPositions.includes(p) ? selectedButtonStyle : null) }}>{p}</button>)}</div></>)}
          </div>
          <div style={{ ...compactCardStyle, flex: "1 1 220px" }}>
            <CardHeader title="American League" isCollapsed={!sections.al} onToggle={() => toggleSection('al')} isActive={AL_TEAMS.some(t => selectedTeams.includes(t)) && !AL_TEAMS.every(t => selectedTeams.includes(t))} onClear={(e:any) => { e.stopPropagation(); setSelectedTeams(prev => [...new Set([...prev, ...AL_TEAMS])]); }} />{sections.al && <TeamGrid teams={AL_TEAMS} />}
          </div>
          <div style={{ ...compactCardStyle, flex: "1 1 220px" }}>
            <CardHeader title="National League" isCollapsed={!sections.nl} onToggle={() => toggleSection('nl')} isActive={NL_TEAMS.some(t => selectedTeams.includes(t)) && !NL_TEAMS.every(t => selectedTeams.includes(t))} onClear={(e:any) => { e.stopPropagation(); setSelectedTeams(prev => [...new Set([...prev, ...NL_TEAMS])]); }} />{sections.nl && <TeamGrid teams={NL_TEAMS} />}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* SIDEBAR */}
          <aside style={{ flex: "1 1 360px", width: "100%", display: "grid", gap: 16 }}>
            <div style={cardStyle}>
              <CardHeader title="Advanced Scouting Filters" onClear={() => setSelectedStatKeys([])} onToggle={() => {}} isCollapsed={false} isActive={selectedStatKeys.length > 0} />
              {isMounted ? (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="cores-list">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: "grid", gap: "10px" }}>
                        {orderedCores.map((group, index) => {
                          const isOpen = openGroup === group.id;
                          return (
                            <Draggable key={group.id} draggableId={group.id} index={index}>
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} style={{ ...provided.draggableProps.style, border: "1px solid #eee", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
                                  <div style={{ display: "flex", alignItems: "stretch", background: isOpen ? "#f0f7ff" : "#fff", borderBottom: isOpen ? "1px solid #eee" : "none" }}>
                                    <div onClick={() => setOpenGroup(isOpen ? null : group.id)} style={{ flex: 1, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <span style={{ fontWeight: 900, fontSize: "13px", color: isOpen ? BUTTON_DARK_GREEN : "#333", textTransform: "uppercase", letterSpacing: "0.5px" }}>{group.label}</span>
                                      <span style={{ fontSize: "18px", color: "#999", marginRight: "10px" }}>{isOpen ? "−" : "+"}</span>
                                    </div>
                                    <div {...provided.dragHandleProps} style={{ width: "40px", cursor: "grab", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid #f0f0f0", color: "#ccc" }}><span style={{ fontSize: "20px" }}>⠿</span></div>
                                  </div>
                                  {isOpen && (
                                    <div style={{ padding: "12px", background: "#fafafa", display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid #eee" }}>
                                      {CORE_STATS[group.id]?.map((sk) => {
  const config = STATS[sk]; if (!config) return null; 
  const isSelected = selectedStatKeys.includes(sk);
  const isDisabled = config.isPaid && !isUserPaid;
  
  // 1. DYNAMIC CONFIG: Read min/max/step directly from your new stats file
  const minVal = config.min ?? 0;
  const maxVal = config.max ?? 100;
  const stepVal = config.step ?? 1;
  
  // 2. CURRENT VALUE: Default to the "Min" (0), not a generic number
  const currentThreshold = statThresholds[sk] ?? minVal;

  return (
    <div key={sk} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <button disabled={isDisabled} onClick={() => toggleStat(sk)} style={{ ...baseButtonStyle, textAlign: "left", padding: "10px 12px", opacity: isDisabled ? 0.6 : 1, background: isSelected ? BUTTON_DARK_GREEN : "#fff", color: isSelected ? "#fff" : "#333", borderColor: isDisabled ? "#e0e0e0" : (isSelected ? BUTTON_DARK_GREEN : "#ddd"), display: "flex", flexDirection: "column", gap: "2px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: "12px" }}>{config.label}</span>
          {config.isPaid && !isUserPaid && <span style={{ fontSize: "8px", background: "#ffebee", color: "#c62828", padding: "2px 6px", borderRadius: "4px", fontWeight: 900 }}>PRO</span>}
        </div>
        <div style={{ fontSize: "10px", fontWeight: 400, opacity: isSelected ? 0.9 : 0.6 }}>{config.description}</div>
      </button>
      
      {isSelected && (
        <div style={{ padding: "12px", background: "#fff", borderRadius: "10px", border: "1px solid " + BUTTON_DARK_GREEN, marginTop: "2px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* MINUS BUTTON */}
            <button 
              onClick={(e) => { e.stopPropagation(); setStatThresholds(p => ({ ...p, [sk]: Number((currentThreshold - stepVal).toFixed(3)) })); }} 
              style={{ ...baseButtonStyle, padding: "2px 8px", minWidth: "30px" }}
            >−</button>
            
            {/* SLIDER INPUT */}
            <input 
              type="range" 
              min={minVal} 
              max={maxVal} 
              step={stepVal} 
              value={currentThreshold} 
              onChange={(e) => setStatThresholds(p => ({ ...p, [sk]: Number(e.target.value) }))} 
              style={{ flex: 1, accentColor: BUTTON_DARK_GREEN, cursor: "pointer" }} 
            />
            
            {/* PLUS BUTTON */}
            <button 
              onClick={(e) => { e.stopPropagation(); setStatThresholds(p => ({ ...p, [sk]: Number((currentThreshold + stepVal).toFixed(3)) })); }} 
              style={{ ...baseButtonStyle, padding: "2px 8px", minWidth: "30px" }}
            >+</button>
          </div>
          
          <div style={{ textAlign: "center", marginTop: "8px", fontWeight: 900, color: BUTTON_DARK_GREEN, fontSize: "14px" }}>
            {config.goodDirection === "higher" ? "> " : "< "}
            {currentThreshold}
            {config.unit === "percent" ? "%" : ""}
          </div>
        </div>
      )}
    </div>
  );
})}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : null}
            </div>
          </aside>

          <section style={{ flex: "2 1 600px", width: "100%" }}>
            <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
              <div ref={resultsTableRef} style={{ padding: "16px 20px", background: "#fff", borderBottom: "2px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 900, fontSize: 18 }}>Results</span>
                  {loading ? <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#666" }}><Icons.Spinner /> Scouting...</span> : <span style={{ fontSize: 11, fontWeight: 800, color: BUTTON_DARK_GREEN, background: "#e8f5e9", padding: "4px 10px", borderRadius: 20 }}>{filteredPlayers.length} Found</span>}
                  
                  <select value={minTools} onChange={(e) => setMinTools(Number(e.target.value))} style={{ ...baseButtonStyle, fontSize: 11, padding: "4px 8px", height: 28, background: "#fff3e0", color: "#e65100", borderColor: "#ffe0b2", fontWeight: 700 }}>
                    <option value="0">Tool Filter: All</option>
                    <option value="1">1+ Elite Tool</option>
                    <option value="2">2+ Elite Tools</option>
                    <option value="3">3+ Elite Tools</option>
                  </select>

                  <button onClick={handleGlobalReset} style={{...baseButtonStyle, fontSize: 10, padding: "4px 10px", background: "#fdecea", color: "#721c24", borderColor: "#f5c6cb"}}>Reset</button>
                  <button onClick={saveCurrentFilter} title="Save current filter" style={{...baseButtonStyle, fontSize: 10, padding: "4px 10px", background: "#e3f2fd", color: "#0d47a1", borderColor: "#90caf9", display: "flex", alignItems: "center", gap: 4}}><Icons.Save /> Save</button>

                  {compareList.length > 0 && (
                    <button onClick={() => setIsCompareOpen(true)} style={{ background: "#1b5e20", color: "#fff", border: "none", borderRadius: 20, padding: "6px 14px", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", animation: "slideDown 0.2s" }}>COMPARE ({compareList.length})</button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginLeft: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9f9f9", padding: "4px 8px", borderRadius: "8px", border: "1px solid #eee" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", marginRight: 2 }}>📅 Range:</span>
                    <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRangeOption)} style={{ ...baseButtonStyle, padding: "4px 8px", fontSize: 11, height: "28px", borderRadius: "6px" }}>
                      <option value="season_curr">Current Season</option>
                      <option value="pace_season">Projected Full Season</option>
                      <option value="season_last">Last Season</option>
                      <option value="last_7">Last 7 Days</option>
                      <option value="last_30">Last 30 Days</option>
                      <option value="last_90">Last 90 Days</option>
                      <option value="custom">Custom...</option>
                    </select>
                    {dateRange === "custom" && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, animation: "fadeIn 0.2s" }}>
                          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ ...baseButtonStyle, padding: "3px 6px", fontSize: 11, width: "110px" }} />
                          <span style={{ color: "#aaa", fontSize: 10 }}>to</span>
                          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ ...baseButtonStyle, padding: "3px 6px", fontSize: 11, width: "110px" }} />
                        </div>
                        <button onClick={applyCustomDates} style={{ ...baseButtonStyle, background: BUTTON_DARK_GREEN, color: "#fff", border: "none", fontSize: 10, padding: "4px 8px", height: 26, fontWeight: 700 }}>Apply</button>
                      </>
                    )}
                  </div>
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: "8px 16px", borderRadius: 20, border: "1px solid #ddd", fontSize: 13, outline: "none", width: "clamp(150px, 20vw, 200px)" }} />
                </div>
              </div>

              {/* LEGEND */}
              <ToolLegend />

              <div className="sticky-container">
                <table className="sticky-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th title="Select to Compare" style={{ padding: 8, width: 32, textAlign: "center", color: "#888", fontSize: "10px", fontWeight: 900 }}>VS</th>
                      <th onClick={() => handleSort('name')} style={{ padding: "8px 12px", textAlign: "left", cursor: "pointer" }}>Player {sortKey === 'name' && (sortDir === 'asc' ? <Icons.SortAsc /> : <Icons.SortDesc />)}</th>
                     {selectedStatKeys.map(k => {
                        // Check if we need to show the Season Lock Badge
                        const showLock = dateRange !== 'season_curr' && dateRange !== 'pace_season' && isSeasonLocked(k);
                        
                        return (
                          <th key={k} onClick={() => handleSort(k)} style={{ padding: "8px 12px", textAlign: "right", color: BUTTON_DARK_GREEN, cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                              {showLock && (
                                <span title="This stat is anchored to the Full Season (Talent Metric)" style={{ 
                                  fontSize: 9, 
                                  fontWeight: 900, 
                                  color: '#999', 
                                  border: '1px solid #ccc', 
                                  borderRadius: '50%', 
                                  width: '14px',
                                  height: '14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'help'
                                }}>S</span>
                              )}
                              {STATS[k].label} {sortKey === k && (sortDir === 'asc' ? <Icons.SortAsc /> : <Icons.SortDesc />)}
                            </div>
                          </th>
                        );
                      })}
                      <th onClick={() => handleSort('dynaScore')} style={{ padding: "8px 12px", textAlign: "right", cursor: "pointer", color: BUTTON_DYNASTY_PURPLE }}>Dynasty</th>
                      <th onClick={() => handleSort('rotoScore')} style={{ padding: "8px 12px", textAlign: "right", cursor: "pointer", color: BUTTON_DARK_GREEN }}>Roto</th>
                      <th onClick={() => handleSort('pointsScore')} style={{ padding: "8px 12px", textAlign: "right", cursor: "pointer", color: "#0288d1" }}>Points</th> 
                      <th onClick={() => handleSort('rangeScore')} style={{ padding: "8px 12px", textAlign: "right", cursor: "pointer", color: BUTTON_RANGE_ORANGE }}>Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={12} style={{ padding: 40, textAlign: "center", color: "#888", fontStyle: "italic" }}><div style={{display: "flex", alignItems: "center", justifyContent: "center", gap: 10}}><Icons.Spinner /> Loading...</div></td></tr>}
                    {!loading && filteredPlayers.map((p: any) => {
                      const isExpanded = activePlayerId === p.id.toString();
                      const isChecked = compareList.includes(p.id.toString());
                      const isPitcher = ['SP', 'RP', 'P'].includes(p.position);

                      return (
                        <React.Fragment key={p.id}>
                       {/* MAIN PLAYER ROW */}
                        <tr 
                          key={p.id} 
                          onClick={() => setSelectedPlayer(p)} 
                          style={{ cursor: 'pointer', borderBottom: '1px solid #eee', transition: 'background 0.2s' }} 
                          className="hover:bg-gray-50"
                        >
                            <td style={{ padding: "8px" }} onClick={e => e.stopPropagation()}>
                              <div className={`custom-checkbox ${isChecked ? 'checked' : ''}`} onClick={() => toggleCompare(p.id.toString())}>
                                {isChecked && <Icons.Check />}
                              </div>
                            </td>
                            <td style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                              <PlayerAvatar 
                                team={p.team as TeamAbbr} 
                                jerseyNumber={p.jerseyNumber} 
                                hasNews={isExpanded} 
                                availability={p.availability} // Backend ownership data
                              />
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                                  <span style={{ fontSize: 9, fontWeight: 800, color: "#666", background: "#eee", padding: "1px 4px", borderRadius: 3 }}>{p.position}</span>
                                  
                                  {/* Visual availability status badges */}
                                  {p.availability === 'MY_TEAM' && (
                                    <span style={{ fontSize: 9, fontWeight: 900, color: "#fff", background: "#4caf50", padding: "1px 6px", borderRadius: 10 }}>OWNED</span>
                                  )}
                                  {p.availability === 'ROSTERED' && (
                                    <span style={{ fontSize: 9, fontWeight: 900, color: "#888", border: "1px solid #888", padding: "1px 6px", borderRadius: 10 }}>TAKEN</span>
                                  )}

                                  {getTrajectory(p) && <span style={{ fontSize: 9, fontWeight: 800, color: getTrajectory(p)!.color, background: getTrajectory(p)!.bg, padding: "1px 4px", borderRadius: 4 }}>{getTrajectory(p)!.label}</span>}
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#555", marginTop: 2, fontFamily: "system-ui", display: "flex", gap: "6px", alignItems: "center" }}>
                                  {isPitcher ? (
                                    <span>{p.stats.w}W • {parseFloat(p.stats.era || 0).toFixed(2)} ERA • {p.stats.so} K</span>
                                  ) : (
                                    <span>{p.stats.hr}HR • {p.stats.sb}SB • .{parseFloat(p.stats.avg || 0).toFixed(3).slice(2)}</span>
                                  )}
                                  <span style={{ color: "#aaa" }}>| Age {p.info?.age}</span>
                                </div>
                                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                                  {getTools(p).map((t, i) => (
                                    <span key={i} title={t.name} style={{ fontSize: 9, fontWeight: 900, color: t.color, border: `1px solid ${t.color}40`, padding: "1px 4px", borderRadius: 4 }}>{t.label}</span>
                                  ))}
                                </div>
                              </div>
                            </td>
                          {selectedStatKeys.map(k => {
                      const isBatterStat = BATTER_STATS.includes(k);
                      const isPitcherStat = PITCHER_STATS.includes(k);
                      
                      // 1. Ghost Zero Check (Hide irrelevant stats)
                      if ((isPitcher && isBatterStat) || (!isPitcher && isPitcherStat)) {
                        return <td key={k} style={{ textAlign: "center", padding: "12px 10px", color: "#ccc" }}>-</td>;
                      }

                      // 2. Get Raw Value
                      const rawVal = p.stats?.[k];
                      if (rawVal === undefined || rawVal === null) {
                         return <td key={k} style={{ textAlign: "right", padding: "8px 12px", color: "#ccc" }}>-</td>;
                      }

                      // 3. Smart Formatting
                      const config = STATS[k];
                      let displayVal = rawVal;

                      if (config) {
                          const num = parseFloat(rawVal);
                          if (!isNaN(num)) {
                              if (config.unit === 'percent') {
                                  // Add % sign (and fix decimal if needed)
                                  displayVal = `${num.toFixed(1)}%`;
                              } else if (['avg', 'obp', 'slg', 'xba', 'xwoba', 'woba'].includes(k)) {
                                  // Baseball Format: .300 (no leading zero)
                                  displayVal = num.toFixed(3).replace(/^0+/, ''); 
                              } else if (['era', 'whip', 'k_bb_ratio', 'xera', 'fip'].includes(k)) {
                                  // Pitching Ratios: 3.45
                                  displayVal = num.toFixed(2);
                              } else if (['ip'].includes(k)) {
                                  // Innings: 120.1
                                  displayVal = num.toFixed(1);
                              } else {
                                  // Integers (HR, SB) or 1-decimal for Ev/Speed
                                  if (Number.isInteger(num)) {
                                     displayVal = num.toString();
                                  } else {
                                     displayVal = num.toFixed(1);
                                  }
                              }
                          }
                      }

                      return <td key={k} style={{ textAlign: "right", padding: "8px 12px", fontWeight: 700, fontFamily: "ui-monospace, monospace" }}>{displayVal}</td>
                    })}
                            <td style={{ textAlign: "right", fontWeight: 900, padding: "8px 12px", fontSize: 14, color: BUTTON_DYNASTY_PURPLE }}>{p.dynaScore}</td>
                            <td style={{ textAlign: "right", fontWeight: 900, padding: "8px 12px", fontSize: 14, color: BUTTON_DARK_GREEN }}>{p.rotoScore}</td>
                            <td style={{ textAlign: "right", fontWeight: 900, padding: "8px 12px", fontSize: 14, color: "#0288d1" }}>{p.pointsScore}</td> 
                            <td style={{ textAlign: "right", fontWeight: 900, padding: "8px 12px", fontSize: 14, color: BUTTON_RANGE_ORANGE }}>{p.rangeScore}</td>
                          </tr>

                          {/* EXPANDABLE NEWS THREAD SECTION */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={12} style={{ padding: "10px", background: "#f8faff" }}>
                                <div style={{ background: "white", padding: "24px", borderRadius: 12, border: "1px solid #d0e3ff", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)" }}>
                                  <PlayerNewsFeed mlbId={p.id} playerName={p.name} />
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
            </div>
          </section>
        </div>
      </main>

      <footer style={{ background: "#111", color: "#eee", padding: "60px 20px 30px 20px", marginTop: 60 }}>
        <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 250px" }}><div style={{ fontWeight: 900, fontSize: 24, marginBottom: 16, color: "#fff" }}>ROTO FILTER</div><p style={{ fontSize: 14, color: "#888", lineHeight: 1.6 }}>The ultimate MLB player analysis and filter tool. Built for fantasy baseball managers who need a competitive edge.</p></div>
          {[{ title: "Product", links: ["Filters", "Live News", "Stat Glossary", "Pro Upgrades"] }, { title: "Resources", links: ["Draft Guide", "Strategy Tips", "Community", "Support"] }, { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact"] }].map(col => (<div key={col.title} style={{ flex: "1 1 120px" }}><div style={{ fontWeight: 800, fontSize: 12, color: "#fff", textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>{col.title}</div><ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>{col.links.map(link => (<li key={link}><a href="#" style={{ color: "#888", fontSize: 14, textDecoration: "none", transition: "0.2s" }}>{link}</a></li>))}</ul></div>))}
        </div>
        <div style={{ maxWidth: 1600, margin: "40px auto 0 auto", paddingTop: 30, borderTop: "1px solid #222", textAlign: "center", color: "#555", fontSize: 12 }}>© {new Date().getFullYear()} Roto Filter. Not affiliated with Major League Baseball.</div>
      </footer>
      
      {/* --- MODALS --- */}
      {selectedPlayer && (
        <PlayerDetailPopup 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}
      
      {isSyncModalOpen && (
        <LeagueSyncModal 
          onClose={() => setIsSyncModalOpen(false)} 
        />
      )}
    </div>
  )
}