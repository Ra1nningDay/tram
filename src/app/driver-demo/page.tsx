import type { Metadata } from "next";

import { DriverDemoScreen } from "./DriverDemoScreen";

export const metadata: Metadata = {
  title: "Driver Demo | BU Tram Tracker",
  description: "Demo driver-facing mobile UI for duty status and passenger capacity states.",
};

export default function DriverDemoPage() {
  return <DriverDemoScreen />;
}
