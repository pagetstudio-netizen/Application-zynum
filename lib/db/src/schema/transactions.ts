import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull().default("recharge"),
  amountUsd: real("amount_usd").notNull(),
  amountFcfa: real("amount_fcfa").notNull(),
  method: text("method").notNull(),
  provider: text("provider"),
  status: text("status").notNull().default("pending"),
  reference: text("reference"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
