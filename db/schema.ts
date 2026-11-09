import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const progress = sqliteTable("progress", {
  userId: text("user_id").primaryKey(),
  data: text("data").notNull(),
  version: integer("version").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

export const developerAudit = sqliteTable("developer_audit", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  targetId: text("target_id").notNull(),
  action: text("action").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [index("developer_audit_created_idx").on(table.createdAt)]);

export * from "./auth-schema.ts";
