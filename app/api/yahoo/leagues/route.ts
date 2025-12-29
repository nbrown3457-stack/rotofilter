import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET() {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

  const cookieStore = await cookies();
  const accessToken = cookieStore.get('yahoo_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  try {
    // 1. Fetch all historical MLB games for the user
    const teamsResponse = await fetch(
      'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=mlb/teams?format=json', 
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const teamsData: any = await teamsResponse.json();

    const games = teamsData?.fantasy_content?.users?.[0]?.user?.[1]?.games;
    if (!games) return NextResponse.json({ error: "No MLB games found" });

    // 2. Sort games by season descending (2026, 2025, 2024...)
    const sortedGames = Object.values(games)
      .filter((g: any) => g && typeof g === 'object' && g.game)
      .sort((a: any, b: any) => parseInt(b.game[0].season) - parseInt(a.game[0].season));

    let teamKey: string | null = null;
    let finalRosterData: any = null;

    // 3. THE SMART LOOP: Find the newest season that isn't empty
    for (const gameObj of (sortedGames as any[])) {
        // Find a team key in this game
        const findKey = (obj: any): string | null => {
            if (!obj || typeof obj !== 'object') return null;
            if (obj.team_key) return obj.team_key;
            for (const val of Object.values(obj)) {
                const res = findKey(val);
                if (res) return res;
            }
            return null;
        };

        const currentKey = findKey(gameObj);
        
        if (currentKey) {
            // Check if this specific team has players (skips empty offseason rosters)
            const rosterRes = await fetch(
                `https://fantasysports.yahooapis.com/fantasy/v2/team/${currentKey}/roster?format=json`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const rosterJson = await rosterRes.json();
            
            // Check for player_id in the stringified JSON as a quick existence check
            if (JSON.stringify(rosterJson).includes('"player_id"')) {
                teamKey = currentKey;
                finalRosterData = rosterJson;
                break; // Found the active roster! Stop here.
            }
        }
    }

    if (!teamKey || !finalRosterData) {
        return NextResponse.json({ error: "No active roster with players found." });
    }

    // 4. Flatten the Player Data
    const players: any[] = [];
    const findPlayers = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.player) { players.push(obj.player); return; }
        for (const value of Object.values(obj)) { findPlayers(value); }
    };
    findPlayers(finalRosterData);

    const roster = [];
    const yahooIds: string[] = [];

    for (const playerMeta of players) {
        const metaArray = playerMeta[0];
        const idObj = metaArray.find((item: any) => item.player_id);
        const nameObj = metaArray.find((item: any) => item.name);
        
        if (idObj) {
            yahooIds.push(idObj.player_id);
            roster.push({
                yahoo_id: idObj.player_id,
                name: nameObj?.name?.full || "Unknown Player",
                mlb_id: null
            });
        }
    }

    // 5. Supabase Batch Lookup (The Rosetta Stone)
    const { data: mappings } = await supabase
        .from('player_mappings')
        .select('yahoo_id, mlb_id')
        .in('yahoo_id', yahooIds);

    const finalRoster = roster.map(player => ({
        ...player,
        mlb_id: mappings?.find(m => m.yahoo_id === player.yahoo_id)?.mlb_id || null
    }));

    return NextResponse.json({ 
        success: true, 
        season_found: teamKey.split('.')[0], // Debug info (e.g. 458 for 2025)
        team_key: teamKey, 
        roster: finalRoster 
    });

  } catch (error) {
    return NextResponse.json({ error: "Sync failed", details: String(error) }, { status: 500 });
  }
}