"use client";

import { useTranslations } from "next-intl";
import { HandDrawnCheck, HandDrawnCross } from "./HandDrawnMark";
import { Reveal } from "./motion";

export function LandingProblemSolution() {
  const t = useTranslations("landing.problem");
  const before = t.raw("before") as string[];
  const after = t.raw("after") as string[];

  return (
    <section className="relative overflow-hidden bg-[#F5EFE6] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <span className="text-xs font-medium tracking-wide text-[#FF4200] uppercase">
            {t("eyebrow")}
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-balance text-[#1A1A18] sm:text-4xl">
            {t("title")}
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 sm:items-stretch lg:gap-8">
          <Reveal x={-28} y={0} className="rounded-2xl border border-[#DDD8CC] bg-white/60 p-6 sm:p-7">
            <p className="mb-5 text-xs font-medium tracking-wide text-[#6B6B67] uppercase">
              {t("beforeLabel")}
            </p>
            <ul className="space-y-4">
              {before.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[#6B6B67]">
                  <HandDrawnCross className="mt-0 size-6 shrink-0 text-[#FF4200]" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal x={28} y={0} delay={0.1} className="rounded-2xl border border-[#1B4F72]/15 bg-white p-6 shadow-[0_20px_50px_-25px_rgba(27,79,114,0.35)] sm:p-7">
            <p className="mb-5 text-xs font-medium tracking-wide text-[#1B4F72] uppercase">
              {t("afterLabel")}
            </p>
            <ul className="space-y-4">
              {after.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-[#1A1A18]">
                  <HandDrawnCheck className="mt-0 size-6 shrink-0 text-[#5B7B52]" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
