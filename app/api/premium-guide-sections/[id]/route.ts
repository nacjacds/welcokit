import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authedContext, cleanHtml, invalidDataResponse } from "@/lib/premium-guide/api";
import { notFoundResponse } from "@/lib/apiResponses";

const schema = z
  .object({
    title: z.string().trim().min(1).max(200),
    kicker: z.string().trim().max(200).nullable(),
    intro_html: z.string().trim().max(4000).nullable(),
    is_visible: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authedContext(request);
  if ("error" in ctx) return ctx.error;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidDataResponse(request, ctx.supabase, ctx.user.id);

  const update = { ...parsed.data };
  if (update.intro_html) update.intro_html = cleanHtml(update.intro_html);

  const { data } = await ctx.db.from("guide_sections").update(update).eq("id", id).select("id").maybeSingle();
  if (!data) return notFoundResponse(request, ctx.supabase, ctx.user.id, "block");
  return NextResponse.json({ ok: true });
}
