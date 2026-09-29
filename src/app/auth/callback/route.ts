import { NextResponse } from "next/server";
import { userClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code && code.length <= 2048) {
    try {
      const client = await userClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error)
        return NextResponse.redirect(new URL("/scan", url), {
          status: 303,
          headers: { "Cache-Control": "no-store" },
        });
    } catch {
      // The sign-in page explains how to recover without exposing auth details.
    }
  }
  return NextResponse.redirect(new URL("/sign-in?link_error=1", url), {
    status: 303,
    headers: { "Cache-Control": "no-store" },
  });
}
