import type { Metadata } from "next";

import { DriverDemoScreen } from "../driver-demo/DriverDemoScreen";
import { requireAuthenticatedSession } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Driver | BU Tram Tracker",
  description: "Responsive driver-facing UI for duty status and passenger capacity controls.",
};

export default async function DriverPage() {
  await requireAuthenticatedSession("/driver");

  return <DriverDemoScreen />;
}
