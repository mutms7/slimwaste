import { profileSchema, type Profile } from "@/lib/schema";
import {
  ApiError,
  json,
  readJson,
  requireSameOrigin,
  run,
} from "@/lib/server/http";
import { dbError, requireUser } from "@/lib/server/supabase";
const empty: Profile = {
  household: "",
  cooking_access: "",
  grocery_cadence: "",
  budget_preference: "",
  dietary_restrictions: "",
  evaluation_consent: false,
};
export async function GET() {
  return run(async () => {
    const { client, user } = await requireUser();
    const { data, error } = await client
      .from("profiles")
      .select(
        "household,cooking_access,grocery_cadence,budget_preference,dietary_restrictions,evaluation_consent",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (error) dbError(error, "load_profile");
    return json({ profile: data || empty });
  });
}
export async function PUT(request: Request) {
  return run(async () => {
    requireSameOrigin(request);
    const parsed = profileSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new ApiError(
        400,
        "invalid_profile",
        "Please check the profile fields.",
      );
    const { client, user } = await requireUser();
    const { error } = await client.from("profiles").upsert({
      id: user.id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    });
    if (error) dbError(error, "save_profile");
    return json({ profile: parsed.data });
  });
}
