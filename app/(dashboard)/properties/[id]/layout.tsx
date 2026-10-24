import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { PropertyNav } from "@/components/editor/PropertyNav";
import { PropertyBreadcrumbLink } from "@/components/editor/PropertyBreadcrumbLink";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Scoped to host_id: properties are also readable by anyone when
  // published (RLS "properties_select_published"), so an unfiltered query
  // here would leak other hosts' property names to anyone who guesses an
  // id. This check is what actually gates access to all four tabs.
  const { data: property } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", id)
    .eq("host_id", user?.id ?? "")
    .is("deleted_at", null)
    .single();

  if (!property) notFound();

  // The "Guía premium" tab only exists for properties that have one.
  const { count: premiumGuideCount } = await (supabase as unknown as SupabaseClient)
    .from("guides")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id);

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <PropertyBreadcrumbLink />
          <span aria-hidden>&gt;</span>
          <span>{property.name}</span>
        </nav>
        <h1 className="text-2xl font-semibold">{property.name}</h1>
      </div>

      {/*
        Mount point for the "Enlaces para huéspedes" trigger on mobile —
        PropertyEditor.tsx (Editor tab only) portals GuestLinksDialog in
        here so it renders between the name and the tabs, matching the
        desktop position's sibling markup without this shared,
        cross-tab layout needing to fetch extra property fields itself.
        Empty (and inert) on the other tabs, since only the Editor tab
        portals into it.
      */}
      <div id="guide-actions-mobile-slot" className="md:hidden" />

      <PropertyNav propertyId={id} hasPremiumGuide={(premiumGuideCount ?? 0) > 0} />

      {/*
        The property-actions sidebar (publish toggle, share, QR, cover
        image, WhatsApp, Airbnb import) lives only on the Editor tab, not
        here. AirbnbImportPanel needs to sync newly created/updated blocks
        into PropertyEditor's live block list — that state only exists on
        the Editor page, so hoisting the sidebar here would either break
        that sync or force it into a no-op on the other three tabs. This is
        a deliberate choice, not an oversight.
      */}
      {children}
    </div>
  );
}
