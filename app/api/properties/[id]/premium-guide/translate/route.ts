import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authedContext, invalidDataResponse } from "@/lib/premium-guide/api";
import { translateGuideFromEnglish } from "@/lib/premium-guide/translate";
import { notFoundResponse } from "@/lib/apiResponses";
import { getApiLocale } from "@/lib/apiLocale";
import { pick } from "@/lib/apiMessages";
import { ALL_GUIDE_LOCALES } from "@/lib/translations/constants";

// Translating a whole guide section by section takes a while.
export const maxDuration = 300;

const schema = z.object({
  target: z.enum(ALL_GUIDE_LOCALES as unknown as [string, ...string[]]).refine((v) => v !== "en"),
  overwrite: z.boolean().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authedContext(request);
  if ("error" in ctx) return ctx.error;
  const { supabase, db, user } = ctx;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidDataResponse(request, supabase, user.id);
  const target = parsed.data.target as Parameters<typeof translateGuideFromEnglish>[2];
  const locale = await getApiLocale(request, supabase, user.id);

  // Only the property's own host (RLS-scoped lookup).
  const { data: property } = await supabase.from("properties").select("id").eq("id", id).eq("host_id", user.id).single();
  if (!property) return notFoundResponse(request, supabase, user.id, "property");

  if (!parsed.data.overwrite) {
    const { data: existing } = await db.from("guides").select("id").eq("property_id", id).eq("language", target).maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: pick(locale, "Esa versión ya existe", "That version already exists") },
        { status: 409 }
      );
    }
  }

  try {
    const result = await translateGuideFromEnglish(db, id, target);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ENGLISH_GUIDE") {
      return NextResponse.json(
        { error: pick(locale, "Esta propiedad no tiene guía premium en inglés para traducir", "This property has no English premium guide to translate from") },
        { status: 404 }
      );
    }
    console.error("premium guide translation failed", error);
    return NextResponse.json({ error: pick(locale, "No se pudo traducir la guía", "Could not translate the guide") }, { status: 500 });
  }
}
