/**
 * ZyNum — Tarification à paliers
 *
 * Les bornes sont exprimées en FCFA (taux 620 CFA/USD).
 * La formule est linéaire par palier.
 *
 * Palier 1 : 5sim FCFA  0 – 500   → ZyNum 1100 – 2200 FCFA
 * Transition :           500 – 1000 → blend 2200 → 2000 FCFA
 * Palier 2 : 5sim FCFA  1000+      → ZyNum 2000 – 4500 FCFA (extrapolé au-delà de 3000)
 */

export const DISPLAY_RATE = 620; // 1 USD = 620 FCFA (taux affiché)

// ─── Paramètres des paliers ────────────────────────────────────────────────
const T1_5SIM_MIN  = 30;   // FCFA 5sim bas de fourchette palier 1
const T1_5SIM_MAX  = 500;  // FCFA 5sim haut de fourchette palier 1
const T1_PRICE_MIN = 1100; // FCFA ZyNum correspondant au bas
const T1_PRICE_MAX = 2200; // FCFA ZyNum correspondant au haut

const T2_5SIM_MIN  = 1000; // FCFA 5sim bas de fourchette palier 2
const T2_5SIM_MAX  = 3000; // FCFA 5sim haut de fourchette palier 2
const T2_PRICE_MIN = 2000; // FCFA ZyNum correspondant au bas
const T2_PRICE_MAX = 4500; // FCFA ZyNum correspondant au haut

const FLOOR_FCFA = T1_PRICE_MIN; // plancher absolu : 1100 FCFA

// ─── Formule principale ────────────────────────────────────────────────────
/**
 * Retourne le prix ZyNum (FCFA et USD) à partir du prix brut 5sim en USD.
 */
export function applyTieredPricing(fiveSimPriceUsd: number): {
  priceUsd: number;
  priceFcfa: number;
} {
  // Prix 5sim exprimé en FCFA au taux affiché (620)
  const fiveSimFcfa = fiveSimPriceUsd * DISPLAY_RATE;

  let zynumFcfa: number;

  if (fiveSimFcfa <= T1_5SIM_MIN) {
    // En-dessous du minimum palier 1 → plancher
    zynumFcfa = FLOOR_FCFA;

  } else if (fiveSimFcfa <= T1_5SIM_MAX) {
    // Palier 1 : interpolation linéaire
    const ratio = (fiveSimFcfa - T1_5SIM_MIN) / (T1_5SIM_MAX - T1_5SIM_MIN);
    zynumFcfa = T1_PRICE_MIN + ratio * (T1_PRICE_MAX - T1_PRICE_MIN);

  } else if (fiveSimFcfa < T2_5SIM_MIN) {
    // Transition entre palier 1 et 2 : blend linéaire 2200 → 2000
    const ratio = (fiveSimFcfa - T1_5SIM_MAX) / (T2_5SIM_MIN - T1_5SIM_MAX);
    zynumFcfa = T1_PRICE_MAX + ratio * (T2_PRICE_MIN - T1_PRICE_MAX);

  } else {
    // Palier 2 (et extrapolation au-delà de 3000F) : y = 750 + 1.25 * x
    // dérivé de : T2_PRICE_MIN à x=T2_5SIM_MIN, T2_PRICE_MAX à x=T2_5SIM_MAX
    const slope = (T2_PRICE_MAX - T2_PRICE_MIN) / (T2_5SIM_MAX - T2_5SIM_MIN); // 1.25
    const intercept = T2_PRICE_MIN - slope * T2_5SIM_MIN;                        // 750
    zynumFcfa = intercept + slope * fiveSimFcfa;
  }

  // Arrondi au FCFA supérieur, plancher garanti
  const priceFcfa = Math.max(FLOOR_FCFA, Math.round(zynumFcfa));
  const priceUsd  = Math.round((priceFcfa / DISPLAY_RATE) * 100) / 100;

  return { priceUsd, priceFcfa };
}
