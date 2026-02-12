import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from './schema';

if(!process.env.MANAGEMENT_DATABASE_URL) {
    throw new Error("MANAGEMENT_DATABASE_URL is not set");
}

const db = drizzle(
    process.env.MANAGEMENT_DATABASE_URL,
    {
        logger: true,
        schema
    }
)

export default db;
