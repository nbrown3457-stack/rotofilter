import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  console.log("--- SYNC STARTED ---");
  try {
    let body;
    try { body = await req.json(); } catch(e) {}
    const { league_key } = body || {};
    
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('yahoo_access_token')?.value;

    if (!accessToken) return NextResponse.json({ error: "No Token" }, { status: 401 });

    // 1. FETCH DATA
    console.log(`Fetching Yahoo: ${league_key}`);
    const response = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/league/${league_key}/teams/roster?format=json`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
        return NextResponse.json({ error: `Yahoo Error: ${response.status}` }, { status: response.status });
    }

    const jsonText = await response.text();
    console.log("--- DATA RECEIVED ---");
    
    // THE SPY: Log the first 1000 characters so we can see the structure in the logs
    console.log("DATA PREVIEW:", jsonText.substring(0, 1000));

    // 2. THE NUCLEAR PARSER
    // Instead of trusting the structure, we parse the JSON and hunt for EVERYTHING.
    const data = JSON.parse(jsonText);
    const rosteredPlayers: any[] = [];

    // Helper to extract players from ANYWHERE
    const extractPlayers = (obj: any, currentTeamKey: string | null) => {
        if (!obj || typeof obj !== 'object') return;

        // Track Team Key if we find one
        if (obj.team_key) currentTeamKey = obj.team_key;
        
        // Also check inside arrays for team keys
        if (Array.isArray(obj)) {
            const teamMeta = obj.find((x: any) => x && x.team_key);
            if (teamMeta) currentTeamKey = teamMeta.team_key;
        }

        // Check if this object IS a player
        if (obj.player_id && currentTeamKey) {
             // We found a player AND we know who owns them!
             // Sometimes name is nested
             let pName = "Unknown";
             if (obj.name && obj.name.full) pName = obj.name.full;
             // Sometimes name is in a sibling object in the same array
             // But let's grab what we can.
             
             // Check if we already added this specific player/team combo
             const exists = rosteredPlayers.find(p => p.yahoo_id === obj.player_id && p.team_key === currentTeamKey);
             if (!exists) {
                 rosteredPlayers.push({
                     league_key: league_key,
                     team_key: currentTeamKey,
                     yahoo_id: obj.player_id,
                     player_name: pName, 
                     updated_at: new Date()
                 });
             }
        }
        
        // Yahoo Arrays: [{player_id: "123"}, {name: {...}}]
        // We need to handle this specific structure
        if (Array.isArray(obj) && currentTeamKey) {
            const idObj = obj.find((x:any) => x && x.player_id);
            const nameObj = obj.find((x:any) => x && x.name);
            
            if (idObj && nameObj) {
                 rosteredPlayers.push({
                     league_key: league_key,
                     team_key: currentTeamKey,
                     yahoo_id: idObj.player_id,
                     player_name: nameObj.name.full,
                     updated_at: new Date()
                 });
                 return; // Done with this array
            }
        }

        // Recurse
        Object.values(obj).forEach(child => extractPlayers(child, currentTeamKey));
    };

    extractPlayers(data, null);

    console.log(`--- NUCLEAR PARSER FOUND: ${rosteredPlayers.length} PLAYERS ---`);

    if (rosteredPlayers.length > 0) {
        // DELETE OLD & INSERT NEW
        await supabase.from('league_rosters').delete().eq('league_key', league_key);
        
        // Insert in batches of 50 to be safe
        const { error } = await supabase.from('league_rosters').insert(rosteredPlayers);
        
        if (error) {
            console.error("DB Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, count: rosteredPlayers.length });
    } else {
        // IF THIS FAILS, THE LOGS WILL SHOW US WHY (Look for "DATA PREVIEW")
        return NextResponse.json({ error: "Still 0 players. Check Logs for 'DATA PREVIEW'." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("CRASH:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}