import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { PremiumGuideEditor } from "@/components/editor/PremiumGuideEditor";
import { loadEditableGuides } from "@/lib/premium-guide/editor";

export default async function PremiumGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Ownership of the property is already guarded by the parent layout; the
  // owner RLS policies on the premium tables scope the guide rows too.
  const guides = await loadEditableGuides(supabase as unknown as SupabaseClient, id);
  if (guides.length === 0) notFound();

  return <PremiumGuideEditor propertyId={id} initialGuides={guides} />;
}
