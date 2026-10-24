import Anthropic from "@anthropic-ai/sdk";
import type { DestinationType, HostTone } from "@/types";
import type { AppLocale } from "@/lib/locale";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = "claude-sonnet-4-6";

function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON found in Claude response");
  return JSON.parse(match[0]) as T;
}

export interface GuideContent {
  welcome_message: string;
  checkin_tips: string[];
  checkout_tips: string[];
  rules: string[];
  neighborhood_description: string;
}

const OUTPUT_LANGUAGE_NAMES: Record<AppLocale, string> = {
  es: "español",
  en: "inglés",
  fr: "francés",
  it: "italiano",
  pt: "portugués",
};

export async function generateGuideContent(property: {
  name: string;
  address: string;
  hostTone: HostTone;
  // Dashboard locale at generation time — content is written directly in
  // this language rather than always generated in Spanish and translated
  // afterward (see app/api/ai/generate-content/route.ts, which also
  // persists this as properties.language so the translation pipeline
  // knows the real source language of the resulting blocks).
  locale: AppLocale;
}): Promise<GuideContent> {
  const outputLanguage = OUTPUT_LANGUAGE_NAMES[property.locale];
  const prompt = `
Eres un asistente que ayuda a propietarios de alojamientos turísticos a crear guías para sus huéspedes.

Genera el contenido para la guía del siguiente alojamiento:
- Nombre: ${property.name}
- Dirección: ${property.address}
- Tono del anfitrión: ${property.hostTone === "friendly" ? "cercano, tuteo" : "formal, usted"}

IMPORTANTE: Escribe TODO el contenido (mensaje de bienvenida, tips, normas, descripción del
barrio) en ${outputLanguage}.

Devuelve SOLO un JSON con esta estructura exacta:
{
  "welcome_message": "Mensaje de bienvenida personalizado (2-3 frases)",
  "checkin_tips": ["tip1", "tip2", "tip3"],
  "checkout_tips": ["tip1", "tip2", "tip3"],
  "rules": ["norma1", "norma2", "norma3", "norma4", "norma5"],
  "neighborhood_description": "Descripción del barrio/zona en 2 frases"
}
`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return extractJson<GuideContent>(text);
}

export interface RecommendationDraft {
  place_id: string;
  description: string;
}

export async function generateRecommendationDescriptions(params: {
  propertyName: string;
  address: string;
  guestProfile: string;
  category: string;
  places: unknown[];
}): Promise<RecommendationDraft[]> {
  const prompt = `
Eres el asistente de ${params.propertyName}, un alojamiento en ${params.address}.

Los huéspedes típicos son: ${params.guestProfile}

Estos son los ${params.category} más valorados cerca del alojamiento (datos de Google):
${JSON.stringify(params.places, null, 2)}

Selecciona los 3 mejores y escribe una descripción breve (máximo 2 frases) para cada uno.
La descripción debe ser útil y personal, no un resumen genérico.
Menciona algo específico: qué pedir, cuándo ir, qué hace especial al lugar.

Devuelve SOLO un JSON array:
[
  {
    "place_id": "...",
    "description": "..."
  }
]
`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return extractJson<RecommendationDraft[]>(text);
}

export interface RecommendationCandidate {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  types: string[];
}

const CURATION_CATEGORY_GUIDANCE: Record<string, string> = {
  restaurants:
    "Prioriza comida auténtica local y buen ambiente por encima de cadenas turísticas o sitios genéricos para turistas. Usa el rating y el tipo de establecimiento como señal, no solo la popularidad.",
  nightlife:
    "Prioriza bares y locales con ambiente auténtico local por encima de cadenas turísticas o sitios genéricos para turistas. Usa el rating y el tipo de establecimiento como señal, no solo la popularidad.",
  attractions: "Prioriza lugares realmente representativos de la zona, con buena valoración.",
  beaches: "Prioriza playas con buena valoración y accesibilidad.",
  nature: "Prioriza parques y espacios naturales con buena valoración.",
};

// Extra framing based on what kind of destination the property is in (see
// properties.destination_type) — empty for "urban" so that default case
// stays byte-identical to the prompt before this existed. Lets Claude
// weigh two otherwise-similar candidates by what actually matters for
// this property's character (e.g. a restaurant with a sea-view terrace
// over an identical inland one for a beach property), on top of the
// per-category guidance above, not instead of it.
const DESTINATION_TYPE_GUIDANCE: Record<DestinationType, string> = {
  urban: "",
  historic_city:
    "Este alojamiento está en una ciudad histórica con patrimonio cultural relevante. Si un lugar tiene valor histórico, monumental o cultural, resáltalo en la descripción.",
  beach:
    "Este alojamiento está en una zona de playa/costa. Si un lugar tiene vistas al mar, terraza junto a la costa, o ambiente playero, resáltalo en la descripción por encima de un lugar equivalente sin esa cercanía al mar.",
  nature:
    "Este alojamiento está en un entorno natural/de montaña. Si un lugar tiene relación con senderismo, naturaleza o paisaje, resáltalo en la descripción.",
  rural:
    "Este alojamiento está en una zona rural/de pueblo. Si un lugar tiene un carácter auténtico, tradicional o típico del entorno rural, resáltalo en la descripción.",
};

