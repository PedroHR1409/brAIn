import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Usa DIRECT_URL para migrations (evita limitações do pgbouncer no Supabase)
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
