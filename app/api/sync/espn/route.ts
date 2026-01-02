import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient(); 
  
  try {
    const { leagueId, espnS2, swid } = await req.json();
    
    // 1. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Fetch from ESPN (Verify keys work)
    const cookiesStr = `swid=${swid}; espn_s2=${espnS2};`;
    const espnUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/seasons/2025/segments/0/leagues/${leagueId}?view=mRoster&view=mTeam`;

    console.log("Fetching ESPN:", espnUrl); // Debug log

    const res = await fetch(espnUrl, {
      headers: { Cookie: cookiesStr }
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to connect to ESPN. Check League ID and Keys.' }, { status: 400 });
    }

    const data = await res.json();

    // 3. Process Data
    // We assume the first team is the user's for MVP, or we match SWID if possible.
    const myTeam = data.teams[0]; 
    
    // ROBUST NAME LOGIC:
    const teamName = myTeam.name 
        ? myTeam.name 
        : (myTeam.location && myTeam.nickname) 
            ? `${myTeam.location} ${myTeam.nickname}`
            : `ESPN Team ${myTeam.id}`;

    const customTeamKey = `e.${leagueId}.${myTeam.id}`;

    // 4. Save to 'leagues' table
    // CRITICAL: We save the FULL 'data' object into 'league_data' so the frontend calculator works.
    const { error: leagueError } = await supabase.from('leagues').upsert({
        user_id: user.id,
        league_key: leagueId.toString(),
        team_key: customTeamKey,
        team_name: teamName, // <--- Corrected Name
        provider: 'ESPN',
        auth_config: { swid, espn_s2: espnS2 },
        league_data: data // <--- CRITICAL: Saving Raw JSON for frontend analysis
    }, { onConflict: 'user_id, league_key' });

    if (leagueError) {
        console.error("Supabase Error:", leagueError);
        throw leagueError;
    }

    // 5. Return success AND the raw data for LocalStorage
    return NextResponse.json({ 
        success: true, 
        teamName: teamName,
        rawData: data // Send this back so Modal can save it
    });

  } catch (error: any) {
    console.error("ESPN Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}