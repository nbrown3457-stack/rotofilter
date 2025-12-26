import { NextResponse } from "next/server";

export async function GET() {
  const { YAHOO_CLIENT_ID } = process.env;
  
  // This must match EXACTLY what is in your Yahoo Developer Portal
  // Uses the variable we set in .env.local (localhost) or Vercel (rotofilter.com)
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`; 

  // "fspt-r" gives you Read-Only access to their fantasy leagues
  const scope = "fspt-r"; 

  const queryParams = new URLSearchParams({
    client_id: YAHOO_CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: scope,
  });

  // Redirect the user to Yahoo's login screen
  return NextResponse.redirect(`https://api.login.yahoo.com/oauth2/request_auth?${queryParams}`);
}