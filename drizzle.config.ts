// import { defineConfig } from "drizzle-kit";

// if (!process.env.DATABASE_URL) {
//   throw new Error("DATABASE_URL is required. Please set up your Supabase database connection.");
// }

// export default defineConfig({
//   out: "./",
//   schema: "./server/shared/schema.ts",
//   dialect: "postgresql",
//   dbCredentials: {
//     url: process.env.DATABASE_URL,
//   },
//   verbose: true,
//   strict: true,
// });


import "dotenv/config";              // <-- YOU MUST ADD THIS
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Please set up your Supabase database connection."
  );
}

export default defineConfig({
  out: "./drizzle",                  // recommended so migrations are in /drizzle
  schema: "./server/shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,  // use the env var
  },
  verbose: true,
  strict: true,
});
