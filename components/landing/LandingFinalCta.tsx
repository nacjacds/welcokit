"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Parallax, Reveal } from "./motion";

export function LandingFinalCta() {
  const t = useTranslations("landing.finalCta");

  return (
    <section className="relative isolate overflow-hidden bg-[#1B4F72]">
      <div aria-hidden="true" className="lp-grid-dark pointer-events-none absolute inset-0 -z-10" />
      <Parallax distance={70} className="pointer-events-none absolute -top-20 -left-20 -z-10">
        <div className="lp-orb size-[360px] bg-[#3B8BC2]/40" />
      </Parallax>
      <Parallax distance={-60} className="pointer-events-none absolute -right-24 -bottom-24 -z-10">
        <div className="lp-orb size-[340px] bg-white/15" />
      </Parallax>
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <Reveal>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-white.svg"
            alt="WelcoKit"
            style={{ width: "150px", height: "auto" }}
            className="lp-float mx-auto mb-6"
          />
          <h2 className="font-serif text-3xl font-semibold text-balance text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-base text-white/80">{t("subtitle")}</p>
          <Button
            size="lg"
            className="lp-shine mt-8 bg-[#FF4200] text-white shadow-[0_14px_34px_-12px_rgba(255,66,0,0.8)] transition-transform hover:-translate-y-0.5 hover:bg-[#e03a00]"
            nativeButton={false}
            render={<Link href="/register" />}
          >
            {t("cta")}
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
