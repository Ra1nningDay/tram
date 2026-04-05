const DEFAULT_HARDWARE_FEED_URL =
  "https://gps-logger-app-default-rtdb.asia-southeast1.firebasedatabase.app/trams_live.json";
const DEFAULT_SYNC_URL = "http://localhost:3000/api/gps/hardware/sync";
const DEFAULT_INTERVAL_MS = 3_000;

const hardwareFeedUrl = process.env.HARDWARE_FEED_URL ?? DEFAULT_HARDWARE_FEED_URL;
const hardwareSyncUrl = process.env.HARDWARE_SYNC_URL ?? DEFAULT_SYNC_URL;
const hardwareSyncSecret = process.env.HARDWARE_SYNC_SECRET;
const intervalMs = Number.parseInt(
  process.env.HARDWARE_POLL_INTERVAL_MS ?? String(DEFAULT_INTERVAL_MS),
  10,
);
const runOnce = process.argv.includes("--once");

if (!hardwareSyncSecret) {
  console.error("HARDWARE_SYNC_SECRET is required.");
  process.exit(1);
}

if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
  console.error("HARDWARE_POLL_INTERVAL_MS must be a positive integer.");
  process.exit(1);
}

let stopped = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncOnce() {
  const polledAt = new Date();
  const feedResponse = await fetch(hardwareFeedUrl, {
    headers: {
      accept: "application/json",
    },
  });

  if (!feedResponse.ok) {
    throw new Error(`Hardware feed request failed: ${feedResponse.status}`);
  }

  const payload = await feedResponse.json();
  const syncResponse = await fetch(hardwareSyncUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hardware-sync-secret": hardwareSyncSecret,
    },
    body: JSON.stringify({
      polledAt: polledAt.toISOString(),
      payload,
    }),
  });

  if (!syncResponse.ok) {
    const body = await syncResponse.text();
    throw new Error(`Hardware sync failed: ${syncResponse.status} ${body}`);
  }

  const result = await syncResponse.json();
  console.log(
    `[hardware-poll] ${polledAt.toISOString()} total=${result.total ?? 0} active=${result.active ?? 0} inactive=${result.inactive ?? 0} unmapped=${result.unmapped ?? 0}`,
  );
}

async function main() {
  do {
    const startedAt = Date.now();

    try {
      await syncOnce();
    } catch (error) {
      console.error("[hardware-poll] sync failed:", error);
    }

    if (runOnce || stopped) {
      break;
    }

    const elapsedMs = Date.now() - startedAt;
    await sleep(Math.max(0, intervalMs - elapsedMs));
  } while (!stopped);
}

process.on("SIGINT", () => {
  stopped = true;
});

process.on("SIGTERM", () => {
  stopped = true;
});

await main();
