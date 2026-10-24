import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateGuidePdf } from "@/lib/premium-guide/pdf";
import { isGuideLocale } from "@/lib/translations/constants";
import { notAuthenticatedResponse, notFoundResponse } from "@/lib/apiResponses";

// Building a PDF drives a headless browser through the whole guide.
export const maxDuration = 90;

const querySchema = z.object({
  lang: z.string().refine(isGuideLocale, "Idioma no válido"),
  force: z.enum(["1"]).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notAuthenticatedResponse(request, supabase);

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Parámetros no válidos" }, { status: 400 });
  }

  // RLS-scoped lookup: only the property's own host gets a row back.
  const { data: property } = await supabase
    .from("properties")
    .select("id, name, slug")
    .eq("id", id)
    .eq("host_id", user.id)
    .single();
  if (!property) return notFoundResponse(request, supabase, user.id, "property");

  try {
    const pdf = await getOrCreateGuidePdf({
      propertyId: property.id,
      slug: property.slug,
      language: parsed.data.lang as Parameters<typeof getOrCreateGuidePdf>[0]["language"],
      propertyName: property.name,
      force: parsed.data.force === "1",
    });
    if (!pdf) return NextResponse.json({ error: "Esta propiedad no tiene guía premium en ese idioma" }, { status: 404 });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="guia-${property.slug}-${parsed.data.lang}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("premium-guide-pdf failed", error);
    return NextResponse.json({ error: "No se pudo generar el PDF" }, { status: 500 });
  }
}
