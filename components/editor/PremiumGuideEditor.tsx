"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Languages } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ALL_GUIDE_LOCALES } from "@/lib/translations/constants";
import { cn } from "@/lib/utils";
import type { EditableGuide, EditablePlace, EditableSection } from "@/lib/premium-guide/editor";

async function send(url: string, method: "PATCH" | "POST", body: unknown): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) return { ok: true };
    const data = await response.json().catch(() => ({}));
    return { ok: false, error: data.error };
  } catch {
    return { ok: false };
  }
}

// A text field that saves itself when it loses focus (and only if it changed).
function AutosaveField({
  label,
  value,
  onSave,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onSave: (value: string) => Promise<boolean>;
  multiline?: boolean;
  rows?: number;
}) {
  const [text, setText] = useState(value);
  const [saved, setSaved] = useState(value);
  const [saving, setSaving] = useState(false);

  async function commit() {
    if (text === saved) return;
    setSaving(true);
    if (await onSave(text)) setSaved(text);
    setSaving(false);
  }

  const common = { value: text, onBlur: commit, disabled: saving };
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea {...common} rows={rows} onChange={(e) => setText(e.target.value)} />
      ) : (
        <Input {...common} onChange={(e) => setText(e.target.value)} />
      )}
    </div>
  );
}

