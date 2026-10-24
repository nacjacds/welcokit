import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notAuthenticatedResponse } from "@/lib/apiResponses";
import { getApiLocale } from "@/lib/apiLocale";
import { apiMessage } from "@/lib/apiMessages";
import { sanitizeGuideHtml } from "./sanitize";

// Shared plumbing of the premium-guide editing routes: authenticate, parse
// the body, and hand back the host's RLS client — every write goes through
// it, so the owner policies on the premium tables decide what's editable
// (a row of someone else's guide simply matches nothing).
export async function authedContext(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: await notAuthenticatedResponse(request, supabase) } as const;
  // The generated Database type doesn't list the premium tables; `db` is the
  // same RLS-scoped client without that typing.
  return { supabase, db: supabase as unknown as SupabaseClient, user } as const;
}

export async function invalidDataResponse(request: NextRequest, supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const locale = await getApiLocale(request, supabase, userId);
  return NextResponse.json({ error: apiMessage("invalidData", locale) }, { status: 400 });
}

// Guide HTML is limited to <strong>/<i>/<em>/<br>/<a href>; anything else is
// stripped on the way in (phone auto-linking only happens when rendering).
export const cleanHtml = (value: string) => sanitizeGuideHtml(value, { linkPhoneNumbers: false });
