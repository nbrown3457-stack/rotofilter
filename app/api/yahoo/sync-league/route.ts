import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase outside the handler
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req: Request) {
  console.log("CHECKPOINT 1: Route Handler Started");

  try {
    // 1. CHECK ENV VARS
    if (!supabaseUrl || !supabaseKey) {
        console.error("CRITICAL: Supabase Keys Missing on Server");
        throw new Error("Server Misconfiguration: Missing Supabase Keys");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("CHECKPOINT 2: Supabase Client Initialized");

    // 2. PARSE REQUEST
    let body;
    try {
        body = await req.json();
    } catch (e) {
        console.error("JSON Parse Failed");
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { league_key } = body;
    console.log(`CHECKPOINT 3: Request for League Key: ${league_key}`);

    // 3. CHECK TOKENS
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('yahoo_access_token')?.value;

    if (!accessToken) {
        console.error("CHECKPOINT FAILURE: No Access Token");
        return NextResponse.json({ error: "No Token" }, { status: 401 });
    }
    console.log("CHECKPOINT 4: Access Token Found");

    // 4. FETCH YAHOO
    console.log("CHECKPOINT 5: Fetching Yahoo API...");
    const response = await fetch(
      `https://fantasysports.yahooapis.com/fantasy/v2/league/${league_key}/teams/roster?format=json`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log(`CHECKPOINT 6: Yahoo Response Status: ${response.status}`);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`CHECKPOINT FAILURE: Yahoo API Error Body: ${errorText.substring(0, 100)}`);
        return NextResponse.json({ error: `Yahoo API Error: ${response.status}` }, { status: response.status });
    }

    // 5. PARSE JSON
    const data = await response.json();
    console.log("CHECKPOINT 7: Yahoo JSON Parsed");

    // 6. HUNTER SEEKER
    const rosteredPlayers: any[] = [];
    const foundTeams: any[] = [];

    const findTeams = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (node.team_key) foundTeams.push(node);
        else if (Array.isArray(node)) {
             const meta = node.find((x: any) => x && x.team_key);
             if (meta) foundTeams.push(node);
        }
        Object.values(node).forEach(child => findTeams(child));
    };
    findTeams(data);
    
    console.log(`CHECKPOINT 8: Found ${foundTeams.length} potential teams`);

    foundTeams.forEach((teamNode: any) => {
        let teamKey = null;
        let rosterNode = null;

        if (Array.isArray(teamNode)) {
            const meta = teamNode.find((x: any) => x.team_key);
            teamKey = meta?.team_key;
            rosterNode = teamNode.find((x: any) => x.roster);
        } else {
            teamKey = teamNode.team_key;
        }

        if (teamKey && rosterNode) {
            const findPlayers = (node: any) => {
                if (!node || typeof node !== 'object') return;
                if (Array.isArray(node)) {
                     const pMeta = node.find((x: any) => x.player_id);
                     if (pMeta) {
                         const pNameObj = node.find((x: any) => x.name);
                         rosteredPlayers.push({
                             league_key: league_key,
                             team_key: teamKey,
                             yahoo_id: pMeta.player_id,
                             player_name: pNameObj?.name?.full || "Unknown",
                             updated_at: new Date()
                         });
                         return; 
                     }
                }
                Object.values(node).forEach(child => findPlayers(child));
            };
            findPlayers(rosterNode);
        }
    });

    console.log(`CHECKPOINT 9: Extracted ${rosteredPlayers.length} players`);

    if (rosteredPlayers.length > 0) {
        // 7. DB WRITE
        console.log("CHECKPOINT 10: Starting DB Write...");
        
        const { error: deleteError } = await supabase.from('league_rosters').delete().eq('league_key', league_key);
        if (deleteError) console.error("DB Delete Warning:", deleteError);
        
        const { error: insertError } = await supabase.from('league_rosters').insert(rosteredPlayers);
        
        if (insertError) {
             console.error("CHECKPOINT FAILURE: DB Insert Error", insertError);
             return NextResponse.json({ error: `DB Error: ${insertError.message}` }, { status: 500 });
        }
        
        console.log("CHECKPOINT 11: SUCCESS - Write Complete");
        return NextResponse.json({ success: true, count: rosteredPlayers.length });
    } else {
        console.warn("CHECKPOINT WARNING: 0 Players Found");
        return NextResponse.json({ error: "No players found in Yahoo data." }, { status: 500 });
    }

  } catch (error: any) {
    console.error("CHECKPOINT CRITICAL CRASH:", error);
    // Return the ACTUAL error message to the frontend so you can see it in the Network Tab
    return NextResponse.json({ 
        error: "Server Crash", 
        details: error.message, 
        stack: error.stack 
    }, { status: 500 });
  }
}