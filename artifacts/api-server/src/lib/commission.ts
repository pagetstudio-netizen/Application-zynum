import { db, adminSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

let _cache: { multiplier: number; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getCommissionMultiplier(): Promise<number> {
  const now = Date.now();
  if (_cache && now < _cache.expiresAt) return _cache.multiplier;

  const rows = await db
    .select()
    .from(adminSettingsTable)
    .where(inArray(adminSettingsTable.key, ["commission_type", "commission_value"]));

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const type = map["commission_type"] ?? "percent";
  const value = parseFloat(map["commission_value"] ?? "0");

  let multiplier = 1.0;
  if (type === "percent" && value > 0) {
    multiplier = 1 + value / 100;
  }

  _cache = { multiplier, expiresAt: now + CACHE_TTL_MS };
  return multiplier;
}

export function applyCommission(priceUsd: number, multiplier: number): number {
  return Math.round(priceUsd * multiplier * 10000) / 10000;
}

export function invalidateCommissionCache(): void {
  _cache = null;
}
