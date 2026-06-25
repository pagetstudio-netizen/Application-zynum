import crypto from "crypto";
import { db, usersTable, socialLinksTable, paymentProvidersTable, operatorRoutesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function generateApiKey(): string {
  return `zyn_${crypto.randomBytes(32).toString("hex")}`;
}

async function ensureSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL,
      "password_hash" text NOT NULL,
      "api_key" text,
      "balance_usd" real DEFAULT 0 NOT NULL,
      "is_admin" boolean DEFAULT false NOT NULL,
      "is_banned" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "users_email_unique" UNIQUE("email"),
      CONSTRAINT "users_api_key_unique" UNIQUE("api_key")
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sessions" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "token" text NOT NULL,
      "expires_at" timestamp with time zone NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "sessions_token_unique" UNIQUE("token")
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "orders" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "external_id" text NOT NULL,
      "phone" text NOT NULL,
      "service" text NOT NULL,
      "service_name" text NOT NULL,
      "country" text NOT NULL,
      "country_name" text NOT NULL,
      "status" text DEFAULT 'PENDING' NOT NULL,
      "sms_code" text,
      "sms_text" text,
      "price_usd" real DEFAULT 0 NOT NULL,
      "price_fcfa" real DEFAULT 0 NOT NULL,
      "currency" text DEFAULT 'USD' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "transactions" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "type" text DEFAULT 'recharge' NOT NULL,
      "amount_usd" real NOT NULL,
      "amount_fcfa" real NOT NULL,
      "method" text NOT NULL,
      "provider" text,
      "status" text DEFAULT 'pending' NOT NULL,
      "reference" text,
      "metadata" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_settings" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" text NOT NULL,
      "value" text NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "admin_settings_key_unique" UNIQUE("key")
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_messages" (
      "id" serial PRIMARY KEY NOT NULL,
      "sender_id" integer NOT NULL,
      "type" text DEFAULT 'popup' NOT NULL,
      "target" text DEFAULT 'all' NOT NULL,
      "subject" text,
      "content" text NOT NULL,
      "color" text DEFAULT 'blue',
      "link_url" text,
      "link_label" text,
      "image_url" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "sent_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  // Add new popup columns to existing admin_messages tables (idempotent)
  for (const col of [
    `ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS color text DEFAULT 'blue'`,
    `ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS link_url text`,
    `ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS link_label text`,
    `ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS image_url text`,
    `ALTER TABLE admin_messages ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL`,
  ]) {
    await db.execute(sql.raw(col)).catch(() => {});
  }
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "payment_providers" (
      "id" serial PRIMARY KEY NOT NULL,
      "category" text NOT NULL,
      "name" text NOT NULL,
      "slug" text NOT NULL,
      "is_active" boolean DEFAULT false NOT NULL,
      "is_selected" boolean DEFAULT false NOT NULL,
      "config" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "payment_providers_slug_unique" UNIQUE("slug")
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "faq_articles" (
      "id" serial PRIMARY KEY NOT NULL,
      "type" text DEFAULT 'faq' NOT NULL,
      "category" text,
      "question" text NOT NULL,
      "answer" text NOT NULL,
      "lang" text DEFAULT 'fr' NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "social_links" (
      "id" serial PRIMARY KEY NOT NULL,
      "platform" text NOT NULL,
      "url" text NOT NULL,
      "icon" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "country_overrides" (
      "id" serial PRIMARY KEY NOT NULL,
      "country_slug" text NOT NULL,
      "country_name" text NOT NULL,
      "is_disabled" boolean DEFAULT false NOT NULL,
      "price_multiplier" real DEFAULT 1 NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "country_overrides_country_slug_unique" UNIQUE("country_slug")
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "contact_messages" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL,
      "subject" text NOT NULL,
      "message" text NOT NULL,
      "is_read" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "api_waitlist" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "api_waitlist_email_unique" UNIQUE("email")
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "discount_codes" (
      "id" serial PRIMARY KEY NOT NULL,
      "code" text NOT NULL,
      "percent" real DEFAULT 0 NOT NULL,
      "country" text,
      "is_active" boolean DEFAULT false NOT NULL,
      "used_count" integer DEFAULT 0 NOT NULL,
      "total_saved_fcfa" real DEFAULT 0 NOT NULL,
      "total_saved_usd" real DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
    )
  `);

  // Email verification and login tracking columns (idempotent)
  for (const col of [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone`,
  ]) {
    await db.execute(sql.raw(col)).catch(() => {});
  }

  // Affiliate system columns (idempotent)
  for (const col of [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by integer`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_balance real DEFAULT 0 NOT NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_unique ON users(referral_code) WHERE referral_code IS NOT NULL`,
  ]) {
    await db.execute(sql.raw(col)).catch(() => {});
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "affiliate_commissions" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "filleul_id" integer NOT NULL,
      "order_id" integer NOT NULL,
      "amount_usd" real NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "affiliate_withdrawals" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "amount_usd" real NOT NULL,
      "phone" text NOT NULL,
      "country" text NOT NULL,
      "status" text DEFAULT 'pending' NOT NULL,
      "note" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "operator_routes" (
      "id" serial PRIMARY KEY NOT NULL,
      "country_code" text NOT NULL,
      "country_name" text NOT NULL,
      "flag" text NOT NULL DEFAULT '🌍',
      "prefix" text NOT NULL,
      "currency" text NOT NULL DEFAULT 'XOF',
      "currency_symbol" text NOT NULL DEFAULT 'FCFA',
      "operator_name" text NOT NULL,
      "operator_key" text NOT NULL,
      "aggregator" text NOT NULL DEFAULT 'omnipay',
      "is_active" boolean NOT NULL DEFAULT true,
      "needs_otp" boolean NOT NULL DEFAULT false,
      "needs_return_url" boolean NOT NULL DEFAULT false,
      "ussd_code" text,
      "otp_hint" text,
      "validation_hint" text,
      "paxity_operator_id" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "operator_routes_operator_key_unique" UNIQUE("operator_key")
    )
  `);
}

async function seedData() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@zynum.net";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "ChangeMe123!!";

  await db
    .insert(usersTable)
    .values({
      name: "Admin",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      apiKey: generateApiKey(),
      balanceUsd: 0,
      isAdmin: true,
      isBanned: false,
    })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: { isAdmin: true, name: "Admin" },
    });

  const existingSocials = await db.select().from(socialLinksTable).limit(1);
  if (existingSocials.length === 0) {
    const socials = [
      { platform: "WhatsApp", url: "https://whatsapp.com/channel/0029Vb8MmTnHQbS8sEmxvd3z", icon: "whatsapp", isActive: true, sortOrder: 1 },
      { platform: "Facebook", url: "https://facebook.com/zynum",  icon: "facebook", isActive: true, sortOrder: 2 },
      { platform: "Discord",  url: "https://discord.gg/zynum",    icon: "discord",  isActive: true, sortOrder: 3 },
      { platform: "Telegram", url: "https://t.me/ZyNumSupport",   icon: "telegram", isActive: true, sortOrder: 4 },
      { platform: "YouTube",  url: "https://youtube.com/@zynum",  icon: "youtube",  isActive: true, sortOrder: 5 },
      { platform: "X",        url: "https://x.com/zynum",         icon: "x",        isActive: true, sortOrder: 6 },
    ];
    await db.insert(socialLinksTable).values(socials);
  }

  const providers = [
    {
      category: "mobile_money",
      name: "Paxity – Mobile Money",
      slug: "paxity",
      isActive: true,
      isSelected: true,
      config: JSON.stringify({
        countries: ["SN","CI","CM","BJ","BF","GH","GN","KE","ML","NG","TG"],
        operators: ["WAVESN","OMSN","MTNCI","WAVECI","OMCI","MTNCM","OMCM","MOOVBJ","MTNBJ","MOOVBF","OMBF","ATGH","MTNGH","TLGH","MTNGN","OMGN","MPESAKE","MOOVML","OMML","MTNNG","OPNG","TMONEYTG","MOOVTG"],
        apiUrl: "https://transaction.paxity.io/api/v1",
      }),
    },
    {
      category: "card",
      name: "Paxity – Carte bancaire",
      slug: "paxity_card",
      isActive: true,
      isSelected: true,
      config: JSON.stringify({ currencies: ["XOF","XAF"], apiUrl: "https://transaction.paxity.io/api/v1" }),
    },
    {
      category: "mobile_money",
      name: "AshTechPay – Mobile Money",
      slug: "ashtechpay",
      isActive: true,
      isSelected: true,
      config: JSON.stringify({
        countries: ["BJ","BF","CM","CF","CG","CI","GA","GQ","GW","GN","ML","NE","COD","SN","TD","TG"],
        apiUrl: "https://ashtechpay.top",
      }),
    },
  ];
  for (const p of providers) {
    await db
      .insert(paymentProvidersTable)
      .values(p)
      .onConflictDoUpdate({
        target: paymentProvidersTable.slug,
        set: { name: p.name, isActive: p.isActive, isSelected: p.isSelected, config: p.config },
      });
  }

  // ── AshTechPay operators (insérer si absents, puis activer tous) ─────────────
  const ATP_OPERATORS = [
    { countryCode:"CF",  countryName:"Centrafrique",       flag:"🇨🇫", prefix:"236", currency:"XAF", currencySymbol:"FCFA", operatorName:"Orange Money",     operatorKey:"ATP_ORANGE_CF",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null as string|null, validationHint:null as string|null },
    { countryCode:"GA",  countryName:"Gabon",              flag:"🇬🇦", prefix:"241", currency:"XAF", currencySymbol:"FCFA", operatorName:"Airtel Money",      operatorKey:"ATP_AIRTEL_GA",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"GA",  countryName:"Gabon",              flag:"🇬🇦", prefix:"241", currency:"XAF", currencySymbol:"FCFA", operatorName:"Moov Money",        operatorKey:"ATP_MOOV_GA",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"GQ",  countryName:"Guinée équatoriale", flag:"🇬🇶", prefix:"240", currency:"XAF", currencySymbol:"FCFA", operatorName:"Orange Money",     operatorKey:"ATP_ORANGE_GQ",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"GW",  countryName:"Guinée-Bissau",      flag:"🇬🇼", prefix:"245", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",     operatorKey:"ATP_ORANGE_GW",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"TD",  countryName:"Tchad",              flag:"🇹🇩", prefix:"235", currency:"XAF", currencySymbol:"FCFA", operatorName:"Airtel Money",      operatorKey:"ATP_AIRTEL_TD",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"TD",  countryName:"Tchad",              flag:"🇹🇩", prefix:"235", currency:"XAF", currencySymbol:"FCFA", operatorName:"Moov Money",        operatorKey:"ATP_MOOV_TD",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"NE",  countryName:"Niger",              flag:"🇳🇪", prefix:"227", currency:"XOF", currencySymbol:"FCFA", operatorName:"Airtel Money",      operatorKey:"ATP_AIRTEL_NE",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    // Niger Moov Money non listé dans la doc AshTechPay — retiré intentionnellement
    { countryCode:"COD", countryName:"RD Congo",           flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Afrimoney",         operatorKey:"ATP_AFRIMONEY_CD", aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"BJ",  countryName:"Bénin",              flag:"🇧🇯", prefix:"229", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",        operatorKey:"ATP_MOOV_BJ",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"BJ",  countryName:"Bénin",              flag:"🇧🇯", prefix:"229", currency:"XOF", currencySymbol:"FCFA", operatorName:"MTN Mobile Money",  operatorKey:"ATP_MTN_BJ",       aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"BF",  countryName:"Burkina Faso",       flag:"🇧🇫", prefix:"226", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",        operatorKey:"ATP_MOOV_BF",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"BF",  countryName:"Burkina Faso",       flag:"🇧🇫", prefix:"226", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",      operatorKey:"ATP_ORANGE_BF",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"CM",  countryName:"Cameroun",           flag:"🇨🇲", prefix:"237", currency:"XAF", currencySymbol:"FCFA", operatorName:"MTN Mobile Money",  operatorKey:"ATP_MTN_CM",       aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"CM",  countryName:"Cameroun",           flag:"🇨🇲", prefix:"237", currency:"XAF", currencySymbol:"FCFA", operatorName:"Orange Money",      operatorKey:"ATP_ORANGE_CM",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"CG",  countryName:"Congo",              flag:"🇨🇬", prefix:"242", currency:"XAF", currencySymbol:"FCFA", operatorName:"Airtel Money",      operatorKey:"ATP_AIRTEL_CG",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"CG",  countryName:"Congo",              flag:"🇨🇬", prefix:"242", currency:"XAF", currencySymbol:"FCFA", operatorName:"MTN Mobile Money",  operatorKey:"ATP_MTN_CG",       aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"CI",  countryName:"Côte d'Ivoire",      flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",        operatorKey:"ATP_MOOV_CI",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"CI",  countryName:"Côte d'Ivoire",      flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"MTN Mobile Money",  operatorKey:"ATP_MTN_CI",       aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"CI",  countryName:"Côte d'Ivoire",      flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",      operatorKey:"ATP_ORANGE_CI",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"CI",  countryName:"Côte d'Ivoire",      flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Wave",              operatorKey:"ATP_WAVE_CI",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:true,  otpHint:null, validationHint:null },
    { countryCode:"GN",  countryName:"Guinée",             flag:"🇬🇳", prefix:"224", currency:"GNF", currencySymbol:"GNF",  operatorName:"MTN Mobile Money",  operatorKey:"ATP_MTN_GN",       aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"GN",  countryName:"Guinée",             flag:"🇬🇳", prefix:"224", currency:"GNF", currencySymbol:"GNF",  operatorName:"Orange Money",      operatorKey:"ATP_ORANGE_GN",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"ML",  countryName:"Mali",               flag:"🇲🇱", prefix:"223", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",        operatorKey:"ATP_MOOV_ML",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"ML",  countryName:"Mali",               flag:"🇲🇱", prefix:"223", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",      operatorKey:"ATP_ORANGE_ML",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"COD", countryName:"RD Congo",           flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Airtel Money",      operatorKey:"ATP_AIRTEL_CD",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"COD", countryName:"RD Congo",           flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Orange Money",      operatorKey:"ATP_ORANGE_CD",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"COD", countryName:"RD Congo",           flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Vodacom M-Pesa",    operatorKey:"ATP_VODACOM_CD",   aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"SN",  countryName:"Sénégal",            flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Free Money",        operatorKey:"ATP_FREE_SN",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"SN",  countryName:"Sénégal",            flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",      operatorKey:"ATP_ORANGE_SN",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"SN",  countryName:"Sénégal",            flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Wave",              operatorKey:"ATP_WAVE_SN",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:true,  otpHint:null, validationHint:null },
    { countryCode:"TG",  countryName:"Togo",               flag:"🇹🇬", prefix:"228", currency:"XOF", currencySymbol:"FCFA", operatorName:"Flooz (Moov)",      operatorKey:"ATP_FLOOZ_TG",     aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"TG",  countryName:"Togo",               flag:"🇹🇬", prefix:"228", currency:"XOF", currencySymbol:"FCFA", operatorName:"T-Money",           operatorKey:"ATP_TMONEY_TG",    aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
    { countryCode:"NE",  countryName:"Niger",              flag:"🇳🇪", prefix:"227", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",        operatorKey:"ATP_MOOV_NE",      aggregator:"ashtechpay", isActive:true,  needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null },
  ];
  for (const op of ATP_OPERATORS) {
    await db.insert(operatorRoutesTable).values(op).onConflictDoNothing();
  }

  // Migration : supprimer les doublons non-ATP, activer tous les ATP, supprimer opérateurs retirés
  await db.execute(sql`
    DELETE FROM operator_routes WHERE operator_key NOT LIKE 'ATP_%'
  `).catch(() => {});
  await db.execute(sql`
    DELETE FROM operator_routes WHERE operator_key = 'ATP_MOOV_NE'
  `).catch(() => {});
  await db.execute(sql`
    UPDATE operator_routes SET is_active = true WHERE operator_key LIKE 'ATP_%'
  `).catch(() => {});

  // Auto-seed operator routes if table is empty
  const existing = await db.select({ id: operatorRoutesTable.id }).from(operatorRoutesTable).limit(1);
  if (existing.length === 0) {
    const DEFAULT_OPERATORS = [
      // Côte d'Ivoire
      { countryCode:"CI", countryName:"Côte d'Ivoire", flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money", operatorKey:"ORANGE_CI", aggregator:"omnipay", isActive:true, needsOtp:true,  needsReturnUrl:false, otpHint:"Composez #144*82# sur votre téléphone pour générer votre code OTP, puis saisissez-le ci-dessous.", validationHint:null, paxityOperatorId:null },
      { countryCode:"CI", countryName:"Côte d'Ivoire", flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"MTN MoMo",     operatorKey:"MTN_CI",    aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"CI", countryName:"Côte d'Ivoire", flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",    operatorKey:"MOOV_CI",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"CI", countryName:"Côte d'Ivoire", flag:"🇨🇮", prefix:"225", currency:"XOF", currencySymbol:"FCFA", operatorName:"Wave",           operatorKey:"WAVE_CI",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:true,  otpHint:null, validationHint:null, paxityOperatorId:null },
      // Sénégal
      { countryCode:"SN", countryName:"Sénégal",        flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Wave",           operatorKey:"WAVE_SN",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:true,  otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"SN", countryName:"Sénégal",        flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ORANGE_SN", aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"SN", countryName:"Sénégal",        flag:"🇸🇳", prefix:"221", currency:"XOF", currencySymbol:"FCFA", operatorName:"Free Money",     operatorKey:"FREE_SN",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      // Burkina Faso
      { countryCode:"BF", countryName:"Burkina Faso",   flag:"🇧🇫", prefix:"226", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ORANGE_BF", aggregator:"omnipay", isActive:true, needsOtp:true,  needsReturnUrl:false, otpHint:"Composez *144*4*6*montant# sur votre téléphone pour générer votre code OTP, puis saisissez-le ci-dessous.", validationHint:null, paxityOperatorId:null },
      { countryCode:"BF", countryName:"Burkina Faso",   flag:"🇧🇫", prefix:"226", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",     operatorKey:"MOOV_BF",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      // Mali
      { countryCode:"ML", countryName:"Mali",           flag:"🇲🇱", prefix:"223", currency:"XOF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ORANGE_ML", aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:"Veuillez valider le paiement sur votre téléphone Orange Money.\n\nSi vous ne recevez pas de notification, composez #144# sur votre téléphone, puis accédez au menu Paiement marchand (option 2).\n\nValidez l'opération en entrant votre code secret.", paxityOperatorId:null },
      { countryCode:"ML", countryName:"Mali",           flag:"🇲🇱", prefix:"223", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",     operatorKey:"MOOV_ML",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      // Guinée
      { countryCode:"GN", countryName:"Guinée",         flag:"🇬🇳", prefix:"224", currency:"GNF", currencySymbol:"GNF",  operatorName:"Orange Money",   operatorKey:"ORANGE_GN", aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"GN", countryName:"Guinée",         flag:"🇬🇳", prefix:"224", currency:"GNF", currencySymbol:"GNF",  operatorName:"MTN MoMo",       operatorKey:"MTN_GN",    aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      // Cameroun
      { countryCode:"CM", countryName:"Cameroun",       flag:"🇨🇲", prefix:"237", currency:"XAF", currencySymbol:"FCFA", operatorName:"MTN MoMo",       operatorKey:"MTN_CM",    aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"CM", countryName:"Cameroun",       flag:"🇨🇲", prefix:"237", currency:"XAF", currencySymbol:"FCFA", operatorName:"Orange Money",   operatorKey:"ORANGE_CM", aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      // Bénin
      { countryCode:"BJ", countryName:"Bénin",          flag:"🇧🇯", prefix:"229", currency:"XOF", currencySymbol:"FCFA", operatorName:"MTN MoMo",       operatorKey:"MTN_BJ",    aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"BJ", countryName:"Bénin",          flag:"🇧🇯", prefix:"229", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",     operatorKey:"MOOV_BJ",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      // Togo
      { countryCode:"TG", countryName:"Togo",           flag:"🇹🇬", prefix:"228", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",     operatorKey:"MOOV_TG",   aggregator:"paxity",  isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:"MOOVTG" },
      { countryCode:"TG", countryName:"Togo",           flag:"🇹🇬", prefix:"228", currency:"XOF", currencySymbol:"FCFA", operatorName:"T-Money",        operatorKey:"TOGOCEL_TG",aggregator:"paxity",  isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:"TMONEYTG" },
      // Ghana
      { countryCode:"GH", countryName:"Ghana",          flag:"🇬🇭", prefix:"233", currency:"GHS", currencySymbol:"GHS",  operatorName:"MTN MoMo",       operatorKey:"MTN_GH",    aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"GH", countryName:"Ghana",          flag:"🇬🇭", prefix:"233", currency:"GHS", currencySymbol:"GHS",  operatorName:"AirtelTigo",     operatorKey:"AIRTEL_GH", aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      // Niger
      { countryCode:"NE", countryName:"Niger",          flag:"🇳🇪", prefix:"227", currency:"XOF", currencySymbol:"FCFA", operatorName:"Moov Money",     operatorKey:"MOOV_NE",   aggregator:"omnipay", isActive:true, needsOtp:false, needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      // RD Congo
      { countryCode:"COD", countryName:"RD Congo",      flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Vodacom",        operatorKey:"VODACOM_CD",aggregator:"sendavapay",isActive:true, needsOtp:false,needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"COD", countryName:"RD Congo",      flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Airtel",         operatorKey:"AIRTEL_CD", aggregator:"sendavapay",isActive:true, needsOtp:false,needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"COD", countryName:"RD Congo",      flag:"🇨🇩", prefix:"243", currency:"CDF", currencySymbol:"FC",   operatorName:"Orange Money",   operatorKey:"ORANGE_CD", aggregator:"sendavapay",isActive:true, needsOtp:false,needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      // Congo Brazzaville
      { countryCode:"COG", countryName:"Congo Brazzaville", flag:"🇨🇬", prefix:"242", currency:"XAF", currencySymbol:"FCFA", operatorName:"MTN",      operatorKey:"MTN_CG",    aggregator:"sendavapay",isActive:true, needsOtp:false,needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
      { countryCode:"COG", countryName:"Congo Brazzaville", flag:"🇨🇬", prefix:"242", currency:"XAF", currencySymbol:"FCFA", operatorName:"Airtel",   operatorKey:"AIRTEL_CG", aggregator:"sendavapay",isActive:true, needsOtp:false,needsReturnUrl:false, otpHint:null, validationHint:null, paxityOperatorId:null },
    ];
    for (const op of DEFAULT_OPERATORS) {
      await db.insert(operatorRoutesTable).values(op).onConflictDoNothing();
    }
    console.log(`Operator routes seeded: ${DEFAULT_OPERATORS.length} operators`);
  }
}

export async function initDb() {
  try {
    console.log("Initializing database schema...");
    await ensureSchema();
    console.log("Seeding initial data...");
    await seedData();
    console.log("Database ready.");
  } catch (err) {
    console.error("Database initialization failed:", err);
    throw err;
  }
}
