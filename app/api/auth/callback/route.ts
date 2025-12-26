import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const { YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET } = process.env;
  
  // This must match the login file exactly
  // Uses the variable we set in .env.local (localhost) or Vercel (rotofilter.com)
const REDIRECT_URI = 'https://www.rotofilter.com/api/auth/callback';

  if (!code) {
    return NextResponse.json({ error: "No code returned from Yahoo" }, { status: 400 });
  }

  try {
    // 1. Trade the "Code" for an "Access Token"
    const tokenResponse = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${YAHOO_CLIENT_ID}:${YAHOO_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        code: code,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
   // DEBUG: Show me exactly what URI we sent!
   return NextResponse.json({ 
     error: tokens.error_description, 
     debug_sent_uri: REDIRECT_URI, // <--- This is the spy
     debug_client_id: YAHOO_CLIENT_ID 
   }, { status: 400 });
}

    // 2. SUCCESS! We have the token.
    // Redirect the user back to your site's "League Sync" page.
    const response = NextResponse.redirect("https://www.rotofilter.com/league-sync?status=success");
    
    // 3. Save the token in a secure cookie so your app can use it
    response.cookies.set("yahoo_access_token", tokens.access_token, {
      httpOnly: true, // JavaScript can't steal it
      secure: true,   // HTTPS only
      path: "/",
      maxAge: 3600    // Lasts 1 hour
    });

    return response;

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}