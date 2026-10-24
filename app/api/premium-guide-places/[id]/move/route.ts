import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authedContext, invalidDataResponse } from "@/lib/premium-guide/api";
import { notFoundResponse } from "@/lib/apiResponses";

const schema = z.object({ direction: z.enum(["up", "down"]) });

// Moves a place one slot up or down inside its section by swapping its
// position with the neighbouring place's. Places and the section's other
// blocks (text, callouts) share one position sequence, so swapping only
// place slots reorders the cards without disturbing what sits between them.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authedContext(request);
  if ("error" in ctx) return ctx.error;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return invalidDataResponse(request, ctx.supabase, ctx.user.id);

  const { supabase, db, user } = ctx;
  const { data: place } = await db.from("guide_places").select("id, section_id, position").eq("id", id).maybeSingle();
  if (!place) return notFoundResponse(request, supabase, user.id, "place");

  const { data: siblings } = await db
    .from("guide_places")
    .select("id, position")
    .eq("section_id", place.section_id)
    .order("position");
  const list = (siblings ?? []) as { id: string; position: number }[];
  const index = list.findIndex((p) => p.id === id);
  const neighbour = list[parsed.data.direction === "up" ? index - 1 : index + 1];
  if (!neighbour) return NextResponse.json({ ok: true, moved: false });

  // (section_id, position) is unique, so park one of them out of the way first.
  const parked = -1 - place.position;
  const steps = [
    db.from("guide_places").update({ position: parked }).eq("id", place.id),
    db.from("guide_places").update({ position: place.position }).eq("id", neighbour.id),
    db.from("guide_places").update({ position: neighbour.position }).eq("id", place.id),
  ];
  for (const step of steps) {
    const { error } = await step;
    if (error) return NextResponse.json({ error: "No se pudo reordenar" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, moved: true });
}
