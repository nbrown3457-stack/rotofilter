import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// --------------------------------------------------------------------------
// CONFIGURATION
// --------------------------------------------------------------------------
const DEFAULT_YEAR = '2025'; 
const SEASON_END_DATE = '2025-09-29'; 
const MAPPING_TABLE = 'player_mappings'; 

// Park Factors (100 is Average, >100 is Hitter Friendly, <100 is Pitcher Friendly)
const PARK_FACTORS: Record<string, number> = {
  'ARI': 100, 'ATL': 102, 'BAL': 98, 'BOS': 104, 'CHC': 101, 'CWS': 99, 
  'CIN': 108, 'CLE': 98, 'COL': 112, 'DET': 97, 'HOU': 99, 'KC': 103, 
  'LAA': 100, 'LAD': 100, 'MIA': 96, 'MIL': 100, 'MIN': 99, 'NYM': 95, 
  'NYY': 102, 'OAK': 96, 'PHI': 103, 'PIT': 98, 'SD': 95, 'SEA': 94, 
  'SF': 97, 'STL': 98, 'TB': 96, 'TEX': 101, 'TOR': 101, 'WSH': 100,
  'FA': 100
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null; 

// --------------------------------------------------------------------------
// HELPER: FETCH SAVANT DATA
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// HELPER: FETCH SAVANT DATA (UPDATED WITH SMART PARSER & ALL STATS)
// --------------------------------------------------------------------------
async function fetchSavantData(type: 'batter' | 'pitcher' | 'sprint' | 'fielding' | 'movement', year: string) {
  try {
    let url = "";
    if (type === 'sprint') url = `https://baseballsavant.mlb.com/leaderboard/sprint_speed?year=${year}&position=&team=&min=1&csv=true`;
    else if (type === 'fielding') url = `https://baseballsavant.mlb.com/leaderboard/outs_above_average?type=Fielder&year=${year}&team=&min=1&csv=true`;
    else if (type === 'movement') url = `https://baseballsavant.mlb.com/leaderboard/pitch-movement?year=${year}&team=&min=1&pitch_type=ALL&csv=true`;
    else {
      // BATTER & PITCHER: Grab every useful metric
      const metrics = ["xwoba", "xba", "xslg", "woba", "ba", "slg", "exit_velocity_avg", "launch_angle_avg", "sweet_spot_percent", "barrel_batted_rate", "hard_hit_percent", "whiff_percent", "swing_percent", "oz_swing_percent", "k_percent", "bb_percent", "iz_contact_percent", "called_strike_percent"].join(",");
      url = `https://baseballsavant.mlb.com/leaderboard/custom?year=${year}&type=${type}&filter=&sort=1&sortDir=desc&min=1&selections=${metrics}&csv=true`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); 

    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
        console.log(`[SAVANT ERROR] Failed to fetch ${type}: ${res.status}`);
        return new Map();
    }
    
    const text = await res.text();
    const rows = text.split('\n');

    // 1. SMART HEADER PARSING (Handles quotes correctly)
    const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
    
    const parseCSVLine = (line: string) => {
        const matches = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
            let val = match[1].replace(/^,/, '').trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            matches.push(val);
        }
        return matches;
    }

    if (rows.length < 2) return new Map();

    const headers = parseCSVLine(rows[0]);
    const idx: Record<string, number> = {};
    headers.forEach((h, i) => idx[h] = i);

    // Spy on mapped headers to confirm success
    if (type === 'batter') console.log(`[SAVANT FIXED] Batter Headers Mapped:`, Object.keys(idx));

    const dataMap = new Map();
    
    for (let i = 1; i < rows.length; i++) {
      const row = parseCSVLine(rows[i]);
      if (row.length < 2) continue;

      const idStr = row[idx['player_id']] || row[idx['pitcher_id']];
      const id = parseInt(idStr);
      if (isNaN(id)) continue;

      const parseVal = (key: string) => {
          const val = row[idx[key]];
          return val ? (parseFloat(val) || 0) : 0;
      };

      if (type === 'sprint') {
          dataMap.set(id, { sprint_speed: parseVal('sprint_speed'), bolts: parseVal('bolts') });
      }
      else if (type === 'fielding') {
          dataMap.set(id, { oaa: parseVal('outs_above_average'), fielding_runs: parseVal('fielding_runs_prevented') });
      }
      else if (type === 'movement') {
          dataMap.set(id, { 
              velocity: parseVal('avg_speed'), 
              spin_rate: 0, 
              ivb: parseVal('pitcher_break_z_induced'),
              h_break: parseVal('pitcher_break_x'),
              pitch_type: row[idx['pitch_type']]
          });
      }
      else {
        dataMap.set(id, {
          xwoba: parseVal('xwoba'), 
          xba: parseVal('xba'), 
          xslg: parseVal('xslg'),
          woba: parseVal('woba'), 
          ba: parseVal('ba'),
          slg: parseVal('slg'),
          exit_velocity_avg: parseVal('exit_velocity_avg'),
          launch_angle_avg: parseVal('launch_angle_avg'),
          barrel_pct: parseVal('barrel_batted_rate'),
          hard_hit_pct: parseVal('hard_hit_percent'),
          sweet_spot_pct: parseVal('sweet_spot_percent'),
          whiff_pct: parseVal('whiff_percent'),
          swing_pct: parseVal('swing_percent'),
          chase_pct: parseVal('oz_swing_percent'),
          k_pct: parseVal('k_percent'),
          bb_pct: parseVal('bb_percent'),
          zone_contact_pct: parseVal('iz_contact_percent'),
          called_strike_pct: parseVal('called_strike_percent'),
        });
      }
    }
    return dataMap;
  } catch (error) { 
    console.error(`Error fetching ${type}`, error);
    return new Map(); 
  }
}

