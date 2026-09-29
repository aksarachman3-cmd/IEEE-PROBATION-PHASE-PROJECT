// Prisma CLI configuration (Prisma 7 reads this instead of `package.json#prisma`).
// `dotenv` loads `.env` so the CLI and the Next.js app read the same variables.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npm run db:seed` delegates to this command.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
