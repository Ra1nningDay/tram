export type EnvConfig = {
  port: number;
  shuttleFeedUrl: string;
  shuttleFeedApiKey?: string;
};

export const env: EnvConfig = {
  port: Number(process.env.PORT ?? 3001),
  shuttleFeedUrl: process.env.SHUTTLE_FEED_URL ?? "",
  shuttleFeedApiKey: process.env.SHUTTLE_FEED_API_KEY,
};

export function assertEnv(): void {
  if (!env.shuttleFeedUrl) {
    throw new Error("SHUTTLE_FEED_URL is required");
  }
}