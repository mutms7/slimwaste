import { json, run } from "@/lib/server/http";
import { isConfigured, userClient } from "@/lib/server/supabase";
import { isFreeTier } from "@/lib/server/ai";
export async function GET() {
  return run(async () => {
    const aiDataUse = isFreeTier() ? "gemini-free-tier" : "no-training";
    if (!isConfigured())
      return json({ user: null, configured: false, aiDataUse });
    const client = await userClient();
    const { data } = await client.auth.getUser();
    return json({
      user: data.user
        ? { id: data.user.id, email: data.user.email || "" }
        : null,
      configured: true,
      aiDataUse,
    });
  });
}
