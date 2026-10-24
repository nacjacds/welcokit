// Importa las guías premium (formato welcokit.guide/v1) de docs/guides-kit/
// content/*.json a Supabase: guides -> guide_sections -> places -> guide_places,
// y sube docs/guides-kit/assets/ a Storage.
//
//   npm run import-guides -- --dry-run              valida y cuenta, sin tocar nada
//   npm run import-guides                           importa (usa .env.local)
//   npm run import-guides -- --only sol-muralla     una sola propiedad
//   npm run import-guides -- --geocode              además geocodifica con Google Places
//   npm run import-guides -- --property sol-muralla=<uuid>   fuerza la propiedad
//   npm run import-guides -- --skip-assets          no sube assets (ya subidos)
//
// Idempotente: la clave es (propiedad, idioma) y, dentro, section_key y la
// posición del bloque, así que se puede relanzar sin duplicar nada. Ojo: una
// reimportación sobrescribe el contenido de las guías premium con el del JSON,
// incluidas las ediciones que haya hecho el anfitrión desde el panel.
//
// Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (salvo --dry-run).
// --geocode además GOOGLE_MAPS_SERVER_KEY; si falta, se salta sin fallar.

import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const KIT_DIR = path.resolve(process.cwd(), "docs/guides-kit");
const CONTENT_DIR = path.join(KIT_DIR, "content");
const ASSETS_DIR = path.join(KIT_DIR, "assets");

const PUBLIC_BUCKET = "guide-assets";
const PRIVATE_BUCKET = "guide-private";
// Las fotos reales de la propiedad no van al bucket público (ver migración).
const PRIVATE_PREFIX = "photos/";

// slug del kit -> texto con el que buscar la propiedad de prueba por nombre
const PROPERTY_NAME_HINTS: Record<string, string> = {
  "sol-muralla": "Sol Muralla",
  "carihuela-cristal": "Carihuela Cristal",
};

// EN es el original y fija la identidad de cada lugar; el resto se alinea con
// él por (section_key, posición) porque los nombres de lugar a veces se
// traducen ("Dia & Aldi"...).
const SOURCE_LANGUAGE = "en";
// Los anfitriones son hispanohablantes: ES se considera revisado. FR y NL son
// traducción por IA y necesitan revisión nativa antes de venderse.
const REVIEWED_LANGUAGES = new Set(["en", "es"]);

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, any>;

interface Doc {
  schema: string;
  property: Json;
  cover: Json;
  toc: Json[];
  map_image?: string;
  map_note?: string;
  sections: { id: string; blocks: Json[]; [k: string]: any }[];
}

interface Args {
  dryRun: boolean;
  geocode: boolean;
  skipAssets: boolean;
  only: string | null;
  propertyOverrides: Record<string, string>;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, geocode: false, skipAssets: false, only: null, propertyOverrides: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--geocode") args.geocode = true;
    else if (a === "--skip-assets") args.skipAssets = true;
    else if (a === "--only") args.only = argv[++i] ?? null;
    else if (a === "--property") {
      const [slug, id] = (argv[++i] ?? "").split("=");
      if (slug && id) args.propertyOverrides[slug] = id;
    } else throw new Error(`Argumento desconocido: ${a}`);
  }
  return args;
}

function loadDocs(only: string | null): Map<string, Map<string, Doc>> {
  const bySlug = new Map<string, Map<string, Doc>>();
  for (const file of fs.readdirSync(CONTENT_DIR).sort()) {
    const m = file.match(/^(.+)\.([a-z]{2})\.json$/);
    if (!m) continue;
    const [, slug, lang] = m;
    if (only && slug !== only) continue;
    const doc = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8")) as Doc;
    if (doc.schema !== "welcokit.guide/v1") throw new Error(`${file}: schema inesperado ${doc.schema}`);
    if (!bySlug.has(slug)) bySlug.set(slug, new Map());
    bySlug.get(slug)!.set(lang, doc);
  }
  return bySlug;
}

