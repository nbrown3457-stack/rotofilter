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

    // 2. Parse Teams (Preserving Ownership)
    // Yahoo's JSON structure is messy. We drill down carefully.
    const teamsData = data?.fantasy_content?.league?.[1]?.teams;

    if (teamsData && typeof teamsData === 'object') {
      // Yahoo returns teams as an object with indices {0: team, 1: team, ... count: X}
      Object.values(teamsData).forEach((t: any) => {
        // Skip the 'count' property
        if (!t?.team) return;

        // The 'team' array usually has 2 parts: [0] is metadata, [1] is roster
        const teamMetadata = t.team[0]; 
        const teamRoster = t.team[1]?.roster;
        
        // Extract the Owner ID (team_key)
        const teamKey = teamMetadata?.find((m: any) => m.team_key !== undefined)?.team_key;
        
        if (teamKey && teamRoster && teamRoster['0']?.players) {
            const playersList = teamRoster['0'].players;
            
            // Loop through players on THIS team
            Object.values(playersList).forEach((pWrapper: any) => {
                const p = pWrapper?.player;
                if (p && p[0]) {
                    // Drill for ID and Name
                    const playerId = p[0].find((x: any) => x.player_id !== undefined)?.player_id;
                    const playerName = p[0].find((x: any) => x.name !== undefined)?.name?.full;

                    if (playerId) {
                        rosteredPlayers.push({
                            league_key: league_key,
                            team_key: teamKey, // <--- CRITICAL: Now we know who owns him
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

    console.log(`SYNC: Found ${rosteredPlayers.length} players. Writing to DB...`);

    // 3. Update Supabase (The part that was commented out)
    
    // A. Clear old data for this league (to handle drops/adds)
    const { error: deleteError } = await supabase
        .from('league_rosters')
        .delete()
        .eq('league_key', league_key);
    
    if (deleteError) {
        console.error("SYNC DB ERROR (Delete):", deleteError);
        throw new Error("Failed to clear old rosters");
    }

    // B. Insert new data (in batches of 100 to be safe)
    if (rosteredPlayers.length > 0) {
        const { error: insertError } = await supabase
            .from('league_rosters')
            .insert(rosteredPlayers);
            
        if (insertError) {
            console.error("SYNC DB ERROR (Insert):", insertError);
            throw new Error("Failed to save new rosters");
        }
    }

    return NextResponse.json({ 
      success: true, 
      count: rosteredPlayers.length,
      message: `Successfully synced ${rosteredPlayers.length} players`
    });

  } catch (error: any) {
    console.error("SYNC CRITICAL FAILURE:", error);
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 });
  }
}