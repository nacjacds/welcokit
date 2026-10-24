"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { BookingConfirmedIcon, SendLinkIcon, PhoneAccessIcon } from "./AnyPlatformIcons";
import { WaveDivider } from "./WaveDivider";
import { Reveal } from "./motion";

const ICONS = [BookingConfirmedIcon, SendLinkIcon, PhoneAccessIcon];

// Curved dashed connectors between steps — same doodle language as the
// pin-to-card string in GuidePreviewCard.tsx (identical dasharray/orange),
// just reoriented here. Two small SVGs per gap (horizontal + vertical)
// rather than one that redraws itself, so the row-vs-column swap between
// desktop and mobile is a plain Tailwind show/hide instead of recomputing
// a path at render time. `flip` mirrors the curve so consecutive
// connectors read as one flowing line rather than two identical arcs.
function HorizontalConnector({ flip, className }: { flip: boolean; className?: string }) {
  const d = flip ? "M4,26 C24,30 40,6 60,10" : "M4,10 C24,6 40,30 60,26";
  const dotY = flip ? 10 : 26;
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      aria-hidden="true"
      className={cn("-mt-2 h-10 w-16 shrink-0 self-center", className)}
    >
      <path d={d} stroke="#FF4200" strokeWidth="1.75" strokeDasharray="3 4" strokeLinecap="round" />
      <circle cx="60" cy={dotY} r="3" fill="#FAFAF8" stroke="#FF4200" strokeWidth="1.75" />
    </svg>
  );
}

function VerticalConnector({ flip, className }: { flip: boolean; className?: string }) {
  const d = flip ? "M16,2 C28,14 4,26 16,38" : "M16,2 C4,14 28,26 16,38";
  return (
    <svg viewBox="0 0 32 40" fill="none" aria-hidden="true" className={cn("my-4 h-10 w-8", className)}>
      <path d={d} stroke="#FF4200" strokeWidth="1.75" strokeDasharray="3 4" strokeLinecap="round" />
    </svg>
  );
}

export function LandingAnyPlatform() {
  const t = useTranslations("landing.anyPlatform");
  const steps = t.raw("steps") as { label: string }[];

  return (
    <section className="bg-[#FAFAF8] pt-16 sm:pt-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <span className="text-xs font-medium tracking-wide text-[#FF4200] uppercase">
          {t("eyebrow")}
        </span>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-balance text-[#1A1A18] sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-[#6B6B67]">
          {t("body")}
        </p>

        <div className="mt-11 flex flex-col items-center sm:flex-row sm:items-start sm:justify-center">
          {steps.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <Fragment key={step.label}>
                <Reveal delay={i * 0.14} className="flex flex-col items-center sm:w-[200px]">
                  <Icon className="size-20 sm:size-24" />
                  <p className="mt-3 text-base font-medium text-[#1A1A18] sm:text-lg">
                    <strong className="font-bold">{i + 1}</strong> - {step.label}
                  </p>
                </Reveal>
                {i < steps.length - 1 && (
                  <>
                    <VerticalConnector flip={i === 1} className="sm:hidden" />
                    <HorizontalConnector flip={i === 1} className="hidden sm:block" />
                  </>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="mt-14 sm:mt-20">
        <WaveDivider color="#F5EFE6" />
      </div>
    </section>
  );
}
