"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

type AdminModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function AdminModal({ title, open, onClose, children }: AdminModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div className="admin-panel w-full max-w-xl p-5 md:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-inner-bg)] text-[var(--text-soft)] transition hover:border-[var(--admin-panel-border-strong)] hover:text-[var(--color-text)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
