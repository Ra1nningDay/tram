import { t } from "../i18n";

export function StatusBanner({ message }: { message: "stale" | "offline" }) {
  const text = message === "offline" ? t("banner.offline") : t("banner.stale");
  return <div className="bg-amber-100 px-3 py-2 text-xs text-amber-900">{text}</div>;
}