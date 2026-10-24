import type { SupabaseClient } from "@supabase/supabase-js";
import { generatePremiumGuideCopy } from "@/lib/claude";
import { LOCALE_NAMES, resolvePropertySourceLocale, type GuideLocale } from "@/lib/translations/constants";
import { cleanHtml } from "./api";

// AI draft of a premium guide (welcokit.guide/v1, source = 'ai') for a
// property that has none: built from the property's real Google Places
// recommendations (property_recommendations), with Claude writing only the
// text around them in the premium style (lib/premium-guide/examples.ts).
// Every fact (name, rating, distance, address, coordinates) comes from the
// data, never from the model; reviews are left empty because Google's review
// count isn't stored. The draft is meant to be reviewed and polished by hand.

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const CATEGORY_ORDER = ["restaurants", "nightlife", "attractions", "beaches", "nature"];
const CATEGORY_STYLE: Record<string, { icon: string; color: string }> = {
  restaurants: { icon: "tapas", color: "#2a9d8f" },
  nightlife: { icon: "cocktail", color: "#6c4f7c" },
  attractions: { icon: "castle", color: "#1b6f8a" },
  beaches: { icon: "wave", color: "#1b6f8a" },
  nature: { icon: "tree", color: "#5c8d5a" },
};

// The few fixed strings the draft needs that Claude doesn't write.
const STATIC_TEXT: Record<GuideLocale, { walk: (n: number) => string; emergencyTitle: string; emergencyKicker: string; emergencyIntro: string; mainTitle: string; mainHtml: string }> = {
  es: { walk: (n) => `~${n} min a pie`, emergencyTitle: "Emergencias", emergencyKicker: "Tened esta página a mano", emergencyIntro: "Esperamos que no los necesitéis, pero aquí están. <strong>Ante la duda, llamad al 112</strong>.", mainTitle: "Emergencias generales", mainHtml: "Policía, ambulancia, bomberos: todo en un solo número. Gratuito, 24 horas." },
  en: { walk: (n) => `~${n} min walk`, emergencyTitle: "Emergencies", emergencyKicker: "Keep this page handy", emergencyIntro: "We hope you never need them, but here they are. <strong>If in doubt, call 112</strong>.", mainTitle: "General emergencies", mainHtml: "Police, ambulance, fire brigade — all in one number. Free, 24/7." },
  fr: { walk: (n) => `~${n} min à pied`, emergencyTitle: "Urgences", emergencyKicker: "Gardez cette page à portée de main", emergencyIntro: "Nous espérons que vous n'en aurez pas besoin, mais les voici. <strong>En cas de doute, appelez le 112</strong>.", mainTitle: "Urgences générales", mainHtml: "Police, ambulance, pompiers : un seul numéro. Gratuit, 24 h/24." },
  it: { walk: (n) => `~${n} min a piedi`, emergencyTitle: "Emergenze", emergencyKicker: "Tieni questa pagina a portata di mano", emergencyIntro: "Speriamo che non ne abbiate bisogno, ma eccoli. <strong>Nel dubbio, chiamate il 112</strong>.", mainTitle: "Emergenze generali", mainHtml: "Polizia, ambulanza, vigili del fuoco: un solo numero. Gratuito, 24 ore su 24." },
  pt: { walk: (n) => `~${n} min a pé`, emergencyTitle: "Emergências", emergencyKicker: "Tenham esta página à mão", emergencyIntro: "Esperamos que não precisem, mas aqui estão. <strong>Em caso de dúvida, liguem para o 112</strong>.", mainTitle: "Emergências gerais", mainHtml: "Polícia, ambulância, bombeiros: tudo num só número. Gratuito, 24 horas." },
  nl: { walk: (n) => `~${n} min lopen`, emergencyTitle: "Noodgevallen", emergencyKicker: "Hou deze pagina bij de hand", emergencyIntro: "We hopen dat je ze nooit nodig hebt, maar hier staan ze. <strong>Bij twijfel: bel 112</strong>.", mainTitle: "Algemene noodgevallen", mainHtml: "Politie, ambulance, brandweer — alles in één nummer. Gratis, 24/7." },
};

// "C/ Sol 106, 41003 Sevilla" -> "Sevilla"
function cityFromAddress(address: string | null): string {
  if (!address) return "";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of parts.slice().reverse()) {
    const match = part.match(/\d{4,5}\s+(.+)/);
    if (match) return match[1].trim();
  }
  return parts[parts.length - 1] ?? "";
}