function getDateRange(range: string, customStart?: string | null, customEnd?: string | null) {
  if (range === 'custom' && customStart && customEnd) return { start: customStart, end: customEnd };
  if (range === 'season_curr' || range === 'season_last' || range === 'pace_season') return null;
  const end = new Date(SEASON_END_DATE);
  const start = new Date(SEASON_END_DATE);
  switch (range) {
    case 'last_7': start.setDate(end.getDate() - 7); break;
    case 'last_30': start.setDate(end.getDate() - 30); break;
    case 'last_90': start.setDate(end.getDate() - 90); break;
    case 'yesterday': start.setDate(end.getDate() - 1); break;
    default: return null; 
  }
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

const fetchJson = async (url: string) => {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) { return null; }
};

// --------------------------------------------------------------------------
// MAIN API HANDLER
// --------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || 'season_curr';
    const customStart = searchParams.get('start');
    const customEnd = searchParams.get('end');
    const contextLeagueId = searchParams.get('league_id'); 
    const contextTeamId = searchParams.get('team_id');     

    const cookieStore = await cookies();
    const cookieLeagueKey = cookieStore.get('active_league_key')?.value;
    const cookieTeamKey = cookieStore.get('active_team_key')?.value;

    const activeLeagueKey = contextLeagueId || cookieLeagueKey;
    const activeTeamKey = contextTeamId || cookieTeamKey;

    let targetYear = DEFAULT_YEAR;
    const dates = getDateRange(range, customStart, customEnd);
    
    if (dates && dates.start) {
      targetYear = dates.start.split('-')[0];
    } else if (range === 'season_last') {
      targetYear = (parseInt(DEFAULT_YEAR) - 1).toString();
    }

    const sportIds = "1";
    let statsParams = dates 
      ? `stats=byDateRange&startDate=${dates.start}&endDate=${dates.end}&group=hitting,pitching&sportId=${sportIds}&limit=3000`
      : `stats=season&season=${targetYear}&gameType=R&group=hitting,pitching&sportId=${sportIds}&limit=3000&playerPool=ALL`;

    const rosterData = await fetchJson(`https://statsapi.mlb.com/api/v1/sports/1/players?season=${targetYear}&gameType=R`);
    if (!rosterData) throw new Error("MLB API Unreachable");

    const [
      allStats, savantBatters, savantPitchers, savantSprint, savantFielding, savantMovement, leagueOwnershipRes, idMappingsRes       
    ] = await Promise.all([
      fetchJson(`https://statsapi.mlb.com/api/v1/stats?${statsParams}`),
      fetchSavantData('batter', targetYear),
      fetchSavantData('pitcher', targetYear),
      fetchSavantData('sprint', targetYear),
      fetchSavantData('fielding', targetYear),
      fetchSavantData('movement', targetYear),
      (supabase && activeLeagueKey)
        ? supabase.from('league_rosters').select('yahoo_id, team_key, player_name').eq('league_key', activeLeagueKey).then(res => res)
        : Promise.resolve({ data: [], error: null }),
      supabase
        ? supabase.from(MAPPING_TABLE).select('yahoo_id, mlb_id').then(res => res)
        : Promise.resolve({ data: [], error: null })
    ]);

    const leagueOwnership = leagueOwnershipRes?.data || [];
    const idMappings = idMappingsRes?.data || [];

    // --- MAPPING LOGIC (ID + NAME FALLBACK) ---
    const yahooToMlb = new Map<string, number>();
    if (idMappings.length > 0) {
        idMappings.forEach((row: any) => {
            if (row.yahoo_id && row.mlb_id) {
                const mlbNum = parseInt(row.mlb_id);
                if (!isNaN(mlbNum)) yahooToMlb.set(row.yahoo_id.toString(), mlbNum);
            }
        });
    }

    const ownershipMap = new Map<number, string>(); 
    // NEW: Name Map for backup ("Aaron Judge" -> "team_123")
    const nameToOwnerMap = new Map<string, string>();

    if (leagueOwnership.length > 0) {
        leagueOwnership.forEach((r: any) => {
            const yId = r.yahoo_id.toString();
            // 1. Try explicit ID mapping
            let mId = yahooToMlb.get(yId);
            if (!mId) mId = parseInt(yId); // Fallback

            if (mId && !isNaN(mId)) {
                ownershipMap.set(mId, r.team_key);
            }

            // 2. Populate Name Map (Normalize to lowercase for better matching)
            if (r.player_name) {
                const cleanName = r.player_name.toLowerCase().trim();
                // Store the team key for this name
                nameToOwnerMap.set(cleanName, r.team_key);
            }
        });
    }

    const masterMap = new Map();
    if (rosterData && rosterData.people) {
      rosterData.people.forEach((p: any) => {
        masterMap.set(p.id, {
          id: p.id,
          name: p.fullName,
          team: mapTeamIdToAbbr(p.currentTeam?.id),
          position: p.primaryPosition?.abbreviation || "DH",
          level: 'mlb',
          isRosteredInMLB: true, 
          mlbInfo: p,
          stats: {}, 
          type: p.primaryPosition?.code === '1' ? 'pitcher' : 'batter'
        });
      });
    }

    if (allStats && allStats.stats) {
      allStats.stats.forEach((group: any) => {
        const type = group.group.displayName === 'pitching' ? 'pitcher' : 'batter';
        if (group.splits) {
          group.splits.forEach((s: any) => {
            const id = s.player.id;

            const existing = masterMap.get(id) || {
              id: id,
              name: s.player.fullName,
              team: s.team.abbreviation || 'FA',
              position: s.position.abbreviation,
              level: 'mlb',
              isRosteredInMLB: false,
              stats: {},
              type: type
            };
            existing.stats = s.stat;
            masterMap.set(id, existing);
          });
        }
      });
    }

    let players = Array.from(masterMap.values()).map((p: any) => {
      const mlbInfo = p.mlbInfo || rosterData?.people?.find((r: any) => r.id === p.id);
      const isPitcher = p.type === 'pitcher';
      const advStats = isPitcher ? savantPitchers.get(p.id) : savantBatters.get(p.id);
      const speedStats = savantSprint.get(p.id) || {};
      const fieldStats = savantFielding.get(p.id) || {};
      const moveStats = savantMovement.get(p.id) || {};
      const safeAdv = advStats || {}; 
      const stdStats = p.stats || {};

      const calculatedISO = (stdStats.slg && stdStats.avg) ? (parseFloat(stdStats.slg) - parseFloat(stdStats.avg)).toFixed(3) : 0;
      const calculatedCSW = (safeAdv.called_strike_pct || 0) + (safeAdv.whiff_pct || 0); 
      const wrcProxy = safeAdv.woba ? Math.round(((safeAdv.woba / 0.315) * 100)) : 100;

      // --- OWNERSHIP LOGIC (WITH NAME FALLBACK) ---
      // 1. Check ID Match
      let ownerTeamKey = ownershipMap.get(p.id); 
      
      // 2. If no ID match, Check Name Match
      if (!ownerTeamKey && p.name) {
          const cleanName = p.name.toLowerCase().trim();
          ownerTeamKey = nameToOwnerMap.get(cleanName);
      }

      let availability = 'AVAILABLE';
      if (ownerTeamKey) {
        if (activeTeamKey && ownerTeamKey === activeTeamKey) {
            availability = 'MY_TEAM';
        } else {
            availability = 'ROSTERED';
        }
      }

      return {
        ...p, 
        availability, 
        ownerTeamKey, 
        jerseyNumber: mlbInfo?.primaryNumber || "--",
        info: {
          age: mlbInfo?.currentAge || 0,
          batsThrows: mlbInfo?.batSide ? `${mlbInfo.batSide.code}/${mlbInfo.pitchHand.code}` : "R/R",
          draft: mlbInfo?.draftYear ? `${mlbInfo.draftYear}` : "--",
        },
        stats: {
          // --- NEW PROFILE DATA ---
          age: mlbInfo?.currentAge || 0,
          bats: mlbInfo?.batSide?.code || "R",
          throws: mlbInfo?.pitchHand?.code || "R",
          park_factor: PARK_FACTORS[mapTeamIdToAbbr(p.currentTeam?.id)] || 100,
          // ------------------------
          // --- EXISTING CORE STATS ---
          ab: stdStats.atBats || 0,
          pa: stdStats.plateAppearances || 0,
          g: stdStats.gamesPlayed || 0,
          ip: parseFloat(stdStats.inningsPitched || 0),
          avg: safeFloat(stdStats.avg),
          hr: stdStats.homeRuns || 0,
          rbi: stdStats.rbi || 0,
          sb: stdStats.stolenBases || 0,
          r: stdStats.runs || 0,
          ops: safeFloat(stdStats.ops),
          era: safeFloat(stdStats.era),
          w: stdStats.wins || 0,
          l: stdStats.losses || 0,
          sv: stdStats.saves || 0,
          so: stdStats.strikeOuts || 0,
          whip: safeFloat(stdStats.whip),
          
          // --- ADVANCED STATS (FIXED & EXPANDED) ---
          iso: safeFloat(calculatedISO),
          wrc_plus: wrcProxy,
          csw_pct: safeFloat(calculatedCSW),
          
          // Savant Hitting/Pitching
          xwoba: safeFloat(safeAdv.xwoba),
          xba: safeFloat(safeAdv.xba),
          xslg: safeFloat(safeAdv.xslg),
          woba: safeFloat(safeAdv.woba),
          savant_ba: safeFloat(safeAdv.ba),
          savant_slg: safeFloat(safeAdv.slg),
          exit_velocity_avg: safeFloat(safeAdv.exit_velocity_avg),
          launch_angle_avg: safeFloat(safeAdv.launch_angle_avg),
          barrel_pct: safeFloat(safeAdv.barrel_pct),
          hard_hit_pct: safeFloat(safeAdv.hard_hit_pct),
          sweet_spot_pct: safeFloat(safeAdv.sweet_spot_pct),
          whiff_pct: safeFloat(safeAdv.whiff_pct),
          swing_pct: safeFloat(safeAdv.swing_pct),
          chase_pct: safeFloat(safeAdv.chase_pct),
          k_pct: safeFloat(safeAdv.k_pct),
          bb_pct: safeFloat(safeAdv.bb_pct),
          zone_contact_pct: safeFloat(safeAdv.zone_contact_pct),
          called_strike_pct: safeFloat(safeAdv.called_strike_pct),

          // Speed & Fielding
          sprint_speed: safeFloat(speedStats.sprint_speed),
          bolts: safeFloat(speedStats.bolts),
          oaa: safeFloat(fieldStats.oaa),
          fielding_runs: safeFloat(fieldStats.fielding_runs),

          // Movement (Pitching)
          velocity: safeFloat(moveStats.velocity),
          spin_rate: safeFloat(moveStats.spin_rate),
          ivb: safeFloat(moveStats.ivb),
          h_break: safeFloat(moveStats.h_break)
        }
      };
    });

    return NextResponse.json(players);

  } catch (error: any) {
    console.error("API CRITICAL FAILURE:", error);
    return NextResponse.json({ error: error.message || "Unknown API Error" }, { status: 500 });
  }
}

function safeFloat(val: any): number { const parsed = parseFloat(val); return isNaN(parsed) ? 0 : parsed; }
function mapTeamIdToAbbr(id: number): string {
  const teams: Record<number, string> = { 109:'ARI',144:'ATL',110:'BAL',111:'BOS',112:'CHC',145:'CWS',113:'CIN',114:'CLE',115:'COL',116:'DET',117:'HOU',118:'KC',108:'LAA',119:'LAD',146:'MIA',158:'MIL',142:'MIN',121:'NYM',147:'NYY',133:'OAK',143:'PHI',134:'PIT',135:'SD',136:'SEA',137:'SF',138:'STL',139:'TB',140:'TEX',141:'TOR',120:'WSH' };
  return teams[id] || 'FA';
}