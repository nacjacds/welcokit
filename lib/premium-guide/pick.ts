import type { GuideLocale } from "@/lib/guide-i18n";
import type { PremiumGuide } from "./types";

// Which language of the premium guides to show: the guest's choice if it
// exists, else the property's own language, else English, else whatever
// there is.
export function pickPremiumGuide(
  guides: Partial<Record<GuideLocale, PremiumGuide>>,
  locale: GuideLocale,
  sourceLocale: GuideLocale
): PremiumGuide | null {
  return guides[locale] ?? guides[sourceLocale] ?? guides.en ?? Object.values(guides)[0] ?? null;
}
