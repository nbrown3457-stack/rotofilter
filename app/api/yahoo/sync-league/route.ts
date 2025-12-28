import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { league_key } = await req.json();
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('yahoo_access_token')?.value;

    if (!accessToken || !league_key) {
      return NextResponse.json({ error: "Missing tokens or league_key" }, { status: 400 });
    }

    console.log(`SYNC: Starting sync for League ${league_key}...`);

    // 1. Fetch FULL Rosters from Yahoo
    const response = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/league/${league_key}/teams/roster?format=json`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        console.error("SYNC: Yahoo API Error", response.status);
        return NextResponse.json({ error: "Yahoo connection failed" }, { status: response.status });
    }

    const data = await response.json();
    const rosteredPlayers: any[] = [];

    // 2. ROBUST PARSING STRATEGY
    // We drill down into the weird Yahoo structure safely
    const leagueData = data?.fantasy_content?.league;
    // Yahoo puts the teams list in the second element of the league array usually [metadata, teams]
    const teamsData = Array.isArray(leagueData) ? leagueData[1]?.teams : leagueData?.teams;

    if (teamsData && typeof teamsData === 'object') {
      Object.values(teamsData).forEach((t: any) => {
        // Yahoo "Team" object is usually an array: [ {metadata}, {roster} ]
        if (!t?.team) return;

        // 1. Get the Team Key (Who owns these players?)
        const teamMetadata = Array.isArray(t.team) ? t.team[0] : null;
        const teamKey = teamMetadata?.find((m: any) => m.team_key !== undefined)?.team_key;
        
        // 2. Get the Player List
        const rosterContainer = Array.isArray(t.team) ? t.team[1] : null;
        const playersList = rosterContainer?.roster?.['0']?.players;

        if (teamKey && playersList) {
            Object.values(playersList).forEach((pWrapper: any) => {
                const p = pWrapper?.player;
                if (p && Array.isArray(p)) {
                    // Extract IDs
                    const playerId = p[0].find((x: any) => x.player_id !== undefined)?.player_id;
                    const playerName = p[0].find((x: any) => x.name !== undefined)?.name?.full;

                    if (playerId && teamKey) {
                        rosteredPlayers.push({
                            league_key: league_key,
                            team_key: teamKey, 
                            yahoo_id: playerId,
                            player_name: playerName || "Unknown",
                            updated_at: new Date()
                        });
                    }
                }
            });
        }
      });
    }

    console.log(`SYNC: Found ${rosteredPlayers.length} rostered players.`);

    // 3. WRITE TO SUPABASE (The Critical Step)
    if (rosteredPlayers.length > 0) {
        // A. Delete old data for this league to avoid duplicates
        const { error: deleteError } = await supabase
            .from('league_rosters')
            .delete()
            .eq('league_key', league_key);
        
        if (deleteError) {
             console.error("SYNC DB DELETE ERROR:", deleteError);
             // We continue anyway, hoping the insert works
        }

        // B. Insert new data
        const { error: insertError } = await supabase
            .from('league_rosters')
            .insert(rosteredPlayers);
            
        if (insertError) {
            console.error("SYNC DB INSERT ERROR:", insertError);
            throw new Error(`Database Write Failed: ${insertError.message}`);
        }
    } else {
        console.warn("SYNC: Parsing resulted in 0 players. Yahoo structure might have changed.");
    }

    return NextResponse.json({ 
      success: true, 
      count: rosteredPlayers.length,
      message: `Saved ${rosteredPlayers.length} players to database`
    });

  } catch (error: any) {
    console.error("SYNC CRITICAL FAILURE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}