import { pgTable, text, serial, timestamp, boolean, real } from "drizzle-orm/pg-core";

export const countryOverridesTable = pgTable("country_overrides", {
  id: serial("id").primaryKey(),
  countrySlug: text("country_slug").notNull().unique(),
  countryName: text("country_name").notNull(),
  isDisabled: boolean("is_disabled").notNull().default(false),
  priceMultiplier: real("price_multiplier").notNull().default(1.0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CountryOverride = typeof countryOverridesTable.$inferSelect;
