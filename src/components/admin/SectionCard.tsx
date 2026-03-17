import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SectionCardProps = {
  eyebrow?: string;
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className={cn("text-xl font-semibold tracking-[-0.03em] text-[var(--color-text)]", eyebrow ? "mt-2" : "")}>
            {title}
          </h2>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
