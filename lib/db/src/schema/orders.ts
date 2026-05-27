import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  externalId: text("external_id").notNull(),
  phone: text("phone").notNull(),
  service: text("service").notNull(),
  serviceName: text("service_name").notNull(),
  country: text("country").notNull(),
  countryName: text("country_name").notNull(),
  status: text("status").notNull().default("PENDING"),
  smsCode: text("sms_code"),
  smsText: text("sms_text"),
  priceUsd: real("price_usd").notNull().default(0),
  priceFcfa: real("price_fcfa").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
