"use client";

import { MapPin, Star } from "lucide-react";
import { useGuideLocale } from "@/components/guide/GuideLocaleProvider";
import { placeMapsUrl } from "@/lib/premium-guide/assets";
import type { PremiumPlaceBlock } from "@/lib/premium-guide/types";
import { GuideIcon } from "./GuideIcon";
import { Html } from "./Html";

function Stars({ rating }: { rating: number }) {
  const percent = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span className="relative inline-flex" aria-hidden>
      <span className="flex text-[var(--pg-sand2)]">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="size-3.5 fill-current" strokeWidth={0} />
        ))}
      </span>
      <span className="absolute inset-y-0 left-0 flex overflow-hidden text-[var(--pg-sun2)]" style={{ width: `${percent}%` }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="size-3.5 shrink-0 fill-current" strokeWidth={0} />
        ))}
      </span>
    </span>
  );
}

export function PlaceCard({ place, city }: { place: PremiumPlaceBlock; city: string }) {
  const { t } = useGuideLocale();
  const accent = place.accent_color ?? "var(--pg-terra)";
  const mapsUrl = placeMapsUrl({ ...place, city });

  return (
    <article className="pg-card p-4 sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        <GuideIcon name={place.icon} size={52} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="pg-sans flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="text-[17px] font-semibold leading-snug text-[var(--pg-ink)]">{place.name}</h3>
            {place.address_hint && <span className="text-xs text-neutral-500">{place.address_hint}</span>}
          </div>

          {place.rating !== null && (
            <div className="pg-sans mt-1 flex flex-wrap items-center gap-x-2 text-xs text-neutral-600">
              <Stars rating={place.rating} />
              <span className="font-semibold text-[var(--pg-ink)]">{place.rating.toFixed(1)}</span>
              {place.reviews && (
                <span>
                  {place.reviews} {t("premiumReviews")}
                </span>
              )}
            </div>
          )}

          {(place.distance_label || place.tags.length > 0) && (
            <div className="pg-sans mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-white">
              {place.distance_label && (
                <span className="rounded-full bg-[var(--pg-turq)] px-2.5 py-0.5">{place.distance_label}</span>
              )}
              {place.tags.map((tag, index) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-0.5"
                  style={{ background: index === 0 ? accent : "#9aa3ab" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="sm:pl-[68px]">
        <Html html={place.description_html} className="mt-3 text-[15px] leading-relaxed sm:mt-2.5" />

        {place.host_tip_html && (
          <p className="pg-sans mt-2 text-[13px] leading-snug text-[var(--pg-tip)]">
            <strong className="font-semibold">{t("premiumOurTip")}</strong>{" "}
            <Html as="span" html={place.host_tip_html} />
          </p>
        )}

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pg-sans mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--pg-sea)] underline underline-offset-2"
        >
          <MapPin className="size-4" strokeWidth={2} />
          {t("directions")}
        </a>
      </div>
    </article>
  );
}
