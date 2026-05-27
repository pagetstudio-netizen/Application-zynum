import { db, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const BASE_URL = "https://5sim.net/v1";
export const FCFA_RATE = 620;       // taux affiché : 1 USD = 620 FCFA
export const MIN_PRICE_FCFA = 1100; // plancher minimum ZyNum

export function usdToFcfa(usd: number): number {
  return Math.round(usd * FCFA_RATE);
}

// ─── Clé API 5sim (DB > env var) ───────────────────────────────────────────
let cachedApiKey: string | null = null;
let cacheExpiry = 0;
const KEY_TTL = 60_000; // 1 minute

export function invalidateFiveSimKeyCache() {
  cachedApiKey = null;
  cacheExpiry = 0;
}

async function getFiveSimApiKey(): Promise<string> {
  const now = Date.now();
  if (cachedApiKey && now < cacheExpiry) return cachedApiKey;

  try {
    const rows = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "fivesim_api_key"));
    if (rows.length > 0 && rows[0].value.trim()) {
      cachedApiKey = rows[0].value.trim();
      cacheExpiry = now + KEY_TTL;
      return cachedApiKey;
    }
  } catch {
    // fall through to env var
  }

  const envKey = process.env.FIVESIM_API_KEY ?? "";
  if (!envKey) throw new Error("Clé API 5sim non configurée. Renseignez-la dans Admin → Paramètres.");
  cachedApiKey = envKey;
  cacheExpiry = now + KEY_TTL;
  return cachedApiKey;
}

