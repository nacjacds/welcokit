"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ChevronRight, MessageCircle } from "lucide-react";
import { useGuideLocale } from "@/components/guide/GuideLocaleProvider";
import { pickPremiumGuide } from "@/lib/premium-guide/pick";
import { lora, poppins } from "@/lib/premium-guide/fonts";
import type { GuideLocale } from "@/lib/guide-i18n";
import type { PremiumBlock, PremiumGuide, PremiumSection } from "@/lib/premium-guide/types";
import { Callout } from "./Callout";
import { ContactCard, EmergencyMainBlock, EmergencyNumbersBlock } from "./Emergency";
import { GuideIcon } from "./GuideIcon";
import { Html } from "./Html";
import { PlaceCard } from "./PlaceCard";
import "./premium-guide.css";

const FLAGS: Record<GuideLocale, string> = { es: "🇪🇸", en: "🇬🇧", fr: "🇫🇷", it: "🇮🇹", pt: "🇵🇹", nl: "🇳🇱" };

function themeVars(guide: PremiumGuide): React.CSSProperties {
  const theme = guide.theme ?? {};
  return {
    ...(theme.primary && { "--pg-sea": theme.primary }),
    ...(theme.accent && { "--pg-terra": theme.accent }),
    ...(theme.sand && { "--pg-sand": theme.sand }),
    ...(theme.ink && { "--pg-ink": theme.ink }),
  } as React.CSSProperties;
}

function LanguagePills({
  available,
  current,
  onSelect,
}: {
  available: GuideLocale[];
  current: GuideLocale;
  onSelect: (locale: GuideLocale) => void;
}) {
  if (available.length < 2) return null;
  return (
    <div className="pg-sans absolute right-3 top-3 z-10 flex gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md">
      {available.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => onSelect(locale)}
          aria-pressed={locale === current}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-colors ${
            locale === current ? "bg-white/30" : "hover:bg-white/15"
          }`}
        >
          <span className="text-base leading-none">{FLAGS[locale]}</span>
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Cover({ guide }: { guide: PremiumGuide }) {
  const { cover, property } = guide;
  return (
    <header>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover.hero_image}
        alt=""
        className="block max-h-[68vh] w-full object-cover object-bottom"
        fetchPriority="high"
      />
      <div className="mx-auto max-w-3xl px-5 pb-10 pt-6 sm:px-8">
        <p className="pg-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pg-terra)]">{cover.kicker}</p>
        <h1 className="pg-sans mt-2 text-5xl font-bold leading-[1.05] text-[var(--pg-sea)] sm:text-6xl">{cover.title}</h1>
        {cover.subtitle && (
          <p className="pg-sans mt-1 text-2xl font-light text-[var(--pg-sea)] sm:text-3xl">{cover.subtitle}</p>
        )}
        <div className="my-5 h-[3px] w-14 rounded-full bg-[var(--pg-terra)]" />
        <Html html={cover.tagline_html} className="max-w-xl text-base italic leading-relaxed" />
        <div className="pg-sans mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--pg-ink)]">{property.name}</p>
            <p className="text-xs text-neutral-600">{property.address}</p>
          </div>
          <div className="flex -space-x-1">
            {guide.toc.slice(0, 4).map((entry) => (
              <GuideIcon key={entry.id} name={entry.icon} size={36} />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function SectionHeader({ section }: { section: PremiumSection }) {
  return (
    <div className="mb-5">
      {section.banner_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={section.banner_image} alt="" loading="lazy" className="mb-5 block w-full rounded-2xl" />
      )}
      {section.kicker && (
        <p className="pg-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pg-terra)]">{section.kicker}</p>
      )}
      <h2 className="pg-sans mt-1 text-3xl font-bold leading-tight text-[var(--pg-sea)] sm:text-4xl">{section.title}</h2>
      <Html html={section.intro_html} className="mt-3 text-base italic leading-relaxed" />
    </div>
  );
}

function Block({ block, city }: { block: PremiumBlock; city: string }) {
  switch (block.type) {
    case "place":
      return <PlaceCard place={block} city={city} />;
    case "callout":
      return <Callout {...block} />;
    case "text":
      return <Html html={block.html} className="text-base leading-relaxed" />;
    case "subheading":
      return <h3 className="pg-sans pt-2 text-xl font-semibold text-[var(--pg-sea)]">{block.text}</h3>;
    case "contact":
      return <ContactCard block={block} />;
    case "emergency_main":
      return <EmergencyMainBlock block={block} />;
    case "emergency_numbers":
      return <EmergencyNumbersBlock block={block} />;
    case "image":
    case "illustration":
      return (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt="" loading="lazy" className="block w-full rounded-2xl" />
          <Html html={block.caption_html} className="mt-2 text-xs leading-snug text-neutral-600" />
        </figure>
      );
    case "signoff":
      return <p className="pg-sans pt-4 text-center text-lg font-semibold text-[var(--pg-sea)]">{block.text}</p>;
  }
}

function BlockList({ blocks, city }: { blocks: PremiumBlock[]; city: string }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => (
        <Block key={index} block={block} city={city} />
      ))}
    </div>
  );
}

function Section({ section, city }: { section: PremiumSection; city: string }) {
  return (
    <section id={`section-${section.id}`} className="scroll-mt-4 py-8">
      <SectionHeader section={section} />
      <BlockList blocks={section.blocks} city={city} />
    </section>
  );
}

// The welcome section reads as: our intro text, then the clickable index,
// then the illustrated map, then the rest ("good to know" notes...).
function WelcomeSection({ guide, section }: { guide: PremiumGuide; section: PremiumSection }) {
  const [intro, ...rest] = section.blocks;
  const city = guide.property.city;
  return (
    <section id={`section-${section.id}`} className="scroll-mt-4 py-8">
      <SectionHeader section={section} />
      {intro && <BlockList blocks={[intro]} city={city} />}
      <div className="my-6">
        <Index guide={guide} />
      </div>
      {guide.map_image && (
        // The kit's map_note is a developer note about the PDF pipeline, not guest-facing text.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={guide.map_image} alt="" loading="lazy" className="mb-6 block w-full rounded-2xl" />
      )}
      <BlockList blocks={rest} city={city} />
    </section>
  );
}

function Index({ guide }: { guide: PremiumGuide }) {
  const { t } = useGuideLocale();
  return (
    <div id="index" className="scroll-mt-4 py-2">
      <div className="pg-sans mb-3 flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-base font-semibold text-[var(--pg-terra)]">{t("premiumInThisGuide")}</h3>
        <span className="text-xs text-neutral-500">{t("premiumJumpHint")}</span>
      </div>
      <nav className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {guide.toc.map((entry) => (
          <a
            key={entry.id}
            href={`#section-${entry.id}`}
            className="pg-sans flex items-center gap-3 rounded-full bg-white p-1.5 pr-4 text-[13px] font-medium text-[var(--pg-ink)] shadow-[2px_3px_0_var(--pg-sand2)]"
          >
            <GuideIcon name={entry.icon} size={32} />
            <span className="min-w-0 flex-1 underline underline-offset-2">{entry.title}</span>
            <ChevronRight className="size-4 shrink-0" style={{ color: entry.color }} strokeWidth={2.5} />
          </a>
        ))}
      </nav>
    </div>
  );
}

