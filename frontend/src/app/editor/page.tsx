"use client";

import dynamic from "next/dynamic";

const RouteEditorPage = dynamic(
  () => import("../../views/RouteEditorPage").then((mod) => mod.RouteEditorPage),
  {
    ssr: false,
    loading: () => <div className="h-screen w-screen bg-surface-dark" />,
  }
);

export default function EditorPage() {
  return <RouteEditorPage />;
}
