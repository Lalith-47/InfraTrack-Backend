import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { dash } from "@better-auth/infra";
import { prisma } from "./prisma.js";
import { env } from "../config/env.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY || env.BETTER_AUTH_API_KEY,
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "SUPERVISOR",
      },
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [
    env.FRONTEND_URL,
    "https://sih2026-beige.vercel.app",
    "https://sih2026.vercel.app",
    "https://*.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],
  emailAndPassword: {
    enabled: true,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "microsoft"],
      requireLocalEmailVerified: false,
    },
    updateAccountOnSignIn: true,
    skipStateCookieCheck: true,
  },
  onAPIError: {
    errorURL: `${env.FRONTEND_URL}/login`,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID || "google_dev_client_id",
      clientSecret: env.GOOGLE_CLIENT_SECRET || "google_dev_client_secret",
      enabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      disableImplicitSignUp: false,
      overrideUserInfoOnSignIn: true,
    },
    microsoft: {
      clientId: env.MICROSOFT_CLIENT_ID || "microsoft_dev_client_id",
      clientSecret: env.MICROSOFT_CLIENT_SECRET || "microsoft_dev_client_secret",
      tenantId: env.MICROSOFT_TENANT_ID || "common",
      enabled: Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET),
      disableImplicitSignUp: false,
      overrideUserInfoOnSignIn: true,
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
