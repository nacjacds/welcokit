import { guideIconUrl } from "@/lib/premium-guide/assets";

// Category icons are pre-drawn circular SVGs (colour baked in) — used as-is.
export function GuideIcon({ name, size = 48, className = "" }: { name: string | null; size?: number; className?: string }) {
  if (!name) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={guideIconUrl(name)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
