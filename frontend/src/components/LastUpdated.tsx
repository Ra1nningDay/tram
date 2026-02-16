import { formatAge } from "../lib/time";
import { t } from "../i18n";

export function LastUpdated({ lastUpdated }: { lastUpdated: string }) {
  return <span className="text-xs text-slate-500">{formatAge(lastUpdated)} {t("time.ago")}</span>;
}
