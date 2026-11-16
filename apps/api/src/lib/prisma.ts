// Load environment variables from apps/api/.env via the central env module.
// This ensures dotenv is loaded before PrismaClient is instantiated,
// regardless of which entry point imported this file.
import { env } from "./env.js";
import { PrismaClient } from "@prisma/client";

env; // touch to ensure side-effects run

// A single PrismaClient instance is reused across the process.
const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
});

export default prisma;
