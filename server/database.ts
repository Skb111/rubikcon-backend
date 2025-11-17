import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./shared/schema";
import path from "path";
import dotenv from "dotenv";

// load env variables relative to the current file
dotenv.config({
  path: path.resolve(process.cwd(), ".env"), // or "../.env.local" depending on your structure
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Create the connection
const connectionString = process.env.DATABASE_URL;


const client = postgres(connectionString, {
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };
