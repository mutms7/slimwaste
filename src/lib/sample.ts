import type { CoachReply, Scan, ScanItem } from "./schema";

export const sampleItems: ScanItem[] = [
  {
    id: "spinach",
    name: "Spinach",
    category: "produce",
    edible: "edible",
    quantity_min: 80,
    quantity_max: 140,
    unit: "g",
    confidence: "medium",
    uncertainty:
      "Leaves overlap in the photo, so the amount is a rough visual range.",
    reason: "spoiled",
    note: "",
  },
  {
    id: "bread",
    name: "Bread",
    category: "bread-and-grains",
    edible: "edible",
    quantity_min: 2,
    quantity_max: 3,
    unit: "slices",
    confidence: "high",
    uncertainty: "The edge of one slice is partly covered.",
    reason: "leftover",
    note: "",
  },
  {
    id: "pasta",
    name: "Pasta",
    category: "prepared-food",
    edible: "edible",
    quantity_min: 0.5,
    quantity_max: 1,
    unit: "bowls",
    confidence: "low",
    uncertainty: "The bowl size is unknown.",
    reason: "over-portioned",
    note: "",
  },
];

export const sampleScan: Scan = {
  id: "sample",
  created_at: "2026-09-28T12:00:00.000Z",
  status: "review",
  items: sampleItems,
  reference: "",
  reference_question:
    "Was this a standard dinner plate or a smaller side plate?",
  image_url: null,
  model_version: "illustration only",
};

export function sampleAdvice(items: ScanItem[]): CoachReply {
  if (!items.length)
    return {
      breakdown:
        "You removed every item from this sample. That’s a useful correction when the first pass got the photo wrong.",
      actions: [
        {
          title: "Start with a clear photo",
          detail:
            "On a real scan, another angle or better light may give you a more useful first list.",
        },
      ],
    };
  const names = items.slice(0, 3).map((item) => item.name || "an unnamed item");
  const list = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(names);
  return {
    breakdown: `Your edited sample lists ${list}. The amounts are visual ranges, so treat them as a conversation starter rather than a measurement.`,
    actions: [
      {
        title: "Look at the reason",
        detail:
          "If an item keeps showing up as spoiled or leftover, check what changed between buying it and using it.",
      },
      {
        title: "Fit the next shop to your space",
        detail:
          "A smaller amount or a different storage plan might help, especially in a shared fridge.",
      },
    ],
  };
}

export const sampleStoreKey = "slimwaste-sample-correction";
