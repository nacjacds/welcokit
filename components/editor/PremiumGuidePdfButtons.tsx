"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// One download button per language the property's premium guide exists in.
// Building the PDF takes several seconds the first time (and again after the
// guide is edited), so the click fetches it and shows progress instead of
// navigating to the endpoint.
export function PremiumGuidePdfButtons({
  propertyId,
  slug,
  languages,
}: {
  propertyId: string;
  slug: string;
  languages: string[];
}) {
  const t = useTranslations("dashboard.editor.publish");
  const [loading, setLoading] = useState<string | null>(null);

  if (languages.length === 0) return null;

  async function download(lang: string) {
    setLoading(lang);
    try {
      const response = await fetch(`/api/properties/${propertyId}/premium-guide-pdf?lang=${lang}`);
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }));
        toast.error(error ?? t("premiumPdfError"));
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `guia-${slug}-${lang}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("premiumPdfError"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("premiumPdf")}</p>
      <div className="flex flex-wrap gap-2">
        {languages.map((lang) => (
          <Button
            key={lang}
            variant="outline"
            size="sm"
            onClick={() => download(lang)}
            disabled={loading !== null}
          >
            {loading === lang ? t("premiumPdfGenerating") : lang.toUpperCase()}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t("premiumPdfHint")}</p>
    </div>
  );
}
