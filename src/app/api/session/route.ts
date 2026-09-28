import { json, run } from "@/lib/server/http";
import { isConfigured, userClient } from "@/lib/server/supabase";
export async function GET() {
  return run(async () => {
    if (!isConfigured()) return json({ user: null, configured: false });
    const client = await userClient();
    const { data } = await client.auth.getUser();
    return json({
      user: data.user
        ? { id: data.user.id, email: data.user.email || "" }
        : null,
      configured: true,
    });
  });
}
