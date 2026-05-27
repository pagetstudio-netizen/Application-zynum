import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const affiliateWithdrawalsTable = pgTable("affiliate_withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amountUsd: real("amount_usd").notNull(),
  phone: text("phone").notNull(),
  country: text("country").notNull(),
  status: text("status").notNull().default("pending"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAffiliateWithdrawalSchema = createInsertSchema(affiliateWithdrawalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliateWithdrawal = z.infer<typeof insertAffiliateWithdrawalSchema>;
export type AffiliateWithdrawal = typeof affiliateWithdrawalsTable.$inferSelect;