// Comprueba que todos los idiomas de una propiedad tienen la misma estructura
// que EN (mismas secciones, mismas posiciones de lugar) — es lo que permite
// compartir `places` entre idiomas.
function validateAlignment(slug: string, docs: Map<string, Doc>) {
  const source = docs.get(SOURCE_LANGUAGE);
  if (!source) throw new Error(`${slug}: falta la versión ${SOURCE_LANGUAGE}`);
  for (const [lang, doc] of Array.from(docs)) {
    if (doc.sections.length !== source.sections.length) {
      throw new Error(`${slug}.${lang}: ${doc.sections.length} secciones, EN tiene ${source.sections.length}`);
    }
    source.sections.forEach((s, i) => {
      const t = doc.sections[i];
      if (t.id !== s.id) throw new Error(`${slug}.${lang}: sección ${i} es "${t.id}", EN tiene "${s.id}"`);
      // Solo los lugares tienen que coincidir en posición: los bloques de texto
      // pueden diferir (p. ej. el "signoff" de carihuela-cristal.tips falta en EN).
      const placeAt = (blocks: Json[]) => blocks.flatMap((b, j) => (b.type === "place" ? [j] : [])).join(",");
      if (placeAt(s.blocks) !== placeAt(t.blocks)) {
        throw new Error(`${slug}.${lang}: la sección "${s.id}" no tiene los lugares en las mismas posiciones que EN`);
      }
      if (s.blocks.length !== t.blocks.length) {
        console.warn(`  aviso ${slug}.${lang}.${s.id}: ${t.blocks.length} bloques, EN tiene ${s.blocks.length}`);
      }
    });
  }
}

// Sustituye cualquier string "assets/..." (portada, banners, mapa, imágenes de
// bloque) por la URL pública de Storage; las fotos reales quedan como
// referencia privada "private:<bucket>/<ruta>" para firmarlas al servirlas.
function makeAssetRewriter(supabaseUrl: string) {
  const publicBase = `${supabaseUrl}/storage/v1/object/public/${PUBLIC_BUCKET}/`;
  const rewriteString = (value: string): string => {
    if (!value.startsWith("assets/")) return value;
    const rel = value.slice("assets/".length);
    if (rel.startsWith(PRIVATE_PREFIX)) return `private:${PRIVATE_BUCKET}/${rel}`;
    return publicBase + rel;
  };
  const rewrite = <T>(node: T): T => {
    if (typeof node === "string") return rewriteString(node) as T;
    if (Array.isArray(node)) return node.map(rewrite) as T;
    if (node && typeof node === "object") {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, rewrite(v)])) as T;
    }
    return node;
  };
  return rewrite;
}

function contentTypeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  return (
    { ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[
      ext
    ] ?? "application/octet-stream"
  );
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

async function uploadAssets(supabase: SupabaseClient) {
  const files = walk(ASSETS_DIR);
  let n = 0;
  for (const file of files) {
    const rel = path.relative(ASSETS_DIR, file).split(path.sep).join("/");
    const bucket = rel.startsWith(PRIVATE_PREFIX) ? PRIVATE_BUCKET : PUBLIC_BUCKET;
    const { error } = await supabase.storage.from(bucket).upload(rel, fs.readFileSync(file), {
      contentType: contentTypeFor(file),
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) throw new Error(`Subida de ${bucket}/${rel}: ${error.message}`);
    n++;
  }
  console.log(`Assets subidos: ${n}`);
}

async function resolveProperty(
  supabase: SupabaseClient,
  slug: string,
  overrides: Record<string, string>
): Promise<{ id: string; name: string }> {
  if (overrides[slug]) {
    const { data, error } = await supabase.from("properties").select("id, name").eq("id", overrides[slug]).single();
    if (error || !data) throw new Error(`${slug}: no existe la propiedad ${overrides[slug]}`);
    return data;
  }
  const hint = PROPERTY_NAME_HINTS[slug] ?? slug.replace(/-/g, " ");
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, slug, host_id")
    .ilike("name", `%${hint}%`)
    .is("deleted_at", null);
  if (error) throw new Error(`${slug}: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(`${slug}: ninguna propiedad con nombre parecido a "${hint}". Usa --property ${slug}=<uuid>.`);
  }
  if (data.length > 1) {
    const list = data.map((p) => `  ${p.id}  ${p.name}  (/guide/${p.slug})`).join("\n");
    throw new Error(`${slug}: ambiguo, ${data.length} propiedades coinciden con "${hint}":\n${list}\nUsa --property ${slug}=<uuid>.`);
  }
  return data[0];
}

async function geocode(name: string, addressHint: string | null, city: string) {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) return null;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.location",
    },
    body: JSON.stringify({ textQuery: [name, addressHint, city].filter(Boolean).join(", "), maxResultCount: 1 }),
  });
  if (!res.ok) {
    console.warn(`  geocode ${name}: HTTP ${res.status}`);
    return null;
  }
  const place = ((await res.json()) as any).places?.[0];
  if (!place) return null;
  return { google_place_id: place.id as string, lat: place.location.latitude as number, lng: place.location.longitude as number };
}

async function importProperty(
  supabase: SupabaseClient,
  rewrite: <T>(n: T) => T,
  slug: string,
  docs: Map<string, Doc>,
  propertyId: string,
  doGeocode: boolean
) {
  const source = docs.get(SOURCE_LANGUAGE)!;
  const city: string = source.property.city;

  // 1) places, desde EN. No se pisan lat/lng/google_place_id ya guardados.
  const placeIds = new Map<string, string>(); // `${sectionIdx}:${blockIdx}` -> places.id
  for (const [si, section] of Array.from(source.sections.entries())) {
    for (const [bi, block] of Array.from(section.blocks.entries())) {
      if (block.type !== "place") continue;
      const { data: existing } = await supabase
        .from("places")
        .select("id, google_place_id")
        .eq("city", city)
        .eq("name", block.name)
        .maybeSingle();
      const row: Json = {
        name: block.name,
        city,
        address_hint: block.address_hint,
        rating: block.rating,
        reviews_label: block.reviews,
      };
      if (doGeocode && !existing?.google_place_id) {
        const g = await geocode(block.name, block.address_hint, city);
        if (g) Object.assign(row, g);
      }
      const { data, error } = existing
        ? await supabase.from("places").update(row).eq("id", existing.id).select("id").single()
        : await supabase.from("places").insert(row).select("id").single();
      if (error) throw new Error(`places "${block.name}": ${error.message}`);
      placeIds.set(`${si}:${bi}`, data.id);
    }
  }

  // 2) cada idioma
  for (const [lang, doc] of Array.from(docs)) {
    const { data: guide, error: gErr } = await supabase
      .from("guides")
      .upsert(
        {
          property_id: propertyId,
          language: lang,
          schema: doc.schema,
          property_info: {
            name: doc.property.name,
            city: doc.property.city,
            address: doc.property.address,
            hosts: doc.property.hosts,
            whatsapp: doc.property.whatsapp,
          },
          cover: rewrite(doc.cover),
          toc: doc.toc,
          theme: doc.property.theme ?? null,
          map_image: doc.map_image ? rewrite(doc.map_image) : null,
          map_note: doc.map_note ?? null,
          source: "premium",
          reviewed_by_native: REVIEWED_LANGUAGES.has(lang),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "property_id,language" }
      )
      .select("id")
      .single();
    if (gErr) throw new Error(`guides ${slug}.${lang}: ${gErr.message}`);

    let places = 0;
    for (const [si, section] of Array.from(doc.sections.entries())) {
      const nonPlace: Json[] = section.blocks
        .map((b, position) => ({ ...rewrite<Json>(b), position } as Json))
        .filter((b) => b.type !== "place");

      const { data: sec, error: sErr } = await supabase
        .from("guide_sections")
        .upsert(
          {
            guide_id: guide.id,
            section_key: section.id,
            position: si,
            title: section.title,
            kicker: section.kicker ?? null,
            intro_html: section.intro_html ?? null,
            illustration: section.illustration ?? null,
            banner_image: section.banner_image ? rewrite(section.banner_image) : null,
            blocks: nonPlace,
          },
          { onConflict: "guide_id,section_key" }
        )
        .select("id")
        .single();
      if (sErr) throw new Error(`guide_sections ${slug}.${lang}.${section.id}: ${sErr.message}`);

      const placeRows = section.blocks.flatMap((b, position) =>
        b.type !== "place"
          ? []
          : [
              {
                section_id: sec.id,
                place_id: placeIds.get(`${si}:${position}`)!,
                position,
                icon: b.icon ?? null,
                walk_minutes: b.walk_minutes ?? null,
                distance_label: b.distance_label ?? null,
                tags: b.tags ?? [],
                description_html: b.description_html,
                host_tip_html: b.host_tip_html ?? null,
                accent_color: b.accent_color ?? null,
              },
            ]
      );
      if (placeRows.length) {
        const { error } = await supabase.from("guide_places").upsert(placeRows, { onConflict: "section_id,position" });
        if (error) throw new Error(`guide_places ${slug}.${lang}.${section.id}: ${error.message}`);
      }
      // Lugares que ya no están en el JSON.
      const keep = placeRows.map((r: Json) => r.position);
      const del = supabase.from("guide_places").delete().eq("section_id", sec.id);
      const { error: dErr } = keep.length ? await del.not("position", "in", `(${keep.join(",")})`) : await del;
      if (dErr) throw new Error(`limpieza guide_places ${slug}.${lang}.${section.id}: ${dErr.message}`);
      places += placeRows.length;
    }

    // Secciones que ya no están en el JSON.
    const keys = doc.sections.map((s) => `"${s.id}"`).join(",");
    const { error: cErr } = await supabase
      .from("guide_sections")
      .delete()
      .eq("guide_id", guide.id)
      .not("section_key", "in", `(${keys})`);
    if (cErr) throw new Error(`limpieza guide_sections ${slug}.${lang}: ${cErr.message}`);

    console.log(`  ${slug}.${lang}: ${doc.sections.length} secciones, ${places} lugares`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const all = loadDocs(args.only);
  if (all.size === 0) throw new Error("No hay JSON en docs/guides-kit/content (¿--only con un slug válido?)");
  for (const [slug, docs] of Array.from(all)) validateAlignment(slug, docs);

  if (args.dryRun) {
    for (const [slug, docs] of Array.from(all)) {
      const en = docs.get(SOURCE_LANGUAGE)!;
      const places = en.sections.flatMap((s) => s.blocks).filter((b) => b.type === "place").length;
      console.log(`${slug}: idiomas [${Array.from(docs.keys()).join(", ")}], ${en.sections.length} secciones, ${places} lugares — OK`);
    }
    console.log("Dry run: no se ha escrito nada.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  if (args.geocode && !process.env.GOOGLE_MAPS_SERVER_KEY) {
    console.warn("--geocode sin GOOGLE_MAPS_SERVER_KEY: se salta la geocodificación.");
    args.geocode = false;
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const rewrite = makeAssetRewriter(url);

  // Resolver todas las propiedades antes de escribir nada: si una es ambigua,
  // no se importa ninguna a medias.
  const targets = new Map<string, { id: string; name: string }>();
  for (const slug of Array.from(all.keys())) targets.set(slug, await resolveProperty(supabase, slug, args.propertyOverrides));

  if (!args.skipAssets) await uploadAssets(supabase);

  for (const [slug, docs] of Array.from(all)) {
    const prop = targets.get(slug)!;
    console.log(`${slug} -> "${prop.name}" (${prop.id})`);
    await importProperty(supabase, rewrite, slug, docs, prop.id, args.geocode);
  }
  console.log("Importación completada.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