function PlaceRow({
  place,
  isFirst,
  isLast,
  onChange,
  onMove,
}: {
  place: EditablePlace;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<EditablePlace>) => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const t = useTranslations("dashboard.editor.premium");

  async function save(patch: Partial<Pick<EditablePlace, "description_html" | "host_tip_html" | "is_visible">>) {
    const result = await send(`/api/premium-guide-places/${place.id}`, "PATCH", patch);
    if (!result.ok) {
      toast.error(result.error ?? t("saveError"));
      return false;
    }
    onChange(patch);
    return true;
  }

  return (
    <div className={cn("space-y-3 rounded-lg border border-border p-3", !place.is_visible && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{place.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[place.address_hint, place.distance_label].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon-sm" variant="ghost" disabled={isFirst} onClick={() => onMove("up")} aria-label={t("moveUp")}>
            <ArrowUp className="size-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" disabled={isLast} onClick={() => onMove("down")} aria-label={t("moveDown")}>
            <ArrowDown className="size-4" />
          </Button>
          <Switch
            checked={place.is_visible}
            onCheckedChange={(checked) => save({ is_visible: checked })}
            aria-label={place.is_visible ? t("visible") : t("hidden")}
          />
        </div>
      </div>
      <AutosaveField
        label={t("description_text")}
        value={place.description_html}
        multiline
        onSave={(value) => save({ description_html: value })}
      />
      <AutosaveField
        label={t("hostTip")}
        value={place.host_tip_html ?? ""}
        multiline
        rows={2}
        onSave={(value) => save({ host_tip_html: value.trim() === "" ? null : value })}
      />
    </div>
  );
}

function SectionCard({ section, onChange }: { section: EditableSection; onChange: (next: EditableSection) => void }) {
  const t = useTranslations("dashboard.editor.premium");
  const [open, setOpen] = useState(false);

  async function saveSection(patch: Partial<Pick<EditableSection, "title" | "kicker" | "intro_html" | "is_visible">>) {
    const result = await send(`/api/premium-guide-sections/${section.id}`, "PATCH", patch);
    if (!result.ok) {
      toast.error(result.error ?? t("saveError"));
      return false;
    }
    onChange({ ...section, ...patch });
    return true;
  }

  function changePlace(id: string, patch: Partial<EditablePlace>) {
    onChange({ ...section, places: section.places.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }

  async function movePlace(id: string, direction: "up" | "down") {
    const result = await send(`/api/premium-guide-places/${id}/move`, "POST", { direction });
    if (!result.ok) {
      toast.error(result.error ?? t("saveError"));
      return;
    }
    const list = [...section.places];
    const index = list.findIndex((p) => p.id === id);
    const other = direction === "up" ? index - 1 : index + 1;
    if (other < 0 || other >= list.length) return;
    // Swap the two cards and the position values they carry.
    const [a, b] = [list[index], list[other]];
    list[index] = { ...b, position: a.position };
    list[other] = { ...a, position: b.position };
    onChange({ ...section, places: list });
  }

  return (
    <Card className={cn(!section.is_visible && "opacity-70")}>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <button type="button" onClick={() => setOpen(!open)} className="flex min-w-0 items-center gap-2 text-left">
          {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          <CardTitle className="truncate text-base">{section.title}</CardTitle>
          {section.places.length > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">{t("places", { count: section.places.length })}</span>
          )}
        </button>
        <Switch
          checked={section.is_visible}
          onCheckedChange={(checked) => saveSection({ is_visible: checked })}
          aria-label={section.is_visible ? t("visible") : t("hidden")}
        />
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <AutosaveField label={t("sectionTitle")} value={section.title} onSave={(v) => (v.trim() ? saveSection({ title: v }) : Promise.resolve(false))} />
          <AutosaveField label={t("kicker")} value={section.kicker ?? ""} onSave={(v) => saveSection({ kicker: v.trim() || null })} />
          <AutosaveField
            label={t("intro")}
            value={section.intro_html ?? ""}
            multiline
            onSave={(v) => saveSection({ intro_html: v.trim() || null })}
          />
          {section.places.length > 0 && (
            <div className="space-y-3">
              {section.places.map((place, index) => (
                <PlaceRow
                  key={place.id}
                  place={place}
                  isFirst={index === 0}
                  isLast={index === section.places.length - 1}
                  onChange={(patch) => changePlace(place.id, patch)}
                  onMove={(direction) => movePlace(place.id, direction)}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function PremiumGuideEditor({ propertyId, initialGuides }: { propertyId: string; initialGuides: EditableGuide[] }) {
  const t = useTranslations("dashboard.editor.premium");
  const uiLocale = useLocale();
  const [guides, setGuides] = useState(initialGuides);
  const [activeId, setActiveId] = useState(initialGuides[0]?.id ?? null);
  const [translating, setTranslating] = useState<string | null>(null);

  const languageName = (code: string) => new Intl.DisplayNames([uiLocale], { type: "language" }).of(code) ?? code;
  const active = guides.find((g) => g.id === activeId) ?? null;
  const hasEnglish = guides.some((g) => g.language === "en");
  const missing = ALL_GUIDE_LOCALES.filter((code) => code !== "en" && !guides.some((g) => g.language === code));

  function updateGuide(id: string, fn: (guide: EditableGuide) => EditableGuide) {
    setGuides((all) => all.map((g) => (g.id === id ? fn(g) : g)));
  }

  async function toggleReviewed(guide: EditableGuide) {
    const next = !guide.reviewed_by_native;
    const result = await send(`/api/premium-guides/${guide.id}`, "PATCH", { reviewed_by_native: next });
    if (!result.ok) return toast.error(result.error ?? t("saveError"));
    updateGuide(guide.id, (g) => ({ ...g, reviewed_by_native: next }));
  }

  async function translateTo(code: string) {
    if (!window.confirm(t("translateConfirm"))) return;
    setTranslating(code);
    const result = await send(`/api/properties/${propertyId}/premium-guide/translate`, "POST", { target: code });
    setTranslating(null);
    if (!result.ok) return toast.error(result.error ?? t("translateError"));
    toast.success(t("translated", { language: languageName(code) }));
    // The new guide's rows come from the server: reload to pick them up.
    window.location.reload();
  }

  if (guides.length === 0) return <p className="text-sm text-muted-foreground">{t("none")}</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <div className="flex flex-wrap items-center gap-2">
        {guides.map((guide) => (
          <Button
            key={guide.id}
            size="sm"
            variant={guide.id === activeId ? "default" : "outline"}
            onClick={() => setActiveId(guide.id)}
          >
            {guide.language.toUpperCase()}
            {!guide.reviewed_by_native && <span className="ml-1.5 size-1.5 rounded-full bg-amber-500" aria-hidden />}
          </Button>
        ))}
      </div>

      {active && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={active.reviewed_by_native ? "secondary" : "outline"}>
              {active.reviewed_by_native ? t("reviewed") : t("pendingReview")}
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => toggleReviewed(active)}>
              {active.reviewed_by_native ? t("markPending") : t("markReviewed")}
            </Button>
          </div>

          <div className="space-y-3">
            {active.sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                onChange={(next) => updateGuide(active.id, (g) => ({ ...g, sections: g.sections.map((s) => (s.id === next.id ? next : s)) }))}
              />
            ))}
          </div>
        </>
      )}

      {hasEnglish && missing.length > 0 && (
        <div className="space-y-2 border-t border-border pt-5">
          <p className="text-sm font-medium">{t("translateHeading")}</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((code) => (
              <Button key={code} size="sm" variant="outline" disabled={translating !== null} onClick={() => translateTo(code)}>
                <Languages className="size-4" />
                {translating === code ? t("translating") : t("translateTo", { language: languageName(code) })}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
