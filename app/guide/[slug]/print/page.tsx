import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { GuideLocaleProvider } from "@/components/guide/GuideLocaleProvider";
import { PremiumGuideView } from "@/components/premium-guide/PremiumGuideView";
import { fetchPremiumGuides } from "@/lib/premium-guide/fetch";
import { pickPremiumGuide } from "@/lib/premium-guide/pick";
import { verifyPrintToken } from "@/lib/premium-guide/printToken";
import { isGuideLocale, resolvePropertySourceLocale } from "@/lib/translations/constants";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Print-optimised rendering of a premium guide, loaded by the headless
// browser that builds the PDF (lib/premium-guide/pdf.ts) — ?lang=xx picks
// the language. Anyone can open it for a published guide (same content as the
// public guide); for an unpublished one it needs the short-lived ?pt= token
// the PDF endpoint signs for the property's host.
export default async function PrintGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string; pt?: string }>;
}) {
  const { slug } = await params;
  const { lang, pt } = await searchParams;

  const { data: property } = await createServiceRoleClient()
    .from("properties")
    .select("id, language, is_published, deleted_at")
    .eq("slug", slug)
    .single();

  if (!property || property.deleted_at) notFound();
  if (!property.is_published && !verifyPrintToken(pt, property.id)) notFound();

  const guides = await fetchPremiumGuides(property.id);
  const requested = lang && isGuideLocale(lang) ? lang : resolvePropertySourceLocale(property.language);
  const guide = pickPremiumGuide(guides, requested, resolvePropertySourceLocale(property.language));
  if (!guide) notFound();

  // The layout's provider follows the guest's stored language; the PDF has to
  // follow the requested one, so it gets its own pinned provider.
  return (
    <GuideLocaleProvider propertyId={property.id} sourceLocale={guide.language} forcedLocale={guide.language}>
      <PremiumGuideView guides={{ [guide.language]: guide }} printLanguage={guide.language} />
    </GuideLocaleProvider>
  );
}
