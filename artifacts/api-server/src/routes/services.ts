import { Router, type IRouter } from "express";
import { getAvailableServices, getCountriesForService } from "../lib/fivesim.js";
import { GetCountriesQueryParams } from "@workspace/api-zod";
import { db, countryOverridesTable } from "@workspace/db";
import { applyTieredPricing } from "../lib/pricing.js";

const router: IRouter = Router();

router.get("/v1/services", async (_req, res): Promise<void> => {
  const services = await getAvailableServices();
  res.json({ services });
});

router.get("/v1/countries", async (req, res): Promise<void> => {
  const parsed = GetCountriesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const service = parsed.data.service ?? "telegram";
  const [countries, overrides] = await Promise.all([
    getCountriesForService(service),
    db.select().from(countryOverridesTable),
  ]);

  const overrideMap = new Map(overrides.map((o) => [o.countrySlug, o]));

  const filtered = countries
    .filter((c) => {
      const ov = overrideMap.get(c.code);
      return !ov || !ov.isDisabled;
    })
    .map((c) => {
      const ov = overrideMap.get(c.code);
      const countryMultiplier = ov && ov.priceMultiplier !== 1.0 ? ov.priceMultiplier : 1.0;
      // Apply tiered pricing on the raw 5sim price, then apply country multiplier on top
      const { priceUsd, priceFcfa } = applyTieredPricing(c.priceUsd * countryMultiplier);
      return { ...c, priceUsd, priceFcfa };
    });

  res.json({ countries: filtered });
});

export default router;
