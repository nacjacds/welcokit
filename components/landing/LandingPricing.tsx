"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { WaveDivider } from "./WaveDivider";
import { Reveal, SpotlightCard } from "./motion";

const HIGHLIGHTED_PLAN_ID = "pro";

export function LandingPricing() {
  const t = useTranslations("landing.pricing");

  return (
    <section className="bg-[#FAFAF8] pt-16 pb-0 sm:pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mb-12 text-center">
          <span className="text-xs font-medium tracking-wide text-[#FF4200] uppercase">
            {t("eyebrow")}
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-balance text-[#1A1A18] sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-base text-[#6B6B67]">{t("subtitle")}</p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((planId, i) => {
            const plan = PLANS[planId];
            const highlighted = planId === HIGHLIGHTED_PLAN_ID;
            const features = t.raw(`planFeatures.${planId}`) as string[];

            return (
              <SpotlightCard
                key={planId}
                delay={i * 0.07}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  highlighted
                    ? "lp-gradient-border shadow-[0_24px_60px_-28px_rgba(255,66,0,0.45)]"
                    : "border-[#DDD8CC] bg-white/70"
                }`}
              >
                {highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FF4200] px-3 py-1 text-[11px] font-medium whitespace-nowrap text-white">
                    {t("mostPopular")}
                  </span>
                )}
                <p className="text-sm font-medium text-[#1B4F72]">{plan.label}</p>
                <p className="mt-2 mb-4">
                  <span className="font-serif text-3xl font-bold text-[#1A1A18]">
                    {plan.priceEurMonth}€
                  </span>
                  <span className="text-sm text-[#6B6B67]">{t("perMonth")}</span>
                </p>
                <ul className="mb-6 flex-1 space-y-2.5">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[#1A1A18]">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-[#FF4200]"
                        strokeWidth={1.5}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={highlighted ? "default" : "outline"}
                  className={
                    highlighted
                      ? "w-full bg-[#FF4200] text-white hover:bg-[#e03a00]"
                      : "w-full border-[#1B4F72] text-[#1B4F72] hover:bg-[#1B4F72]/5"
                  }
                  nativeButton={false}
                  render={<Link href="/register" />}
                >
                  {planId === "free" ? t("cta") : t("ctaPaid", { plan: plan.label })}
                </Button>
              </SpotlightCard>
            );
          })}
        </div>
      </div>

      <div className="mt-14 sm:mt-20">
        <WaveDivider color="#1B4F72" />
      </div>
    </section>
  );
}
