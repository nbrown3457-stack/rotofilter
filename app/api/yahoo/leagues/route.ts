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

    // 1. RECURSIVE SEARCH: Find the first team_key in the entire JSON
    let teamKey: string | null = null;
    
    const findTeamKey = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj.team_key) return obj.team_key;
        
        for (const value of Object.values(obj)) {
            const result = findTeamKey(value);
            if (result) return result;
        }
        return null;
    };

    teamKey = findTeamKey(teamsData);

    if (!teamKey) {
        return NextResponse.json({ error: "No team key found in Yahoo data", debug: teamsData });
    }

    // 2. Fetch the Roster
    const rosterResponse = await fetch(
        `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster?format=json`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const rosterData: any = await rosterResponse.json();
    
    // 3. Flatten the Player Data
    const players: any[] = [];
    const findPlayers = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.player) {
            players.push(obj.player);
            return;
        }
        for (const value of Object.values(obj)) {
            findPlayers(value);
        }
    };

    findPlayers(rosterData);

    if (players.length === 0) {
        return NextResponse.json({ error: "No players found on roster", debug: rosterData });
    }

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

    // 4. Batch lookup in your Supabase Rosetta Stone
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
        team_found: teamKey, 
        roster: finalRoster 
    });

  } catch (error) {
    return NextResponse.json({ error: "Sync failed", details: String(error) }, { status: 500 });
  }
}