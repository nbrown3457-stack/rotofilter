import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('yahoo_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  try {
    const teamsResponse = await fetch(
      'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=mlb/teams?format=json', 
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const teamsData: any = await teamsResponse.json();

    let teamKey: string | null = null;
    
    // Safety check for the root path
    const games = teamsData?.fantasy_content?.users?.[0]?.user?.[1]?.games;
    if (!games) {
      return NextResponse.json({ error: "No MLB games found", raw: teamsData });
    }

    // Convert games object to a safe array and look for a team key
    const gamesArray = Object.values(games).filter((g: any) => g && typeof g === 'object' && g.game);
    
    for (const gameObj of (gamesArray as any[])) {
        const leagues = gameObj.leagues;
        if (!leagues) continue;

        const leaguesArray = Object.values(leagues).filter((l: any) => l && typeof l === 'object');
        for (const leagueObj of (leaguesArray as any[])) {
            if (!leagueObj.teams) continue;
            
            const teamsArray = Object.values(leagueObj.teams).filter((t: any) => t && typeof t === 'object' && t.team);
            if (teamsArray.length > 0) {
                const teamData = (teamsArray[0] as any).team[0];
                const keyEntry = teamData.find((item: any) => item.team_key);
                if (keyEntry) {
                    teamKey = keyEntry.team_key;
                    break;
                }
            }
        }
        if (teamKey) break;
    }

    if (!teamKey) return NextResponse.json({ error: "Active team not found" });

    // Fetch the actual Roster
    const rosterResponse = await fetch(
        `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster?format=json`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const rosterData: any = await rosterResponse.json();
    
    const players = rosterData.fantasy_content?.team?.[1]?.roster?.[0]?.players;
    if (!players) return NextResponse.json({ error: "Roster unavailable" });

    const roster = [];
    const yahooIds: string[] = [];
    const playersArray = Object.values(players).filter((p: any) => p && typeof p === 'object' && p.player);

    for (const pObj of (playersArray as any[])) {
        const meta = pObj.player[0];
        // Scan the metadata array for specific fields
        const idObj = meta.find((item: any) => item.player_id);
        const nameObj = meta.find((item: any) => item.name);
        
        if (idObj) {
            yahooIds.push(idObj.player_id);
            roster.push({
                yahoo_id: idObj.player_id,
                name: nameObj?.name?.full || "Unknown Player",
                mlb_id: null
            });
        }
    }

    // Match Yahoo IDs to MLB IDs using your Supabase Rosetta Stone
    const { data: mappings } = await supabase
        .from('player_mappings')
        .select('yahoo_id, mlb_id')
        .in('yahoo_id', yahooIds);

    const finalRoster = roster.map(player => ({
        ...player,
        mlb_id: mappings?.find(m => m.yahoo_id === player.yahoo_id)?.mlb_id || null
    }));

    return NextResponse.json({ success: true, team_key: teamKey, roster: finalRoster });

  } catch (error) {
    return NextResponse.json({ error: "Sync failed", details: String(error) }, { status: 500 });
  }
}