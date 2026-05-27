import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

export const operatorRoutesTable = pgTable("operator_routes", {
  id:              serial("id").primaryKey(),
  countryCode:     text("country_code").notNull(),
  countryName:     text("country_name").notNull(),
  flag:            text("flag").notNull().default("🌍"),
  prefix:          text("prefix").notNull(),
  currency:        text("currency").notNull().default("XOF"),
  currencySymbol:  text("currency_symbol").notNull().default("FCFA"),
  operatorName:    text("operator_name").notNull(),
  operatorKey:     text("operator_key").notNull().unique(),
  aggregator:      text("aggregator").notNull().default("omnipay"),
  isActive:        boolean("is_active").notNull().default(true),
  needsOtp:        boolean("needs_otp").notNull().default(false),
  needsReturnUrl:  boolean("needs_return_url").notNull().default(false),
  ussdCode:        text("ussd_code"),
  otpHint:         text("otp_hint"),
  validationHint:  text("validation_hint"),
  paxityOperatorId: text("paxity_operator_id"),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type OperatorRoute = typeof operatorRoutesTable.$inferSelect;
