import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";

// load .env.<NODE_ENV> if present, otherwise fall back to plain .env
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile });
if (!process.env.DATABASE_URL) {
  dotenv.config(); // fallback to .env
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
