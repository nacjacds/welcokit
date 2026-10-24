import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PropertyEditor } from "@/components/editor/PropertyEditor";
import { getRecommendationRegenerationStatus } from "@/lib/recommendations/quota";
import {
  BASE_RECOMMENDATION_CATEGORIES,
  OPTIONAL_RECOMMENDATION_CATEGORIES,
} from "@/lib/recommendations/constants";
import { cheapestPlanWithRecommendationRegenerations } from "@/lib/plans";
import { isSuperAdmin } from "@/lib/admin";
import type { PropertyRecommendationCategory } from "@/types";

const ALL_CATEGORIES: PropertyRecommendationCategory[] = [
  ...BASE_RECOMMENDATION_CATEGORIES,
  ...OPTIONAL_RECOMMENDATION_CATEGORIES,
];

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single();

  if (!property) notFound();

  const { data: blocks } = await supabase
    .from("guide_blocks")
    .select("*")
    .eq("property_id", id)
    .order("order_index");

  const { data: recommendations } = await supabase
    .from("property_recommendations")
    .select("*")
    .eq("property_id", id)
    .order("display_order");

  const { data: recommendationMeta } = await supabase
    .from("property_recommendation_meta")
    .select("categories_detected")
    .eq("property_id", id)
    .maybeSingle();

  const { data: guestLinks } = await supabase
    .from("guest_guide_links")
    .select("*")
    .eq("property_id", id)
    .order("created_at", { ascending: false });

  // Languages this property has a premium guide in (RLS: owner only) — drives
  // the PDF download buttons in the publish panel.
  const { data: premiumGuides } = await supabase
    .from("guides" as never)
    .select("language")
    .eq("property_id", id)
    .order("language");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", property.host_id)
    .single();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const quotaByCategory = await getRecommendationRegenerationStatus(id, ALL_CATEGORIES, {
    planId: profile?.plan,
    isSuperAdmin: isSuperAdmin(user?.email),
    email: user?.email,
  });
  const upgradePlan = cheapestPlanWithRecommendationRegenerations(profile?.plan);

  return (
    <PropertyEditor
      property={property}
      initialBlocks={blocks ?? []}
      initialRecommendations={recommendations ?? []}
      categoriesDetected={recommendationMeta?.categories_detected ?? []}
      recommendationQuotaByCategory={quotaByCategory}
      upgradePlanLabel={upgradePlan?.label ?? null}
      initialGuestLinks={guestLinks ?? []}
      premiumGuideLanguages={((premiumGuides ?? []) as unknown as { language: string }[]).map((g) => g.language)}
    />
  );
}
