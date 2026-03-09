export function getSafeRedirectPath(path: string | null | undefined, fallback = "/editor"): string {
  if (!path) {
    return fallback;
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  return path;
}
