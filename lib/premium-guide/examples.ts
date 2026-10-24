// Few-shot material for AI-written premium guides (welcokit.guide/v1).
//
// Taken from the hand-made Sol Muralla and Carihuela Cristal guides (the
// English originals) so the model sees what "good" looks like: the hosts'
// voice, a concrete tip per place, walking distance, real Google ratings.
// Only public venue information is included here — nothing about the
// hosts' own address, contacts or photos, since this file ships in the repo.

export const PREMIUM_STYLE_RULES = `
Estilo de las guías premium de WelcoKit (síguelo siempre):
1. Voz del anfitrión: primera persona del plural ("nos encanta", "pedid"), cercana, con consejos concretos ("ve antes de las 13:00", "reserva para la puesta de sol").
2. Solo sitios con buena nota en Google. La nota y el número de reseñas son datos reales de Google: NUNCA los inventes. Si no los tienes, no los menciones.
3. Distancias a pie desde el alojamiento, tal como vienen en los datos.
4. Orientación al salir del portal ("gira a la derecha y otra vez a la derecha…") solo si el anfitrión la ha facilitado; no la inventes.
5. Transporte con precio y tiempo, solo con datos reales.
6. Urgencias siempre al final, con el 112 destacado.
7. Avisa de que horarios y precios cambian y conviene comprobarlos en Google Maps.
8. No inventes platos, precios, horarios ni historia que no estén en los datos. Si no hay un dato concreto para el consejo, déjalo vacío antes que rellenarlo con algo genérico.
`.trim();

export interface PremiumExamplePlace {
  name: string;
  address_hint: string | null;
  rating: number | null;
  reviews: string | null;
  distance_label: string | null;
  walk_minutes: number | null;
  tags: string[];
  description_html: string;
  host_tip_html: string | null;
}

// Four place cards in the target shape, from four kinds of place.
export const PREMIUM_EXAMPLE_PLACES: PremiumExamplePlace[] = [
  {
    "name": "El Rinconcillo",
    "address_hint": "C/ Gerona 40",
    "rating": 4.3,
    "reviews": "14,900+",
    "distance_label": "~7 min walk",
    "walk_minutes": 7,
    "tags": [
      "Oldest bar in Seville"
    ],
    "description_html": "Founded in 1670, it's the oldest bar in Seville, with tiled walls, hams hanging from the ceiling and your bill chalked on the wooden bar. The place to try typical Sevillian tapas: spinach with chickpeas (<i>espinacas con garbanzos</i>), cod fritters, <i>pringá</i> and a glass of sherry.",
    "host_tip_html": "stand at the bar for the full experience — or book a table in the dining room. There are lots of other good bars in the streets around it."
  },
  {
    "name": "abba The Roof Giralda",
    "address_hint": "Plaza de la Encarnación",
    "rating": 4.5,
    "reviews": "350+",
    "distance_label": "~14 min walk",
    "walk_minutes": 14,
    "tags": [
      "Views"
    ],
    "description_html": "A stylish rooftop right next to Las Setas, with skyline views, good cocktails and small plates.",
    "host_tip_html": "book a table for sunset."
  },
  {
    "name": "Restaurante Olas de Levante",
    "address_hint": "Calle Bulto",
    "rating": 4.7,
    "reviews": "940+",
    "distance_label": "~1 min walk",
    "walk_minutes": 1,
    "tags": [
      "Family-run"
    ],
    "description_html": "Our next-door gem. A family-run rice and seafood restaurant with generous portions, perfectly cooked fish and real warmth from the owners. Paella with prawns, arroz negro (black rice) and grilled octopus.",
    "host_tip_html": "rice dishes are for a minimum of two people and take ~20–25 min — order a starter while you wait."
  },
  {
    "name": "Sea Life Benalmádena",
    "address_hint": "At Puerto Marina",
    "rating": 4.2,
    "reviews": "10,700+",
    "distance_label": "At the end of the walk",
    "walk_minutes": null,
    "tags": [
      "Great for kids"
    ],
    "description_html": "The aquarium right in the marina: an underwater shark tunnel, sea turtles, jellyfish, seahorses, playful otters and a 'Finding Nemo' area. Compact and easy — the visit takes 45 minutes to an hour.",
    "host_tip_html": "buy tickets online — it's cheaper than at the door (around €18–19 there) and you skip the queue. Last entry is usually around 18:00."
  }
];

// The "leaving the building" callout — the part guests thank hosts for most.
export const PREMIUM_EXAMPLE_ORIENTATION = {
  "kicker": "LEAVING THE BUILDING",
  "title": "Which way?",
  "html": "<strong>Turn right</strong> and, at the end of the street, turn right again: you're on <strong>C/ María Auxiliadora</strong>. Here you'll find Bar Trinidad, the Lidl supermarket and bus stops for lines going all over the city. A butcher's and a greengrocer's are right there at the end of Calle Sol too.<br/><br/><strong>Turn left</strong> and walk to the end of the street: you're heading into the centre — the lively, commercial heart of Seville, full of bars, restaurants and shops."
};

// Rendered for prompts: examples are in English, the output language is the
// property's own; they are a style reference, not text to copy.
export function premiumStyleReference(): string {
  return `${PREMIUM_STYLE_RULES}

Ejemplos de fichas bien escritas (en inglés; son SOLO una referencia de estilo y nivel de detalle —
escribe en el idioma pedido y no copies su contenido ni uses detalles que no estén en tus datos):
${JSON.stringify(PREMIUM_EXAMPLE_PLACES, null, 2)}`;
}
