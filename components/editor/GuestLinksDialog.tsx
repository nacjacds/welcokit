"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useLocale } from "@/components/shared/LocaleProvider";
import { formatLocalizedDate } from "@/lib/formatDate";
import { getAppUrl } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { GuestGuideLink } from "@/types";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GuestLinksDialog({
  propertyId,
  guestLinks,
  onGuestLinksChange,
  className,
  defaultOpen = false,
}: {
  propertyId: string;
  guestLinks: GuestGuideLink[];
  onGuestLinksChange: (links: GuestGuideLink[]) => void;
  className?: string;
  defaultOpen?: boolean;
}) {
  const t = useTranslations("dashboard.editor.guestLinks");
  const tCommon = useTranslations("dashboard.common");
  const { locale } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const [guestName, setGuestName] = useState("");
  const [checkinDate, setCheckinDate] = useState(todayIsoDate());
  const [checkoutDate, setCheckoutDate] = useState(todayIsoDate());
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function guestLinkUrl(linkId: string) {
    return `${getAppUrl()}/guide/link/${linkId}`;
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (checkoutDate < checkinDate) {
      toast.error(t("dateOrderError"));
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/guest-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: guestName.trim() || null,
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }));
        toast.error(error ?? t("generateError"));
        return;
      }

      const { link } = (await response.json()) as { link: GuestGuideLink };
      onGuestLinksChange([link, ...guestLinks]);
      setGuestName("");
      toast.success(t("linkCreated"));
    } catch {
      toast.error(tCommon("networkError"));
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(link: GuestGuideLink) {
    try {
      await navigator.clipboard.writeText(guestLinkUrl(link.id));
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error(t("copyError"));
    }
  }

  async function handleDelete(linkId: string) {
    setDeletingId(linkId);
    try {
      const response = await fetch(`/api/properties/${propertyId}/guest-links/${linkId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        toast.error(t("deleteError"));
        return;
      }
      onGuestLinksChange(guestLinks.filter((l) => l.id !== linkId));
      toast.success(t("deleted"));
    } catch {
      toast.error(tCommon("networkError"));
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  }

  return (
    <>
      <Button
        type="button"
        className={cn("w-full", className)}
        onClick={() => setOpen(true)}
      >
        <Link2 size={14} className="mr-1.5" />
        {t("generateLink")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{t("dialogDescription")}</p>
            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <Label htmlFor="guest-link-name">{t("guestNameLabel")}</Label>
                <Input
                  id="guest-link-name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t("guestNamePlaceholder")}
                  maxLength={120}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="guest-link-checkin">{t("checkinLabel")}</Label>
                  <Input
                    id="guest-link-checkin"
                    type="date"
                    value={checkinDate}
                    onChange={(e) => setCheckinDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guest-link-checkout">{t("checkoutLabel")}</Label>
                  <Input
                    id="guest-link-checkout"
                    type="date"
                    value={checkoutDate}
                    onChange={(e) => setCheckoutDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" size="sm" disabled={generating} className="w-full">
                {generating ? t("generating") : t("generate")}
              </Button>
            </form>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("activeLinks")}</p>
              {guestLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noLinksYet")}</p>
              ) : (
                <div className="space-y-2">
                  {guestLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
                    >
                      <p className="min-w-0 text-xs font-medium">
                        {link.guest_name && `${link.guest_name} · `}
                        {formatLocalizedDate(link.checkin_date, locale)} →{" "}
                        {formatLocalizedDate(link.checkout_date, locale)}
                      </p>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(link)}
                        >
                          {copiedId === link.id ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDeleteId(link.id)}
                          disabled={deletingId === link.id}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => !o && setPendingDeleteId(null)}
        title={t("confirmDeleteTitle")}
        description={t("confirmDeleteDescription")}
        confirmLabel={t("delete")}
        onConfirm={() => pendingDeleteId && handleDelete(pendingDeleteId)}
        loading={deletingId !== null}
      />
    </>
  );
}
