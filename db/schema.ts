import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const progress = sqliteTable("progress", {
  userId: text("user_id").primaryKey(),
  data: text("data").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

export * from "./auth-schema.ts";
