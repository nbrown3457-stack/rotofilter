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
    // We request both mRoster (players) and mTeam (owners/names) views
    const cookiesStr = `swid=${swid}; espn_s2=${espnS2};`;
    const espnUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/seasons/2025/segments/0/leagues/${leagueId}?view=mRoster&view=mTeam`;

    console.log("Fetching ESPN:", espnUrl);

    const res = await fetch(espnUrl, {
      headers: { Cookie: cookiesStr }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to connect to ESPN. Check League ID and Keys.' }, { status: 400 });
    }

    const data = await res.json();

    // 3. Process Data: FIND THE USER'S TEAM
    // Logic: Look for the team that matches the provided SWID.
    // If no SWID is provided (or no match found), we default to the first team.
    let myTeam = data.teams[0]; 
    
    if (swid) {
        // ESPN stores owners in 'owners' array or 'primaryOwner' field
        // We clean the swid just in case (remove { } if user added them manually)
        const cleanSwid = swid.replace(/[{}]/g, '');
        
        const foundTeam = data.teams.find((t: any) => 
            t.owners?.includes(cleanSwid) || 
            t.owners?.includes(`{${cleanSwid}}`) ||
            t.primaryOwner === cleanSwid
        );
        
        if (foundTeam) {
            console.log("Found matching team for SWID:", foundTeam.location, foundTeam.nickname);
            myTeam = foundTeam;
        } else {
            console.warn("SWID provided but no matching team found. Defaulting to Team 1.");
        }
    }

    // 4. Construct Robust Name
    // ESPN often has no 'name', just 'location' and 'nickname'
    const teamName = myTeam.name 
        ? myTeam.name 
        : (myTeam.location && myTeam.nickname) 
            ? `${myTeam.location} ${myTeam.nickname}`
            : `ESPN Team ${myTeam.id}`;

    const customTeamKey = `e.${leagueId}.${myTeam.id}`;

    // 5. Save to 'leagues' table
    // CRITICAL: We save the FULL 'data' object into 'league_data' so the frontend calculator works.
    const { error: leagueError } = await supabase.from('leagues').upsert({
        user_id: user.id,
        league_key: leagueId.toString(),
        team_key: customTeamKey,
        team_name: teamName, 
        provider: 'ESPN',
        auth_config: { swid, espn_s2: espnS2 },
        league_data: data // <--- CRITICAL: Saving Raw JSON for frontend analysis
    }, { onConflict: 'user_id, league_key' });

    if (leagueError) {
        console.error("Supabase Error (Leagues):", leagueError);
        throw leagueError;
    }

    // 6. OPTIONAL: Save Roster to 'league_rosters' (The Players)
    // This allows for other views/queries, even though the frontend mainly uses league_data now.
    await supabase.from('league_rosters').delete().eq('league_key', leagueId.toString());

    const allRosteredPlayers: any[] = [];
    
    if (data.teams) {
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
    }

    if (allRosteredPlayers.length > 0) {
        const { error: rosterError } = await supabase.from('league_rosters').insert(allRosteredPlayers);
        if (rosterError) console.warn("Roster Insert Warning (non-critical):", rosterError.message);
    }

    // 7. Return success AND the raw data for LocalStorage (Immediate Feedback)
    return NextResponse.json({ 
        success: true, 
        teamName: teamName,
        rawData: data // Send this back so Modal can save it to localStorage immediately
    });

  } catch (error: any) {
    console.error("ESPN Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}