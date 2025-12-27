import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('yahoo_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  try {
    // 1. Fetch ALL MLB teams for the logged-in user
    const response = await fetch(
      'https://fantasysports.yahooapis.com/fantasy/v2/users;use_login=1/games;game_codes=mlb/teams?format=json',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();

    // 2. The "Cleaner" Logic: Recursively find all team objects in the messy Yahoo JSON
    const myTeams: any[] = [];
    
    const findTeams = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      
      // If we found a team object, extract the key data
      if (obj.team_key && obj.name) {
        // A team_key looks like "458.l.12345.t.1"
        // The league_key is the first two parts: "458.l.12345"
        const parts = obj.team_key.split('.');
        const leagueKey = `${parts[0]}.${parts[1]}.${parts[2]}`;
        
        myTeams.push({
          team_key: obj.team_key,
          team_name: obj.name,
          league_key: leagueKey,
          // Yahoo often puts league name in a separate part of the JSON, 
          // but we can at least identify the team name for the dropdown.
        });
        return;
      }
      
      // Keep digging deeper
      for (const value of Object.values(obj)) {
        findTeams(value);
      }
    };

    findTeams(data);

    // 3. Return the clean list for your dropdown
    return NextResponse.json({ 
      success: true, 
      teams: myTeams 
    });

  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to fetch teams", 
      details: String(error) 
    }, { status: 500 });
  }
}