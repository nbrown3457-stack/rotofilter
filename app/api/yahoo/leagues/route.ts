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
    // 1. Fetch all baseball seasons
    const teamsResponse = await fetch(
      'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=mlb/teams?format=json', 
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const teamsData: any = await teamsResponse.json();

    // 2. Find the most recent active team
    let teamKey = null;

    try {
       const users = teamsData.fantasy_content.users[0];
       const games = users.games;
       
       // FIX 1: Force this to be an array of 'any' so the loop doesn't complain
       const gamesArray: any[] = Object.values(games)
          .filter((g: any) => typeof g === 'object' && g.teams) 
          .reverse(); 

       for (const gameObj of gamesArray) {
           // Double check it has teams
           if (gameObj.teams && Object.keys(gameObj.teams).length > 0) {
               // The teams object is also indexed (0, 1, count). We need the first real team.
               const firstTeamWrapper = Object.values(gameObj.teams)
                   .find((t: any) => t.team); 

               if (firstTeamWrapper) {
                   const teamMetadata = (firstTeamWrapper as any).team[0];
                   const keyObj = teamMetadata.find((item: any) => item.team_key);
                   
                   if (keyObj) {
                       teamKey = keyObj.team_key;
                       break; 
                   }
               }
           }
       }
    } catch (e) {
        return NextResponse.json({ error: "Error parsing Yahoo structure", debug: String(e) });
    }

    if (!teamKey) {
        return NextResponse.json({ 
            error: "No MLB teams found.", 
            details: "We searched your history but found no valid team keys." 
        });
    }

    // 3. Fetch Roster
    const rosterResponse = await fetch(
        `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster?format=json`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const rosterData: any = await rosterResponse.json();
    
    // Safety check: ensure roster exists
    const teamContent = rosterData.fantasy_content?.team?.[1];
    if (!teamContent || !teamContent.roster) {
        return NextResponse.json({ error: "Roster not found in Yahoo response" });
    }
    
    const yahooPlayers = teamContent.roster[0].players;

    // 4. Collect Yahoo IDs
    const roster = [];
    const yahooIds: string[] = [];

    // FIX 2: Force this to be an array of 'any'
    const playersArray: any[] = Object.values(yahooPlayers)
        .filter((p: any) => typeof p === 'object');

    for (const pObj of playersArray) {
        if (pObj.player) {
             const meta = pObj.player[0];
             // Helper to find deep properties
             const idObj = meta.find((item: any) => item.player_id);
             const nameObj = meta.find((item: any) => item.name);
             const imgObj = meta.find((item: any) => item.headshot);
             const teamObj = meta.find((item: any) => item.editorial_team_abbr);
             const posObj = meta.find((item: any) => item.display_position);

             if (idObj) {
                 yahooIds.push(idObj.player_id);
                 roster.push({
                     yahoo_id: idObj.player_id,
                     name: nameObj?.name?.full || "Unknown",
                     position: posObj?.display_position || "",
                     team: teamObj?.editorial_team_abbr || "",
                     image: imgObj?.headshot?.url || "",
                     mlb_id: null
                 });
             }
        }
    }

    // 5. Supabase Lookup
    const { data: mappings } = await supabase
        .from('player_mappings')
        .select('yahoo_id, mlb_id')
        .in('yahoo_id', yahooIds);

    // 6. Merge
    const finalRoster = roster.map(player => {
        const match = mappings?.find(m => m.yahoo_id === player.yahoo_id);
        return {
            ...player,
            mlb_id: match ? match.mlb_id : null 
        };
    });

    return NextResponse.json({ 
        success: true,
        team_key: teamKey,
        roster: finalRoster 
    });

  } catch (error) {
    return NextResponse.json({ error: "Sync failed", details: String(error) }, { status: 500 });
  }
}