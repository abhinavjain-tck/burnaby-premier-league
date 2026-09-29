import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  migrations: { prefix: "supabase" }, // <timestamp>_name.sql so `supabase db push` picks them up
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
