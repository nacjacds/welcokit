"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/shared/LocaleProvider";
import { LocaleSwitcher } from "@/components/shared/LocaleSwitcher";

export function LandingHeader() {
  const t = useTranslations("landing.nav");
  const { locale, setLocale } = useLocale();
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));
  // So "< Back" on /login returns here instead of always falling back to
  // home — future-proof against this header being reused on a page other
  // than the homepage, even though today it only ever renders there.
  const loginHref = `/login?returnTo=${encodeURIComponent(pathname)}`;

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-all duration-300 ${
        scrolled
          ? "border-[#DDD8CC]/80 bg-[#FAFAF8]/80 shadow-[0_8px_30px_-20px_rgba(27,79,114,0.5)]"
          : "border-transparent bg-[#FAFAF8]/60"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-4 transition-all duration-300 sm:px-6 ${
          scrolled ? "py-2" : "py-3.5"
        }`}
      >
        <Link href="/" className="w-[130px] shrink-0 sm:w-[200px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="WelcoKit" className="h-auto w-full" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <LocaleSwitcher locale={locale} onChange={setLocale} />

          <Button
            variant="ghost"
            size="sm"
            className="text-[#1B4F72] hover:bg-[#1B4F72]/5 hover:text-[#1B4F72]"
            nativeButton={false}
            render={<Link href={loginHref} />}
          >
            {t("login")}
          </Button>
        </div>
      </div>
    </header>
  );
}
