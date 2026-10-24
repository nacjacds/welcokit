import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authedContext, invalidDataResponse } from "@/lib/premium-guide/api";
import { notFoundResponse } from "@/lib/apiResponses";

const schema = z.object({ reviewed_by_native: z.boolean() });

// Marks a language of the premium guide as reviewed (or pending review) by a native speaker.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authedContext(request);
  if ("error" in ctx) return ctx.error;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidDataResponse(request, ctx.supabase, ctx.user.id);

  const { data } = await ctx.db
    .from("guides")
    .update({ reviewed_by_native: parsed.data.reviewed_by_native })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (!data) return notFoundResponse(request, ctx.supabase, ctx.user.id, "guide");
  return NextResponse.json({ ok: true });
}