export async function generatePremiumGuideDraft(
  db: SupabaseClient,
  propertyId: string,
  hostName: string | null
): Promise<{ language: GuideLocale; sections: number; places: number }> {
  const { data: property } = await db.from("properties").select("*").eq("id", propertyId).single();
  if (!property) throw new Error("NO_PROPERTY");
  const language = resolvePropertySourceLocale(property.language);

  const { data: recs } = await db
    .from("property_recommendations")
    .select("*")
    .eq("property_id", propertyId)
    .order("display_order");
  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    rows: ((recs ?? []) as Row[]).filter((r) => r.category === category),
  })).filter((c) => c.rows.length > 0);
  if (byCategory.length === 0) throw new Error("NO_RECOMMENDATIONS");

  const copy = await generatePremiumGuideCopy({
    propertyName: property.name,
    address: property.address ?? "",
    hostNames: hostName ?? "",
    languageName: LOCALE_NAMES[language],
    tone: property.host_tone,
    welcomeMessage: property.welcome_message,
    categories: byCategory.map((c) => ({
      category: c.category,
      places: c.rows.map((r) => ({
        id: r.id,
        name: r.name,
        address: r.address,
        walking_minutes: r.distance_walking_minutes,
        rating: r.rating === null ? null : Number(r.rating),
        description: r.description,
      })),
    })),
  });

  const text = STATIC_TEXT[language];
  const city = cityFromAddress(property.address);

  const sectionsToWrite = byCategory.map((c) => {
    const written = copy.sections.find((s) => s.category === c.category);
    return { ...c, written };
  });

  // 1) the guide row
  const toc = [
    ...sectionsToWrite.map((c) => ({
      id: c.category,
      title: c.written?.title ?? c.category,
      icon: CATEGORY_STYLE[c.category].icon,
      color: CATEGORY_STYLE[c.category].color,
    })),
    { id: "emergency", title: text.emergencyTitle, icon: "cross", color: "#c0392b" },
  ];
  const { data: guide, error: guideError } = await db
    .from("guides")
    .upsert(
      {
        property_id: propertyId,
        language,
        schema: "welcokit.guide/v1",
        property_info: { name: property.name, city, address: property.address ?? "", hosts: hostName ?? "", whatsapp: property.whatsapp_number ?? null },
        cover: {
          kicker: copy.cover.kicker,
          title: copy.cover.title,
          subtitle: copy.cover.subtitle,
          tagline_html: copy.cover.tagline_html ? cleanHtml(copy.cover.tagline_html) : null,
          hero_image: property.cover_image_url ?? "",
        },
        toc,
        theme: property.accent_color ? { primary: property.accent_color } : null,
        map_image: null,
        map_note: null,
        source: "ai",
        reviewed_by_native: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "property_id,language" }
    )
    .select("id")
    .single();
  if (guideError) throw new Error(guideError.message);

  // 2) sections: welcome, one per category, emergency
  const upsertSection = async (section: Row) => {
    const { data, error } = await db
      .from("guide_sections")
      .upsert({ guide_id: guide.id, is_visible: true, illustration: null, banner_image: null, ...section }, { onConflict: "guide_id,section_key" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id as string;
  };

  await upsertSection({
    section_key: "welcome",
    position: 0,
    title: copy.welcome_title,
    kicker: null,
    intro_html: null,
    blocks: [
      { type: "text", html: cleanHtml(copy.welcome_html), position: 0 },
      { type: "text", html: cleanHtml(copy.note_html), position: 1 },
    ],
  });

  let placeCount = 0;
  for (const [index, c] of Array.from(sectionsToWrite.entries())) {
    const sectionId = await upsertSection({
      section_key: c.category,
      position: index + 1,
      title: c.written?.title ?? c.category,
      kicker: c.written?.kicker ?? null,
      intro_html: c.written?.intro_html ? cleanHtml(c.written.intro_html) : null,
      blocks: [],
    });

    const rows: Row[] = [];
    for (const [position, r] of Array.from(c.rows.entries())) {
      // Shared place row (same (city, name) key as the importer); never
      // overwrites coordinates/ratings an existing row already has.
      const { data: existing } = await db.from("places").select("id").eq("city", city).eq("name", r.name).maybeSingle();
      let placeId = existing?.id as string | undefined;
      if (!placeId) {
        const { data: inserted, error } = await db
          .from("places")
          .insert({
            name: r.name,
            city,
            address_hint: r.address,
            google_place_id: r.place_id ?? null,
            lat: r.lat,
            lng: r.lng,
            rating: r.rating,
            reviews_label: null,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        placeId = inserted.id;
      }

      const writtenPlace = c.written?.places.find((p) => p.id === r.id);
      rows.push({
        section_id: sectionId,
        place_id: placeId,
        position,
        icon: CATEGORY_STYLE[c.category].icon,
        walk_minutes: r.distance_walking_minutes,
        distance_label: r.distance_walking_minutes ? text.walk(r.distance_walking_minutes) : null,
        tags: [],
        description_html: cleanHtml(writtenPlace?.description_html || r.description || r.name),
        host_tip_html: writtenPlace?.host_tip_html ? cleanHtml(writtenPlace.host_tip_html) : null,
        accent_color: CATEGORY_STYLE[c.category].color,
      });
    }
    const { error } = await db.from("guide_places").upsert(rows, { onConflict: "section_id,position" });
    if (error) throw new Error(error.message);
    placeCount += rows.length;
  }

  await upsertSection({
    section_key: "emergency",
    position: sectionsToWrite.length + 1,
    title: text.emergencyTitle,
    kicker: text.emergencyKicker,
    intro_html: text.emergencyIntro,
    blocks: [{ type: "emergency_main", number: "112", title: text.mainTitle, html: text.mainHtml, tel: "tel:112", position: 0 }],
  });

  return { language, sections: sectionsToWrite.length + 2, places: placeCount };
}