function BackToIndexButton() {
  const { t } = useGuideLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const index = document.getElementById("index");
    if (!index) return;
    // Visible once the index has scrolled off the top of the screen.
    const onScroll = () => setVisible(index.getBoundingClientRect().bottom < 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;
  return (
    <a
      href="#index"
      className="pg-sans fixed bottom-4 left-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-[var(--pg-sea)] px-4 py-2.5 text-[13px] font-semibold text-white underline shadow-lg"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <ArrowUp className="size-4" strokeWidth={2.5} />
      {t("premiumBackToIndex")}
    </a>
  );
}

export function PremiumGuideView({
  guides,
}: {
  guides: Partial<Record<GuideLocale, PremiumGuide>>;
}) {
  const { locale, setLocale, sourceLocale, t } = useGuideLocale();
  const guide = pickPremiumGuide(guides, locale, sourceLocale);
  if (!guide) return null;

  const available = (Object.keys(guides) as GuideLocale[]).sort();
  const whatsappDigits = guide.property.whatsapp?.replace(/\D/g, "");
  const welcome = guide.sections.find((s) => s.id === "welcome");
  const rest = guide.sections.filter((s) => s.id !== "welcome");

  return (
    <div className={`pg-root ${poppins.variable} ${lora.variable} relative pb-24`} style={themeVars(guide)}>
      <LanguagePills available={available} current={guide.language} onSelect={setLocale} />
      <Cover guide={guide} />

      <main className="mx-auto max-w-3xl px-5 sm:px-8">
        {welcome && <WelcomeSection guide={guide} section={welcome} />}
        {!welcome && <Index guide={guide} />}
        {rest.map((section) => (
          <Section key={section.id} section={section} city={guide.property.city} />
        ))}

        {whatsappDigits && (
          <div className="py-8">
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pg-sans inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white underline shadow-md"
            >
              <MessageCircle className="size-5" strokeWidth={2} />
              {t("premiumWhatsAppHost")}
            </a>
          </div>
        )}
      </main>
      <BackToIndexButton />
    </div>
  );
}
