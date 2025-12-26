import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('yahoo_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  try {
    // 1. We KNOW your 2025 Team Key is '458.l.79174.t.10' from the previous log.
    // Let's ask for that specific roster.
    const teamKey = '458.l.79174.t.10'; 

    const rosterResponse = await fetch(
        `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster?format=json`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    const rosterData: any = await rosterResponse.json();

    // 2. Return the Player Data
    return NextResponse.json({ 
        success: true,
        team: "SODERPOPINSKY",
        roster: rosterData
    });

  } catch (error) {
    return NextResponse.json({ error: "Fetch failed", details: String(error) }, { status: 500 });
  }
}