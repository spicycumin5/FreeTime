import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js reads .env.local itself at app runtime; the Prisma CLI (migrate/generate/studio)
// runs outside Next, so load the same file explicitly here.
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
