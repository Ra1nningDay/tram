import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";

import { getPrisma } from "@/lib/prisma";

const authBaseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const authSecret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET;

function createAuth() {
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
