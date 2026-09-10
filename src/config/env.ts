import dotenv from "dotenv";
import { z } from "zod";

// Load .env file
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required. Provide a PostgreSQL connection string."),
  BETTER_AUTH_SECRET: z
    .string()
    .min(16, "BETTER_AUTH_SECRET must be at least 16 characters long"),
  BETTER_AUTH_URL: z
    .string()
    .url("BETTER_AUTH_URL must be a valid URL"),
  FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL must be a valid URL"),
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  BETTER_AUTH_API_KEY: z.string().optional().default("ba_6c8u5hsfwyk7ghnizcv9mymu7jx9utlj"),
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
