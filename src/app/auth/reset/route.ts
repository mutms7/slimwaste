import { NextResponse } from "next/server";
import { userClient } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const client = await userClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL("/reset-password", url), {
        status: 303,
      });
  }
  return NextResponse.redirect(new URL("/forgot-password?reset_error=1", url), {
    status: 303,
  });
}
