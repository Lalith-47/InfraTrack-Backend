import dotenv from "dotenv";
import { z } from "zod";

// Load .env file
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z
    .string({
      required_error: "DATABASE_URL is required. Provide a PostgreSQL connection string.",
    })
    .min(1, "DATABASE_URL cannot be empty"),
  BETTER_AUTH_SECRET: z
    .string({
      required_error: "BETTER_AUTH_SECRET is required. Provide a secret key for session encryption.",
    })
    .min(16, "BETTER_AUTH_SECRET must be at least 16 characters long"),
  BETTER_AUTH_URL: z
    .string({
      required_error: "BETTER_AUTH_URL is required (e.g. http://localhost:4000).",
    })
    .url("BETTER_AUTH_URL must be a valid URL"),
  FRONTEND_URL: z
    .string({
      required_error: "FRONTEND_URL is required for CORS origin (e.g. http://localhost:3000).",
    })
    .url("FRONTEND_URL must be a valid URL"),
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables configuration at boot:");
  const errors = parsed.error.format();
  for (const [key, value] of Object.entries(errors)) {
    if (key !== "_errors" && value && "_errors" in value && (value as { _errors: string[] })._errors.length > 0) {
      console.error(`   - ${key}: ${(value as { _errors: string[] })._errors.join(", ")}`);
    }
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
