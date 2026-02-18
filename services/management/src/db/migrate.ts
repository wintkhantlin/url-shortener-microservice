import { migrate } from "drizzle-orm/node-postgres/migrator";
import db from "./index";

console.log("Migrating database...");
await migrate(db, { migrationsFolder: "./drizzle" });
console.log("Database migrated successfully!");
process.exit(0);
