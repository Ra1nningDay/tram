import { EditorClient } from "./EditorClient";

import { requireEditorAccess } from "@/lib/auth/guards";

export default async function EditorPage() {
  await requireEditorAccess("/editor");

  return <EditorClient />;
}
