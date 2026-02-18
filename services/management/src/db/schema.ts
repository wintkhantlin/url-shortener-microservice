import { pgTable, varchar, jsonb, timestamp, index, boolean } from "drizzle-orm/pg-core";

export const alias = pgTable("alias", {
    code: varchar("code", { length: 12 }).primaryKey(),
    target: varchar("target", { length: 2_048 }).notNull(),
    user_id: varchar("user_id", { length: 100 }).notNull(),
    metadata: jsonb("metadata"),
    expires_at: timestamp("expires_at"),
    should_warn: boolean("should_warn").default(false),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at").defaultNow()
}, (table) => [
    index("alias_user_id_idx").on(table.user_id),
    index("alias_expires_at_idx").on(table.expires_at),
]);
