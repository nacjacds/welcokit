import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isGuideLocale } from "@/lib/translations/constants";
import type { GuideLocale } from "@/lib/guide-i18n";
import type { PremiumBlock, PremiumGuide, PremiumPlaceBlock, PremiumSection } from "./types";

// Real photos of the property live in a private bucket and are stored as
// "private:<bucket>/<path>" (see scripts/import-guides.ts); they're swapped
// for short-lived signed URLs when the guide is served.
const PRIVATE_PREFIX = "private:";
const SIGNED_URL_TTL_SECONDS = 6 * 60 * 60;

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function signPrivateUrls<T>(db: SupabaseClient, value: T): Promise<T> {
  const paths = new Set<string>();
  const collect = (node: unknown) => {
    if (typeof node === "string") {
      if (node.startsWith(PRIVATE_PREFIX)) paths.add(node);
    } else if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === "object") Object.values(node).forEach(collect);
  };
  collect(value);
  if (paths.size === 0) return value;

  const signed = new Map<string, string>();
  await Promise.all(
    Array.from(paths).map(async (ref) => {
      const [bucket, ...rest] = ref.slice(PRIVATE_PREFIX.length).split("/");
      const { data } = await db.storage.from(bucket).createSignedUrl(rest.join("/"), SIGNED_URL_TTL_SECONDS);
      signed.set(ref, data?.signedUrl ?? "");
    })
  );

  const rewrite = (node: unknown): unknown => {
    if (typeof node === "string") return signed.has(node) ? signed.get(node) : node;
    if (Array.isArray(node)) return node.map(rewrite);
    if (node && typeof node === "object") {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, rewrite(v)]));
    }
    return node;
  };
  return rewrite(value) as T;
}

// Every premium guide a property has, keyed by language. Read with the
// service role because the premium tables have no public RLS policy: the
// caller (the public guide routes) has already resolved the slug / guest
// link and checked the property is published, not deleted and not expired.
export async function fetchPremiumGuides(
  propertyId: string
): Promise<Partial<Record<GuideLocale, PremiumGuide>>> {
  const db = createServiceRoleClient() as unknown as SupabaseClient;

  const { data: guides } = await db.from("guides").select("*").eq("property_id", propertyId);
  if (!guides?.length) return {};

  const guideIds = guides.map((g: Row) => g.id);
  const { data: sections } = await db
    .from("guide_sections")
    .select("*")
    .in("guide_id", guideIds)
    .eq("is_visible", true)
    .order("position");
  const sectionIds = (sections ?? []).map((s: Row) => s.id);
  const { data: placeRows } = sectionIds.length
    ? await db
        .from("guide_places")
        .select("*, places(*)")
        .in("section_id", sectionIds)
        .eq("is_visible", true)
    : { data: [] as Row[] };

  const placesBySection = new Map<string, Row[]>();
  for (const row of placeRows ?? []) {
    const list = placesBySection.get(row.section_id) ?? [];
    list.push(row);
    placesBySection.set(row.section_id, list);
  }

  const result: Partial<Record<GuideLocale, PremiumGuide>> = {};
  for (const guide of guides as Row[]) {
    if (!isGuideLocale(guide.language)) continue;

    const builtSections: PremiumSection[] = (sections ?? [])
      .filter((s: Row) => s.guide_id === guide.id)
      .map((s: Row) => {
        // Non-place blocks and places each carry their original position in
        // the section; merging by it restores the authored order.
        const positioned: { position: number; block: PremiumBlock }[] = [
          ...((s.blocks ?? []) as Row[]).map((b) => ({ position: b.position as number, block: b as PremiumBlock })),
          ...(placesBySection.get(s.id) ?? []).map((gp) => {
            const place = gp.places as Row;
            const block: PremiumPlaceBlock = {
              type: "place",
              name: place.name,
              address_hint: place.address_hint,
              icon: gp.icon,
              rating: place.rating === null ? null : Number(place.rating),
              reviews: place.reviews_label,
              distance_label: gp.distance_label,
              walk_minutes: gp.walk_minutes,
              tags: gp.tags ?? [],
              description_html: gp.description_html,
              host_tip_html: gp.host_tip_html,
              accent_color: gp.accent_color,
              google_place_id: place.google_place_id,
              lat: place.lat,
              lng: place.lng,
            };
            return { position: gp.position as number, block };
          }),
        ];
        positioned.sort((a, b) => a.position - b.position);
        return {
          id: s.section_key,
          title: s.title,
          kicker: s.kicker,
          intro_html: s.intro_html,
          banner_image: s.banner_image,
          blocks: positioned.map((p) => p.block),
        };
      });

    result[guide.language as GuideLocale] = {
      language: guide.language,
      property: guide.property_info,
      cover: guide.cover,
      toc: guide.toc,
      theme: guide.theme,
      map_image: guide.map_image,
      map_note: guide.map_note,
      sections: builtSections,
    };
  }

  return signPrivateUrls(db, result);
}
