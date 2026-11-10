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

import { user } from "./auth-schema.ts";
export const practicePush = sqliteTable("practice_push", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  subscription: text("subscription").notNull(),
  schedule: text("schedule").notNull(),
  nextSendAt: integer("next_send_at").notNull(),
  lastLocalDay: text("last_local_day"),
  leaseUntil: integer("lease_until"),
  failures: integer("failures").notNull().default(0),
  lastError: text("last_error"),
  lastTestAt: integer("last_test_at"),
  updatedAt: integer("updated_at").notNull(),
}, table => [index("practice_push_due_idx").on(table.nextSendAt), index("practice_push_user_idx").on(table.userId)]);
