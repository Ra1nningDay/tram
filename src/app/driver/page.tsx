import type { Metadata } from "next";

import { DriverDemoScreen } from "../driver-demo/DriverDemoScreen";

export const metadata: Metadata = {
  title: "Driver | BU Tram Tracker",
  description: "Responsive driver-facing UI for duty status and passenger capacity controls.",
};

export default function DriverPage() {
  return <DriverDemoScreen />;
}
