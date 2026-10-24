import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authedContext, cleanHtml, invalidDataResponse } from "@/lib/premium-guide/api";
import { notFoundResponse } from "@/lib/apiResponses";

const schema = z
  .object({
    description_html: z.string().trim().min(1).max(4000),
    host_tip_html: z.string().trim().max(2000).nullable(),
    is_visible: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0);

// Edits one place card of a premium guide: its description, the host's
// "Nuestro consejo" line, or whether it shows at all.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authedContext(request);
  if ("error" in ctx) return ctx.error;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidDataResponse(request, ctx.supabase, ctx.user.id);

  const update = { ...parsed.data };
  if (update.description_html) update.description_html = cleanHtml(update.description_html);
  if (update.host_tip_html) update.host_tip_html = cleanHtml(update.host_tip_html);
  if (update.host_tip_html === "") update.host_tip_html = null;

  const { data } = await ctx.db.from("guide_places").update(update).eq("id", id).select("id").maybeSingle();
  if (!data) return notFoundResponse(request, ctx.supabase, ctx.user.id, "place");
  return NextResponse.json({ ok: true });
}
