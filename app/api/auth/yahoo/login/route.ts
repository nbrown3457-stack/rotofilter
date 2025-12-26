import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const client_id = process.env.YAHOO_CLIENT_ID;
  const redirect_uri = process.env.YAHOO_REDIRECT_URI;

  if (!client_id) {
    return NextResponse.json({ error: "Missing YAHOO_CLIENT_ID env variable" }, { status: 500 });
  }
  if (!redirect_uri) {
    return NextResponse.json({ error: "Missing YAHOO_REDIRECT_URI env variable" }, { status: 500 });
  }

  const queryParams = new URLSearchParams({
    client_id,
    redirect_uri,
    response_type: "code",
    scope: "fspt-r",
  });

  const yahooAuthUrl = `https://api.login.yahoo.com/oauth2/request_auth?${queryParams.toString()}`;

  // ✅ Debug mode: visit /api/auth/yahoo/login?debug=1 to see what you're sending
  const url = new URL(request.url);
  if (url.searchParams.get("debug") === "1") {
    return NextResponse.json({
      client_id_prefix: client_id.slice(0, 12) + "...",
      redirect_uri,
      yahooAuthUrl,
    });
  }

  return NextResponse.redirect(yahooAuthUrl);
}