export interface CuratedRecommendation {
  place_id: string;
  description: string;
}

// Selects, orders, and writes a short description for up to `limit` places
// from real Google Places candidates — Claude must not invent or modify
// any factual data (name/address/rating/etc.), only choose, rank, and
// describe from the list it's given.
//
// Deliberately always writes in Spanish (RECOMMENDATIONS_SOURCE_LOCALE, see
// lib/translations/constants.ts) regardless of what language a guest is
// viewing the guide in, or what properties.language/dashboard_locale the
// host uses — unlike guide_blocks/welcome_message content, this doesn't
// follow the host's dashboard locale (see generateGuideContent above). A
// guest viewing in English gets these
// descriptions translated on the fly via the same content_translations
// cache the rest of the guide uses (see
// lib/translations/translateRecommendations.ts), not by asking Claude to
// write in a different language here.
export async function curateRecommendations(params: {
  propertyName: string;
  address: string;
  category: string;
  candidates: RecommendationCandidate[];
  limit?: number;
  destinationType?: DestinationType;
}): Promise<CuratedRecommendation[]> {
  const limit = params.limit ?? 10;
  const guidance = CURATION_CATEGORY_GUIDANCE[params.category] ?? "";
  const destinationGuidance = DESTINATION_TYPE_GUIDANCE[params.destinationType ?? "urban"];

  const prompt = `
Eres el asistente de ${params.propertyName}, un alojamiento en ${params.address}.

Estos son los lugares candidatos de la categoría "${params.category}" cerca del alojamiento
(datos reales de Google Places — nombre, rating, número de reseñas, tipos):
${JSON.stringify(params.candidates, null, 2)}

Selecciona un máximo de ${limit} lugares y ordénalos de mejor a peor recomendación para un
huésped turístico. ${guidance} ${destinationGuidance}

Para cada lugar seleccionado, escribe una descripción breve (máximo 1-2 frases) que explique
qué lo hace destacar — tipo de lugar, ambiente, qué esperar — basándote únicamente en su
nombre, rating y tipos. No inventes datos factuales (precios, platos concretos, horarios) que
no estén en los datos proporcionados.

No inventes ni modifiques ningún dato factual. Solo elige, ordena y describe a partir de la
lista proporcionada.

Devuelve SOLO un JSON array en el orden de recomendación:
[{ "place_id": "...", "description": "..." }, ...]
`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const results = extractJson<CuratedRecommendation[]>(text);
  const validIds = new Set(params.candidates.map((c) => c.place_id));
  return results.filter((r) => validIds.has(r.place_id)).slice(0, limit);
}

// Sibling of curateRecommendations for a single place a host adds manually
// (no selection/ranking needed — the host already chose it) — same
// no-inventing-facts and always-Spanish rules apply.
export async function describeManualPlace(params: {
  propertyName: string;
  address: string;
  category: string;
  place: RecommendationCandidate;
  destinationType?: DestinationType;
}): Promise<string> {
  const guidance = CURATION_CATEGORY_GUIDANCE[params.category] ?? "";
  const destinationGuidance = DESTINATION_TYPE_GUIDANCE[params.destinationType ?? "urban"];

  const prompt = `
Eres el asistente de ${params.propertyName}, un alojamiento en ${params.address}.

El anfitrión ha añadido a mano el siguiente lugar a la categoría "${params.category}"
(datos reales de Google Places — nombre, rating, número de reseñas, tipos):
${JSON.stringify(params.place, null, 2)}

Escribe una descripción breve (máximo 1-2 frases) que explique qué lo hace destacar — tipo de
lugar, ambiente, qué esperar — basándote únicamente en su nombre, rating y tipos. ${guidance}
${destinationGuidance}
No inventes datos factuales (precios, platos concretos, horarios) que no estén en los datos
proporcionados.

Devuelve SOLO un JSON: { "description": "..." }
`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return extractJson<{ description: string }>(text).description;
}

export interface PlaceSuggestion {
  name: string;
  description: string;
  address: string;
  distance_meters: number | null;
}

const PLACE_CATEGORY_LABELS: Record<string, string> = {
  parking: "un parking o aparcamiento",
};

