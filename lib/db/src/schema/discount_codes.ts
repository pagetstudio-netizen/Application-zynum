import { pgTable, text, serial, timestamp, boolean, real, integer } from "drizzle-orm/pg-core";

export const discountCodesTable = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  percent: real("percent").notNull().default(0),
  country: text("country"),
  isActive: boolean("is_active").notNull().default(false),
  usedCount: integer("used_count").notNull().default(0),
  totalSavedFcfa: real("total_saved_fcfa").notNull().default(0),
  totalSavedUsd: real("total_saved_usd").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DiscountCode = typeof discountCodesTable.$inferSelect;
