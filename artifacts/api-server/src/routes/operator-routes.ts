import { Router, type IRouter, type Request, type Response } from "express";
import { db, operatorRoutesTable } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";

const router: IRouter = Router();
const auth = [requireAuth, requireAdmin];

const DEFAULT_OPERATORS = [
  // ── Côte d'Ivoire ────────────────────────────────────────────────────────
  { countryCode:"CI", countryName:"Côte d'Ivoire", flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money", operatorKey:"ORANGE_CI", aggregator:"omnipay", isActive:true, needsOtp:true,  needsReturnUrl:false, otpHint:"Composez #144*82# sur votre téléphone pour générer votre code OTP, puis saisissez-le ci-dessous.", paxityOperatorId:null },
  { countryCode:"CI", countryName:"Côte d'Ivoire", flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"MTN MoMo",     operatorKey:"MTN_CI",    aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CI", countryName:"Côte d'Ivoire", flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",    operatorKey:"MOOV_CI",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CI", countryName:"Côte d'Ivoire", flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Wave",           operatorKey:"WAVE_CI",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:true,  otpHint:null, paxityOperatorId:null },
  // ── Sénégal ──────────────────────────────────────────────────────────────
  { countryCode:"SN", countryName:"Sénégal",        flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Wave",           operatorKey:"WAVE_SN",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:true,  otpHint:null, paxityOperatorId:null },
  { countryCode:"SN", countryName:"Sénégal",        flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ORANGE_SN", aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"SN", countryName:"Sénégal",        flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Free Money",     operatorKey:"FREE_SN",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Burkina Faso ─────────────────────────────────────────────────────────
  { countryCode:"BF", countryName:"Burkina Faso",   flag:"🇧🇫", prefix:"226", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ORANGE_BF", aggregator:"omnipay", isActive:true, needsOtp:true,  needsReturnUrl:false, otpHint:"Composez *144*4*6*montant# sur votre téléphone pour générer votre code OTP, puis saisissez-le ci-dessous.", paxityOperatorId:null },
  { countryCode:"BF", countryName:"Burkina Faso",   flag:"🇧🇫", prefix:"226", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",     operatorKey:"MOOV_BF",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Mali ─────────────────────────────────────────────────────────────────
  { countryCode:"ML", countryName:"Mali",           flag:"🇲🇱", prefix:"223", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ORANGE_ML", aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:"Veuillez valider le paiement sur votre téléphone Orange Money.\n\nSi vous ne recevez pas de notification, composez #144# sur votre téléphone, puis accédez au menu Paiement marchand (option 2).\n\nValidez l'opération en entrant votre code secret.", paxityOperatorId:null },
  { countryCode:"ML", countryName:"Mali",           flag:"🇲🇱", prefix:"223", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",     operatorKey:"MOOV_ML",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Guinée ───────────────────────────────────────────────────────────────
  { countryCode:"GN", countryName:"Guinée",         flag:"🇬🇳", prefix:"224", currency:"GNF", currencySymbol:"GNF",  operatorName:"Orange Money",   operatorKey:"ORANGE_GN", aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"GN", countryName:"Guinée",         flag:"🇬🇳", prefix:"224", currency:"GNF", currencySymbol:"GNF",  operatorName:"MTN MoMo",       operatorKey:"MTN_GN",    aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Cameroun ─────────────────────────────────────────────────────────────
  { countryCode:"CM", countryName:"Cameroun",       flag:"🇨🇲", prefix:"237", currency:"XAF", currencySymbol:"FCFA", operatorName:"MTN MoMo",       operatorKey:"MTN_CM",    aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CM", countryName:"Cameroun",       flag:"🇨🇲", prefix:"237", currency:"XAF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ORANGE_CM", aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Bénin ────────────────────────────────────────────────────────────────
  { countryCode:"BJ", countryName:"Bénin",          flag:"🇧🇯", prefix:"229", currency:"XOF", currencySymbol:"FCFA", operatorName:"MTN MoMo",       operatorKey:"MTN_BJ",    aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"BJ", countryName:"Bénin",          flag:"🇧🇯", prefix:"229", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",     operatorKey:"MOOV_BJ",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Togo ─────────────────────────────────────────────────────────────────
  { countryCode:"TG", countryName:"Togo",           flag:"🇹🇬", prefix:"228", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",     operatorKey:"MOOV_TG",   aggregator:"paxity",  isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:"MOOVTG" },
  { countryCode:"TG", countryName:"Togo",           flag:"🇹🇬", prefix:"228", currency:"XOF", currencySymbol:"FCFA", operatorName:"T-Money",        operatorKey:"TOGOCEL_TG",aggregator:"paxity",  isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:"TMONEYTG" },
  // ── Ghana ────────────────────────────────────────────────────────────────
  { countryCode:"GH", countryName:"Ghana",          flag:"🇬🇭", prefix:"233", currency:"GHS", currencySymbol:"GHS",  operatorName:"MTN MoMo",       operatorKey:"MTN_GH",    aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"GH", countryName:"Ghana",          flag:"🇬🇭", prefix:"233", currency:"GHS", currencySymbol:"GHS",  operatorName:"AirtelTigo",     operatorKey:"AIRTEL_GH", aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Niger ────────────────────────────────────────────────────────────────
  { countryCode:"NE", countryName:"Niger",          flag:"🇳🇪", prefix:"227", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",     operatorKey:"MOOV_NE",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── RD Congo ─────────────────────────────────────────────────────────────
  { countryCode:"COD", countryName:"RD Congo",      flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Vodacom",        operatorKey:"VODACOM_CD",aggregator:"sendavapay",isActive:true, needsOtp:false,needsReturnUrl:false,  otpHint:null, paxityOperatorId:null },
  { countryCode:"COD", countryName:"RD Congo",      flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Airtel",         operatorKey:"AIRTEL_CD", aggregator:"sendavapay",isActive:true, needsOtp:false,needsReturnUrl:false,  otpHint:null, paxityOperatorId:null },
  { countryCode:"COD", countryName:"RD Congo",      flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Orange Money",   operatorKey:"ORANGE_CD", aggregator:"sendavapay",isActive:true, needsOtp:false,needsReturnUrl:false,  otpHint:null, paxityOperatorId:null },
  // ── Congo Brazzaville ────────────────────────────────────────────────────
  { countryCode:"COG", countryName:"Congo Brazzaville", flag:"🇨🇬", prefix:"242", currency:"XAF", currencySymbol:"FCFA", operatorName:"MTN",      operatorKey:"MTN_CG",    aggregator:"sendavapay",isActive:true, needsOtp:false,needsReturnUrl:false,  otpHint:null, paxityOperatorId:null },
  { countryCode:"COG", countryName:"Congo Brazzaville", flag:"🇨🇬", prefix:"242", currency:"XAF", currencySymbol:"FCFA", operatorName:"Airtel",   operatorKey:"AIRTEL_CG", aggregator:"sendavapay",isActive:true, needsOtp:false,needsReturnUrl:false,  otpHint:null, paxityOperatorId:null },

  // ══════════════════════════════════════════════════════════════════════════
  // ── AshTechPay ───────────────────────────────────────────────────────────
  // Nouveaux pays (isActive: true) — pas couverts par les autres fournisseurs
  // ── Centrafrique (NOUVEAU) ────────────────────────────────────────────────
  { countryCode:"CF", countryName:"Centrafrique",       flag:"🇨🇫", prefix:"236", currency:"XAF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ATP_ORANGE_CF",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Gabon (NOUVEAU) ──────────────────────────────────────────────────────
  { countryCode:"GA", countryName:"Gabon",              flag:"🇬🇦", prefix:"241", currency:"XAF", currencySymbol:"FCFA", operatorName:"Airtel Money",    operatorKey:"ATP_AIRTEL_GA",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"GA", countryName:"Gabon",              flag:"🇬🇦", prefix:"241", currency:"XAF", currencySymbol:"FCFA", operatorName:"Moov Money",      operatorKey:"ATP_MOOV_GA",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Guinée équatoriale (NOUVEAU) ─────────────────────────────────────────
  { countryCode:"GQ", countryName:"Guinée équatoriale", flag:"🇬🇶", prefix:"240", currency:"XAF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ATP_ORANGE_GQ",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Guinée-Bissau (NOUVEAU) ──────────────────────────────────────────────
  { countryCode:"GW", countryName:"Guinée-Bissau",      flag:"🇬🇼", prefix:"245", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ATP_ORANGE_GW",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Tchad (NOUVEAU) ──────────────────────────────────────────────────────
  { countryCode:"TD", countryName:"Tchad",              flag:"🇹🇩", prefix:"235", currency:"XAF", currencySymbol:"FCFA", operatorName:"Airtel Money",    operatorKey:"ATP_AIRTEL_TD",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"TD", countryName:"Tchad",              flag:"🇹🇩", prefix:"235", currency:"XAF", currencySymbol:"FCFA", operatorName:"Moov Money",      operatorKey:"ATP_MOOV_TD",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── Niger — Airtel uniquement (Moov Money non supporté par AshTechPay) ──────
  { countryCode:"NE", countryName:"Niger",              flag:"🇳🇪", prefix:"227", currency:"XOF", currencySymbol:"FCFA", operatorName:"Airtel Money",    operatorKey:"ATP_AIRTEL_NE",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  // ── RD Congo — Afrimoney (NOUVEAU, autres via SendavaPay) ────────────────
  { countryCode:"COD", countryName:"RD Congo",          flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Afrimoney",       operatorKey:"ATP_AFRIMONEY_CD", aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },

  // Pays déjà couverts (isActive: false — activables via l'admin si besoin)
  { countryCode:"BJ",  countryName:"Bénin",            flag:"🇧🇯", prefix:"229", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",      operatorKey:"ATP_MOOV_BJ",      aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"BJ",  countryName:"Bénin",            flag:"🇧🇯", prefix:"229", currency:"XOF", currencySymbol:"FCFA", operatorName:"MTN Mobile Money", operatorKey:"ATP_MTN_BJ",       aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"BF",  countryName:"Burkina Faso",      flag:"🇧🇫", prefix:"226", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",      operatorKey:"ATP_MOOV_BF",      aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"BF",  countryName:"Burkina Faso",      flag:"🇧🇫", prefix:"226", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",    operatorKey:"ATP_ORANGE_BF",    aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CM",  countryName:"Cameroun",          flag:"🇨🇲", prefix:"237", currency:"XAF", currencySymbol:"FCFA", operatorName:"MTN Mobile Money", operatorKey:"ATP_MTN_CM",       aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CM",  countryName:"Cameroun",          flag:"🇨🇲", prefix:"237", currency:"XAF", currencySymbol:"FCFA", operatorName:"Orange Money",    operatorKey:"ATP_ORANGE_CM",    aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CG",  countryName:"Congo",             flag:"🇨🇬", prefix:"242", currency:"XAF", currencySymbol:"FCFA", operatorName:"Airtel Money",    operatorKey:"ATP_AIRTEL_CG",    aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CG",  countryName:"Congo",             flag:"🇨🇬", prefix:"242", currency:"XAF", currencySymbol:"FCFA", operatorName:"MTN Mobile Money", operatorKey:"ATP_MTN_CG",       aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CI",  countryName:"Côte d'Ivoire",     flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",      operatorKey:"ATP_MOOV_CI",      aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CI",  countryName:"Côte d'Ivoire",     flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"MTN Mobile Money", operatorKey:"ATP_MTN_CI",       aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CI",  countryName:"Côte d'Ivoire",     flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",    operatorKey:"ATP_ORANGE_CI",    aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"CI",  countryName:"Côte d'Ivoire",     flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Wave",            operatorKey:"ATP_WAVE_CI",      aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:true,  otpHint:null, paxityOperatorId:null },
  { countryCode:"GN",  countryName:"Guinée",            flag:"🇬🇳", prefix:"224", currency:"GNF", currencySymbol:"GNF",  operatorName:"MTN Mobile Money", operatorKey:"ATP_MTN_GN",       aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"GN",  countryName:"Guinée",            flag:"🇬🇳", prefix:"224", currency:"GNF", currencySymbol:"GNF",  operatorName:"Orange Money",    operatorKey:"ATP_ORANGE_GN",    aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"ML",  countryName:"Mali",              flag:"🇲🇱", prefix:"223", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",      operatorKey:"ATP_MOOV_ML",      aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"ML",  countryName:"Mali",              flag:"🇲🇱", prefix:"223", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",    operatorKey:"ATP_ORANGE_ML",    aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"COD", countryName:"RD Congo",          flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Airtel Money",    operatorKey:"ATP_AIRTEL_CD",    aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"COD", countryName:"RD Congo",          flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Orange Money",    operatorKey:"ATP_ORANGE_CD",    aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"COD", countryName:"RD Congo",          flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Vodacom M-Pesa",  operatorKey:"ATP_VODACOM_CD",   aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"SN",  countryName:"Sénégal",           flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Free Money",      operatorKey:"ATP_FREE_SN",      aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"SN",  countryName:"Sénégal",           flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",    operatorKey:"ATP_ORANGE_SN",    aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"SN",  countryName:"Sénégal",           flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Wave",            operatorKey:"ATP_WAVE_SN",      aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:true,  otpHint:null, paxityOperatorId:null },
  { countryCode:"TG",  countryName:"Togo",              flag:"🇹🇬", prefix:"228", currency:"XOF", currencySymbol:"FCFA", operatorName:"Flooz (Moov)",     operatorKey:"ATP_FLOOZ_TG",     aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
  { countryCode:"TG",  countryName:"Togo",              flag:"🇹🇬", prefix:"228", currency:"XOF", currencySymbol:"FCFA", operatorName:"T-Money",         operatorKey:"ATP_TMONEY_TG",    aggregator:"ashtechpay", isActive:false, needsOtp:false, needsReturnUrl:false, otpHint:null, paxityOperatorId:null },
];

// ─── Public: list active operators for payment modal ─────────────────────────
router.get("/v1/payments/operators", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(operatorRoutesTable)
      .where(eq(operatorRoutesTable.isActive, true))
      .orderBy(asc(operatorRoutesTable.countryName), asc(operatorRoutesTable.operatorName));
    res.json({ operators: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

// ─── Admin: list all ──────────────────────────────────────────────────────────
router.get("/v1/admin/operator-routes", ...auth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(operatorRoutesTable)
      .orderBy(asc(operatorRoutesTable.countryName), asc(operatorRoutesTable.operatorName));
    res.json({ operators: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

// ─── Admin: basculer tous les opérateurs vers AshTechPay ─────────────────────
router.post("/v1/admin/operator-routes/migrate-to-ashtechpay", ...auth, async (_req: Request, res: Response): Promise<void> => {
  try {
    await db
      .update(operatorRoutesTable)
      .set({ isActive: false })
      .where(sql`${operatorRoutesTable.operatorKey} NOT LIKE 'ATP_%'`);

    await db
      .update(operatorRoutesTable)
      .set({ isActive: true })
      .where(sql`${operatorRoutesTable.operatorKey} LIKE 'ATP_%'`);

    const rows = await db.select().from(operatorRoutesTable).orderBy(asc(operatorRoutesTable.countryName));
    const active   = rows.filter(r => r.isActive).length;
    const inactive = rows.filter(r => !r.isActive).length;
    res.json({ success: true, active, inactive, total: rows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

// ─── Admin: seed defaults ─────────────────────────────────────────────────────
router.post("/v1/admin/operator-routes/seed", ...auth, async (_req: Request, res: Response): Promise<void> => {
  try {
    let inserted = 0;
    let skipped  = 0;
    for (const op of DEFAULT_OPERATORS) {
      try {
        await db.insert(operatorRoutesTable).values({
          countryCode:      op.countryCode,
          countryName:      op.countryName,
          flag:             op.flag,
          prefix:           op.prefix,
          currency:         op.currency,
          currencySymbol:   op.currencySymbol,
          operatorName:     op.operatorName,
          operatorKey:      op.operatorKey,
          aggregator:       op.aggregator,
          isActive:         op.isActive,
          needsOtp:         op.needsOtp,
          needsReturnUrl:   op.needsReturnUrl,
          otpHint:          op.otpHint ?? null,
          validationHint:   (op as any).validationHint ?? null,
          paxityOperatorId: op.paxityOperatorId ?? null,
        }).onConflictDoNothing();
        inserted++;
      } catch {
        skipped++;
      }
    }
    res.json({ success: true, inserted, skipped, total: DEFAULT_OPERATORS.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

// ─── Admin: create ────────────────────────────────────────────────────────────
router.post("/v1/admin/operator-routes", ...auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      countryCode, countryName, flag, prefix, currency, currencySymbol,
      operatorName, operatorKey, aggregator,
      isActive, needsOtp, needsReturnUrl,
      otpHint, validationHint, paxityOperatorId,
    } = req.body ?? {};

    if (!countryCode || !countryName || !operatorName || !operatorKey || !aggregator) {
      res.status(400).json({ error: "Champs requis : countryCode, countryName, operatorName, operatorKey, aggregator" });
      return;
    }

    const [row] = await db.insert(operatorRoutesTable).values({
      countryCode:      String(countryCode),
      countryName:      String(countryName),
      flag:             String(flag ?? "🌍"),
      prefix:           String(prefix ?? ""),
      currency:         String(currency ?? "XOF"),
      currencySymbol:   String(currencySymbol ?? "FCFA"),
      operatorName:     String(operatorName),
      operatorKey:      String(operatorKey).toUpperCase().replace(/\s+/g, "_"),
      aggregator:       String(aggregator),
      isActive:         isActive !== false,
      needsOtp:         needsOtp === true,
      needsReturnUrl:   needsReturnUrl === true,
      otpHint:          otpHint ? String(otpHint) : null,
      validationHint:   validationHint ? String(validationHint) : null,
      paxityOperatorId: paxityOperatorId ? String(paxityOperatorId) : null,
    }).returning();

    res.json({ operator: row });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    if (message.includes("unique")) {
      res.status(409).json({ error: "Un opérateur avec cette clé existe déjà." });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// ─── Admin: update ────────────────────────────────────────────────────────────
router.patch("/v1/admin/operator-routes/:id", ...auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }

    const {
      aggregator, isActive, needsOtp, needsReturnUrl,
      otpHint, validationHint, paxityOperatorId,
      operatorName, countryName, flag, prefix, currency, currencySymbol,
    } = req.body ?? {};

    const patch: Record<string, unknown> = {};
    if (aggregator      !== undefined) patch.aggregator      = String(aggregator);
    if (isActive        !== undefined) patch.isActive        = Boolean(isActive);
    if (needsOtp        !== undefined) patch.needsOtp        = Boolean(needsOtp);
    if (needsReturnUrl  !== undefined) patch.needsReturnUrl  = Boolean(needsReturnUrl);
    if (otpHint         !== undefined) patch.otpHint         = otpHint ? String(otpHint) : null;
    if (validationHint  !== undefined) patch.validationHint  = validationHint ? String(validationHint) : null;
    if (paxityOperatorId !== undefined) patch.paxityOperatorId = paxityOperatorId ? String(paxityOperatorId) : null;
    if (operatorName    !== undefined) patch.operatorName    = String(operatorName);
    if (countryName     !== undefined) patch.countryName     = String(countryName);
    if (flag            !== undefined) patch.flag            = String(flag);
    if (prefix          !== undefined) patch.prefix          = String(prefix);
    if (currency        !== undefined) patch.currency        = String(currency);
    if (currencySymbol  !== undefined) patch.currencySymbol  = String(currencySymbol);

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "Aucune mise à jour fournie" });
      return;
    }

    const [row] = await db
      .update(operatorRoutesTable)
      .set(patch as any)
      .where(eq(operatorRoutesTable.id, id))
      .returning();

    if (!row) { res.status(404).json({ error: "Opérateur introuvable" }); return; }
    res.json({ operator: row });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

// ─── Admin: bulk activate / deactivate by country ────────────────────────────
router.post("/v1/admin/operator-routes/bulk", ...auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryCode, isActive } = req.body ?? {};
    if (!countryCode || isActive === undefined) {
      res.status(400).json({ error: "countryCode et isActive requis" });
      return;
    }
    await db
      .update(operatorRoutesTable)
      .set({ isActive: Boolean(isActive) })
      .where(eq(operatorRoutesTable.countryCode, String(countryCode)));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

// ─── Admin: delete ────────────────────────────────────────────────────────────
router.delete("/v1/admin/operator-routes/:id", ...auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string, 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
    await db.delete(operatorRoutesTable).where(eq(operatorRoutesTable.id, id));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

export default router;
