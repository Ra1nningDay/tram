import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";

export async function getAuthSession() {
  const requestHeaders = await headers();

  return getAuth().api.getSession({
    headers: requestHeaders,
    query: {
      disableRefresh: true,
    },
  });
}
