"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/app/utils/supabase/client"; 

/* --- 1. COMPONENTS --- */
import { PlayerDetailPopup } from "../components/PlayerDetailPopup";
import { PlayerNewsFeed } from "../components/PlayerNewsFeed";
import LeagueSyncModal from "../components/LeagueSyncModal"; 
import { Icons } from "../components/Icons"; 
import { UserMenu } from "../components/UserMenu"; 
import TeamSwitcher from "../components/TeamSwitcher"; 
import { useTeam } from '../context/TeamContext';
import { NewsDrawer } from "../components/NewsDrawer"; 
import { Newspaper } from "lucide-react"; 

/* --- 2. CONFIG & TYPES --- */
import type { CoreId } from "../config/cores";
import { CORES } from "../config/cores";
import { CORE_STATS } from "../config/corestats";
import { STATS, type StatKey } from "../config/stats";

/* --- 3. UTILS --- */
import { 
  getTools, 
  getTrajectory, 
  enrichPlayerData, 
  type DateRangeOption 
} from "./utils/playerAnalysis";

/* =============================================================================
   CONSTANTS & STATIC DATA
============================================================================= */
type BatterPos = "C" | "1B" | "2B" | "3B" | "SS" | "OF" | "DH";
type PitcherPos = "SP" | "RP";
type Position = BatterPos | PitcherPos | "batters" | "pitchers";
type Level = "all" | "mlb" | "prospects" | "rookies";
type LeagueStatus = "all" | "available" | "rostered" | "my_team";
type FilterTab = "recommended" | "expert" | "my_filters";
type TeamAbbr = (typeof ALL_TEAMS)[number];

const AL_TEAMS = ["BAL","BOS","CWS","CLE","DET","HOU","KC","LAA","MIN","NYY","OAK","SEA","TB","TEX","TOR"] as const;
const NL_TEAMS = ["ARI","ATL","CHC","CIN","COL","LAD","MIA","MIL","NYM","PHI","PIT","SD","SF","STL","WSH"] as const;
const ALL_TEAMS = [...AL_TEAMS, ...NL_TEAMS].sort();
const BATTER_POSITIONS: Position[] = ["C", "1B", "2B", "3B", "SS", "OF", "DH"];
const PITCHER_POSITIONS: Position[] = ["SP", "RP"];
const ALL_POSITIONS: Position[] = [...BATTER_POSITIONS, ...PITCHER_POSITIONS];

const CUSTOM_TAB_ORDER = [
  "profile",        
  "std_hit",        
  "std_pitch",      
  "power", 
  "speed", 
  "discipline", 
  "contact", 
  "pitch_shape", 
  "pitch_outcomes"
];

const COLORS = {
  DARK_GREEN: "#1b5e20",
  DYNASTY_PURPLE: "#6a1b9a", 
  RANGE_ORANGE: "#e65100",
  LIGHT_GREEN_BG: "#e8f5e9",
  GRAY_TEXT: "#666",
  BORDER: "rgba(0,0,0,0.12)"
};

const TEAM_PRIMARY: Record<TeamAbbr, string> = {
  ARI: "#A71930", ATL: "#CE1141", BAL: "#DF4601", BOS: "#BD3039", CHC: "#0E3386",
  CWS: "#27251F", CIN: "#C6011F", CLE: "#0C2340", COL: "#33006F", DET: "#0C2340",
  HOU: "#002D62", KC:  "#004687", LAA: "#BA0021", LAD: "#005A9C", MIA: "#00A3E0",
  MIL: "#12284B", MIN: "#002B5C", NYM: "#002D72", NYY: "#0C2340", OAK: "#003831",
  PHI: "#E81828", PIT: "#FDB827", SD:  "#2F241D", SEA: "#0C2C56", SF:  "#FD5A1E",
  STL: "#C41E3A", TB:  "#092C5C", TEX: "#003278", TOR: "#134A8E", WSH: "#AB0003",
};

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
  'arm_value', 'arm_strength', 'fielding_runs' 
];

/* --- STYLES OBJECTS --- */
const STYLES = {
  btnBase: {
    padding: "6px 10px", borderRadius: 8, borderWidth: "1px", borderStyle: "solid",
    borderColor: COLORS.BORDER, background: "#ffffff", color: "#333",
    cursor: "pointer", fontWeight: 600, fontSize: "12px", transition: "all 0.1s ease",
  } as React.CSSProperties,
    
  btnSelected: { background: COLORS.DARK_GREEN, borderColor: COLORS.DARK_GREEN, color: "#ffffff" },
    
  cardCompact: { 
    borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.1)", 
    borderRadius: 12, background: "rgba(255,255,255,0.98)", padding: "12px 14px", 
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", width: "100%",
    gap: "8px", transition: "all 0.2s ease"
  } as React.CSSProperties,

  label: { fontWeight: 800, fontSize: 10, color: COLORS.GRAY_TEXT, textTransform: "uppercase", letterSpacing: "0.8px" } as React.CSSProperties
};

/* --- ICONS --- */
const CategoryIcons = {
  Context: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2196f3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Bat: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff9800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l12 12 3-3-12-12z" /></svg>,
  Power: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f44336" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.5-3.3a9 9 0 0 0 3 3.3z"></path></svg>,
  Eye: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9c27b0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  Target: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#009688" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>,
  Speed: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
  Ball: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#607d8b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2v20"></path></svg>,
  Stuff: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3f51b5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>,
  Check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
};

const CATEGORY_DISPLAY: Record<string, { label: string; icon: any }> = {
  "profile":          { label: "Profile",    icon: CategoryIcons.Context },
  "std_hit":          { label: "Roto Batting",  icon: CategoryIcons.Bat }, 
  "power":            { label: "Power",      icon: CategoryIcons.Power },
  "discipline":       { label: "Discipline", icon: CategoryIcons.Eye },
  "contact":          { label: "Contact",    icon: CategoryIcons.Target },
  "speed":            { label: "Speed",      icon: CategoryIcons.Speed }, 
  "std_pitch":        { label: "Roto Pitching",  icon: CategoryIcons.Ball }, 
  "pitch_shape":      { label: "Stuff",      icon: CategoryIcons.Stuff },
  "pitch_outcomes":   { label: "Outcomes",   icon: CategoryIcons.Check },
};

