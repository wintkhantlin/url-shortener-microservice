import db from "./db";
import { alias } from "./db/schema";

async function getAllAliases(): Promise<typeof alias.$inferSelect[]> {
    return db.select().from(alias);
}

export { getAllAliases };
