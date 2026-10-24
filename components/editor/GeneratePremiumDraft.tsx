"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Superadmin-only entry point for a property without a premium guide yet.
export function GeneratePremiumDraft({ propertyId }: { propertyId: string }) {
  const t = useTranslations("dashboard.editor.premium");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/premium-guide/generate`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error ?? t("draftError"));
        return;
      }
      window.location.reload();
    } catch {
      toast.error(t("draftError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("draftDescription")}</p>
      <Button onClick={generate} disabled={loading}>
        <Sparkles className="size-4" />
        {loading ? t("draftGenerating") : t("draftButton")}
      </Button>
    </div>
  );
}
