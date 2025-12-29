import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);
  try {
    console.log("Starting ID Map update...");

    // 1. USE THIS GOOGLE SHEETS EXPORT LINK (It forces CSV format)
    const SHEET_ID = "1JgczhD5VDQ1EiXqVG-8FjDNXAkUxWXADBt85HOOAikI";
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&id=${SHEET_ID}`);
    
    if (!response.ok) {
        throw new Error(`Fetch Failed: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = csvText.split('\n');
    
    // Clean headers
    const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, '').toUpperCase());
    
    // 2. Find Columns (SFBB uses "IDYAHOO" and "MLBID")
    // We add checks for common variations just in case
    const yahooIndex = headers.indexOf('IDYAHOO');
    const mlbIndex = headers.indexOf('MLBID') !== -1 ? headers.indexOf('MLBID') : headers.indexOf('IDMLB');
    const nameIndex = headers.indexOf('PLAYERNAME');

    if (yahooIndex === -1 || mlbIndex === -1) {
       return NextResponse.json({ error: "Columns not found", headers });
    }

    const upsertData = [];

    // 3. Parse Data
    for (let i = 1; i < rows.length; i++) {
      // Handle commas inside quotes (e.g. "Jr., Acuna") - Quick hack fix
      // For a perfect parser we'd use a library, but this usually works for IDs
      const row = rows[i].split(','); 
      
      if (row.length < headers.length) continue;

      const yahooId = row[yahooIndex]?.replace(/"/g, '').trim();
      const mlbId = row[mlbIndex]?.replace(/"/g, '').trim();
      // Remove quotes from name
      const name = row[nameIndex]?.replace(/"/g, '').trim();

      if (yahooId && mlbId && yahooId !== '') {
        upsertData.push({
          yahoo_id: yahooId,
          mlb_id: mlbId,
          full_name: name,
          last_updated: new Date()
        });
      }
    }

    // 4. Batch Upload (Chunks of 1000)
    const chunkSize = 1000;
    for (let i = 0; i < upsertData.length; i += chunkSize) {
        const chunk = upsertData.slice(i, i + chunkSize);
        const { error } = await supabase
            .from('player_mappings')
            .upsert(chunk, { onConflict: 'yahoo_id' });
            
        if (error) throw error;
    }

    return NextResponse.json({ 
      success: true, 
      count: upsertData.length,
      message: "Map updated successfully" 
    });

  } catch (error) {
    return NextResponse.json({ error: "Failed to update map", details: String(error) }, { status: 500 });
  }
}