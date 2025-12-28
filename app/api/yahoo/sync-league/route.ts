import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    let body;
    try { body = await req.json(); } catch(e) {}
    const { league_key } = body || {};
    
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('yahoo_access_token')?.value;

    if (!accessToken) return NextResponse.json({ error: "No Token" }, { status: 401 });

    // 1. FETCH DATA
    console.log(`Fetching Yahoo Roster for: ${league_key}`);
    const response = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/league/${league_key}/teams/roster?format=json`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        return NextResponse.json({ error: `Yahoo Error: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    const rosteredPlayers: any[] = [];

    // 2. THE CONTEXT-AWARE PARSER
    // Yahoo Structure: fantasy_content -> league -> [metadata, { teams: { ... } }]
    
    let leagueData = data.fantasy_content?.league;
    // Handle case where league is an array (common) or object
    if (!Array.isArray(leagueData)) leagueData = [leagueData];

    // Find the part of the league that contains 'teams'
    const teamsWrapper = leagueData.find((x: any) => x.teams);
    
    if (teamsWrapper && teamsWrapper.teams) {
        const teamsObj = teamsWrapper.teams;
        
        // Yahoo returns teams as an object with keys "0", "1", "2"... plus a "count" property
        // We iterate over the values that are objects
        Object.values(teamsObj).forEach((teamEntry: any) => {
            if (teamEntry.team) {
                // TEAM FOUND: It is an array.
                // Index 0: Metadata (Team Key, Name)
                // Index 1: Roster Data
                const teamArray = teamEntry.team;
                let teamKey = null;

                // Step A: Get Team Key from Index 0
                if (Array.isArray(teamArray[0])) {
                     const meta = teamArray[0].find((x: any) => x.team_key);
                     if (meta) teamKey = meta.team_key;
                }

                // Step B: Get Players from Index 1
                if (teamKey && teamArray[1] && teamArray[1].roster) {
                    const playersObj = teamArray[1].roster['0'].players;
                    
                    // Loop through players ("0", "1", "2"...)
                    Object.values(playersObj).forEach((playerEntry: any) => {
                        if (playerEntry.player) {
                            // Player is ALSO an array: [ {player_id...}, {name...} ]
                            const pArray = playerEntry.player;
                            const pMeta = pArray[0].find((x: any) => x.player_id);
                            const pNameMeta = pArray[0].find((x: any) => x.name);
                            
                            if (pMeta) {
                                rosteredPlayers.push({
                                    league_key: league_key,
                                    team_key: teamKey,
                                    yahoo_id: pMeta.player_id,
                                    player_name: pNameMeta?.name?.full || "Unknown",
                                    updated_at: new Date()
                                });
                            }
                        }
                    });
                }
            }
        });
    }

    console.log(`PARSER SUCCESS: Found ${rosteredPlayers.length} players.`);

    if (rosteredPlayers.length > 0) {
        // DELETE OLD & INSERT NEW
        await supabase.from('league_rosters').delete().eq('league_key', league_key);
        
        const { error } = await supabase.from('league_rosters').insert(rosteredPlayers);
        
        if (error) {
            console.error("DB Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, count: rosteredPlayers.length });
    } else {
        return NextResponse.json({ error: "Parser finished but found 0 players." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("CRASH:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}