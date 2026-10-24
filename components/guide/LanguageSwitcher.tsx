"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useGuideLocale } from "./GuideLocaleProvider";
import type { GuideLocale } from "@/lib/guide-i18n";

const LANGUAGES: { code: GuideLocale; flag: string; label: string }[] = [
  { code: "es", flag: "🇪🇸", label: "ES" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "fr", flag: "🇫🇷", label: "FR" },
  { code: "it", flag: "🇮🇹", label: "IT" },
  { code: "pt", flag: "🇵🇹", label: "PT" },
  { code: "nl", flag: "🇳🇱", label: "NL" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useGuideLocale();
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[rgba(27,79,114,0.6)] px-3 py-1 text-xs font-medium text-white backdrop-blur-md transition-colors hover:bg-[rgba(27,79,114,0.75)]"
      >
        <span className="text-[20px] leading-none">{current.flag}</span>
        {current.label}
        <ChevronDown className="size-3.5" strokeWidth={2.5} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-24">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={cn(
              "justify-between gap-1.5",
              lang.code === locale && "bg-accent text-accent-foreground"
            )}
          >
            <span className="text-[20px] leading-none">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
