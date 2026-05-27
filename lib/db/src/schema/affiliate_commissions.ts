import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const affiliateCommissionsTable = pgTable("affiliate_commissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  filleulId: integer("filleul_id").notNull(),
  orderId: integer("order_id").notNull(),
  amountUsd: real("amount_usd").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAffiliateCommissionSchema = createInsertSchema(affiliateCommissionsTable).omit({ id: true, createdAt: true });
export type InsertAffiliateCommission = z.infer<typeof insertAffiliateCommissionSchema>;
export type AffiliateCommission = typeof affiliateCommissionsTable.$inferSelect;
