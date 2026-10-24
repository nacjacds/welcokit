"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Reveal } from "./motion";

export function LandingHowItWorks() {
  const t = useTranslations("landing.howItWorks");
  const steps = t.raw("steps") as { title: string; description: string }[];

  return (
    <section className="bg-[#F5EFE6] py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Reveal className="mb-14 text-center">
          <span className="text-xs font-medium tracking-wide text-[#FF4200] uppercase">
            {t("eyebrow")}
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-balance text-[#1A1A18] sm:text-4xl">
            {t("title")}
          </h2>
        </Reveal>

        <div className="relative grid gap-10 sm:grid-cols-3 sm:gap-6">
          <div aria-hidden="true" className="absolute top-6 right-0 left-0 hidden h-px bg-[#DDD8CC] sm:block" />
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            className="absolute top-6 right-0 left-0 hidden h-px origin-left bg-gradient-to-r from-[#1B4F72] via-[#FF4200] to-[#1B4F72] sm:block"
          />
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              className="relative text-center"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.2 + i * 0.25 }}
                className="relative z-10 mx-auto mb-4 flex size-12 items-center justify-center rounded-full border-2 border-[#1B4F72] bg-[#F5EFE6] font-sans text-2xl font-bold text-[#1B4F72] shadow-[0_0_0_6px_rgba(245,239,230,1),0_10px_24px_-10px_rgba(27,79,114,0.5)]"
              >
                {i + 1}
              </motion.div>
              <h3 className="mb-1.5 text-base font-semibold text-[#1A1A18]">{step.title}</h3>
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-[#6B6B67]">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
