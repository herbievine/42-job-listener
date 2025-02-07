import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  dbCredentials: {
    url: "file:sqlite.db",
  },
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
