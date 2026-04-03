import type { Vehicle } from "@/features/shuttle/api";

export type CrowdingDisplay = {
  label: string;
  level: number;
  color: string;
};

export function getCrowdingDisplay(crowding?: Vehicle["crowding"]): CrowdingDisplay {
  if (crowding === "full") {
    return { label: "คนเต็ม", level: 3, color: "#EF4444" };
  }

  return { label: "ปกติ", level: 1, color: "#22C55E" };
}
