import { GuideIcon } from "./GuideIcon";
import { Html } from "./Html";

export function Callout({ icon, kicker, title, html }: { icon: string; kicker: string; title: string; html: string }) {
  return (
    <aside className="flex gap-4 rounded-2xl bg-[var(--pg-sea)] p-5 text-white sm:p-6">
      <GuideIcon name={icon} size={52} className="mt-1 hidden sm:block" />
      <div className="min-w-0">
        <p className="pg-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--pg-sun)]">{kicker}</p>
        <h3 className="pg-sans mt-1 text-xl font-bold leading-tight text-white">{title}</h3>
        <Html html={html} className="mt-2 text-[15px] leading-relaxed text-white/95 [&_a]:text-white" />
      </div>
    </aside>
  );
}
