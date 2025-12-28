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
      return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
    }

    // 1. Fetch from Yahoo
    const response = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/league/${league_key}/teams/roster?format=json`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();

    const rosteredPlayers: any[] = [];

    // ---------------------------------------------------------
    // THE HUNTER-SEEKER PARSER (Recursive)
    // ---------------------------------------------------------
    
    // Step 1: Find all Objects that look like a "Team"
    const foundTeams: any[] = [];
    const findTeams = (node: any) => {
        if (!node || typeof node !== 'object') return;
        
        // Yahoo Teams always have a 'team_key' in their metadata
        // Sometimes the node IS the metadata, sometimes it WRAPS the metadata
        if (node.team_key) {
             foundTeams.push(node); // Found a team metadata object directly
        } else if (Array.isArray(node)) {
             // Check if this array contains a team metadata object
             const meta = node.find((x: any) => x && x.team_key);
             if (meta) foundTeams.push(node); // Push the whole array (metadata + roster)
        }
        
        // Recurse deeper
        Object.values(node).forEach(child => findTeams(child));
    };
    
    // Start hunting for teams from the root
    findTeams(data);

    // Step 2: Extract Players from each found Team
    foundTeams.forEach((teamNode: any) => {
        let teamKey = null;
        let rosterNode = null;

        // Extract Team Key
        if (Array.isArray(teamNode)) {
            const meta = teamNode.find((x: any) => x.team_key);
            teamKey = meta?.team_key;
            // The roster is usually a sibling in this same array
            rosterNode = teamNode.find((x: any) => x.roster);
        } else {
            teamKey = teamNode.team_key;
            // If we found the metadata object directly, the roster is likely not here
            // This case is rare in the recursion but possible
        }

        if (teamKey && rosterNode) {
            // Now we hunt for players INSIDE this roster node
            const findPlayers = (node: any) => {
                if (!node || typeof node !== 'object') return;
                
                // Found a player ID?
                if (node.player_id) {
                     // We found a player!
                     // But we need the name too. Often 'node' is just {player_id: "123"}, 
                     // and the name is in a sibling or parent. 
                     // Yahoo players are usually arrays: [{player_id: "123", name: {...}}, {selected_position: ...}]
                     // So we might be deep inside. 
                     
                     // Easier strategy: Look for the specific "Player Wrapper" array
                     return; 
                }
                
                // Yahoo Player Array Detection: look for array containing {player_key}
                if (Array.isArray(node)) {
                     const pMeta = node.find((x: any) => x.player_id);
                     if (pMeta) {
                         // This IS a player array
                         const pNameObj = node.find((x: any) => x.name);
                         rosteredPlayers.push({
                             league_key: league_key,
                             team_key: teamKey,
                             yahoo_id: pMeta.player_id,
                             player_name: pNameObj?.name?.full || "Unknown Player",
                             updated_at: new Date()
                         });
                         return; // Don't dig deeper into this player
                     }
                }

                Object.values(node).forEach(child => findPlayers(child));
            };
            
            findPlayers(rosterNode);
        }
    });
    // ---------------------------------------------------------

    console.log(`SYNC: Hunter-Seeker found ${rosteredPlayers.length} players.`);

    // 2. Write to Supabase
    if (rosteredPlayers.length > 0) {
        // Clear old
        await supabase.from('league_rosters').delete().eq('league_key', league_key);
        // Insert new
        const { error } = await supabase.from('league_rosters').insert(rosteredPlayers);
        if (error) throw new Error(error.message);
        
        return NextResponse.json({ success: true, count: rosteredPlayers.length });
    } else {
        return NextResponse.json({ error: "Parsing found 0 players. Yahoo format unknown." }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}