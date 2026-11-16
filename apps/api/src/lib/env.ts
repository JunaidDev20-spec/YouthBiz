import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";

// Load .env anchored to this file's directory so the path is correct
// regardless of process.cwd().  prisma.ts lives at src/lib/ — two levels
// up reaches apps/api/ where .env resides.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../.env") });

function required(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Check apps/api/.env (see .env.example for the template).`
    );
  }
  return val;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env["JWT_EXPIRES_IN"] ?? "24h",
  PORT: parseInt(process.env["PORT"] ?? "5000", 10),
  NODE_ENV: process.env["NODE_ENV"] ?? "development",
} as const;

if (env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long.");
}