async function fiveSimRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const apiKey = await getFiveSimApiKey();
  if (!apiKey) throw new Error("FIVESIM_API_KEY not configured");

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`5SIM API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Types returned by 5SIM API ───────────────────────────────────────────────

export interface FiveSimProfile {
  id: number;
  email: string;
  balance: number;
  rating: number;
  frozen_balance: number;
  total_active_orders: number;
}

// GET /v1/guest/countries
// { [countryName]: { iso: {[code]:1}, prefix: {[prefix]:1}, text_en: string, ... } }
interface FiveSimCountry {
  iso: Record<string, number>;
  prefix: Record<string, number>;
  text_en: string;
  text_ru: string;
}

// GET /v1/guest/prices?product=telegram
// { [product]: { [country]: { [operator]: { cost, count } } } }
interface FiveSimPriceEntry {
  cost: number;
  count: number;
  rate?: number;
}

// GET /v1/guest/products/{country}/any
// { [product]: { Category, Qty, Price } }
interface FiveSimProductEntry {
  Category: string;
  Qty: number;
  Price: number;
}

// GET /v1/user/buy/activation/{country}/any/{product}
export interface FiveSimOrder {
  id: number;
  phone: string;
  operator: string;
  product: string;
  price: number;
  status: string;
  expires: string;
  sms: Array<{
    created_at: string;
    date: string;
    sender: string;
    text: string;
    code: string;
  }>;
  created_at: string;
}

// ─── Our service/country types ────────────────────────────────────────────────

export interface ServiceInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
}

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  priceUsd: number;
  priceFcfa: number;
  available: number;
}

// ─── Static service catalogue ─────────────────────────────────────────────────

const CDN = "https://cdn.simpleicons.org";

// Rich metadata for well-known services (icon from simpleicons.org)
const SERVICE_MAP: Record<string, { name: string; icon: string; color: string; category: string }> = {
  // ── Messagerie ──────────────────────────────────────────────────────────────
  telegram:    { name: "Telegram",       icon: `${CDN}/telegram/ffffff`,    color: "#2AABEE", category: "Messagerie" },
  whatsapp:    { name: "WhatsApp",       icon: `${CDN}/whatsapp/ffffff`,    color: "#25D366", category: "Messagerie" },
  viber:       { name: "Viber",          icon: `${CDN}/viber/ffffff`,       color: "#7360F2", category: "Messagerie" },
  line:        { name: "Line",           icon: `${CDN}/line/ffffff`,        color: "#00C300", category: "Messagerie" },
  wechat:      { name: "WeChat",         icon: `${CDN}/wechat/ffffff`,      color: "#07C160", category: "Messagerie" },
  kakaotalk:   { name: "KakaoTalk",      icon: `${CDN}/kakaotalk/000000`,   color: "#FAE100", category: "Messagerie" },
  imo:         { name: "IMO",            icon: "",                           color: "#009DDC", category: "Messagerie" },
  michat:      { name: "MiChat",         icon: "",                           color: "#FF6B00", category: "Messagerie" },
  // ── Social ──────────────────────────────────────────────────────────────────
  facebook:    { name: "Facebook",       icon: `${CDN}/facebook/ffffff`,    color: "#1877F2", category: "Social" },
  instagram:   { name: "Instagram",      icon: `${CDN}/instagram/ffffff`,   color: "#E4405F", category: "Social" },
  twitter:     { name: "Twitter / X",    icon: `${CDN}/x/ffffff`,           color: "#14171A", category: "Social" },
  tiktok:      { name: "TikTok",         icon: `${CDN}/tiktok/ffffff`,      color: "#010101", category: "Social" },
  snapchat:    { name: "Snapchat",       icon: `${CDN}/snapchat/000000`,    color: "#FFFC00", category: "Social" },
  linkedin:    { name: "LinkedIn",       icon: `${CDN}/linkedin/ffffff`,    color: "#0A66C2", category: "Social" },
  discord:     { name: "Discord",        icon: `${CDN}/discord/ffffff`,     color: "#5865F2", category: "Social" },
  naver:       { name: "Naver",          icon: `${CDN}/naver/ffffff`,       color: "#03C75A", category: "Social" },
  weibo:       { name: "Weibo",          icon: `${CDN}/sinaweibo/ffffff`,   color: "#E6162D", category: "Social" },
  clubhouse:   { name: "Clubhouse",      icon: "",                           color: "#F2F0EB", category: "Social" },
  skout:       { name: "Skout",          icon: "",                           color: "#FF6900", category: "Social" },
  bigolive:    { name: "BIGO LIVE",      icon: "",                           color: "#00C878", category: "Social" },
  yalla:       { name: "Yalla",          icon: "",                           color: "#F5A623", category: "Social" },
  // ── Email / Tech ────────────────────────────────────────────────────────────
  google:      { name: "Gmail / Google", icon: `${CDN}/gmail/ffffff`,       color: "#EA4335", category: "Email" },
  yahoo:       { name: "Yahoo",          icon: `${CDN}/yahoo/ffffff`,       color: "#6001D2", category: "Email" },
  microsoft:   { name: "Microsoft",      icon: `${CDN}/microsoft/ffffff`,   color: "#0078D4", category: "Tech" },
  zoho:        { name: "Zoho",           icon: `${CDN}/zoho/ffffff`,        color: "#C8202E", category: "Email" },
  protonmail:  { name: "ProtonMail",     icon: `${CDN}/protonmail/ffffff`,  color: "#6D4AFF", category: "Email" },
  apple:       { name: "Apple / iCloud", icon: `${CDN}/apple/ffffff`,       color: "#555555", category: "Tech" },
  // ── Shopping ────────────────────────────────────────────────────────────────
  amazon:      { name: "Amazon",         icon: `${CDN}/amazon/ffffff`,      color: "#FF9900", category: "Shopping" },
  ebay:        { name: "eBay",           icon: `${CDN}/ebay/ffffff`,        color: "#E43142", category: "Shopping" },
  shopee:      { name: "Shopee",         icon: `${CDN}/shopee/ffffff`,      color: "#EE4D2D", category: "Shopping" },
  aliexpress:  { name: "AliExpress",     icon: `${CDN}/aliexpress/ffffff`,  color: "#FF6A00", category: "Shopping" },
  lazada:      { name: "Lazada",         icon: "",                           color: "#0F146D", category: "Shopping" },
  vinted:      { name: "Vinted",         icon: `${CDN}/vinted/ffffff`,      color: "#007982", category: "Shopping" },
  olx:         { name: "OLX",            icon: `${CDN}/olx/ffffff`,         color: "#4C80F0", category: "Shopping" },
  nike:        { name: "Nike",           icon: `${CDN}/nike/ffffff`,        color: "#111111", category: "Shopping" },
  // ── Finance / Crypto ────────────────────────────────────────────────────────
  paypal:      { name: "PayPal",         icon: `${CDN}/paypal/ffffff`,      color: "#003087", category: "Finance" },
  alipay:      { name: "Alipay",         icon: `${CDN}/alipay/ffffff`,      color: "#1677FF", category: "Finance" },
  binance:     { name: "Binance",        icon: `${CDN}/binance/ffffff`,     color: "#F0B90B", category: "Crypto" },
  papara:      { name: "Papara",         icon: "",                           color: "#7400FF", category: "Finance" },
  // ── Transport / Food ────────────────────────────────────────────────────────
  uber:        { name: "Uber",           icon: `${CDN}/uber/ffffff`,        color: "#000000", category: "Transport" },
  bolt:        { name: "Bolt",           icon: `${CDN}/bolt/ffffff`,        color: "#34D186", category: "Transport" },
  airbnb:      { name: "Airbnb",         icon: `${CDN}/airbnb/ffffff`,      color: "#FF5A5F", category: "Voyage" },
  deliveroo:   { name: "Deliveroo",      icon: `${CDN}/deliveroo/ffffff`,   color: "#00CCBC", category: "Alimentation" },
  blablacar:   { name: "BlaBlaCar",      icon: `${CDN}/blablacar/ffffff`,   color: "#00A0E8", category: "Transport" },
  grabtaxi:    { name: "Grab",           icon: `${CDN}/grab/ffffff`,        color: "#00B14F", category: "Transport" },
  didi:        { name: "DiDi",           icon: `${CDN}/didi/ffffff`,        color: "#FF8000", category: "Transport" },
  foodpanda:   { name: "Foodpanda",      icon: `${CDN}/foodpanda/ffffff`,   color: "#D70F64", category: "Alimentation" },
  wolt:        { name: "Wolt",           icon: `${CDN}/wolt/ffffff`,        color: "#009DE0", category: "Alimentation" },
  getir:       { name: "Getir",          icon: `${CDN}/getir/ffffff`,       color: "#5D0096", category: "Alimentation" },
  // ── Gaming ──────────────────────────────────────────────────────────────────
  steam:       { name: "Steam",          icon: `${CDN}/steam/ffffff`,       color: "#1B2838", category: "Gaming" },
  blizzard:    { name: "Battle.net",     icon: `${CDN}/battledotnet/ffffff`,color: "#148EFF", category: "Gaming" },
  // ── Dating ──────────────────────────────────────────────────────────────────
  tinder:      { name: "Tinder",         icon: `${CDN}/tinder/ffffff`,      color: "#FE3C72", category: "Dating" },
  grindr:      { name: "Grindr",         icon: `${CDN}/grindr/ffffff`,      color: "#FEAD14", category: "Dating" },
  happn:       { name: "Happn",          icon: "",                           color: "#FF4E6D", category: "Dating" },
  pof:         { name: "POF (Plenty of Fish)", icon: "",                    color: "#0070CC", category: "Dating" },
  cupid:       { name: "Cupid",          icon: "",                           color: "#E91E63", category: "Dating" },
  bumble:      { name: "Bumble",         icon: `${CDN}/bumble/000000`,      color: "#FFC629", category: "Dating" },
  // ── Pro / Freelance ─────────────────────────────────────────────────────────
  fiverr:      { name: "Fiverr",         icon: `${CDN}/fiverr/ffffff`,      color: "#1DBF73", category: "Pro" },
  craigslist:  { name: "Craigslist",     icon: "",                           color: "#800000", category: "Pro" },
  truecaller:  { name: "Truecaller",     icon: "",                           color: "#0097DA", category: "Pro" },
  // ── Streaming ───────────────────────────────────────────────────────────────
  netflix:     { name: "Netflix",        icon: `${CDN}/netflix/ffffff`,     color: "#E50914", category: "Streaming" },
  // ── Autres ──────────────────────────────────────────────────────────────────
  tencentqq:   { name: "Tencent QQ",     icon: `${CDN}/tencentqq/ffffff`,   color: "#12B7F5", category: "Social" },
  jd:          { name: "JD.com",         icon: `${CDN}/jd/ffffff`,          color: "#E1251B", category: "Shopping" },
};

// Generate a deterministic color for unknown services
function colorFromString(str: string): string {
  const colors = ["#6366F1","#EC4899","#14B8A6","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#84CC16","#F97316","#10B981"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

// Capitalize service id into a readable name (e.g. "bigolive" → "Bigolive")
function toReadableName(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

// Services toujours mis en avant (forcés en tête de liste même si stock = 0)
const FEATURED_SERVICE_IDS = [
  "whatsapp", "telegram", "facebook", "tiktok", "instagram",
  "google", "twitter", "discord", "snapchat", "netflix",
];

// Cache for dynamic services list
let servicesCache: ServiceInfo[] | null = null;
let servicesCacheTime = 0;
const SERVICES_CACHE_TTL = 10 * 60 * 1000; // 10 min

// ISO code → emoji flag
function isoToFlag(iso: string): string {
  const code = iso.toLowerCase();
  const flagMap: Record<string, string> = {
    af: "🇦🇫", al: "🇦🇱", dz: "🇩🇿", ao: "🇦🇴", ag: "🇦🇬",
    ar: "🇦🇷", am: "🇦🇲", aw: "🇦🇼", au: "🇦🇺", at: "🇦🇹",
    az: "🇦🇿", bs: "🇧🇸", bh: "🇧🇭", bd: "🇧🇩", by: "🇧🇾",
    be: "🇧🇪", bz: "🇧🇿", bj: "🇧🇯", bo: "🇧🇴", ba: "🇧🇦",
    bw: "🇧🇼", br: "🇧🇷", bn: "🇧🇳", bg: "🇧🇬", bf: "🇧🇫",
    bi: "🇧🇮", kh: "🇰🇭", cm: "🇨🇲", ca: "🇨🇦", cv: "🇨🇻",
    cf: "🇨🇫", td: "🇹🇩", cl: "🇨🇱", co: "🇨🇴", km: "🇰🇲",
    cg: "🇨🇬", cd: "🇨🇩", cr: "🇨🇷", ci: "🇨🇮", hr: "🇭🇷",
    cy: "🇨🇾", cz: "🇨🇿", dk: "🇩🇰", dj: "🇩🇯", dm: "🇩🇲",
    do: "🇩🇴", ec: "🇪🇨", eg: "🇪🇬", sv: "🇸🇻", gq: "🇬🇶",
    er: "🇪🇷", ee: "🇪🇪", sz: "🇸🇿", et: "🇪🇹", fj: "🇫🇯",
    fi: "🇫🇮", fr: "🇫🇷", ga: "🇬🇦", gm: "🇬🇲", ge: "🇬🇪",
    de: "🇩🇪", gh: "🇬🇭", gr: "🇬🇷", gd: "🇬🇩", gt: "🇬🇹",
    gn: "🇬🇳", gw: "🇬🇼", gy: "🇬🇾", ht: "🇭🇹", hn: "🇭🇳",
    hu: "🇭🇺", is: "🇮🇸", in: "🇮🇳", id: "🇮🇩", ir: "🇮🇷",
    iq: "🇮🇶", ie: "🇮🇪", il: "🇮🇱", it: "🇮🇹", jm: "🇯🇲",
    jp: "🇯🇵", jo: "🇯🇴", kz: "🇰🇿", ke: "🇰🇪", ki: "🇰🇮",
    kp: "🇰🇵", kr: "🇰🇷", kw: "🇰🇼", kg: "🇰🇬", la: "🇱🇦",
    lv: "🇱🇻", lb: "🇱🇧", ls: "🇱🇸", lr: "🇱🇷", ly: "🇱🇾",
    lt: "🇱🇹", lu: "🇱🇺", mg: "🇲🇬", mw: "🇲🇼", my: "🇲🇾",
    mv: "🇲🇻", ml: "🇲🇱", mt: "🇲🇹", mh: "🇲🇭", mr: "🇲🇷",
    mu: "🇲🇺", mx: "🇲🇽", fm: "🇫🇲", md: "🇲🇩", mc: "🇲🇨",
    mn: "🇲🇳", me: "🇲🇪", ma: "🇲🇦", mz: "🇲🇿", mm: "🇲🇲",
    na: "🇳🇦", nr: "🇳🇷", np: "🇳🇵", nl: "🇳🇱", nz: "🇳🇿",
    ni: "🇳🇮", ne: "🇳🇪", ng: "🇳🇬", no: "🇳🇴", om: "🇴🇲",
    pk: "🇵🇰", pw: "🇵🇼", pa: "🇵🇦", pg: "🇵🇬", py: "🇵🇾",
    pe: "🇵🇪", ph: "🇵🇭", pl: "🇵🇱", pt: "🇵🇹", qa: "🇶🇦",
    ro: "🇷🇴", rw: "🇷🇼", kn: "🇰🇳", lc: "🇱🇨", vc: "🇻🇨",
    ws: "🇼🇸", sm: "🇸🇲", st: "🇸🇹", sa: "🇸🇦", sn: "🇸🇳",
    rs: "🇷🇸", sl: "🇸🇱", sg: "🇸🇬", sk: "🇸🇰", si: "🇸🇮",
    sb: "🇸🇧", so: "🇸🇴", za: "🇿🇦", ss: "🇸🇸", es: "🇪🇸",
    lk: "🇱🇰", sd: "🇸🇩", sr: "🇸🇷", se: "🇸🇪", ch: "🇨🇭",
    sy: "🇸🇾", tw: "🇹🇼", tj: "🇹🇯", tz: "🇹🇿", th: "🇹🇭",
    tl: "🇹🇱", tg: "🇹🇬", to: "🇹🇴", tt: "🇹🇹", tn: "🇹🇳",
    tr: "🇹🇷", tm: "🇹🇲", tv: "🇹🇻", ug: "🇺🇬", ua: "🇺🇦",
    ae: "🇦🇪", gb: "🇬🇧", us: "🇺🇸", uy: "🇺🇾", uz: "🇺🇿",
    vu: "🇻🇺", ve: "🇻🇪", vn: "🇻🇳", ye: "🇾🇪", zm: "🇿🇲",
    zw: "🇿🇼",
  };
  return flagMap[code] ?? "🏳️";
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

let countryCacheRaw: Record<string, FiveSimCountry> | null = null;
let countryCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 min

async function getRawCountries(): Promise<Record<string, FiveSimCountry>> {
  if (countryCacheRaw && Date.now() - countryCacheTime < CACHE_TTL) {
    return countryCacheRaw;
  }
  const data = await fiveSimRequest<Record<string, FiveSimCountry>>("/guest/countries");
  countryCacheRaw = data;
  countryCacheTime = Date.now();
  return data;
}

// prices cache: product → data
const priceCache: Map<string, { data: Record<string, Record<string, FiveSimPriceEntry>>; ts: number }> = new Map();

async function getPricesForProduct(
  product: string
): Promise<Record<string, Record<string, FiveSimPriceEntry>>> {
  const cached = priceCache.get(product);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  // Response shape: { [product]: { [country]: { [operator]: { cost, count } } } }
  const raw = await fiveSimRequest<Record<string, Record<string, Record<string, FiveSimPriceEntry>>>>(
    `/guest/prices?product=${encodeURIComponent(product)}`
  );
  const data = raw[product] ?? {};
  priceCache.set(product, { data, ts: Date.now() });
  return data;
}

// ─── Sync service info lookup ─────────────────────────────────────────────────

export function getServiceInfo(service: string): { icon: string; color: string } {
  const entry = SERVICE_MAP[service.toLowerCase()];
  return { icon: entry?.icon ?? "", color: entry?.color ?? "#6B7280" };
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export async function getProfile(): Promise<FiveSimProfile> {
  return fiveSimRequest<FiveSimProfile>("/user/profile");
}

export async function getAvailableServices(): Promise<ServiceInfo[]> {
  if (servicesCache && Date.now() - servicesCacheTime < SERVICES_CACHE_TTL) {
    return servicesCache;
  }

  // Fetch top services from 5sim sorted by availability
  let fiveSimProducts: Record<string, { Category: string; Qty: number; Price: number }> = {};
  try {
    fiveSimProducts = await fiveSimRequest<typeof fiveSimProducts>("/guest/products/any/any");
  } catch {
    // Fallback to static map if API fails
    return Object.entries(SERVICE_MAP).map(([id, { name, icon, color, category }]) => ({ id, name, icon, color, category }));
  }

  // Sort by qty descending, take top 150
  const sorted = Object.entries(fiveSimProducts)
    .filter(([, v]) => v.Category === "activation" && v.Qty > 0)
    .sort((a, b) => b[1].Qty - a[1].Qty)
    .slice(0, 150);

  // Build featured services first (always shown, even if qty = 0)
  const featured: ServiceInfo[] = FEATURED_SERVICE_IDS.map((id) => {
    const known = SERVICE_MAP[id];
    if (known) return { id, name: known.name, icon: known.icon, color: known.color, category: known.category };
    return { id, name: toReadableName(id), icon: "", color: colorFromString(id), category: "Autre" };
  });

  // Remaining dynamic services (exclude already-featured ones)
  const rest: ServiceInfo[] = sorted
    .filter(([id]) => !FEATURED_SERVICE_IDS.includes(id))
    .map(([id]) => {
      const known = SERVICE_MAP[id];
      if (known) return { id, name: known.name, icon: known.icon, color: known.color, category: known.category };
      return { id, name: toReadableName(id), icon: "", color: colorFromString(id), category: "Autre" };
    });

  // Also include featured services that happen to be in the dynamic list with their real position data
  const result: ServiceInfo[] = [...featured, ...rest];

  servicesCache = result;
  servicesCacheTime = Date.now();
  return result;
}

export async function getCountriesForService(service: string): Promise<CountryInfo[]> {
  const [rawCountries, prices] = await Promise.all([
    getRawCountries(),
    getPricesForProduct(service),
  ]);

  const result: CountryInfo[] = [];

  for (const [countryCode, operatorMap] of Object.entries(prices)) {
    const meta = rawCountries[countryCode];
    if (!meta) continue;

    let bestPrice = Infinity;
    let totalAvailable = 0;

    for (const entry of Object.values(operatorMap)) {
      totalAvailable += entry.count || 0;
      if (entry.count > 0 && entry.cost < bestPrice) bestPrice = entry.cost;
    }

    if (bestPrice === Infinity) continue;

    const isoCode = Object.keys(meta.iso ?? {})[0] ?? "";
    const flag = isoToFlag(isoCode);

    result.push({
      code: countryCode,
      name: meta.text_en,
      flag,
      priceUsd: Math.round(bestPrice * 100) / 100,
      priceFcfa: usdToFcfa(bestPrice),
      available: totalAvailable,
    });
  }

  // Sort by price ascending
  return result.sort((a, b) => a.priceUsd - b.priceUsd);
}

// ─── Operator info ─────────────────────────────────────────────────────────────

export interface OperatorInfo {
  name: string;
  label: string;
  priceUsd: number;
  priceFcfa: number;
  available: number;
}

export async function getOperatorsForServiceCountry(
  service: string,
  country: string
): Promise<OperatorInfo[]> {
  const prices = await getPricesForProduct(service);
  const operatorMap = prices[country] ?? {};

  return Object.entries(operatorMap)
    .filter(([, entry]) => entry.count > 0)
    .map(([name, entry]) => ({
      name,
      label: name === "any" ? "Automatique" : name.replace(/_/g, " "),
      priceUsd: Math.round(entry.cost * 100) / 100,
      priceFcfa: usdToFcfa(entry.cost),
      available: entry.count,
    }))
    .sort((a, b) => a.priceUsd - b.priceUsd);
}

export async function buyNumber(
  service: string,
  country: string,
  operator = "any"
): Promise<FiveSimOrder> {
  return fiveSimRequest<FiveSimOrder>(
    `/user/buy/activation/${country}/${operator}/${service}`
  );
}

export async function checkOrder(orderId: number): Promise<FiveSimOrder> {
  return fiveSimRequest<FiveSimOrder>(`/user/check/${orderId}`);
}

export async function cancelOrder(orderId: number): Promise<FiveSimOrder> {
  return fiveSimRequest<FiveSimOrder>(`/user/cancel/${orderId}`);
}

export async function finishOrder(orderId: number): Promise<FiveSimOrder> {
  return fiveSimRequest<FiveSimOrder>(`/user/finish/${orderId}`);
}

export function getServiceName(serviceId: string): string {
  return SERVICE_MAP[serviceId]?.name ?? serviceId;
}

// Synchronous helper — uses the raw country name key (already text_en from 5SIM)
// We store the text_en name in the DB so we just return whatever was passed in.
// If you need to resolve a code dynamically, use getRawCountries() instead.
export function getCountryName(countryCode: string): string {
  // Capitalize the first letter of each word
  return countryCode.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function mapFiveSimStatus(status: string): string {
  const map: Record<string, string> = {
    PENDING: "PENDING",
    RECEIVED: "RECEIVED",
    FINISHED: "FINISHED",
    TIMEOUT: "TIMEOUT",
    BANNED: "BANNED",
    CANCELED: "CANCELED",
  };
  return map[status?.toUpperCase()] ?? "PENDING";
}
