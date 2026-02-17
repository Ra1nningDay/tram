import { formatAge } from "../lib/time";
import { t } from "../i18n";

export function LastUpdated({ lastUpdated }: { lastUpdated: string }) {
  return <span className="text-xs text-[var(--color-text-muted)]">{formatAge(lastUpdated)} {t("time.ago")}</span>;
}
