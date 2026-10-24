"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowRight, Languages, MessageCircle, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuidePreviewCard } from "./GuidePreviewCard";
import { Parallax, TiltCard } from "./motion";

// Small glass chips orbiting the guide card — icons only (no copy to
// translate): AI, languages, QR, WhatsApp. Each floats on its own beat.
const CHIPS = [
  { icon: Sparkles, className: "-top-3 -left-6 sm:-left-12", color: "#FF4200", delay: "0s" },
  { icon: Languages, className: "top-24 -right-5 sm:-right-12", color: "#1B4F72", delay: "-2s" },
  { icon: QrCode, className: "-bottom-4 left-2 sm:-left-10", color: "#1B4F72", delay: "-4s" },
  { icon: MessageCircle, className: "-right-3 -bottom-6 sm:-right-8", color: "#25D366", delay: "-1s" },
] as const;

export function LandingHero() {
  const t = useTranslations("landing.hero");

  return (
    <section className="relative isolate overflow-hidden bg-[#FAFAF8] pt-12 sm:pt-16">
      {/* Atmosphere: faint grid + two blurred brand glows that drift at
          different speeds as you scroll (parallax depth). */}
      <div aria-hidden="true" className="lp-grid pointer-events-none absolute inset-0 -z-10" />
      <Parallax distance={90} className="pointer-events-none absolute -top-24 -right-24 -z-10">
        <div className="lp-orb size-[420px] bg-[#FF4200]/20" />
      </Parallax>
      <Parallax distance={-70} className="pointer-events-none absolute top-40 -left-32 -z-10">
        <div className="lp-orb size-[380px] bg-[#1B4F72]/20" />
      </Parallax>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-16 sm:px-6 sm:pb-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-center lg:text-left"
        >
          <span className="lp-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide text-[#FF4200] uppercase">
            <span className="lp-pulse-dot size-1.5 rounded-full bg-[#FF4200]" />
            {t("eyebrow")}
          </span>
          <h1 className="mt-6 font-serif text-4xl leading-[1.08] font-bold text-balance text-[#1A1A18] sm:text-5xl lg:text-[3.5rem]">
            {t("headline")}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-[#6B6B67] sm:text-lg lg:mx-0">
            {t("subhead")}
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Button
              size="lg"
              className="lp-shine group w-full bg-[#FF4200] text-white shadow-[0_14px_30px_-12px_rgba(255,66,0,0.7)] transition-transform hover:-translate-y-0.5 hover:bg-[#e03a00] sm:w-auto"
              nativeButton={false}
              render={<Link href="/register" />}
            >
              {t("ctaPrimary")}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                strokeWidth={2}
              />
            </Button>
            <a
              href="#features"
              className="group inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[#1B4F72] transition-colors hover:text-[#123a56]"
            >
              {t("ctaSecondary")}
              <ArrowDown
                className="size-4 transition-transform group-hover:translate-y-0.5"
                strokeWidth={1.5}
              />
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98], delay: 0.2 }}
        >
          <Parallax distance={28}>
            <TiltCard className="relative mx-auto w-fit">
              {/* Soft glow under the card. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-6 top-10 -bottom-6 -z-10 rounded-[2rem] bg-[#1B4F72]/25 blur-3xl"
              />
              <GuidePreviewCard />
              {CHIPS.map(({ icon: Icon, className, color, delay }) => (
                <div
                  key={className}
                  aria-hidden="true"
                  style={{ animationDelay: delay }}
                  className={`lp-glass lp-float absolute hidden size-11 items-center justify-center rounded-2xl sm:flex ${className}`}
                >
                  <Icon size={20} strokeWidth={1.75} color={color} />
                </div>
              ))}
            </TiltCard>
          </Parallax>
        </motion.div>
      </div>
    </section>
  );
}
