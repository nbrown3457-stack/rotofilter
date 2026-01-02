import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient(); // Use server client (cookies auto-handled)
  
  try {
    const { leagueId, espnS2, swid } = await req.json();
    
    // 1. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Fetch from ESPN (Verify keys work)
    const cookiesStr = `swid=${swid}; espn_s2=${espnS2};`;
    const espnUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/seasons/2025/segments/0/leagues/${leagueId}?view=mRoster&view=mTeam`;

    const res = await fetch(espnUrl, {
      headers: { Cookie: cookiesStr }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to connect to ESPN. Check League ID and Keys.' }, { status: 400 });
    }

    const data = await res.json();

    // 3. Process Data
    // Find "My Team" (Logic: For now, we take the first team or look for user match. 
    // Since we don't know which is yours, we default to the first one or allow passing it in params.
    // For MVP: We assume the user is the first team or just save the league.)
    
    // Better MVP: Save the league, and just assume Team ID 1 is "My Team" for now.
    // Real implementation: We should filter `data.teams` to find the one owned by `swid` if possible, 
    // but ESPN API doesn't always make that clear.
    
    const myTeam = data.teams[0]; // TODO: Add logic to pick correct team
    const customTeamKey = `e.${leagueId}.${myTeam.id}`;

    // 4. Save to 'leagues' table (The Settings)
    const { error: leagueError } = await supabase.from('leagues').upsert({
        user_id: user.id,
        league_key: leagueId.toString(),
        team_key: customTeamKey,
        team_name: `${myTeam.location} ${myTeam.nickname} (ESPN)`,
        provider: 'ESPN',
        auth_config: { swid, espn_s2: espnS2 }
    }, { onConflict: 'user_id, league_key' });

    if (leagueError) throw leagueError;

    // 5. Save Roster to 'league_rosters' (The Players)
    // We clear old roster first
    await supabase.from('league_rosters').delete().eq('league_key', leagueId.toString());

    const allRosteredPlayers: any[] = [];
    
    data.teams.forEach((team: any) => {
        const roster = team.roster?.entries || [];
        roster.forEach((entry: any) => {
            allRosteredPlayers.push({
                league_key: leagueId.toString(),
                team_key: `e.${leagueId}.${team.id}`,
                yahoo_id: null, // It's ESPN
                espn_id: entry.playerId.toString(),
                player_name: entry.playerPoolEntry.player.fullName,
                provider: 'ESPN',
                updated_at: new Date()
            });
        });
    });

    if (allRosteredPlayers.length > 0) {
        const { error: rosterError } = await supabase.from('league_rosters').insert(allRosteredPlayers);
        if (rosterError) throw rosterError;
    }

    return NextResponse.json({ success: true, teamName: myTeam.nickname });

  } catch (error: any) {
    console.error("ESPN Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}