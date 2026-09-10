import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma.js";
import { env } from "../config/env.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [env.FRONTEND_URL],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID || "github_dev_client_id",
      clientSecret: env.GITHUB_CLIENT_SECRET || "github_dev_client_secret",
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID || "google_dev_client_id",
      clientSecret: env.GOOGLE_CLIENT_SECRET || "google_dev_client_secret",
    },
  },
  advanced: {
    cookiePrefix: "sih_auth",
    useSecureCookies: env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
});

export type Auth = typeof auth;
