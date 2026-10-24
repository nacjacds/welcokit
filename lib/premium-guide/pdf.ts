import { chromium, type Browser } from "playwright-core";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/env";
import type { GuideLocale } from "@/lib/guide-i18n";
import { createPrintToken } from "./printToken";

const PDF_BUCKET = "guide-pdfs";

// Where the headless Chromium comes from:
//  - PDF_BROWSER_WS_URL: a remote Chromium over CDP (e.g. a browserless
//    container in EasyPanel, "ws://browserless:3000?token=...") — the
//    production setup, since the app container itself ships no browser.
//  - PDF_CHROMIUM_PATH: a local Chrome/Chromium executable (development).
//  - otherwise Playwright's own bundled Chromium (`npx playwright install chromium`).
async function connectBrowser(): Promise<Browser> {
  const wsUrl = process.env.PDF_BROWSER_WS_URL;
  if (wsUrl) return chromium.connectOverCDP(wsUrl);
  return chromium.launch({ executablePath: process.env.PDF_CHROMIUM_PATH || undefined });
}

// The remote browser must reach the app by its public URL; override only if
// the PDF browser sits on the same network as the app (PDF_PRINT_BASE_URL).
function printBaseUrl(): string {
  return process.env.PDF_PRINT_BASE_URL || getAppUrl();
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function renderGuidePdf(args: {
  propertyId: string;
  slug: string;
  language: GuideLocale;
  propertyName: string;
}): Promise<Buffer> {
  const url = `${printBaseUrl()}/guide/${encodeURIComponent(args.slug)}/print?lang=${args.language}&pt=${encodeURIComponent(
    createPrintToken(args.propertyId)
  )}`;

  const browser = await connectBrowser();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.emulateMedia({ media: "print" });
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
    if (!response?.ok()) throw new Error(`La página de impresión respondió ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);

    const footer = `
      <div style="width:100%;padding:0 12mm;display:flex;justify-content:space-between;
                  font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#6b7280;">
        <span>${escapeHtml(args.propertyName)}</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`;

    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: footer,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Returns the guide's PDF, from the Storage cache when it's still fresh and
// otherwise (re)generated and stored. A PDF is stale when the guide changed
// after it was built: guides.updated_at is bumped by the database whenever a
// section or place is edited (migration 20260725090000).
export async function getOrCreateGuidePdf(args: {
  propertyId: string;
  slug: string;
  language: GuideLocale;
  propertyName: string;
  force?: boolean;
}): Promise<Buffer | null> {
  const db = createServiceRoleClient() as unknown as SupabaseClient;

  const { data: guide } = await db
    .from("guides")
    .select("id, updated_at, pdf_path, pdf_generated_at")
    .eq("property_id", args.propertyId)
    .eq("language", args.language)
    .maybeSingle();
  if (!guide) return null;

  const isFresh =
    !args.force &&
    guide.pdf_path &&
    guide.pdf_generated_at &&
    new Date(guide.pdf_generated_at) >= new Date(guide.updated_at);

  if (isFresh) {
    const { data: file } = await db.storage.from(PDF_BUCKET).download(guide.pdf_path);
    if (file) return Buffer.from(await file.arrayBuffer());
  }

  // Timestamp taken before rendering: an edit that lands while the PDF is
  // being built leaves updated_at ahead of it, so that PDF reads as stale.
  const startedAt = new Date();
  const pdf = await renderGuidePdf(args);

  const path = `${args.propertyId}/${args.language}.pdf`;
  const { error } = await db.storage.from(PDF_BUCKET).upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (!error) {
    await db.from("guides").update({ pdf_path: path, pdf_generated_at: startedAt.toISOString() }).eq("id", guide.id);
  }
  return pdf;
}
