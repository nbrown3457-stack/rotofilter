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

    if (!accessToken || !league_key) return NextResponse.json({ error: "Missing tokens" }, { status: 400 });

    // Fetch from Yahoo
    const response = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/league/${league_key}/teams/roster?format=json`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();

    const rosteredPlayers: any[] = [];
    const foundTeams: any[] = [];

    // RECURSIVE PARSER (The Hunter-Seeker)
    const findTeams = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (node.team_key) foundTeams.push(node);
        else if (Array.isArray(node)) {
             const meta = node.find((x: any) => x && x.team_key);
             if (meta) foundTeams.push(node);
        }
        Object.values(node).forEach(child => findTeams(child));
    };
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
        // CLEAN SLATE INSERT
        await supabase.from('league_rosters').delete().eq('league_key', league_key);
        const { error } = await supabase.from('league_rosters').insert(rosteredPlayers);
        if (error) throw new Error(error.message);
        
        return NextResponse.json({ success: true, count: rosteredPlayers.length });
    } else {
        return NextResponse.json({ error: "No players found in Yahoo data." }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}