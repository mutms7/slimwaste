import { z } from "zod";

export const units = ["g", "pieces", "bowls", "cups", "slices"] as const;
export const reasons = [
  "spoiled",
  "leftover",
  "over-portioned",
  "disliked",
  "unavoidable",
  "unsure",
] as const;
export const itemSchema = z
  .object({
    id: z.string().max(80),
    name: z.string().trim().min(1).max(80),
    category: z.enum([
      "produce",
      "bread-and-grains",
      "protein",
      "dairy",
      "prepared-food",
      "other",
    ]),
    edible: z.enum(["edible", "inedible", "uncertain"]),
    quantity_min: z.number().finite().min(0).max(10000),
    quantity_max: z.number().finite().positive().max(10000),
    unit: z.enum(units),
    confidence: z.enum(["low", "medium", "high"]),
    uncertainty: z.string().min(1).max(300),
    reason: z.enum(reasons),
    note: z.string().max(500),
  })
  .strict()
  .refine((x) => x.quantity_min < x.quantity_max, {
    message: "Keep a range with a maximum above the minimum.",
    path: ["quantity_max"],
  });
export const detectionSchema = z
  .object({
    items: z.array(itemSchema).max(20),
    reference_question: z.string().max(300),
  })
  .strict();
export const correctionSchema = z
  .object({
    items: z.array(itemSchema).max(20),
    reference: z.string().max(300),
  })
  .strict();
export const coachSchema = z
  .object({
    breakdown: z.string().min(1).max(1600),
    actions: z
      .array(
        z
          .object({
            title: z.string().min(1).max(100),
            detail: z.string().min(1).max(500),
          })
          .strict(),
      )
      .min(1)
      .max(3),
  })
  .strict();
export const profileSchema = z
  .object({
    household: z.string().max(200),
    cooking_access: z.string().max(200),
    grocery_cadence: z.string().max(200),
    budget_preference: z.string().max(200),
    dietary_restrictions: z.string().max(500),
    evaluation_consent: z.boolean(),
  })
  .strict();
export type ScanItem = z.infer<typeof itemSchema>;
export type Detection = z.infer<typeof detectionSchema>;
export type CoachReply = z.infer<typeof coachSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Scan = {
  id: string;
  created_at: string;
  status: "review" | "corrected" | "deleting";
  items: ScanItem[];
  reference: string;
  reference_question: string;
  image_url: string | null;
  model_version: string;
};
export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
