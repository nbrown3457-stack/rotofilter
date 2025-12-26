import { NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: `Yahoo Error: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  // 1. Authenticate the User
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "User must be logged in to sync Yahoo" }, { status: 401 });
  }

  // 2. Exchange Code for Token
  const clientId = process.env.YAHOO_CLIENT_ID;
  const clientSecret = process.env.YAHOO_CLIENT_SECRET;
  const redirectUri = process.env.YAHOO_REDIRECT_URI;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId) {
    return NextResponse.json({ error: "Missing YAHOO_CLIENT_ID env variable" }, { status: 500 });
  }

  if (!clientSecret) {
    return NextResponse.json({ error: "Missing YAHOO_CLIENT_SECRET env variable" }, { status: 500 });
  }

  if (!redirectUri) {
    return NextResponse.json({ error: "Missing YAHOO_REDIRECT_URI env variable" }, { status: 500 });
  }

  if (!appUrl) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_APP_URL env variable" }, { status: 500 });
  }

  // Yahoo requires the credentials to be base64 encoded in the header
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const tokenResponse = await fetch("https://api.login.yahoo.com/oauth2/get_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        redirect_uri: redirectUri, // ✅ must match /login + Yahoo console exactly
        code,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      throw new Error(tokens.error_description || "Failed to fetch tokens");
    }

    // 3. Save to Supabase (Upsert)
    const { error: dbError } = await supabase.from("yahoo_tokens").upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: Math.floor(Date.now() / 1000) + tokens.expires_in,
      updated_at: new Date().toISOString(),
    });

    if (dbError) throw dbError;

    // 4. Success! Redirect back to your app
    return NextResponse.redirect(`${appUrl}/?sync=success`);
  } catch (err: any) {
    console.error("Yahoo Sync Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
