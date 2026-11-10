/**
 * The 20 muscle regions of the body model and the muscle group each rolls up
 * to. The slugs match the mesh names in /models/body/body.glb
 * (`muscle_<slug>_<L|R>`) and the `muscle_regions` table.
 */
export const MUSCLE_REGIONS = [
  { slug: "chest", name: "Chest", group: "chest" },
  { slug: "delts_front", name: "Front delts", group: "shoulders" },
  { slug: "delts_side", name: "Side delts", group: "shoulders" },
  { slug: "delts_rear", name: "Rear delts", group: "shoulders" },
  { slug: "lats", name: "Lats", group: "back" },
  { slug: "upper_back", name: "Upper back", group: "back" },
  { slug: "lower_back", name: "Lower back", group: "back" },
  { slug: "traps", name: "Traps", group: "traps" },
  { slug: "neck", name: "Neck", group: "traps" },
  { slug: "biceps", name: "Biceps", group: "biceps" },
  { slug: "triceps", name: "Triceps", group: "triceps" },
  { slug: "forearms", name: "Forearms", group: "forearms" },
  { slug: "abs", name: "Abs", group: "abs" },
  { slug: "obliques", name: "Obliques", group: "abs" },
  { slug: "glutes", name: "Glutes", group: "glutes" },
  { slug: "abductors", name: "Abductors", group: "glutes" },
  { slug: "quads", name: "Quads", group: "quads" },
  { slug: "adductors", name: "Adductors", group: "quads" },
  { slug: "hamstrings", name: "Hamstrings", group: "hamstrings" },
  { slug: "calves", name: "Calves", group: "calves" }
] as const;

export type MuscleRegionSlug = (typeof MUSCLE_REGIONS)[number]["slug"];

const groupByRegion = new Map<string, string>(MUSCLE_REGIONS.map((region) => [region.slug, region.group]));

/** The muscle group a region belongs to; a group slug maps to itself. */
export function muscleGroupOf(slug: string): string {
  return groupByRegion.get(slug) ?? slug;
}

/**
 * The slug a region answers to in the data on screen: its own when the numbers
 * are per region, its muscle group's when they are per group (example data).
 */
export function dataSlugOf(region: string, byRegion: boolean): string {
  return byRegion ? region : muscleGroupOf(region);
}
