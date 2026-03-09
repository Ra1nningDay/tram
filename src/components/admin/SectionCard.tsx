import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionCardProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
  actions,
  className,
}: SectionCardProps) {
  return (
    <section className={cn("admin-panel p-5 md:p-6", className)}>
      <div className="flex flex-col gap-4 border-b border-[rgba(100,116,139,0.14)] pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-faint)]">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
