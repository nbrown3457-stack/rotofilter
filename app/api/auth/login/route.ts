import { NextResponse } from 'next/server';

export async function GET() {
  const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID;
  // This is the specific address we are testing
  const REDIRECT_URI = 'https://www.rotofilter.com/api/auth/callback';

  const url = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${YAHOO_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;

  // STOP! Don't redirect. Just show me the URL.
  return NextResponse.json({ 
    debug_mode: true,
    intended_url: url,
    redirect_uri_used: REDIRECT_URI 
  });
}