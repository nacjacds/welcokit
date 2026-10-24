import type { SupabaseClient } from "@supabase/supabase-js";
import { translateGuideChunk } from "@/lib/claude";
import { LOCALE_NAMES, type GuideLocale } from "@/lib/translations/constants";

// "Traducir desde EN": builds the premium guide of a property in another
// language from its English one. Section keys, block order and the places
// (shared rows of `places`) are kept as they are — only the text changes —
// so the translated guide lines up one to one with the original. The result
// is always flagged reviewed_by_native = false.

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const CONCURRENCY = 4;

// Text fields of each non-place block that get translated.
const BLOCK_TEXT_KEYS: Record<string, string[]> = {
  text: ["html"],
  callout: ["kicker", "title", "html"],
  subheading: ["text"],
  contact: ["title", "details"],
  emergency_main: ["title", "html"],
  image: ["caption_html"],
  illustration: ["caption_html"],
  signoff: ["text"],
};

function pickBlockText(block: Row): Row {
  if (block.type === "emergency_numbers") {
    return { items: (block.items ?? []).map((i: Row) => ({ title: i.title, subtitle: i.subtitle })) };
  }
  const keys = BLOCK_TEXT_KEYS[block.type] ?? [];
  return Object.fromEntries(keys.filter((k) => block[k] != null).map((k) => [k, block[k]]));
}

function applyBlockText(block: Row, translated: Row | undefined): Row {
  if (!translated) return block;
  if (block.type === "emergency_numbers") {
    const items = (block.items ?? []).map((item: Row, i: number) => ({
      ...item,
      title: typeof translated.items?.[i]?.title === "string" ? translated.items[i].title : item.title,
      subtitle: typeof translated.items?.[i]?.subtitle === "string" ? translated.items[i].subtitle : item.subtitle,
    }));
    return { ...block, items };
  }
  const keys = BLOCK_TEXT_KEYS[block.type] ?? [];
  const out = { ...block };
  for (const key of keys) if (typeof translated[key] === "string") out[key] = translated[key];
  return out;
}

const str = (value: unknown, fallback: string | null): string | null => (typeof value === "string" ? value : fallback);

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    })
  );
  return results;
}

export async function translateGuideFromEnglish(
  db: SupabaseClient,
  propertyId: string,
  target: GuideLocale
): Promise<{ sections: number; places: number }> {
  const targetName = LOCALE_NAMES[target];

  const { data: source } = await db.from("guides").select("*").eq("property_id", propertyId).eq("language", "en").maybeSingle();
  if (!source) throw new Error("NO_ENGLISH_GUIDE");

  const { data: sections } = await db.from("guide_sections").select("*").eq("guide_id", source.id).order("position");
  const sectionRows = (sections ?? []) as Row[];
  const { data: places } = sectionRows.length
    ? await db.from("guide_places").select("*").in("section_id", sectionRows.map((s) => s.id))
    : { data: [] as Row[] };
  const placeRows = (places ?? []) as Row[];

  // 1) translate: the cover (plus the index titles) and each section.
  const coverPayload = {
    kicker: source.cover.kicker,
    title: source.cover.title,
    subtitle: source.cover.subtitle,
    tagline_html: source.cover.tagline_html,
    toc: (source.toc as Row[]).map((e) => e.title),
  };
  const translatedCover = (await translateGuideChunk(coverPayload, targetName)) as Row;

  const translatedSections = await mapLimit(sectionRows, CONCURRENCY, async (section) => {
    const sectionPlaces = placeRows.filter((p) => p.section_id === section.id);
    const payload = {
      title: section.title,
      kicker: section.kicker,
      intro_html: section.intro_html,
      blocks: ((section.blocks ?? []) as Row[]).map(pickBlockText),
      places: sectionPlaces.map((p) => ({
        distance_label: p.distance_label,
        tags: p.tags,
        description_html: p.description_html,
        host_tip_html: p.host_tip_html,
      })),
    };
    return (await translateGuideChunk(payload, targetName)) as Row;
  });

  // 2) write the target guide (upsert by property + language).
  const cover = {
    ...source.cover,
    kicker: str(translatedCover.kicker, source.cover.kicker),
    title: str(translatedCover.title, source.cover.title),
    subtitle: str(translatedCover.subtitle, source.cover.subtitle),
    tagline_html: str(translatedCover.tagline_html, source.cover.tagline_html),
  };
  const toc = (source.toc as Row[]).map((entry, i) => ({
    ...entry,
    title: Array.isArray(translatedCover.toc) ? str(translatedCover.toc[i], entry.title) : entry.title,
  }));

  const { data: guide, error: guideError } = await db
    .from("guides")
    .upsert(
      {
        property_id: propertyId,
        language: target,
        schema: source.schema,
        property_info: source.property_info,
        cover,
        toc,
        theme: source.theme,
        map_image: source.map_image,
        map_note: source.map_note,
        source: source.source,
        reviewed_by_native: false,
        ratings_checked_at: source.ratings_checked_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "property_id,language" }
    )
    .select("id")
    .single();
  if (guideError) throw new Error(guideError.message);

  let placeCount = 0;
  for (const [index, section] of Array.from(sectionRows.entries())) {
    const tr = translatedSections[index];
    const sectionPlaces = placeRows.filter((p) => p.section_id === section.id).sort((a, b) => a.position - b.position);
    const sourceBlocks = (section.blocks ?? []) as Row[];

    const blocks = sourceBlocks.map((block, i) => applyBlockText(block, Array.isArray(tr.blocks) ? (tr.blocks[i] as Row) : undefined));

    const { data: targetSection, error: sectionError } = await db
      .from("guide_sections")
      .upsert(
        {
          guide_id: guide.id,
          section_key: section.section_key,
          position: section.position,
          title: str(tr.title, section.title),
          kicker: str(tr.kicker, section.kicker),
          intro_html: str(tr.intro_html, section.intro_html),
          illustration: section.illustration,
          banner_image: section.banner_image,
          is_visible: section.is_visible,
          blocks,
        },
        { onConflict: "guide_id,section_key" }
      )
      .select("id")
      .single();
    if (sectionError) throw new Error(sectionError.message);

    // places come back in the same order they were sent (sorted by position above
    // only for writing; the payload used the unsorted DB order, so index by id).
    const unsorted = placeRows.filter((p) => p.section_id === section.id);
    const rows = sectionPlaces.map((p) => {
      const t = (Array.isArray(tr.places) ? tr.places[unsorted.indexOf(p)] : undefined) as Row | undefined;
      return {
        section_id: targetSection.id,
        place_id: p.place_id,
        position: p.position,
        icon: p.icon,
        walk_minutes: p.walk_minutes,
        distance_label: str(t?.distance_label, p.distance_label),
        tags: Array.isArray(t?.tags) && t!.tags.length === (p.tags ?? []).length ? t!.tags : p.tags,
        description_html: str(t?.description_html, p.description_html) as string,
        host_tip_html: str(t?.host_tip_html, p.host_tip_html),
        accent_color: p.accent_color,
        is_visible: p.is_visible,
      };
    });
    if (rows.length) {
      const { error } = await db.from("guide_places").upsert(rows, { onConflict: "section_id,position" });
      if (error) throw new Error(error.message);
    }
    placeCount += rows.length;
  }

  return { sections: sectionRows.length, places: placeCount };
}
