import { sanitizeGuideHtml } from "@/lib/premium-guide/sanitize";

// The single place guide HTML is turned into markup: always sanitised.
export function Html({
  html,
  className = "",
  as: Tag = "div",
}: {
  html: string | null | undefined;
  className?: string;
  as?: "div" | "span" | "p";
}) {
  if (!html) return null;
  return (
    <Tag
      className={`pg-html ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeGuideHtml(html) }}
    />
  );
}
