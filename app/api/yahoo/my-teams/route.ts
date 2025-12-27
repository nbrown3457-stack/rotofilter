import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('yahoo_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  try {
    const response = await fetch(
      'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=mlb/teams?format=json',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();

    // Map to store the "Newest" team found for each unique league
    const leagueMap: Record<string, any> = {};
    
    const findTeams = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      if (obj.team_key && obj.name && typeof obj.name === 'string') {
        const parts = obj.team_key.split('.');
        const seasonYear = parseInt(parts[0]);
        // The league unique identifier is usually the second and third parts: "l.12345"
        const leagueId = `${parts[1]}.${parts[2]}`; 
        const leagueKey = `${parts[0]}.${parts[1]}.${parts[2]}`;

        // If we haven't seen this league yet, OR this team is from a newer season than the one we stored
        if (!leagueMap[leagueId] || seasonYear > leagueMap[leagueId].seasonYear) {
          leagueMap[leagueId] = {
            team_key: obj.team_key,
            team_name: obj.name,
            league_key: leagueKey,
            seasonYear: seasonYear,
            // We can add the league name here if we find it in the recursion
          };
        }
      }

      const values = Array.isArray(obj) ? obj : Object.values(obj);
      for (const value of values) {
        findTeams(value);
      }
    };

    findTeams(data);

    // Convert our map back into a clean array for the dropdown
    const finalTeams = Object.values(leagueMap).sort((a, b) => b.seasonYear - a.seasonYear);

    return NextResponse.json({ 
      success: true, 
      count: finalTeams.length,
      teams: finalTeams 
    });

  } catch (error) {
    return NextResponse.json({ error: "Sync failed", details: String(error) }, { status: 500 });
  }
}