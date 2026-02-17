import { t } from "../i18n";

export const statusCopy = {
  fresh: () => t("status.live"),
  delayed: () => t("status.delayed"),
  offline: () => t("status.offline"),
  hidden: () => t("status.hidden"),
} as const;