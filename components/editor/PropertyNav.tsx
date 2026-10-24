"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn, isActiveNavLink } from "@/lib/utils";

const TABS = [
  { key: "edit", labelKey: "editor", href: (id: string) => `/properties/${id}/edit` },
  { key: "premium", labelKey: "premium", href: (id: string) => `/properties/${id}/premium` },
  { key: "settings", labelKey: "settings", href: (id: string) => `/properties/${id}/settings` },
  { key: "stats", labelKey: "stats", href: (id: string) => `/properties/${id}/stats` },
] as const;

export function PropertyNav({ propertyId, hasPremiumGuide = false }: { propertyId: string; hasPremiumGuide?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("dashboard.editor.nav");

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.filter((tab) => tab.key !== "premium" || hasPremiumGuide).map((tab) => {
        const href = tab.href(propertyId);
        const active = isActiveNavLink(pathname, href);
        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
