import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// --------------------------------------------------------------------------
// CONFIGURATION
// --------------------------------------------------------------------------
const DEFAULT_YEAR = '2025'; 
const SEASON_END_DATE = '2025-09-29'; 
const MAPPING_TABLE = 'player_mappings'; 

// --- SAFETY CHECK: Initialize Supabase Conditionally ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null; 

// --------------------------------------------------------------------------
// HELPER: FETCH SAVANT DATA
// --------------------------------------------------------------------------
async function fetchSavantData(type: 'batter' | 'pitcher' | 'sprint' | 'fielding' | 'movement', year: string) {
  try {
    let url = "";
    if (type === 'sprint') url = `https://baseballsavant.mlb.com/leaderboard/sprint_speed?year=${year}&position=&team=&min=1&csv=true`;
    else if (type === 'fielding') url = `https://baseballsavant.mlb.com/leaderboard/outs_above_average?type=Fielder&year=${year}&team=&min=1&csv=true`;
    else if (type === 'movement') url = `https://baseballsavant.mlb.com/leaderboard/pitch-movement?year=${year}&team=&min=1&pitch_type=ALL&csv=true`;
    else {
      const metrics = ["xwoba", "xba", "xslg", "woba", "ba", "slg", "exit_velocity_avg", "launch_angle_avg", "sweet_spot_percent", "barrel_batted_rate", "hard_hit_percent", "whiff_percent", "swing_percent", "oz_swing_percent", "k_percent", "bb_percent", "iz_contact_percent", "called_strike_percent"].join(",");
      url = `https://baseballsavant.mlb.com/leaderboard/custom?year=${year}&type=${type}&filter=&sort=1&sortDir=desc&min=1&selections=${metrics}&csv=true`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); 

    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return new Map();
    const text = await res.text();
    const rows = text.split('\n');
    const headers = rows[0].split(',').map(h => h.replace(/"/g, '').trim());
    const idx: Record<string, number> = {};
    headers.forEach((h, i) => idx[h] = i);

    const dataMap = new Map();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i].split(',');
      if (row.length < 2) continue;
      const id = parseInt(row[idx['player_id']]);
      if (isNaN(id)) continue;
      
      const parseVal = (key: string) => parseFloat(row[idx[key]]) || 0;
      if (type === 'sprint') dataMap.set(id, { sprint_speed: parseVal('sprint_speed') });
      else if (type === 'fielding') dataMap.set(id, { oaa: parseVal('outs_above_average') });
      else if (type === 'movement') dataMap.set(id, { ivb: parseVal('pfx_z'), spin_rate: parseVal('avg_spin') });
      else {
        dataMap.set(id, {
          xwoba: parseVal('xwoba'), xba: parseVal('xba'), xslg: parseVal('xslg'),
          woba: parseVal('woba'), exit_velocity_avg: parseVal('exit_velocity_avg'),
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
    return new Map(); 
  }
}

// --------------------------------------------------------------------------
// HELPER: DATE CALCULATOR
// --------------------------------------------------------------------------
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
    const filterTeamId = searchParams.get('team_id'); 

    // GET LEAGUE CONTEXT
    const cookieStore = await cookies();
    const activeLeagueKey = cookieStore.get('active_league_key')?.value;
    const activeTeamKey = cookieStore.get('active_team_key')?.value;

    // --- PATCH: Derive League Key if Cookie Missing ---
    let derivedLeagueKey = activeLeagueKey;
    if (!derivedLeagueKey && filterTeamId && filterTeamId.includes('.t.')) {
        // Extract league key from team key (e.g. "428.l.12345.t.1" -> "428.l.12345")
        derivedLeagueKey = filterTeamId.split('.t.')[0];
    }

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
      : `stats=season&season=${targetYear}&group=hitting,pitching&sportId=${sportIds}&limit=3000`;

    // --- PHASE 1: CRITICAL DATA ---
    const rosterData = await fetchJson(`https://statsapi.mlb.com/api/v1/sports/1/players?season=${targetYear}&gameType=R`);
    if (!rosterData) throw new Error("MLB API Unreachable");

    // --- PHASE 2: ENRICHMENT DATA ---
    const [
      allStats, 
      savantBatters, 
      savantPitchers, 
      savantSprint, 
      savantFielding, 
      savantMovement,
      leagueOwnershipRes, 
      idMappingsRes       
    ] = await Promise.all([
      fetchJson(`https://statsapi.mlb.com/api/v1/stats?${statsParams}`),
      fetchSavantData('batter', targetYear),
      fetchSavantData('pitcher', targetYear),
      fetchSavantData('sprint', targetYear),
      fetchSavantData('fielding', targetYear),
      fetchSavantData('movement', targetYear),
      // Use derivedLeagueKey here so it works even if cookies are empty
      (supabase && derivedLeagueKey)
        ? supabase.from('league_rosters').select('yahoo_id, team_key').eq('league_key', derivedLeagueKey).then(res => res)
        : Promise.resolve({ data: [], error: null }),
      supabase
        ? supabase.from(MAPPING_TABLE).select('yahoo_id, mlb_id').then(res => res)
        : Promise.resolve({ data: [], error: null })
    ]);

    const leagueOwnership = leagueOwnershipRes?.data || [];
    const idMappings = idMappingsRes?.data || [];

    // --- MAPPING LOGIC (Uses Your Table) ---
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
    if (leagueOwnership.length > 0) {
        leagueOwnership.forEach((r: any) => {
            const yId = r.yahoo_id.toString();
            // Try explicit mapping first
            let mId = yahooToMlb.get(yId);
            
            // If mapping fails, try using Yahoo ID as MLB ID (common for many players)
            if (!mId) mId = parseInt(yId);

            if (mId && !isNaN(mId)) {
                ownershipMap.set(mId, r.team_key);
            }
        });
    }

    // 3. BUILD MASTER MAP
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

    // 4. FINAL MERGE
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

      let ownerTeamKey = ownershipMap.get(p.id); 
      let availability = 'AVAILABLE';
      if (ownerTeamKey) {
        // Use derived 'My Team' logic (checks cookie OR current filter)
        const myTeam = activeTeamKey || filterTeamId;
        availability = (myTeam && ownerTeamKey === myTeam) ? 'MY_TEAM' : 'ROSTERED';
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
          ab: stdStats.atBats || 0,
          ip: parseFloat(stdStats.inningsPitched || 0),
          avg: safeFloat(stdStats.avg),
          hr: stdStats.homeRuns || 0,
          rbi: stdStats.rbi || 0,
          sb: stdStats.stolenBases || 0,
          r: stdStats.runs || 0,
          ops: safeFloat(stdStats.ops),
          era: safeFloat(stdStats.era),
          w: stdStats.wins || 0,
          sv: stdStats.saves || 0,
          so: stdStats.strikeOuts || 0,
          whip: safeFloat(stdStats.whip),
          iso: safeFloat(calculatedISO),
          wrc_plus: wrcProxy,
          csw_pct: safeFloat(calculatedCSW),
          xwoba: safeFloat(safeAdv.xwoba),
          xba: safeFloat(safeAdv.xba),
          xslg: safeFloat(safeAdv.xslg),
          exit_velocity_avg: safeFloat(safeAdv.exit_velocity_avg),
          launch_angle_avg: safeFloat(safeAdv.launch_angle_avg),
          barrel_pct: safeFloat(safeAdv.barrel_pct),
          hard_hit_pct: safeFloat(safeAdv.hard_hit_pct),
          sweet_spot_pct: safeFloat(safeAdv.sweet_spot_pct),
          whiff_pct: safeFloat(safeAdv.whiff_pct),
          chase_pct: safeFloat(safeAdv.chase_pct),
          k_pct: safeFloat(safeAdv.k_pct),
          bb_pct: safeFloat(safeAdv.bb_pct),
          zone_contact_pct: safeFloat(safeAdv.zone_contact_pct),
          sprint_speed: safeFloat(speedStats.sprint_speed),
          oaa: safeFloat(fieldStats.oaa),
          spin_rate: safeFloat(moveStats.spin_rate),
          ivb: safeFloat(moveStats.ivb)
        }
      };
    });

    if (filterTeamId) {
       players = players.filter((p: any) => p.ownerTeamKey === filterTeamId);
    }

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