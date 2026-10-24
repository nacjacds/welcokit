import type { GuideLocale } from "@/lib/guide-i18n";

export type { GuideLocale };

// Every locale the guest-facing guide can be viewed in. Adding a 7th
// locale later means adding it here (and to lib/guide-i18n.ts's
// GuideLocale union) — everything downstream (isGuideLocale,
// guideTargetLocalesFor, LOCALE_NAMES, RECOMMENDATIONS_TARGET_LOCALES)
// derives from this single list rather than hardcoding locale pairs.
export const ALL_GUIDE_LOCALES: readonly GuideLocale[] = ["es", "en", "fr", "it", "pt", "nl"];

export function isGuideLocale(value: string): value is GuideLocale {
  return (ALL_GUIDE_LOCALES as readonly string[]).includes(value);
}

// properties.language is the authoritative record of which language a
// given property's guide_blocks/welcome_message were actually authored
// in (see app/api/ai/generate-content/route.ts, which now writes it at
// generation time). Falls back to "es" for any row where it's missing or
// unrecognized — matches the DB column default, so pre-existing
// properties keep working exactly as before this per-property
// source-locale system existed.
export function resolvePropertySourceLocale(language: string | null | undefined): GuideLocale {
  return language && isGuideLocale(language) ? language : "es";
}

// Every locale a piece of source-language content needs a translation
// generated for — all guide locales except the one it's already written
// in. Fires N-1 background translateContent() calls per save (see
// trigger.ts) instead of the single opposite-locale call from when only
// es/en existed.
export function guideTargetLocalesFor(sourceLocale: GuideLocale): GuideLocale[] {
  return ALL_GUIDE_LOCALES.filter((locale) => locale !== sourceLocale);
}

export const LOCALE_NAMES: Record<GuideLocale, string> = {
  es: "Spanish",
  en: "English",
  fr: "French",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
};

// property_recommendations descriptions are written by
// curateRecommendations()/describeManualPlace() (lib/claude.ts), which are
// deliberately hardcoded to always write in Spanish regardless of the
// host's dashboard_locale (see the comment on curateRecommendations) — so
// unlike guide_blocks/welcome_message, this pathway's source doesn't
// follow properties.language. The target list is still every other guide
// locale, same as guideTargetLocalesFor.
export const RECOMMENDATIONS_SOURCE_LOCALE: GuideLocale = "es";
export const RECOMMENDATIONS_TARGET_LOCALES: readonly GuideLocale[] =
  guideTargetLocalesFor(RECOMMENDATIONS_SOURCE_LOCALE);