/* --- GLOBAL STYLES & ANIMATIONS --- */
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
    
    @keyframes pulse-ring { 0% { transform: scale(0.33); opacity: 1; } 80%, 100% { opacity: 0; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .news-pulse { position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background-color: #ff1744; border-radius: 50%; border: 2px solid white; z-index: 10; }
    .news-pulse::after { content: ''; position: absolute; top: -2px; left: -2px; width: 12px; height: 12px; background-color: #ff1744; border-radius: 50%; animation: pulse-ring 1.25s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; }
    .sticky-container { overflow: auto; max-height: 800px; position: relative; }
    .sticky-table { border-collapse: separate; border-spacing: 0; width: 100%; }
    .sticky-table thead th { position: sticky; top: 0; z-index: 20; background: #fafafa; box-shadow: inset 0 -1px 0 #eee; cursor: pointer; user-select: none; }
    .sticky-table td:nth-child(1), .sticky-table th:nth-child(1) { position: sticky; left: 0; z-index: 30; background: white; }
    .sticky-table th:nth-child(1) { z-index: 40; background: #fafafa; top: 0; } 
    .sticky-table td:nth-child(1)::after, .sticky-table th:nth-child(1)::after { content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: 1px; background: #eee; }
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
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none;  scrollbar-width: none; }
    .wide-container { width: 98%; max-width: 2500px; margin: 0 auto; }
    .main-padding { padding: 8px; }
    
    .nav-auth-section { display: flex; align-items: center; }

    @media (max-width: 768px) {
      .wide-container { width: 99.5%; } 
      .main-padding { padding: 4px !important; }
      .desktop-nav-links { display: none !important; }
      
      /* HIDE UPGRADE BTN ON MOBILE TO MAKE ROOM FOR SIGN IN */
      .upgrade-btn { display: none !important; }
      
      /* ENSURE AUTH SECTION IS VISIBLE */
      .nav-auth-section { display: flex !important; }

      .sticky-table th:nth-child(1), .sticky-table td:nth-child(1) { width: 80px !important; min-width: 80px !important; max-width: 80px !important; padding: 8px 4px !important; box-shadow: 2px 0 6px rgba(0,0,0,0.15); z-index: 50; }
      .desktop-player-info { display: none !important; }
      .mobile-player-info { display: flex !important; flex-direction: column; align-items: center; text-align: center; gap: 4px; }
      .mobile-floating-bar { display: flex; position: fixed; top: 64px; left: 0; right: 0; z-index: 90; background: rgba(27, 94, 32, 0.95); backdrop-filter: blur(8px); padding: 10px 20px; align-items: center; justify-content: space-between; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.2); animation: slideDown 0.3s ease-out; }
      @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .mobile-bottom-nav { display: flex !important; position: fixed; bottom: 0; left: 0; right: 0; background: #121212; border-top: 1px solid #2a2a2a; z-index: 1000; padding-bottom: env(safe-area-inset-bottom); height: 60px; align-items: center; overflow-x: auto; justify-content: flex-start; box-shadow: 0 -4px 15px rgba(0,0,0,0.5); }
      .mobile-nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #777; font-size: 9px; font-weight: 600; text-decoration: none; min-width: 72px; height: 100%; gap: 4px; transition: color 0.2s ease; }
      .mobile-nav-item.active { color: #fff; }
      .mobile-nav-item.active svg { stroke: #4caf50; }
      footer { padding-bottom: 80px !important; }
    }
    * { box-sizing: border-box; }
    html, body { overflow-x: hidden; width: 100%; margin: 0; padding: 0; }
    @media (max-width: 600px) {
      .nav-logo-text { font-size: 16px !important; }
      .nav-logo-subtext { display: none; }
    }
    @keyframes slideDownTray { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  `}} />
);

/* =============================================================================
   SECTION 3 — Sub-Components
============================================================================= */
const PlayerAvatar = ({ team, jerseyNumber, hasNews, headline, availability, isSelected }: any) => {
  const teamColor = TEAM_PRIMARY[team as TeamAbbr] || "#444";
  const selectionStyle = isSelected 
    ? { border: `3px solid ${COLORS.DARK_GREEN}`, boxShadow: `0 0 0 2px #fff inset, 0 4px 8px rgba(0,0,0,0.3)` } 
    : { border: "2px solid #fff" };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} title={headline}>
      <div style={{ ...selectionStyle, width: 32, height: 32, backgroundColor: teamColor, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)", position: 'relative', overflow: 'hidden', transition: 'all 0.2s' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%)' }} />
        <span style={{ color: "#fff", fontSize: "14px", fontWeight: 900, fontFamily: "ui-monospace, monospace", position: 'relative', zIndex: 2, textShadow: "1px 1px 2px rgba(0,0,0,0.4)" }}>{jerseyNumber || "--"}</span>
        
        {isSelected && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(27, 94, 32, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, color: 'white', fontSize: '18px' }}>
             <Icons.Check />
          </div>
        )}
      </div>
      
      {hasNews && !isSelected && <div className="news-pulse" />}
      
      {availability === 'MY_TEAM' && (
        <div style={{ position: 'absolute', top: -2, left: -2, width: 10, height: 10, background: '#4caf50', borderRadius: '50%', border: '2px solid white', zIndex: 10 }} />
      )}
      <div style={{ position: 'absolute', bottom: -2, right: -4, background: '#fff', color: teamColor, fontSize: '8px', fontWeight: 900, padding: '1px 3px', borderRadius: '4px', border: `1px solid ${teamColor}`, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', zIndex: 5 }}>{team}</div>
    </div>
  );
};

const ToolLegend = () => (
  <div className="hide-scrollbar" style={{ display: "flex", gap: 16, padding: "10px 16px", background: "#f5f5f5", borderRadius: 8, marginBottom: 12, alignItems: "center", overflowX: "auto", whiteSpace: "nowrap" }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.GRAY_TEXT, textTransform: "uppercase", marginRight: 4 }}>Key:</div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 900, color: "#4caf50", background: COLORS.LIGHT_GREEN_BG, padding: "2px 6px", borderRadius: 4 }}>H</span><span style={{ fontSize: 10, color: "#555" }}>Hit (AVG &gt; .275)</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 900, color: "#f44336", background: "#ffebee", padding: "2px 6px", borderRadius: 4 }}>P</span><span style={{ fontSize: 10, color: "#555" }}>Power (ISO &gt; .200)</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 900, color: "#2196f3", background: "#e3f2fd", padding: "2px 6px", borderRadius: 4 }}>S</span><span style={{ fontSize: 10, color: "#555" }}>Speed (Spd &gt; 28)</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 900, color: "#ff9800", background: "#fff3e0", padding: "2px 6px", borderRadius: 4 }}>D</span><span style={{ fontSize: 10, color: "#555" }}>Disc (BB% &gt; 10)</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 10, fontWeight: 900, color: "#9c27b0", background: "#f3e5f5", padding: "2px 6px", borderRadius: 4 }}>C</span><span style={{ fontSize: 10, color: "#555" }}>Context (OPS &gt; .800)</span></div>
  </div>
);