export async function generatePlaceSuggestion(params: {
  propertyName: string;
  address: string;
  blockType: string;
  excludeNames: string[];
}): Promise<PlaceSuggestion> {
  const category = PLACE_CATEGORY_LABELS[params.blockType] ?? "un lugar de interés";
  const exclusions =
    params.excludeNames.length > 0
      ? `No sugieras ninguno de estos lugares, que ya están en la lista: ${params.excludeNames.join(", ")}.`
      : "";

  const prompt = `
Eres un asistente que conoce bien la zona de ${params.address}, donde se encuentra el alojamiento "${params.propertyName}".

Sugiere ${category} real y conocido cerca de esa dirección, útil para huéspedes turísticos.
${exclusions}

Devuelve SOLO un JSON con esta estructura exacta:
{
  "name": "Nombre del lugar",
  "description": "Descripción breve en 2 frases: qué lo hace especial, qué pedir o qué hacer allí",
  "address": "Dirección aproximada del lugar",
  "distance_meters": 400
}

"distance_meters" es la distancia aproximada a pie en metros desde ${params.address}, como número entero.
`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return extractJson<PlaceSuggestion>(text);
}

const TRANSLATION_TONE_GUIDANCE = `
Eres el traductor oficial de WelcoKit, una guía digital para huéspedes de alojamientos turísticos.
Tono: cálido, natural y profesional — nunca frío ni literal. Como si un anfitrión atento
le explicara esto en persona a su huésped. No traduzcas palabra por palabra: adapta la
frase para que suene natural en el idioma de destino.
`.trim();

// Plain-text variant — used for property.welcome_message (a single free-text
// field, not a block content object).
export async function translateContentText(
  text: string,
  targetLanguageName: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${TRANSLATION_TONE_GUIDANCE}

Traduce este texto al ${targetLanguageName}. Devuelve SOLO el texto traducido, sin comillas, sin comentarios ni explicaciones:

${text}`,
      },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text.trim() : text;
}

// JSON variant — used for block content, which is a JSON object of
// already-extracted translatable string/string[]/Record<string,string>
// fields (see lib/translations/extract.ts). Keys and structure must come
// back unchanged; only the string values are translated.
export async function translateContentJson(
  content: Record<string, unknown>,
  targetLanguageName: string
): Promise<Record<string, unknown>> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${TRANSLATION_TONE_GUIDANCE}

Traduce al ${targetLanguageName} todos los valores de texto de este objeto JSON.
Mantén exactamente la misma estructura y las mismas claves — no añadas, quites ni
renombres ninguna clave. Traduce únicamente los valores de tipo texto (incluidos los
que están dentro de arrays o de objetos anidados). Devuelve SOLO el JSON resultante,
sin comentarios, sin explicación, sin bloque de código markdown:

${JSON.stringify(content)}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return extractJson<Record<string, unknown>>(text);
}

// Translations are short, high-volume and don't need the larger model (see
// CLAUDE.md: Haiku for guide translation) — and a whole premium-guide
// section is far longer than a block, hence the big output budget.
const TRANSLATION_MODEL = "claude-haiku-4-5-20251001";

// Translates the text values of one chunk of a premium guide (a section, or
// the cover), keeping the JSON shape, the HTML tags and every proper noun,
// price, time and phone number exactly as they are.
export async function translateGuideChunk(
  chunk: Record<string, unknown>,
  targetLanguageName: string
): Promise<Record<string, unknown>> {
  const message = await anthropic.messages.create({
    model: TRANSLATION_MODEL,
    max_tokens: 12000,
    messages: [
      {
        role: "user",
        content: `${TRANSLATION_TONE_GUIDANCE}

Esto es parte de una guía local escrita por los anfitriones de un alojamiento, en primera persona del plural ("nosotros"), con tono cercano y consejos concretos.
Traduce al ${targetLanguageName} todos los valores de texto de este objeto JSON.
Reglas:
- Mantén exactamente la misma estructura y las mismas claves; no añadas, quites ni reordenes nada.
- Conserva las etiquetas HTML (<strong>, <i>, <em>, <br/>, <a href="...">) tal cual, y traduce solo el texto que contienen.
- No traduzcas nombres propios de lugares, bares, calles ni marcas; tampoco precios, horarios, números de teléfono ni cifras.
- Las distancias como "~8 min a pie" se traducen manteniendo el mismo formato.
- No inventes información ni añadas notas.
Devuelve SOLO el JSON resultante, sin comentarios ni bloque de código markdown:

${JSON.stringify(chunk)}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return extractJson<Record<string, unknown>>(text);
}

export async function askBot(systemPrompt: string, userMessage: string) {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}
