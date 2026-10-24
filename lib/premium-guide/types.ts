// Resolved shape of a premium guide (welcokit.guide/v1) as the guest UI
// consumes it: the rows of guides / guide_sections / guide_places / places
// already stitched back into one document per language. The block
// vocabulary mirrors docs/guides-kit/schema/guide.ts.

import type { GuideLocale } from "@/lib/guide-i18n";

export interface PremiumTheme {
  primary?: string;
  accent?: string;
  sand?: string;
  ink?: string;
}

export interface PremiumPropertyInfo {
  name: string;
  city: string;
  address: string;
  hosts: string;
  whatsapp: string | null;
}

export interface PremiumCover {
  kicker: string;
  title: string;
  subtitle: string | null;
  tagline_html: string | null;
  hero_image: string;
}

export interface PremiumTocEntry {
  id: string;
  title: string;
  icon: string;
  color: string;
}

export interface PremiumPlaceBlock {
  type: "place";
  name: string;
  address_hint: string | null;
  icon: string | null;
  rating: number | null;
  reviews: string | null;
  distance_label: string | null;
  walk_minutes: number | null;
  tags: string[];
  description_html: string;
  host_tip_html: string | null;
  accent_color: string | null;
  google_place_id: string | null;
  lat: number | null;
  lng: number | null;
}

export type PremiumBlock =
  | PremiumPlaceBlock
  | { type: "text"; html: string }
  | { type: "callout"; icon: string; kicker: string; title: string; html: string }
  | { type: "subheading"; text: string }
  | { type: "contact"; title: string; details: string; phone: string | null; tel: string | null }
  | { type: "emergency_main"; number: string; title: string; html: string; tel: string }
  | {
      type: "emergency_numbers";
      items: { number: string; title: string; subtitle: string; tel: string }[];
    }
  | { type: "image"; src: string; caption_html: string }
  | { type: "illustration"; src: string; caption_html: string }
  | { type: "signoff"; text: string };

export interface PremiumSection {
  id: string;
  title: string;
  kicker: string | null;
  intro_html: string | null;
  banner_image: string | null;
  blocks: PremiumBlock[];
}

export interface PremiumGuide {
  language: GuideLocale;
  property: PremiumPropertyInfo;
  cover: PremiumCover;
  toc: PremiumTocEntry[];
  theme: PremiumTheme | null;
  map_image: string | null;
  map_note: string | null;
  sections: PremiumSection[];
}
