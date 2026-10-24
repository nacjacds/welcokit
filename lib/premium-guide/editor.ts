import type { SupabaseClient } from "@supabase/supabase-js";
import type { GuideLocale } from "@/lib/guide-i18n";
import { isGuideLocale } from "@/lib/translations/constants";

// What the host's "Guía premium" editor works with: the raw rows of the
// premium tables (not the resolved guest shape of ./types.ts), because the
// editor reads and writes individual rows, hidden ones included.

export interface EditablePlace {
  id: string;
  position: number;
  name: string;
  address_hint: string | null;
  distance_label: string | null;
  tags: string[];
  description_html: string;
  host_tip_html: string | null;
  is_visible: boolean;
}

export interface EditableSection {
  id: string;
  section_key: string;
  position: number;
  title: string;
  kicker: string | null;
  intro_html: string | null;
  is_visible: boolean;
  places: EditablePlace[];
}

export interface EditableGuide {
  id: string;
  language: GuideLocale;
  reviewed_by_native: boolean;
  sections: EditableSection[];
}

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// Loads every premium guide of a property for editing. Pass the host's own
// (RLS) client: the owner policies on guides/guide_sections/guide_places
// are what restrict this to the host's property.
export async function loadEditableGuides(db: SupabaseClient, propertyId: string): Promise<EditableGuide[]> {
  const { data: guides } = await db.from("guides").select("id, language, reviewed_by_native").eq("property_id", propertyId);
  if (!guides?.length) return [];

  const { data: sections } = await db
    .from("guide_sections")
    .select("id, guide_id, section_key, position, title, kicker, intro_html, is_visible")
    .in("guide_id", guides.map((g: Row) => g.id))
    .order("position");
  const sectionIds = (sections ?? []).map((s: Row) => s.id);
  const { data: places } = sectionIds.length
    ? await db
        .from("guide_places")
        .select("id, section_id, position, distance_label, tags, description_html, host_tip_html, is_visible, places(name, address_hint)")
        .in("section_id", sectionIds)
        .order("position")
    : { data: [] as Row[] };

  return (guides as Row[])
    .filter((g) => isGuideLocale(g.language))
    .map((g) => ({
      id: g.id,
      language: g.language as GuideLocale,
      reviewed_by_native: g.reviewed_by_native,
      sections: (sections ?? [])
        .filter((s: Row) => s.guide_id === g.id)
        .map((s: Row) => ({
          id: s.id,
          section_key: s.section_key,
          position: s.position,
          title: s.title,
          kicker: s.kicker,
          intro_html: s.intro_html,
          is_visible: s.is_visible,
          places: (places ?? [])
            .filter((p: Row) => p.section_id === s.id)
            .map((p: Row) => ({
              id: p.id,
              position: p.position,
              name: p.places?.name ?? "",
              address_hint: p.places?.address_hint ?? null,
              distance_label: p.distance_label,
              tags: p.tags ?? [],
              description_html: p.description_html,
              host_tip_html: p.host_tip_html,
              is_visible: p.is_visible,
            })),
        })),
    }))
    .sort((a, b) => a.language.localeCompare(b.language));
}
