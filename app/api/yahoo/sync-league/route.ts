import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { league_key } = await req.json();
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('yahoo_access_token')?.value;

    // --- DEBUG STEP 1: Log that we started ---
    // We write a fake row just to prove we can talk to the DB
    await supabase.from('league_rosters').insert({
        league_key: league_key || 'UNKNOWN',
        yahoo_id: 'DEBUG-START',
        player_name: 'Sync Started - Checking Yahoo...',
        team_key: 'DEBUG'
    });

    if (!accessToken || !league_key) {
      return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
    }

    // 2. Fetch from Yahoo
    const response = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/league/${league_key}/teams/roster?format=json`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // --- DEBUG STEP 2: Check Yahoo Status ---
    if (!response.ok) {
        // If Yahoo failed, WRITE THE ERROR to the database so we can see it
        await supabase.from('league_rosters').insert({
            league_key: league_key,
            yahoo_id: 'DEBUG-ERROR',
            player_name: `Yahoo Failed: ${response.status} ${response.statusText}`,
            team_key: 'DEBUG'
        });
        return NextResponse.json({ error: "Yahoo API Failed" }, { status: response.status });
    }

    const data = await response.json();
    
    // --- DEBUG STEP 3: Log what Yahoo sent us ---
    // We grab the first 50 characters of the response to see if it's real data or an error message
    const snippet = JSON.stringify(data).substring(0, 50);
    await supabase.from('league_rosters').insert({
        league_key: league_key,
        yahoo_id: 'DEBUG-DATA',
        player_name: `Yahoo Data: ${snippet}...`,
        team_key: 'DEBUG'
    });

    const rosteredPlayers: any[] = [];

    // THE HUNTER-SEEKER PARSER
    const findTeams = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (node.team_key) foundTeams.push(node);
        else if (Array.isArray(node)) {
             const meta = node.find((x: any) => x && x.team_key);
             if (meta) foundTeams.push(node);
        }
        Object.values(node).forEach(child => findTeams(child));
    };
    
    const foundTeams: any[] = [];
    findTeams(data);

    foundTeams.forEach((teamNode: any) => {
        let teamKey = null;
        let rosterNode = null;

        if (Array.isArray(teamNode)) {
            const meta = teamNode.find((x: any) => x.team_key);
            teamKey = meta?.team_key;
            rosterNode = teamNode.find((x: any) => x.roster);
        } else {
            teamKey = teamNode.team_key;
        }

        if (teamKey && rosterNode) {
            const findPlayers = (node: any) => {
                if (!node || typeof node !== 'object') return;
                
                if (Array.isArray(node)) {
                     const pMeta = node.find((x: any) => x.player_id);
                     if (pMeta) {
                         const pNameObj = node.find((x: any) => x.name);
                         rosteredPlayers.push({
                             league_key: league_key,
                             team_key: teamKey,
                             yahoo_id: pMeta.player_id,
                             player_name: pNameObj?.name?.full || "Unknown",
                             updated_at: new Date()
                         });
                         return; 
                     }
                }
                Object.values(node).forEach(child => findPlayers(child));
            };
            findPlayers(rosterNode);
        }
    });

    if (rosteredPlayers.length > 0) {
        // Delete DEBUG rows before saving real data
        await supabase.from('league_rosters').delete().eq('team_key', 'DEBUG');
        await supabase.from('league_rosters').delete().eq('league_key', league_key);
        
        await supabase.from('league_rosters').insert(rosteredPlayers);
        return NextResponse.json({ success: true, count: rosteredPlayers.length });
    } else {
        return NextResponse.json({ error: "Found 0 players" }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}