"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlertIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GuestLinksDialog } from "./GuestLinksDialog";
import { PremiumGuidePdfButtons } from "./PremiumGuidePdfButtons";
import { toast } from "sonner";
import { sanitizePhoneDigits, isValidPhoneNumber } from "@/lib/phone";
import { compressImageFile } from "@/lib/compressImage";
import type { Property, GuestGuideLink } from "@/types";

const MAX_COVER_SIZE_BYTES = 3 * 1024 * 1024;

export function PublishPanel({
  property,
  isPublished,
  onPublishedChange,
  guestLinks,
  onGuestLinksChange,
  guestLinksDefaultOpen,
  premiumGuideLanguages = [],
}: {
  property: Property;
  isPublished: boolean;
  onPublishedChange: (isPublished: boolean) => void;
  guestLinks: GuestGuideLink[];
  onGuestLinksChange: (links: GuestGuideLink[]) => void;
  guestLinksDefaultOpen?: boolean;
  premiumGuideLanguages?: string[];
}) {
  const t = useTranslations("dashboard.editor.publish");
  const tCommon = useTranslations("dashboard.common");
  const [updating, setUpdating] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [coverUrl, setCoverUrl] = useState(property.cover_image_url);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [compressingCover, setCompressingCover] = useState(false);
  const [confirmCoverDelete, setConfirmCoverDelete] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [whatsappNumber, setWhatsappNumber] = useState(property.whatsapp_number ?? "");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.type !== "image/jpeg") {
      toast.error(t("onlyJpg"));
      return;
    }

    setCompressingCover(true);
    const compressed = await compressImageFile(file, { maxSizeMB: 3, maxWidthOrHeight: 1920 });
    setCompressingCover(false);

    if (compressed.size > MAX_COVER_SIZE_BYTES) {
      toast.error(tCommon("imageStillTooLargeAfterCompression"));
      return;
    }

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", compressed);
      const response = await fetch(`/api/properties/${property.id}/cover-image`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }));
        toast.error(error ?? t("coverUploadError"));
        return;
      }
      const { cover_image_url } = await response.json();
      setCoverUrl(cover_image_url);
      toast.success(t("coverUpdated"));
    } catch {
      toast.error(tCommon("networkError"));
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleRemoveCover() {
    setUploadingCover(true);
    try {
      const response = await fetch(`/api/properties/${property.id}/cover-image`, {
        method: "DELETE",
      });
      if (!response.ok) {
        toast.error(t("coverDeleteError"));
        return;
      }
      setCoverUrl(null);
      toast.success(t("coverDeleted"));
    } catch {
      toast.error(tCommon("networkError"));
    } finally {
      setUploadingCover(false);
      setConfirmCoverDelete(false);
    }
  }

  async function handleSaveWhatsapp() {
    const sanitized = sanitizePhoneDigits(whatsappNumber);
    if (sanitized && !isValidPhoneNumber(sanitized)) {
      toast.error(t("phoneInvalid"));
      return;
    }
    setSavingWhatsapp(true);
    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_number: sanitized || null }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }));
        toast.error(error ?? t("whatsappSaveError"));
        return;
      }
      setWhatsappNumber(sanitized);
      toast.success(t("whatsappSaved"));
    } catch {
      toast.error(tCommon("networkError"));
    } finally {
      setSavingWhatsapp(false);
    }
  }

  async function handleTogglePublished(checked: boolean) {
    setUpdating(true);
    onPublishedChange(checked);
    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: checked }),
      });
      if (!response.ok) {
        onPublishedChange(!checked);
        toast.error(t("publishToggleError"));
        return;
      }
      toast.success(checked ? t("publishedToast") : t("unpublishedToast"));
    } catch {
      onPublishedChange(!checked);
      toast.error(tCommon("networkError"));
    } finally {
      setUpdating(false);
    }
  }

  async function handleShowQr() {
    if (qrDataUrl) {
      setQrDataUrl(null);
      return;
    }
    setLoadingQr(true);
    try {
      const response = await fetch(`/api/properties/${property.id}/qr`);
      if (!response.ok) {
        toast.error(t("qrError"));
        return;
      }
      const { dataUrl } = await response.json();
      setQrDataUrl(dataUrl);
    } catch {
      toast.error(tCommon("networkError"));
    } finally {
      setLoadingQr(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5">
          <Label htmlFor="publish-toggle" className="text-sm">
            {isPublished ? t("published") : t("draft")}
          </Label>
          <Switch
            id="publish-toggle"
            checked={isPublished}
            disabled={updating}
            onCheckedChange={handleTogglePublished}
          />
        </div>

        {/* Mobile renders this same dialog portaled above the property tabs
            instead — see PropertyEditor.tsx. Hidden here below md to avoid
            showing it twice. */}
        <GuestLinksDialog
          propertyId={property.id}
          guestLinks={guestLinks}
          onGuestLinksChange={onGuestLinksChange}
          className="hidden md:inline-flex"
          defaultOpen={guestLinksDefaultOpen}
        />
        {!isPublished && (
          <p className="text-xs text-muted-foreground">{t("publishHint")}</p>
        )}

        <div className="space-y-2">
          <Label>{t("coverImage")}</Label>
          {coverUrl ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={t("coverAlt")}
                className="h-28 w-full rounded-lg border border-border object-cover"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover || compressingCover}
                >
                  {compressingCover
                    ? tCommon("compressingImage")
                    : uploadingCover
                      ? tCommon("saving")
                      : t("change")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmCoverDelete(true)}
                  disabled={uploadingCover || compressingCover}
                >
                  {tCommon("delete")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover || compressingCover}
            >
              {compressingCover
                ? tCommon("compressingImage")
                : uploadingCover
                  ? tCommon("saving")
                  : t("uploadJpg")}
            </Button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg"
            className="hidden"
            onChange={handleCoverFileChange}
          />
          <p className="text-xs text-muted-foreground">{t("coverFormatHint")}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp_number">{t("contactPhoneLabel")}</Label>
          <div className="flex gap-2">
            <Input
              id="whatsapp_number"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="34600000000"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveWhatsapp}
              disabled={savingWhatsapp}
            >
              {savingWhatsapp ? "..." : tCommon("save")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("phoneHint")}</p>
          {!whatsappNumber && (
            <p className="flex items-start gap-1.5 text-xs text-amber-600">
              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
              {t("phoneWarning")}
            </p>
          )}
        </div>

        <Button
          variant="secondary"
          className="w-full"
          onClick={handleShowQr}
          disabled={loadingQr}
        >
          {loadingQr ? t("generatingQr") : qrDataUrl ? t("hideQr") : t("viewQr")}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          nativeButton={false}
          render={
            <a
              href={`/api/properties/${property.id}/qr-print`}
              download={`qr-imprimir-${property.slug}.pdf`}
            />
          }
        >
          {t("printQr")}
        </Button>

        <PremiumGuidePdfButtons
          propertyId={property.id}
          slug={property.slug}
          languages={premiumGuideLanguages}
        />

        {qrDataUrl && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={t("qrAlt")} className="size-40" />
            <a
              href={qrDataUrl}
              download={`qr-${property.slug}.png`}
              className="text-xs text-primary underline underline-offset-2"
            >
              {t("downloadPng")}
            </a>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmCoverDelete}
        onOpenChange={setConfirmCoverDelete}
        title={t("confirmCoverDeleteTitle")}
        description={t("confirmDeleteDescription")}
        onConfirm={handleRemoveCover}
        loading={uploadingCover}
      />
    </Card>
  );
}
