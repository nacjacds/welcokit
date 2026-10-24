// Public URL of an illustration icon in the guide-assets bucket
// (uploaded by scripts/import-guides.ts under icons/<name>.svg). Works in
// client components: NEXT_PUBLIC_ vars are inlined at build time.
export function guideIconUrl(name: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/guide-assets/icons/${name}.svg`;
}

// Google Maps "directions" target for a place: the exact place when we have
// its Google Place ID, otherwise a plain search by name + area + city.
export function placeMapsUrl(place: {
  name: string;
  address_hint: string | null;
  google_place_id: string | null;
  city: string;
}): string {
  const query = encodeURIComponent([place.name, place.address_hint, place.city].filter(Boolean).join(", "));
  const base = `https://www.google.com/maps/search/?api=1&query=${query}`;
  return place.google_place_id ? `${base}&query_place_id=${encodeURIComponent(place.google_place_id)}` : base;
}
