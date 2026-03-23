import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";

import { LOCAL_APP_URL, isLocalhostUrl, normalizeUrl } from "@/lib/config";
import { getPrisma } from "@/lib/prisma";

const authBaseURL =
  normalizeUrl(process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL) ??
  (process.env.NODE_ENV !== "production" ? LOCAL_APP_URL : "");
const authSecret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;

function createAuth() {
  if (!authBaseURL) {
    throw new Error("BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL must be set in production");
  }

  if (process.env.NODE_ENV === "production" && isLocalhostUrl(authBaseURL)) {
    throw new Error("BETTER_AUTH_URL cannot point to localhost in production");
  }

  return betterAuth({
    appName: "BU Tram",
    baseURL: authBaseURL,
    secret: authSecret,
    trustedOrigins: [authBaseURL],
    database: prismaAdapter(getPrisma(), {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 50,
      }),
      nextCookies(),
    ],
    advanced: {
      database: {
        generateId: false,
      },
    },
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (!authSecret && process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET must be set in production");
  }

  if (!authInstance) {
    authInstance = createAuth();
  }

  return authInstance;
}
