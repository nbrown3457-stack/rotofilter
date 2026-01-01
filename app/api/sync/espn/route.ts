import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming request body
    const body = await request.json();
    const { leagueId, espnS2, swid } = body;

    // 2. Validate required fields
    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    // 3. Configuration
    // TODO: You might want to make this dynamic or an env variable in the future
    const currentSeason = 2026; 

    // 4. Construct the ESPN API URL
    // We request specific "views" to get just the data we need:
    // - mRoster: The actual players on each team
    // - mTeam: Team names, logos, and owner info
    // - mSettings: League name and size
    const baseUrl = `https://fantasy.espn.com/apis/v3/games/flb/seasons/${currentSeason}/segments/0/leagues/${leagueId}`;
    const params = new URLSearchParams({
      view: ['mRoster', 'mTeam', 'mSettings', 'mStandings']
    } as any);

    const espnUrl = `${baseUrl}?${params.toString()}`;

    // 5. Prepare Headers
    // ESPN blocks requests without a valid User-Agent
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    };

    // 6. Handle Private Leagues (Cookies)
    if (espnS2 && swid) {
      headers['Cookie'] = `espn_s2=${espnS2}; SWID=${swid};`;
    }

    // 7. Fetch from ESPN
    console.log(`[ESPN Sync] Fetching: ${espnUrl}`);
    const response = await fetch(espnUrl, { headers });

    // 8. Handle Errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ESPN Sync] Error ${response.status}:`, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorized. This league appears to be private. Please provide your espn_s2 and swid cookies.' }, 
          { status: 401 }
        );
      }
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'League not found. Check the League ID and Season.' }, 
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `ESPN API Error: ${response.statusText}` }, 
        { status: response.status }
      );
    }

    const data = await response.json();

    // 9. Return raw data (We will map this in the next step)
    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error: any) {
    console.error('[ESPN Sync] Internal Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}