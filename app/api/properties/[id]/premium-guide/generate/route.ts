import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { authedContext } from "@/lib/premium-guide/api";
import { generatePremiumGuideDraft } from "@/lib/premium-guide/generateDraft";
import { resolvePropertySourceLocale } from "@/lib/translations/constants";
import { isSuperAdmin } from "@/lib/admin";
import { notAuthorizedResponse, notFoundResponse } from "@/lib/apiResponses";
import { getApiLocale } from "@/lib/apiLocale";
import { pick } from "@/lib/apiMessages";

// Writing a draft guide calls Claude once for the whole copy.
export const maxDuration = 120;

// Creates an AI draft premium guide (source = 'ai') for a property that has
// none, from its Google Places recommendations. Premium guides are a
// service WelcoKit prepares for its hosts, so for now only a superadmin can
// start one; it writes with the service role because it also fills the
// shared `places` catalogue, which hosts themselves can't write.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authedContext(request);
  if ("error" in ctx) return ctx.error;
  const { supabase, user } = ctx;

  if (!isSuperAdmin(user.email)) return notAuthorizedResponse(request, supabase, user.id);
  const locale = await getApiLocale(request, supabase, user.id);

  const db = createServiceRoleClient() as unknown as SupabaseClient;
  const { data: property } = await db.from("properties").select("id, host_id, language").eq("id", id).is("deleted_at", null).single();
  if (!property) return notFoundResponse(request, supabase, user.id, "property");

  const language = resolvePropertySourceLocale(property.language);
  const { data: existing } = await db.from("guides").select("id").eq("property_id", id).eq("language", language).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: pick(locale, "Ya existe una guía premium en ese idioma", "A premium guide already exists in that language") }, { status: 409 });
  }

  const { data: host } = await db.from("profiles").select("full_name").eq("id", property.host_id).single();

  try {
    const result = await generatePremiumGuideDraft(db, id, host?.full_name ?? null);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_RECOMMENDATIONS") {
      return NextResponse.json(
        { error: pick(locale, "Primero genera las recomendaciones locales de esta propiedad", "Generate this property's local recommendations first") },
        { status: 422 }
      );
    }
    console.error("premium guide draft failed", error);
    return NextResponse.json({ error: pick(locale, "No se pudo generar el borrador", "Could not generate the draft") }, { status: 500 });
  }
}
