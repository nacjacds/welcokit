"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BlockEditor } from "./BlockEditor";
import { BlockToolbar } from "./BlockToolbar";
import { PublishPanel } from "./PublishPanel";
import { GuestLinksDialog } from "./GuestLinksDialog";
import { AirbnbImportPanel } from "./AirbnbImportPanel";
import { PropertyRecommendationsSection } from "./PropertyRecommendationsSection";
import type { CategoryRegenerationStatus } from "@/lib/recommendations/constants";
import type {
  GuideBlock,
  Property,
  PropertyRecommendation,
  PropertyRecommendationCategory,
  GuestGuideLink,
} from "@/types";

async function saveBlock(block: GuideBlock) {
  const response = await fetch(`/api/guide-blocks/${block.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: block.title,
      content: block.content,
      images: block.images,
      is_visible: block.is_visible,
    }),
  });
  return response.ok;
}

export function PropertyEditor({
  property,
  initialBlocks,
  initialRecommendations,
  categoriesDetected,
  recommendationQuotaByCategory,
  upgradePlanLabel,
  initialGuestLinks,
  premiumGuideLanguages,
}: {
  property: Property;
  initialBlocks: GuideBlock[];
  initialRecommendations: PropertyRecommendation[];
  categoriesDetected: PropertyRecommendationCategory[];
  recommendationQuotaByCategory: Record<string, CategoryRegenerationStatus>;
  upgradePlanLabel: string | null;
  initialGuestLinks: GuestGuideLink[];
  premiumGuideLanguages: string[];
}) {
  const t = useTranslations("dashboard.editor");
  const tSaveAll = useTranslations("dashboard.editor.saveAll");
  const tCommon = useTranslations("dashboard.common");
  const [blocks, setBlocks] = useState(initialBlocks);
  const [isPublished, setIsPublished] = useState(property.is_published);
  // Lifted here (rather than kept local to PublishPanel) because the
  // mobile-portaled GuestLinksDialog below is a sibling of PublishPanel's
  // own copy, not a descendant — a link generated on one surface must be
  // visible on the other immediately, not just after the next full page load.
  const [guestLinks, setGuestLinks] = useState(initialGuestLinks);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [newBlockIds, setNewBlockIds] = useState<Set<string>>(new Set());

  // Portal target for the mobile GuestLinksDialog trigger — see the slot
  // div in properties/[id]/layout.tsx. Only resolvable client-side after
  // mount, hence the effect instead of reading it during render.
  const [mobileActionsSlot, setMobileActionsSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setMobileActionsSlot(document.getElementById("guide-actions-mobile-slot"));
  }, []);

  // Landing here with ?openGuestLinks=true (from onboarding's "publish and
  // generate a link" step) auto-opens the desktop GuestLinksDialog instance
  // only — its Dialog portals to the document body regardless of the
  // trigger button's own responsive hidden/shown class, so this opens
  // correctly on mobile too without needing to also flag the mobile-portaled
  // instance (which would otherwise render a second, overlapping dialog).
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoOpenGuestLinks = searchParams.get("openGuestLinks") === "true";
  useEffect(() => {
    if (autoOpenGuestLinks) {
      router.replace(`/properties/${property.id}/edit`);
    }
  }, [autoOpenGuestLinks, router, property.id]);

  // Re-sync when the server component re-fetches — useState's initial value
  // is only read on mount.
  useEffect(() => setBlocks(initialBlocks), [initialBlocks]);

  useEffect(() => {
    if (dirtyIds.size === 0) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirtyIds]);

  function handleBlockCreated(block: GuideBlock) {
    setBlocks((prev) => [...prev, block]);
    setNewBlockIds((prev) => new Set(prev).add(block.id));
  }

  function handleBlockDeleted(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleBlockChange(id: string, patch: Partial<GuideBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    setDirtyIds((prev) => new Set(prev).add(id));
  }

  // For changes already persisted server-side (image upload/delete) —
  // updates local state without flagging the block as having unsaved edits.
  function handleBlockSynced(id: string, patch: Partial<GuideBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  async function handleSaveOne(id: string) {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;

    setSavingIds((prev) => new Set(prev).add(id));
    const ok = await saveBlock(block);
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (!ok) {
      toast.error(tSaveAll("blockSaveError"));
      return;
    }
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success(tSaveAll("blockSaved"));
  }

  async function handleSaveAll() {
    const ids = Array.from(dirtyIds);
    if (ids.length === 0) return;

    setSavingAll(true);
    setSavingIds(new Set(ids));
    const results = await Promise.all(
      ids.map(async (id) => {
        const block = blocks.find((b) => b.id === id);
        if (!block) return true;
        return saveBlock(block);
      })
    );
    setSavingIds(new Set());
    setSavingAll(false);

    const failedCount = results.filter((ok) => !ok).length;
    const savedIds = ids.filter((_, i) => results[i]);
    setDirtyIds((prev) => {
      const next = new Set(prev);
      savedIds.forEach((id) => next.delete(id));
      return next;
    });

    if (failedCount > 0) {
      toast.error(tSaveAll("failedCount", { count: failedCount }));
    } else {
      toast.success(tSaveAll("savedCount", { count: ids.length }));
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousBlocks = blocks;
    const reordered = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(reordered);

    const response = await fetch(`/api/properties/${property.id}/blocks/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockIds: reordered.map((b) => b.id) }),
    });

    if (!response.ok) {
      toast.error(tSaveAll("reorderError"));
      setBlocks(previousBlocks);
    }
  }

  return (
    <>
      {mobileActionsSlot &&
        createPortal(
          <GuestLinksDialog
            propertyId={property.id}
            guestLinks={guestLinks}
            onGuestLinksChange={setGuestLinks}
          />,
          mobileActionsSlot
        )}

      <div
        className={cn(
          "grid grid-cols-1 gap-6 lg:grid-cols-3",
          dirtyIds.size > 0 && "pb-20 md:pb-0"
        )}
      >
        <div className="space-y-4 lg:col-span-2">
          <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-3 bg-background/95 px-1 py-3 backdrop-blur-sm">
            <div className="min-w-0 flex-1">
              <BlockToolbar propertyId={property.id} blocks={blocks} onCreated={handleBlockCreated} />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveAll}
              disabled={dirtyIds.size === 0 || savingAll}
              className="hidden shrink-0 md:inline-flex"
            >
              {savingAll
                ? tCommon("saving")
                : dirtyIds.size
                  ? tSaveAll("saveWithCount", { count: dirtyIds.size })
                  : tSaveAll("save")}
            </Button>
          </div>

          {blocks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {t("emptyState")}
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {blocks.map((block) => (
                    <BlockEditor
                      key={block.id}
                      block={block}
                      dirty={dirtyIds.has(block.id)}
                      saving={savingIds.has(block.id)}
                      defaultOpen={newBlockIds.has(block.id)}
                      onChange={(patch) => handleBlockChange(block.id, patch)}
                      onSave={() => handleSaveOne(block.id)}
                      onDeleted={handleBlockDeleted}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <PropertyRecommendationsSection
            propertyId={property.id}
            initialRecommendations={initialRecommendations}
            categoriesDetected={categoriesDetected}
            initialQuotaByCategory={recommendationQuotaByCategory}
            upgradePlanLabel={upgradePlanLabel}
          />
        </div>

        <div className="space-y-6">
          <PublishPanel
            property={property}
            isPublished={isPublished}
            onPublishedChange={setIsPublished}
            guestLinks={guestLinks}
            onGuestLinksChange={setGuestLinks}
            guestLinksDefaultOpen={autoOpenGuestLinks}
            premiumGuideLanguages={premiumGuideLanguages}
          />

          <AirbnbImportPanel
            property={property}
            blocks={blocks}
            onBlockCreated={handleBlockCreated}
            onBlockSynced={handleBlockSynced}
          />
        </div>
      </div>

      {dirtyIds.size > 0 && (
        <div className="fixed right-0 bottom-0 left-20 z-20 border-t border-l border-border bg-background/95 p-3 backdrop-blur-sm md:hidden">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSaveAll}
            disabled={savingAll}
            className="w-full"
          >
            {savingAll ? tCommon("saving") : tSaveAll("saveWithCount", { count: dirtyIds.size })}
          </Button>
        </div>
      )}
    </>
  );
}