/* =============================================================================
   SECTION 4 — Main Component
============================================================================= */
export default function Home() {
  const supabase = createClient();
  const { activeTeam } = useTeam();

  // --- STATE: DATA ---
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isUserPaid, setIsUserPaid] = useState(true); 
  const [savedFilters, setSavedFilters] = useState<any[]>([]);

  // --- STATE: FILTERS ---
  const [openGroup, setOpenGroup] = useState<CoreId | null>(null); 
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [selectedStatKeys, setSelectedStatKeys] = useState<StatKey[]>([]);
  const [level, setLevel] = useState<Level>("all");
  const [leagueStatus, setLeagueStatus] = useState<LeagueStatus>("all");
  const [selectedTeams, setSelectedTeams] = useState<TeamAbbr[]>([...ALL_TEAMS]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>("rotoScore"); 
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statThresholds, setStatThresholds] = useState<Record<string, number>>({});
  const [minTools, setMinTools] = useState<number>(0);
  const [dateRange, setDateRange] = useState<DateRangeOption>("season_curr");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
    
  // --- STATE: UI ---
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("filters");
  const [presetTab, setPresetTab] = useState<FilterTab>("recommended");
  const [leagueScope, setLeagueScope] = useState('all'); 
  const [search, setSearch] = useState(''); 
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isNewsOpen, setIsNewsOpen] = useState(false); 
    
  const resultsTableRef = useRef<HTMLDivElement>(null);

  // --- HELPERS ---
  const isSeasonLocked = (key: string) => {
    const isStandardHit = CORE_STATS.std_hit?.includes(key as any);
    const isStandardPitch = CORE_STATS.std_pitch?.includes(key as any);
    return !isStandardHit && !isStandardPitch;
  };

  // --- EFFECTS ---
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

  const fetchSavedFilters = async (currentUser: any) => {
    if (!currentUser) return; 
    const { data, error } = await supabase.from('saved_filters').select('*').order('created_at', { ascending: false });
    if (data) {
      const cloudFilters = data.map((f: any) => ({ id: f.id, name: f.name, ...f.config }));
      setSavedFilters(cloudFilters);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsUserPaid(true); 
      if (currentUser) fetchSavedFilters(currentUser); 
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsUserPaid(true);
      
      if (currentUser) {
        fetchSavedFilters(currentUser); 
      } else {
        document.cookie = "active_team_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        document.cookie = "active_league_key=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        const saved = localStorage.getItem('rotofilter_presets');
        if (saved) setSavedFilters(JSON.parse(saved));
        else setSavedFilters([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTeam) {
          params.append('league_id', activeTeam.league_key);
          params.append('team_id', activeTeam.team_key);
      }
      if (search) params.append('search', search);
      if (dateRange !== 'custom') {
          const rangeValue = dateRange === 'pace_season' ? 'season_curr' : dateRange;
          params.append('range', rangeValue);
      } else {
          if (customStart) params.append('start_date', customStart);
          if (customEnd) params.append('end_date', customEnd);
      }
      if (selectedPositions.length > 0 && !selectedPositions.includes('All')) {
        params.append('position', selectedPositions.join(','));
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`/api/players?${params.toString()}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Failed to fetch players');
      
      const data = await response.json();
      const safeList = Array.isArray(data) ? data : (data.players || []);
      setPlayers(safeList); 
      
    } catch (error) {
      console.error('Error fetching players:', error);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, [leagueScope, activeTeam, search, dateRange, customStart, customEnd, selectedPositions]); 

  useEffect(() => {
    if (dateRange !== 'custom' || (customStart && customEnd)) {
      fetchPlayers();
    }
  }, [fetchPlayers, dateRange, customStart, customEnd]);

  // --- ACTIONS ---
  const applyCustomDates = () => {
    if (dateRange === 'custom' && customStart && customEnd) {
      fetchPlayers();
    }
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
      const { error } = await supabase.from('saved_filters').insert({ user_id: user.id, name: name, config: newFilterConfig });
      if (error) { alert("Error saving to cloud: " + error.message); } 
      else { alert("Saved to Cloud! ☁️"); fetchSavedFilters(user); }
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

  const toggleStat = (key: StatKey) => {
    if (selectedStatKeys.includes(key)) {
      setSelectedStatKeys(prev => prev.filter(k => k !== key));
    } else { 
      setSelectedStatKeys(prev => [...prev, key]); 
      if (statThresholds[key] === undefined) {
        const startValue = STATS[key].min ?? 0;
        setStatThresholds(prev => ({ ...prev, [key]: startValue })); 
      }
    }
  };

  // --- FILTERED DATA MEMO ---
  const filteredPlayers = useMemo(() => {
    const scoredData = players.map((p: any) => enrichPlayerData(p, dateRange));

    return scoredData.filter((p: any) => {
    const hasPitchingStats = selectedStatKeys.some(k => PITCHER_STATS.includes(k));
    const hasBattingStats = selectedStatKeys.some(k => BATTER_STATS.includes(k));

    if (hasPitchingStats && !hasBattingStats) {
      if (p.type !== 'pitcher' && p.position !== 'P' && p.position !== 'SP' && p.position !== 'RP') return false;
    }
    if (hasBattingStats && !hasPitchingStats) {
      if (p.type === 'pitcher' || ['SP', 'RP', 'P'].includes(p.position)) return false;
    }
      
    if (leagueStatus === "available") { if (p.availability !== "AVAILABLE") return false; }
    if (leagueStatus === "my_team") { if (p.availability !== "MY_TEAM") return false; }
    if (leagueStatus === "rostered") { if (p.availability !== "MY_TEAM" && p.availability !== "ROSTERED") return false; }

      if (selectedPositions.length > 0 && !selectedPositions.includes(p.position as Position)) return false;
      
      if (level !== "all") {
          if (level === "rookies") {
              if (!p.is_rookie && p.level !== 'rookie') return false; 
          } else {
              if (p.level !== level) return false;
          }
      }

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
      let valA = sortKey.includes('Score') ? a[sortKey] : parseFloat(a.stats[sortKey] || 0);
      let valB = sortKey.includes('Score') ? b[sortKey] : parseFloat(b.stats[sortKey] || 0);
      
      const rateStats = ['avg', 'obp', 'slg', 'ops', 'era', 'whip', 'k_pct', 'bb_pct', 'xwoba', 'hard_hit_pct'];
      if (rateStats.includes(sortKey)) {
          const minPA = dateRange === 'last_7' ? 5 : 25;
          const minIP = dateRange === 'last_7' ? 2 : 10;
          const aQualified = (a.type === 'pitcher' || ['SP','RP','P'].includes(a.position)) ? (a.stats.ip || 0) >= minIP : (a.stats.pa || 0) >= minPA;
          const bQualified = (b.type === 'pitcher' || ['SP','RP','P'].includes(b.position)) ? (b.stats.ip || 0) >= minIP : (b.stats.pa || 0) >= minPA;
          if (aQualified && !bQualified) return -1;
          if (!aQualified && bQualified) return 1;
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
  }, [players, selectedPositions, level, leagueStatus, selectedTeams, searchQuery, sortKey, sortDir, selectedStatKeys, statThresholds, minTools, dateRange]);


  /* =============================================================================
       RENDER FUNCTIONS
   ============================================================================= */

  const renderFilterTray = () => {
    if (!openGroup) return null;
    return (
      <div style={{ background: "#fafafa", borderBottom: "1px solid #ddd", borderTop: `2px solid ${COLORS.DARK_GREEN}`, padding: "20px", boxShadow: "inset 0 4px 12px rgba(0,0,0,0.05)", animation: "slideDownTray 0.2s ease-out" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#999", textTransform: "uppercase" }}>
                Select Stats for {CATEGORY_DISPLAY[openGroup]?.label || openGroup}
            </h4>
            <button onClick={() => setOpenGroup(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", display: "flex", alignItems: "center", fontSize: "16px" }}>
                <Icons.X />
            </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {CUSTOM_TAB_ORDER.includes(openGroup) && CORE_STATS[openGroup]?.map((sk) => {
                const config = STATS[sk]; if (!config) return null; 
                const isSelected = selectedStatKeys.includes(sk);
                const isDisabled = config.isPaid && !isUserPaid;
                const minVal = config.min ?? 0;
                const maxVal = config.max ?? 100;
                const stepVal = config.step ?? 1;
                const currentThreshold = statThresholds[sk] ?? minVal;

                return (
                    <div key={sk} style={{ 
                        background: "#fff", borderRadius: 8, 
                        border: `1px solid ${isSelected ? COLORS.DARK_GREEN : "#eee"}`,
                        padding: 12, opacity: isDisabled ? 0.6 : 1,
                        boxShadow: isSelected ? "0 4px 12px rgba(27, 94, 32, 0.15)" : "0 2px 4px rgba(0,0,0,0.02)",
                        transition: "all 0.2s"
                    }}>
                        <div 
                          onClick={() => !isDisabled && toggleStat(sk)} 
                          style={{ 
                            cursor: isDisabled ? "not-allowed" : "pointer", 
                            display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 
                          }}
                        >
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 13, color: isSelected ? COLORS.DARK_GREEN : "#333" }}>{config.label}</div>
                                <div style={{ fontSize: 10, color: "#888", lineHeight: 1.2 }}>{config.description}</div>
                            </div>
                            <div className={`custom-checkbox ${isSelected ? 'checked' : ''}`} style={{ color: "white" }}>
                                {isSelected && <Icons.Check />}
                            </div>
                        </div>

                        {isSelected && (
                            <div style={{ paddingTop: 8, borderTop: "1px solid #f0f0f0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <button onClick={(e) => { e.stopPropagation(); setStatThresholds(p => ({ ...p, [sk]: Number((currentThreshold - stepVal).toFixed(3)) })); }} style={{ ...STYLES.btnBase, padding: "2px 8px", minWidth: "24px" }}>−</button>
                                    <input type="range" min={minVal} max={maxVal} step={stepVal} value={currentThreshold} onChange={(e) => setStatThresholds(p => ({ ...p, [sk]: Number(e.target.value) }))} style={{ flex: 1, accentColor: COLORS.DARK_GREEN, cursor: "pointer", height: 4 }} />
                                    <button onClick={(e) => { e.stopPropagation(); setStatThresholds(p => ({ ...p, [sk]: Number((currentThreshold + stepVal).toFixed(3)) })); }} style={{ ...STYLES.btnBase, padding: "2px 8px", minWidth: "24px" }}>+</button>
                                </div>
                                <div style={{ textAlign: "right", marginTop: "4px", fontWeight: 900, color: COLORS.DARK_GREEN, fontSize: "12px" }}>
                                    {config.goodDirection === "higher" ? "Min: " : "Max: "}
                                    {currentThreshold}
                                    {config.unit === "percent" ? "%" : ""}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    );
  };

  const renderTeamScrollRow = () => {
    const isAllSelected = ALL_TEAMS.every(t => selectedTeams.includes(t));
    const toggleAll = () => {
        if (isAllSelected) setSelectedTeams([]);
        else setSelectedTeams([...ALL_TEAMS]);
    };
    
    return (
        <div className="hide-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, alignItems: "center", width: "100%" }}>
            <div style={{ flexShrink: 0, fontSize: 10, fontWeight: 900, color: "#999", marginRight: 4 }}>TEAMS:</div>
            <button onClick={toggleAll} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", border: `2px solid ${isAllSelected ? COLORS.DARK_GREEN : "#ddd"}`, fontSize: 9, fontWeight: 900, background: isAllSelected ? COLORS.DARK_GREEN : "#fff", color: isAllSelected ? "#fff" : "#999", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>ALL</button>
            <div style={{ width: 1, height: 20, background: "#eee", flexShrink: 0, margin: "0 4px" }} />
            {ALL_TEAMS.map(t => {
                const isSel = selectedTeams.includes(t);
                return (
                    <button key={t} onClick={() => setSelectedTeams(prev => isSel ? prev.filter(x => x !== t) : [...prev, t])} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", border: "2px solid " + TEAM_PRIMARY[t], fontSize: 9, fontWeight: 900, background: isSel ? TEAM_PRIMARY[t] : "#fff", color: isSel ? "#fff" : TEAM_PRIMARY[t], cursor: "pointer", transition: "all 0.1s" }}>
                        {t}
                    </button>
                );
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

  // --- MAIN RETURN ---
  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(circle at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.85) 100%), url('/bg-grass.png')`, backgroundAttachment: "fixed", backgroundSize: "cover", display: "flex", flexDirection: "column", width: "100%" }}>
      <GlobalStyles />
      <div className="beta-banner">BETA • v1.2 • Dec 2025</div>
      {renderCompareModal()}
      
      {/* TOP NAVIGATION */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 99999, background: '#1a1a1a', borderBottom: '1px solid #333', height: '64px', display: 'flex', alignItems: 'center', padding: '0 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
        <div className="wide-container" style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div onClick={handleGlobalReset} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/rf-logo.svg" alt="RF" style={{ width: '32px', height: '32px', marginRight: '1px', display: 'inline-block', verticalAlign: 'middle' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="nav-logo-text" style={{ fontWeight: 900, fontSize: '20px', color: '#fff', letterSpacing: '-0.5px', lineHeight: '1' }}>ROTO<span style={{ color: '#4caf50' }}>FILTER</span></span>
                
                {/* --- TEAM NAME WITH EDGY FONT --- */}
                {user && activeTeam ? (
                  <span style={{ 
                    color: '#FFD700', // Lightning Yellow
                    fontFamily: '"Permanent Marker", cursive', 
                    fontSize: '12px', 
                    marginTop: '2px', 
                    letterSpacing: '1px', 
                    lineHeight: '1',
                    textShadow: '0 0 5px rgba(255, 215, 0, 0.4)'
                  }}>
                    {(activeTeam as any).name || (activeTeam as any).team_name || "My Team"}
                  </span>
                ) : (
                  <span className="nav-logo-subtext" style={{ fontSize: '10px', color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', lineHeight: '1' }}>Data Driving Dominance</span>
                )}
                {/* --------------------------------------------- */}

              </div>
            </div>
            <div className="desktop-nav-links" style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '10px' }}>
              <a href="#" className="nav-link active">Filters</a>
              <a href="#" className="nav-link">Rosters</a>
              <a href="#" className="nav-link">Closers</a>
              <a href="#" className="nav-link">Prospects</a>
              <a href="#" className="nav-link">Community</a>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => setIsNewsOpen(true)}
                title="News & Updates"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'} 
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'} 
                style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#1a1a1a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
              >
                 <Newspaper size={18} color="#888" />
                 <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8 }}>
                    <span style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: '#4caf50', opacity: 0.75, animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }} className="animate-ping" />
                    <span style={{ position: 'relative', display: 'inline-block', width: '100%', height: '100%', borderRadius: '50%', background: '#4caf50' }} />
                 </span>
              </button>

              <button onClick={() => setIsSyncModalOpen(true)} title="Sync League" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4caf50'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#333', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', flexShrink: 0, transition: 'background 0.2s' }}>
                <div style={{ transform: 'scale(0.8)' }}><Icons.Sync /></div>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}><TeamSwitcher /></div>
              <button className="upgrade-btn" style={{ ...STYLES.btnBase, background: isUserPaid ? 'rgba(255,255,255,0.1)' : '#4caf50', color: '#fff', border: isUserPaid ? '1px solid #333' : 'none', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, flexShrink: 0, boxShadow: isUserPaid ? 'none' : '0 2px 8px rgba(76, 175, 80, 0.4)' }}>{isUserPaid ? '✔ PRO' : 'UPGRADE'}</button>
              
              {/* --- EXPLICIT SIGN IN BUTTON LOGIC --- */}
              {!user ? (
                <button 
                  className="sign-in-btn"
                  onClick={() => window.location.href = '/login'} 
                  style={{ 
                    ...STYLES.btnBase, 
                    background: '#333', 
                    color: '#fff', 
                    marginLeft: 8,
                    border: '1px solid #555' 
                  }}
                >
                  Sign In
                </button>
              ) : (
                <div className="nav-auth-section" style={{marginLeft: 8}}>
                  <UserMenu />
                </div>
              )}

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

      <div className="mobile-bottom-nav">
        {[{ id: "filters", label: "Filters", Icon: Icons.Filters }, { id: "rosters", label: "Rosters", Icon: Icons.Rosters }, { id: "closers", label: "Closers", Icon: Icons.Closers }, { id: "prospects", label: "Prospects", Icon: Icons.Prospects }, { id: "grade", label: "Grade", Icon: Icons.Grade }, { id: "trade", label: "Trade", Icon: Icons.Trade }, { id: "community", label: "Community", Icon: Icons.Community }, { id: "sync", label: "Sync", Icon: Icons.Sync }].map((item) => (
          <a key={item.id} href="#" onClick={(e) => { e.preventDefault(); setActiveTab(item.id); if(item.id === 'sync') setIsSyncModalOpen(true); }} className={`mobile-nav-item ${activeTab === item.id ? "active" : ""}`}><item.Icon />{item.label}</a>
        ))}
      </div>

      <main className="wide-container main-padding" style={{ fontFamily: "system-ui", flex: "1 0 auto", display: "flex", flexDirection: "column", background: "transparent" }}>
        
        {/* PRESET TABS */}
        <div style={{ marginBottom: 24, marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ ...STYLES.label, color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 18 }}>⚡</span> Scouting Quick Presets</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["recommended", "expert", "my_filters"] as const).map(t => (
                <button key={t} onClick={() => setPresetTab(t)} style={{ padding: "4px 12px", borderRadius: 16, border: "none", background: presetTab === t ? "#4caf50" : "rgba(255,255,255,0.1)", color: presetTab === t ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 11, cursor: "pointer", textTransform: "capitalize" }}>{t.replace("_", " ")}</button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 10, WebkitOverflowScrolling: 'touch' }}>
            {presetTab === "recommended" && (
              <>
                {/* 1. THE SLEEPING GIANT (Buy Low) - Red for Power */}
                <div className="preset-card" onClick={() => applyQuickFilter({ 
                    name: "The Sleeping Giant", 
                    pos: BATTER_POSITIONS, 
                    stats: ["barrel_pct", "chase_pct", "xwoba", "avg", "pa"], 
                    thresholds: { barrel_pct: 10, chase_pct: 28 }, 
                    minTools: 0,
                    dateRange: "last_30"
                })} style={{ ...STYLES.cardCompact, flex: "0 0 200px", cursor: "pointer", background: "rgba(255,255,255,0.95)", borderTop: "3px solid #d32f2f" }}>
                    <div style={{ fontWeight: 900, color: "#d32f2f", fontSize: 12 }}>The Sleeping Giant</div>
                    <div style={{ fontSize: 10, color: "#666" }}>Elite Process, Bad Luck.</div>
                    <div style={{ fontSize: 9, color: "#888", fontStyle: "italic" }}>Last 30 Days</div>
                </div>

                {/* 2. HIDDEN HIGH-FLOOR (Contact) - Blue */}
                <div className="preset-card" onClick={() => applyQuickFilter({ 
                    name: "Hidden High Floor", 
                    pos: BATTER_POSITIONS, 
                    stats: ["zone_contact_pct", "max_exit_velocity", "age", "k_pct"], 
                    thresholds: { zone_contact_pct: 85, max_exit_velocity: 108, age: 24 }, 
                    minTools: 1,
                    dateRange: "season_curr"
                })} style={{ ...STYLES.cardCompact, flex: "0 0 200px", cursor: "pointer", background: "rgba(255,255,255,0.95)", borderTop: "3px solid #1976d2" }}>
                    <div style={{ fontWeight: 900, color: "#1976d2", fontSize: 12 }}>Hidden High-Floor</div>
                    <div style={{ fontSize: 10, color: "#666" }}>Young + Contact + Secret Pop.</div>
                    <div style={{ fontSize: 9, color: "#888", fontStyle: "italic" }}>Full Season</div>
                </div>

                {/* 3. STUFF+ BREAKOUT (Pitching) - Purple */}
                <div className="preset-card" onClick={() => applyQuickFilter({ 
                    name: "Stuff+ Breakout", 
                    pos: PITCHER_POSITIONS, 
                    stats: ["ivb", "k_pct", "era", "xera"], 
                    thresholds: { ivb: 17, k_pct: 25 }, 
                    minTools: 1,
                    dateRange: "last_30"
                })} style={{ ...STYLES.cardCompact, flex: "0 0 200px", cursor: "pointer", background: "rgba(255,255,255,0.95)", borderTop: "3px solid #7b1fa2" }}>
                    <div style={{ fontWeight: 900, color: "#7b1fa2", fontSize: 12 }}>Stuff+ Breakout</div>
                    <div style={{ fontSize: 10, color: "#666" }}>Elite Shape, Buy-Low ERA.</div>
                    <div style={{ fontSize: 9, color: "#888", fontStyle: "italic" }}>Last 30 Days</div>
                </div>

                {/* 4. GREEN LIGHT SPEEDSTER (Speed) - Yellow */}
                <div className="preset-card" onClick={() => applyQuickFilter({ 
                    name: "Green Light Speed", 
                    pos: BATTER_POSITIONS, 
                    stats: ["sprint_speed", "sb", "bolts", "obp"], 
                    thresholds: { sprint_speed: 29, bolts: 3 }, 
                    minTools: 1,
                    dateRange: "last_30"
                })} style={{ ...STYLES.cardCompact, flex: "0 0 200px", cursor: "pointer", background: "rgba(255,255,255,0.95)", borderTop: "3px solid #fbc02d" }}>
                    <div style={{ fontWeight: 900, color: "#f57f17", fontSize: 12 }}>Green Light Speed</div>
                    <div style={{ fontSize: 10, color: "#666" }}>Elite Wheels + New Aggression.</div>
                    <div style={{ fontSize: 9, color: "#888", fontStyle: "italic" }}>Last 30 Days</div>
                </div>

                {/* 5. LAUNCH ANGLE FIX (Power) - Orange */}
                <div className="preset-card" onClick={() => applyQuickFilter({ 
                    name: "Launch Angle Fix", 
                    pos: BATTER_POSITIONS, 
                    stats: ["ev_90", "hard_hit_pct", "iso", "hr"], 
                    thresholds: { ev_90: 103, hard_hit_pct: 45 }, 
                    minTools: 0,
                    dateRange: "last_30"
                })} style={{ ...STYLES.cardCompact, flex: "0 0 200px", cursor: "pointer", background: "rgba(255,255,255,0.95)", borderTop: "3px solid #e64a19" }}>
                    <div style={{ fontWeight: 900, color: "#e64a19", fontSize: 12 }}>Launch Angle Fix</div>
                    <div style={{ fontSize: 10, color: "#666" }}>Raw Power finding the air.</div>
                    <div style={{ fontSize: 9, color: "#888", fontStyle: "italic" }}>Last 30 Days</div>
                </div>
              </>
            )}
            {presetTab === "expert" && <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, padding: 10 }}>Expert Filters coming in next update...</div>}
            {presetTab === "my_filters" && (
              <>
                {savedFilters.length === 0 ? <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, padding: 10 }}>No saved filters yet. Create one below!</div> : savedFilters.map((filter) => (
                  <div key={filter.id} className="preset-card" onClick={() => applyQuickFilter(filter)} style={{ ...STYLES.cardCompact, flex: "0 0 200px", cursor: "pointer", background: "#e8f5e9", borderColor: "#4caf50" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ fontWeight: 900, color: "#2e7d32", fontSize: 12 }}>{filter.name}</div><button onClick={(e) => deleteFilter(filter.id, e)} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5 }}><Icons.Trash /></button></div>
                    <div style={{ fontSize: 10, color: "#555" }}>{filter.stats?.length || 0} Stats • {filter.dateRange || 'Season'}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          
          <section style={{ flex: "1 1 600px", width: "100%" }}>
            
            {/* --- FILTER CONTROL PANEL --- */}
            <div style={{ borderWidth: "1px", borderStyle: "solid", borderColor: "rgba(255,255,255,0.1)", borderRadius: 16, background: "rgba(255,255,255,0.98)", padding: 0, overflow: "visible", boxShadow: "0 10px 40px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", width: "100%" }}>
              
              {/* --- 1. STAT CATEGORIES (Horizontal Scroll) --- */}
              <div className="hide-scrollbar" style={{ padding: "16px 12px 0 12px", display: "flex", gap: 8, overflowX: "auto", whiteSpace: "nowrap", flexWrap: "nowrap", borderBottom: openGroup ? "none" : "1px solid #e0e0e0", background: "#f9f9f9", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                  {CUSTOM_TAB_ORDER.map((coreId) => {
                  const isOpen = openGroup === coreId;
                  const activeCount = CORE_STATS[coreId]?.filter(k => selectedStatKeys.includes(k)).length || 0;
                  const display = CATEGORY_DISPLAY[coreId] || { label: coreId, icon: null };

                  const isActiveStyle = { background: COLORS.DARK_GREEN, color: "white", borderColor: COLORS.DARK_GREEN, boxShadow: "0 4px 12px rgba(27, 94, 32, 0.3)" };
                  const hasFilterStyle = { background: "white", color: COLORS.DARK_GREEN, borderColor: COLORS.DARK_GREEN, borderWidth: "1px" };
                  const defaultStyle = { background: "white", color: "#555", borderColor: "transparent", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" };
                  let currentStyle = isOpen ? isActiveStyle : (activeCount > 0 ? hasFilterStyle : defaultStyle);

                  return (
                      <div key={coreId} style={{ position: "relative", paddingBottom: 12, flexShrink: 0 }}>
                      <button 
                          onClick={() => setOpenGroup(isOpen ? null : coreId as CoreId)}
                          style={{
                          ...STYLES.btnBase, ...currentStyle,
                          padding: "8px 14px", borderRadius: "24px", fontSize: "12px", fontWeight: (isOpen || activeCount > 0) ? 800 : 600,
                          display: "flex", alignItems: "center", gap: "6px",
                          border: isOpen ? `1px solid ${COLORS.DARK_GREEN}` : (activeCount > 0 ? `1px solid ${COLORS.DARK_GREEN}` : "1px solid #eee"),
                          zIndex: isOpen ? 1002 : 1
                          }}
                      >
                          {display.icon && <span style={{ opacity: isOpen ? 1 : 1, display: 'flex' }}>{display.icon}</span>}
                          {display.label}
                          {activeCount > 0 && (
                              <span style={{ marginLeft: 4, fontSize: 9, background: isOpen ? "#fff" : COLORS.DARK_GREEN, color: isOpen ? COLORS.DARK_GREEN : "#fff", fontWeight: 900, width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>
                                  {activeCount}
                              </span>
                          )}
                          <span style={{ fontSize: 8, opacity: 0.5, marginLeft: 2 }}>{isOpen ? "▲" : "▼"}</span>
                      </button>
                      </div>
                  );
                  })}
              </div>

              {/* --- 1.5 THE FILTER TRAY --- */}
              {renderFilterTray()}

              {/* --- 2. COMPACT SUPER ROW (Split into 2 Rows) --- */}
              <div style={{ background: "#fff", borderBottom: "1px solid #eee" }}>
                  
                  {/* ROW 1: SCOPE & LEVELS */}
                  <div className="hide-scrollbar" style={{ display: "flex", gap: 10, padding: "12px 20px 6px 20px", overflowX: "auto", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          {[
                            { key: "all", label: "All" },
                            { key: "available", label: "FA" },    
                            { key: "my_team", label: "My Team" },                      
                            { key: "rostered", label: "Rostered" }        
                          ].map((opt) => { 
                            const isLocked = !isUserPaid && opt.key !== "all"; 
                            return (
                              <button 
                                key={opt.key} 
                                onClick={() => !isLocked && setLeagueStatus(opt.key as LeagueStatus)} 
                                style={{ ...STYLES.btnBase, padding: "6px 10px", fontSize: 11, ...(leagueStatus === opt.key ? STYLES.btnSelected : null), opacity: isLocked ? 0.6 : 1, cursor: isLocked ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                              >
                                {opt.label}{isLocked && <Icons.LockSmall />}
                              </button>
                            ); 
                          })}
                      </div>
                      <div style={{ width: 1, height: 20, background: "#eee", flexShrink: 0 }} />
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button onClick={() => { setLevel("all"); setSelectedPositions([]); }} style={{ ...STYLES.btnBase, padding: "6px 10px", fontSize: 11, ...(level === "all" && selectedPositions.length === 0 ? STYLES.btnSelected : null) }}>All</button>
                          <button onClick={() => setLevel("mlb")} style={{ ...STYLES.btnBase, padding: "6px 10px", fontSize: 11, ...(level === "mlb" ? STYLES.btnSelected : null) }}>MLB</button>
                          <button onClick={() => setLevel("rookies" as any)} style={{ ...STYLES.btnBase, padding: "6px 10px", fontSize: 11, ...(level === "rookies" as any ? STYLES.btnSelected : null) }}>Rookies</button>
                          <button onClick={() => setLevel("prospects")} style={{ ...STYLES.btnBase, padding: "6px 10px", fontSize: 11, ...(level === "prospects" ? STYLES.btnSelected : null) }}>MiLB</button>
                      </div>
                  </div>

                  {/* ROW 2: TYPES & POSITIONS */}
                  <div className="hide-scrollbar" style={{ display: "flex", gap: 10, padding: "0 20px 12px 20px", overflowX: "auto", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button 
                            onClick={() => setSelectedPositions([])} 
                            style={{ ...STYLES.btnBase, padding: "6px 10px", fontSize: 11, ...(selectedPositions.length === 0 ? STYLES.btnSelected : null) }}
                          >
                            All
                          </button>
                          <button onClick={() => setSelectedPositions([...BATTER_POSITIONS])} style={{ ...STYLES.btnBase, padding: "6px 10px", fontSize: 11, ...(BATTER_POSITIONS.every(p => selectedPositions.includes(p)) && selectedPositions.length > 0 ? STYLES.btnSelected : null) }}>Batters</button>
                          <button onClick={() => setSelectedPositions([...PITCHER_POSITIONS])} style={{ ...STYLES.btnBase, padding: "6px 10px", fontSize: 11, ...(PITCHER_POSITIONS.every(p => selectedPositions.includes(p)) && selectedPositions.length > 0 ? STYLES.btnSelected : null) }}>Pitchers</button>
                      </div>
                      <div style={{ width: 1, height: 20, background: "#eee", flexShrink: 0 }} />
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          {ALL_POSITIONS.map(p => (
                            <button key={p} onClick={() => setSelectedPositions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} style={{ ...STYLES.btnBase, width: 28, height: 28, padding: 0, borderRadius: "50%", fontSize: 10, ...(selectedPositions.includes(p) ? STYLES.btnSelected : null), flexShrink: 0 }}>{p}</button>
                          ))}
                      </div>
                  </div>
              </div>

              {/* --- 3. TEAMS ROW (Alphabetical) --- */}
              <div style={{ padding: "8px 20px", background: "#fff", borderBottom: "1px solid #eee" }}>
                 {renderTeamScrollRow()}
              </div>

              {/* --- RESULTS BAR --- */}
              <div ref={resultsTableRef} style={{ padding: "12px 20px", background: "#fcfcfc", borderBottom: "2px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 900, fontSize: 18 }}>Results</span>
                  {loading ? <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#666" }}><Icons.Spinner /> Scouting...</span> : <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.DARK_GREEN, background: "#e8f5e9", padding: "4px 10px", borderRadius: 20 }}>{filteredPlayers.length} Found</span>}
                  
                  <button onClick={handleGlobalReset} style={{...STYLES.btnBase, fontSize: 10, padding: "4px 10px", background: "#fdecea", color: "#721c24", borderColor: "#f5c6cb"}}>Reset</button>
                  <button onClick={saveCurrentFilter} title="Save current filter" style={{...STYLES.btnBase, fontSize: 10, padding: "4px 10px", background: "#e3f2fd", color: "#0d47a1", borderColor: "#90caf9", display: "flex", alignItems: "center", gap: 4}}><Icons.Save /> Save</button>

                  {compareList.length > 0 && (
                    <button onClick={() => setIsCompareOpen(true)} style={{ background: "#1b5e20", color: "#fff", border: "none", borderRadius: 20, padding: "6px 14px", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", animation: "slideDown 0.2s" }}>COMPARE ({compareList.length})</button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto", overflowX: "auto", flexWrap: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", padding: "4px 8px", borderRadius: "8px", border: "1px solid #eee", whiteSpace: "nowrap", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", marginRight: 2 }}>📅 Range:</span>
                    <select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRangeOption)} style={{ ...STYLES.btnBase, padding: "4px 8px", fontSize: 11, height: "28px", borderRadius: "6px" }}>
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
                          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ ...STYLES.btnBase, padding: "3px 6px", fontSize: 11, width: "110px" }} />
                          <span style={{ color: "#aaa", fontSize: 10 }}>to</span>
                          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ ...STYLES.btnBase, padding: "3px 6px", fontSize: 11, width: "110px" }} />
                        </div>
                        <button onClick={applyCustomDates} style={{ ...STYLES.btnBase, background: COLORS.DARK_GREEN, color: "#fff", border: "none", fontSize: 10, padding: "4px 8px", height: 26, fontWeight: 700 }}>Apply</button>
                      </>
                    )}
                  </div>
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: "8px 16px", borderRadius: 20, border: "1px solid #ddd", fontSize: 13, outline: "none", width: "clamp(120px, 20vw, 200px)", flexShrink: 1 }} />
                </div>
              </div>

              {/* LEGEND */}
              <ToolLegend />

              {/* --- TABLE --- */}
              <div className="sticky-container">
                <table className="sticky-table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('name')} style={{ padding: "8px 12px", textAlign: "left", cursor: "pointer" }}>Player {sortKey === 'name' && (sortDir === 'asc' ? <Icons.SortAsc /> : <Icons.SortDesc />)}</th>
                      {selectedStatKeys.map(k => {
                        const showLock = dateRange !== 'season_curr' && dateRange !== 'pace_season' && isSeasonLocked(k);
                        return (
                          <th key={k} onClick={() => handleSort(k)} style={{ padding: "8px 12px", textAlign: "right", color: COLORS.DARK_GREEN, cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                              {showLock && (
                                <span title="This stat is anchored to the Full Season (Talent Metric)" style={{ fontSize: 9, fontWeight: 900, color: '#999', border: '1px solid #ccc', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>S</span>
                              )}
                              {STATS[k].label} {sortKey === k && (sortDir === 'asc' ? <Icons.SortAsc /> : <Icons.SortDesc />)}
                            </div>
                          </th>
                        );
                      })}
                      <th onClick={() => handleSort('dynaScore')} style={{ padding: "8px 12px", textAlign: "right", cursor: "pointer", color: COLORS.DYNASTY_PURPLE }}>Dyna</th>
                      <th onClick={() => handleSort('rotoScore')} style={{ padding: "8px 12px", textAlign: "right", cursor: "pointer", color: COLORS.DARK_GREEN }}>Roto</th>
                      <th onClick={() => handleSort('pointsScore')} style={{ padding: "8px 12px", textAlign: "right", cursor: "pointer", color: "#0288d1" }}>Points</th> 
                      <th onClick={() => handleSort('rangeScore')} style={{ padding: "8px 12px", textAlign: "right", cursor: "pointer", color: COLORS.RANGE_ORANGE }}>Overall</th>
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
                          <td style={{ padding: "8px 12px" }}>
                            {/* MOBILE LAYOUT */}
                            <div className="mobile-player-info" style={{ display: "none" }}>
                                <div onClick={(e) => { e.stopPropagation(); toggleCompare(p.id.toString()); }}>
                                    <PlayerAvatar team={p.team as TeamAbbr} jerseyNumber={p.jerseyNumber} hasNews={isExpanded} availability={p.availability} isSelected={isChecked} />
                                </div>
                                <div style={{ lineHeight: 1.1, marginTop: 4 }}>
                                   <div style={{ fontWeight: 800, fontSize: 11, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70px" }}>{p.name.split(' ').pop()}</div> 
                                   <div style={{ fontSize: 9, color: "#888" }}>{p.position} - {p.team}</div>
                                </div>
                            </div>
                            {/* DESKTOP LAYOUT */}
                            <div className="desktop-player-info" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div onClick={(e) => { e.stopPropagation(); toggleCompare(p.id.toString()); }} style={{ cursor: 'pointer' }} title="Click to Compare">
                                 <PlayerAvatar team={p.team as TeamAbbr} jerseyNumber={p.jerseyNumber} hasNews={isExpanded} availability={p.availability} isSelected={isChecked} />
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                                  <span style={{ fontSize: 9, fontWeight: 800, color: "#666", background: "#eee", padding: "1px 4px", borderRadius: 3 }}>{p.position}</span>
                                  {p.availability === 'MY_TEAM' && (<span style={{ fontSize: 9, fontWeight: 900, color: "#fff", background: "#4caf50", padding: "1px 6px", borderRadius: 10 }}>OWNED</span>)}
                                  {p.availability === 'ROSTERED' && (<span style={{ fontSize: 9, fontWeight: 900, color: "#888", border: "1px solid #888", padding: "1px 6px", borderRadius: 10 }}>TAKEN</span>)}
                                  {getTrajectory(p) && <span style={{ fontSize: 9, fontWeight: 800, color: getTrajectory(p)!.label, background: getTrajectory(p)!.bg, padding: "1px 4px", borderRadius: 4 }}>{getTrajectory(p)!.label}</span>}
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
                                  {getTools(p).map((t: any, i: number) => (
                                    <span key={i} title={t.name} style={{ fontSize: 9, fontWeight: 900, color: t.color, border: `1px solid ${t.color}40`, padding: "1px 4px", borderRadius: 4 }}>{t.label}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                          {selectedStatKeys.map(k => {
                              const isBatterStat = BATTER_STATS.includes(k);
                              const isPitcherStat = PITCHER_STATS.includes(k);
                              
                              if ((isPitcher && isBatterStat) || (!isPitcher && isPitcherStat)) {
                                return <td key={k} style={{ textAlign: "center", padding: "12px 10px", color: "#ccc" }}>-</td>;
                              }

                              const rawVal = p.stats?.[k];
                              if (rawVal === undefined || rawVal === null) {
                                  return <td key={k} style={{ textAlign: "right", padding: "8px 12px", color: "#ccc" }}>-</td>;
                              }

                              const config = STATS[k];
                              let displayVal = rawVal;

                              if (config) {
                                  const num = parseFloat(rawVal);
                                  if (!isNaN(num)) {
                                      if (config.unit === 'percent') {
                                          displayVal = `${num.toFixed(1)}%`;
                                      } else if (['avg', 'obp', 'slg', 'xba', 'xwoba', 'woba'].includes(k)) {
                                          displayVal = num.toFixed(3).replace(/^0+/, ''); 
                                      } else if (['era', 'whip', 'k_bb_ratio', 'xera', 'fip'].includes(k)) {
                                          displayVal = num.toFixed(2);
                                      } else if (['ip'].includes(k)) {
                                          displayVal = num.toFixed(1);
                                      } else {
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
                            <td style={{ textAlign: "right", fontWeight: 900, padding: "8px 12px", fontSize: 14, color: COLORS.DYNASTY_PURPLE }}>{p.dynaScore}</td>
                            <td style={{ textAlign: "right", fontWeight: 900, padding: "8px 12px", fontSize: 14, color: COLORS.DARK_GREEN }}>{p.rotoScore}</td>
                            <td style={{ textAlign: "right", fontWeight: 900, padding: "8px 12px", fontSize: 14, color: "#0288d1" }}>{p.pointsScore}</td> 
                            <td style={{ textAlign: "right", fontWeight: 900, padding: "8px 12px", fontSize: 14, color: COLORS.RANGE_ORANGE }}>{p.rangeScore}</td>
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
        <div className="wide-container" style={{ display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 250px" }}><div style={{ fontWeight: 900, fontSize: 24, marginBottom: 16, color: "#fff" }}>ROTO FILTER</div><p style={{ fontSize: 14, color: "#888", lineHeight: 1.6 }}>The ultimate MLB player analysis and filter tool. Built for fantasy baseball managers who need a competitive edge.</p></div>
          {[{ title: "Product", links: ["Filters", "Live News", "Stat Glossary", "Pro Upgrades"] }, { title: "Resources", links: ["Draft Guide", "Strategy Tips", "Community", "Support"] }, { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact"] }].map(col => (<div key={col.title} style={{ flex: "1 1 120px" }}><div style={{ fontWeight: 800, fontSize: 12, color: "#fff", textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>{col.title}</div><ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>{col.links.map(link => (<li key={link}><a href="#" style={{ color: "#888", fontSize: 14, textDecoration: "none", transition: "0.2s" }}>{link}</a></li>))}</ul></div>))}
        </div>
        <div className="wide-container" style={{ marginTop: 40, paddingTop: 30, borderTop: "1px solid #222", textAlign: "center", color: "#555", fontSize: 12 }}>© {new Date().getFullYear()} Roto Filter. Not affiliated with Major League Baseball.</div>
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

      {/* --- NEWS DRAWER --- */}
      <NewsDrawer 
        isOpen={isNewsOpen} 
        onClose={() => setIsNewsOpen(false)} 
      />
    </div>
  )
}