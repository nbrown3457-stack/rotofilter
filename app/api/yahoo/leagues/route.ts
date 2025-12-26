import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Initialize Supabase (Read-Only access is fine here)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('yahoo_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  try {
    // 1. Get User's Teams (Historical Search to find 2025/2026)
    const teamsResponse = await fetch(
      'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=mlb/teams?format=json', 
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const teamsData: any = await teamsResponse.json();

    // 2. Find the most recent active team
    let teamKey = null;
    let leagueName = "";
    try {
       const games = teamsData.fantasy_content.users[0].games;
       // Loop to find the first valid team
       for (const key in games) {
           if (games[key].leagues && games[key].leagues[0].teams) {
               teamKey = games[key].leagues[0].teams[0].team_key;
               leagueName = games[key].leagues[0].name;
               break; 
           }
       }
    } catch (e) {
        return NextResponse.json({ error: "No MLB teams found." });
    }

    if (!teamKey) return NextResponse.json({ error: "No MLB teams found." });

    // 3. Get the Roster for that Team
    const rosterResponse = await fetch(
        `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster?format=json`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const rosterData: any = await rosterResponse.json();
    const yahooPlayers = rosterData.fantasy_content.team[1].roster[0].players;

    // 4. Prepare the List of Yahoo IDs
    const roster = [];
    const yahooIds: string[] = [];

    for (const key in yahooPlayers) {
        const p = yahooPlayers[key].player[0];
        if (p.player_id) {
            yahooIds.push(p.player_id);
            roster.push({
                yahoo_id: p.player_id,
                name: p.name.full,
                position: p.display_position,
                team: p.editorial_team_abbr,
                image: p.headshot?.url,
                mlb_id: null // Placeholder
            });
        }
    }

    // 5. THE MAGIC: Batch lookup in Supabase "Rosetta Stone"
    const { data: mappings } = await supabase
        .from('player_mappings')
        .select('yahoo_id, mlb_id')
        .in('yahoo_id', yahooIds);

    // 6. Stitch it together
    const finalRoster = roster.map(player => {
        const match = mappings?.find(m => m.yahoo_id === player.yahoo_id);
        return {
            ...player,
            mlb_id: match ? match.mlb_id : null // Now we have the MLB ID!
        };
    });

    return NextResponse.json({ 
        league_name: leagueName,
        team_key: teamKey,
        roster: finalRoster 
    });

  } catch (error) {
    return NextResponse.json({ error: "Sync failed", details: String(error) }, { status: 500 });
  }
}