type LogLevel = "info" | "warn" | "error";

const REDACT_KEYS = ["authorization", "cookie", "set-cookie", "apiKey", "token"];

function redact(value: unknown): unknown {
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => {
        if (REDACT_KEYS.includes(key.toLowerCase())) {
          return [key, "[REDACTED]"];
        }
        return [key, val];
      },
    );
    return Object.fromEntries(entries);
  }
  return value;
}

export function log(level: LogLevel, message: string, meta?: unknown): void {
  const payload = meta ? { meta: redact(meta) } : undefined;
  const line = JSON.stringify({ level, message, ...payload, ts: new Date().toISOString() });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}