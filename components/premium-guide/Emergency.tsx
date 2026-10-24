"use client";

import { Phone } from "lucide-react";
import { useGuideLocale } from "@/components/guide/GuideLocaleProvider";
import type { PremiumBlock } from "@/lib/premium-guide/types";
import { Html } from "./Html";

type EmergencyMain = Extract<PremiumBlock, { type: "emergency_main" }>;
type EmergencyNumbers = Extract<PremiumBlock, { type: "emergency_numbers" }>;
type ContactBlock = Extract<PremiumBlock, { type: "contact" }>;

export function EmergencyMainBlock({ block }: { block: EmergencyMain }) {
  return (
    <a
      href={block.tel}
      className="flex items-center gap-4 rounded-2xl bg-[var(--pg-danger)] p-5 text-white shadow-[3px_4px_0_rgba(0,0,0,0.15)] sm:gap-6 sm:p-6"
    >
      <span className="pg-sans text-6xl font-bold leading-none sm:text-7xl">{block.number}</span>
      <span className="min-w-0">
        <span className="pg-sans block text-lg font-bold leading-tight">{block.title}</span>
        <Html as="span" html={block.html} className="mt-1 block text-sm leading-snug text-white/95 [&_a]:text-white" />
      </span>
    </a>
  );
}

export function EmergencyNumbersBlock({ block }: { block: EmergencyNumbers }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {block.items.map((item) => (
        <a key={item.number + item.title} href={item.tel} className="pg-card flex flex-col gap-0.5 p-3.5 active:translate-y-px">
          <span className="pg-sans text-xl font-bold text-[var(--pg-danger)]">{item.number}</span>
          <span className="pg-sans text-sm font-semibold leading-tight text-[var(--pg-ink)]">{item.title}</span>
          <span className="text-xs leading-snug text-neutral-600">{item.subtitle}</span>
        </a>
      ))}
    </div>
  );
}

export function ContactCard({ block }: { block: ContactBlock }) {
  const { t } = useGuideLocale();
  return (
    <div className="pg-card p-4">
      <h4 className="pg-sans text-[15px] font-semibold leading-snug text-[var(--pg-ink)]">{block.title}</h4>
      <p className="mt-1 text-sm leading-relaxed text-neutral-700">{block.details}</p>
      {block.tel && block.phone && (
        <a
          href={block.tel}
          className="pg-sans mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--pg-sea)] underline underline-offset-2"
        >
          <Phone className="size-4" strokeWidth={2} />
          {t("premiumCall")} {block.phone}
        </a>
      )}
    </div>
  );
}
