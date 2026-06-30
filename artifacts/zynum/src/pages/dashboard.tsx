import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Eye, EyeOff, Plus, ChevronRight, Home, Smartphone,
  MessageSquare, Wallet as WalletIcon, User, LogOut,
  Copy, Check, Shield, Gift, Code2, HelpCircle, Settings,
  ArrowUpRight, ArrowDownLeft, Tag, History, RefreshCw,
  Phone, Globe2, Star, Lock, KeyRound, X, Menu,
  ChevronLeft, Clock, XCircle, Package, CreditCard, SlidersHorizontal,
  Share2, DollarSign, ArrowDownToLine, Users, Link2, UserPlus, Mail,
} from "lucide-react";
import {
  useGetCurrentUser, useLogoutUser, useGetBalance,
  useGetOrderHistory, useGetServices, getGetCurrentUserQueryKey,
  getGetBalanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-currency";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import BuyNumber from "@/pages/buy";
import OrderHistory from "@/pages/history";
import Recharge from "@/pages/recharge";
import { OmnipayModal } from "@/components/omnipay-modal";
import { PaxityModal } from "@/components/paxity-modal";
import { useNotifications } from "@/components/notification-banner";
import imgTMoneyOp  from "@assets/images_(1)_1774832430242.png";
import imgMoovOp    from "@assets/moov_(1)_1763835082986-GKkwwfPK_1774832019539.png";
import imgAirtelOp  from "@assets/Airtel_logo-01_1774832430216.png";
import imgParamsIcon from "@assets/20260413_084836_1782817603068.png";
import { usePublicSettings, openTelegramSupport } from "@/hooks/use-public-settings";

type Tab = "accueil" | "numeros" | "sms" | "compte";
type UserWithAdmin = { id: number; name: string; email: string; isAdmin?: boolean; isBanned?: boolean; createdAt: string };

const FCFA_RATE = 620;

function fmt(balance: number, currency: string) {
  return currency === "FCFA"
    ? `${Math.round(balance * FCFA_RATE).toLocaleString("fr-FR")} FCFA`
    : `$${balance.toFixed(2)}`;
}

function ServiceIcon({ icon, color, name, size = 48 }: { icon?: string; color?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const bg = color ?? "#6B7280";
  const lightBg = ["#FFFC00","#F0B90B","#FAE100","#FFC629"].some(c => bg.toUpperCase() === c);
  return (
    <div style={{ width: size, height: size, background: bg, borderRadius: size * 0.24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
      {icon && !failed
        ? <img src={icon} alt={name} style={{ width: size * 0.58, height: size * 0.58, objectFit: "contain" }} onError={() => setFailed(true)} />
        : <span style={{ fontWeight: 700, fontSize: size * 0.36, color: lightBg ? "#000" : "#fff", lineHeight: 1 }}>{name.slice(0,2).toUpperCase()}</span>
      }
    </div>
  );
}

const POPULAR_COUNTRIES = [
  { flag: "🇺🇸", name: "États-Unis", code: "+1" },
  { flag: "🇬🇧", name: "Royaume-Uni", code: "+44" },
  { flag: "🇫🇷", name: "France", code: "+33" },
  { flag: "🇨🇦", name: "Canada", code: "+1" },
];

function getStatusMap(t: (k: string) => string): Record<string, { label: string; cls: string }> {
  return {
    PENDING:  { label: t("status_pending"),  cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    RECEIVED: { label: t("status_received"), cls: "bg-green-50 text-green-700 border-green-200" },
    FINISHED: { label: t("status_finished"), cls: "bg-blue-50 text-blue-700 border-blue-200" },
    TIMEOUT:  { label: t("status_timeout"),  cls: "bg-gray-100 text-gray-500 border-gray-200" },
    CANCELED: { label: t("status_canceled"), cls: "bg-gray-100 text-gray-500 border-gray-200" },
    BANNED:   { label: t("status_banned"),   cls: "bg-red-50 text-red-600 border-red-200" },
  };
}

// ─── RECHARGE VIEW ───────────────────────────────────────────────────────────
const COUNTRIES = [
  { flag: "🇹🇬", name: "Togo", code: "TG", currency: "XOF" },
  { flag: "🇨🇮", name: "Côte d'Ivoire", code: "CI", currency: "XOF" },
  { flag: "🇸🇳", name: "Sénégal", code: "SN", currency: "XOF" },
  { flag: "🇨🇲", name: "Cameroun", code: "CM", currency: "XAF" },
  { flag: "🇧🇯", name: "Bénin", code: "BJ", currency: "XOF" },
  { flag: "🇧🇫", name: "Burkina Faso", code: "BF", currency: "XOF" },
  { flag: "🇲🇱", name: "Mali", code: "ML", currency: "XOF" },
  { flag: "🇬🇳", name: "Guinée", code: "GN", currency: "GNF" },
];

const METHODS_BY_COUNTRY: Record<string, { id: string; name: string; color: string }[]> = {
  TG: [{ id: "tmoney", name: "TMoney", color: "#F59E0B" }, { id: "moov", name: "Moov Money", color: "#3B82F6" }],
  CI: [{ id: "orange", name: "Orange Money", color: "#F97316" }, { id: "moov", name: "Moov Money", color: "#3B82F6" }, { id: "wave", name: "Wave", color: "#06B6D4" }],
  SN: [{ id: "orange", name: "Orange Money", color: "#F97316" }, { id: "wave", name: "Wave", color: "#06B6D4" }, { id: "free", name: "Free Money", color: "#8B5CF6" }],
  CM: [{ id: "orange", name: "Orange Money", color: "#F97316" }, { id: "mtn", name: "MTN Mobile Money", color: "#FBBF24" }],
  BJ: [{ id: "moov", name: "Moov Money", color: "#3B82F6" }, { id: "mtn", name: "MTN Mobile Money", color: "#FBBF24" }],
  BF: [{ id: "orange", name: "Orange Money", color: "#F97316" }, { id: "moov", name: "Moov Money", color: "#3B82F6" }],
  ML: [{ id: "orange", name: "Orange Money", color: "#F97316" }, { id: "moov", name: "Moov Money", color: "#3B82F6" }],
  GN: [{ id: "orange", name: "Orange Money", color: "#F97316" }, { id: "mtn", name: "MTN Mobile Money", color: "#FBBF24" }],
};

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];
const FEES: Record<string, number> = { tmoney: 5, moov: 5, orange: 5, wave: 2, mtn: 5, free: 3 };

const RECHARGE_PRESETS = [1000, 2000, 5000, 10000, 20000, 50000];

function RechargeView({ user, onBack }: { user: UserWithAdmin; onBack: () => void }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { currency } = useCurrency();
  const { data: balanceData, refetch: refetchBalance } = useGetBalance({ query: { retry: false } as any });

  const [showBal, setShowBal] = useState(true);
  const [amount, setAmount] = useState(5000);
  const [pendingMethod, setPendingMethod] = useState<"mobile" | "card" | null>(null);
  const [omnipayOpen, setOmnipayOpen] = useState(false);
  const [paxityOpen, setPaxityOpen] = useState(false);
  const [transactions, setTransactions] = useState<{
    id: number; type: string; amountUsd: number | null;
    amountFcfa: number | null; status: string; createdAt: string | null;
  }[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const FCFA_PER_USD = 620;
  const balance = balanceData?.balance ?? 0;
  const displayBal = showBal
    ? currency === "FCFA"
      ? `${Math.round(balance * FCFA_PER_USD).toLocaleString("fr-FR")} FCFA`
      : `$${balance.toFixed(2)}`
    : "••••••";

  useEffect(() => {
    const token = localStorage.getItem("zynum_token");
    fetch("/api/v1/transactions", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then(r => r.ok ? r.json() : { transactions: [] })
      .then(d => { setTransactions(d.transactions ?? []); setTxLoading(false); })
      .catch(() => setTxLoading(false));
  }, []);

  const handleMethodClick = (method: "mobile" | "card") => {
    setPendingMethod(method);
  };

  const handleConfirmAmount = () => {
    if (amount < 300) {
      toast({ variant: "destructive", title: t("dash_amount_too_low"), description: t("mm_min_amount") });
      return;
    }
    if (pendingMethod === "mobile") {
      setPendingMethod(null);
      setOmnipayOpen(true);
    } else {
      setPendingMethod(null);
      setPaxityOpen(true);
    }
  };

  const handlePaymentSuccess = () => {
    toast({ title: t("dash_payment_initiated"), description: t("dash_payment_initiated_desc") });
    setTimeout(() => {
      refetchBalance();
      queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
      const token = localStorage.getItem("zynum_token");
      fetch("/api/v1/transactions", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
        .then(r => r.ok ? r.json() : { transactions: [] })
        .then(d => setTransactions(d.transactions ?? []))
        .catch(() => {});
    }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 relative">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 shrink-0 border-b border-gray-100">
        <button onClick={onBack} className="p-2 rounded-xl active:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="font-extrabold text-gray-900 text-lg flex-1">{t("dash_recharge_title")}</h1>
      </div>

      {/* Fixed section — balance card + method buttons + history title */}
      <div className="shrink-0 px-4 pt-4 pb-0 space-y-4 bg-gray-50">

        {/* Balance card — green */}
        <div className="rounded-[32px] p-4" style={{ backgroundColor: "#00C87A" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
                <img src="/logo.jpg" alt="ZyNum" className="w-full h-full object-cover" />
              </div>
              <span className="font-extrabold text-[#1a2b8c] text-lg tracking-tight">ZyNum</span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-white mb-0.5">{t("dash_balance_label")}</p>
              <div className="flex items-center gap-1.5 justify-end">
                <p className="text-xl font-black text-white tracking-tight">{displayBal}</p>
                <button onClick={() => setShowBal(s => !s)} className="text-white/80 hover:text-white transition-colors">
                  {showBal ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Method buttons */}
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
          <button
            onClick={() => handleMethodClick("mobile")}
            className="w-full flex items-center justify-between px-5 py-5 active:bg-gray-50 transition-colors"
          >
            <span className="font-bold text-[#1a2b8c] text-[15px]">{t("dash_recharge_via_mobile")}</span>
            <div className="flex items-center -space-x-2 shrink-0">
              <img src={imgTMoneyOp}  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" alt="TMoney" />
              <img src={imgMoovOp}    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" alt="Moov" />
              <img src={imgAirtelOp}  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" alt="Airtel" />
            </div>
          </button>
          <div className="mx-5 h-[2px]" style={{ backgroundColor: "#00C87A" }} />
          <button
            onClick={() => handleMethodClick("card")}
            className="w-full flex items-center justify-between px-5 py-5 active:bg-gray-50 transition-colors"
          >
            <span className="font-bold text-[#1a2b8c] text-[15px]">{t("dash_recharge_via_card")}</span>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 text-red-500" />
            </div>
          </button>
        </div>

        {/* History title — fixed */}
        <p className="font-bold text-gray-900 text-base pb-2">{t("dash_tx_history")}</p>
      </div>

      {/* Scrollable transactions list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {txLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">{t("loading")}</div>
        ) : transactions.filter(tx => tx.status === "completed").length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <History className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-500">{t("dash_no_tx")}</p>
            <p className="text-xs text-gray-400 mt-1">{t("dash_no_tx_sub")}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {transactions.filter(tx => tx.status === "completed").map(tx => {
              const isRecharge = tx.type === "recharge";
              const amountFcfa = tx.amountFcfa ?? Math.round((tx.amountUsd ?? 0) * 620);
              const amountUsd = tx.amountUsd ?? amountFcfa / 620;
              const displayAmt = currency === "FCFA"
                ? `${amountFcfa.toLocaleString("fr-FR")} FCFA`
                : `$${amountUsd.toFixed(2)}`;
              const date = tx.createdAt ? new Date(tx.createdAt) : null;
              const dateStr = date ? format(date, "dd MMM · HH:mm", { locale: fr }) : "";
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRecharge ? "bg-blue-500" : "bg-orange-500"}`}>
                    {isRecharge ? <Plus className="w-4 h-4 text-white" /> : <ArrowUpRight className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {isRecharge ? t("dash_tx_recharge_label") : t("dash_tx_withdrawal_label")}
                    </p>
                    <p className="text-xs text-gray-400">{dateStr}</p>
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${isRecharge ? "text-green-600" : "text-red-500"}`}>
                    {isRecharge ? "+" : "−"}{displayAmt}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Amount picker — bottom sheet */}
      <AnimatePresence>
        {pendingMethod && (
          <>
            <motion.div
              key="amount-bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-40"
              onClick={() => setPendingMethod(null)}
            />
            <motion.div
              key="amount-sheet"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 pb-8"
            >
              <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                <p className="font-bold text-gray-900 text-base">
                  {pendingMethod === "mobile" ? t("dash_amount_mobile") : t("dash_amount_card")}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t("mm_min_amount")}</p>
              </div>
              <div className="px-5 pt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {RECHARGE_PRESETS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAmount(a)}
                      className={`py-3 rounded-2xl text-sm font-bold transition-all ${
                        amount === a
                          ? "bg-green-100 text-green-700 shadow-sm"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {a.toLocaleString("fr-FR")} F
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200">
                  <span className="text-sm font-semibold text-gray-400 shrink-0">FCFA</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                    className="flex-1 bg-transparent text-gray-900 font-bold text-lg focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleConfirmAmount}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base active:scale-95 transition-transform shadow-lg"
                  style={{ backgroundColor: "#00C87A" }}
                >
                  {t("dash_continue")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* OmnipayModal */}
      {user && (
        <OmnipayModal
          open={omnipayOpen}
          onClose={() => setOmnipayOpen(false)}
          amountXof={amount}
          userId={user.id}
          onSuccess={handlePaymentSuccess}
          userFirstName={user.name?.split(" ")[0] ?? "ZyNum"}
          userLastName={user.name?.split(" ").slice(1).join(" ") || `User${user.id}`}
        />
      )}

      {/* PaxityModal — carte bancaire */}
      {user && (
        <PaxityModal
          open={paxityOpen}
          onClose={() => setPaxityOpen(false)}
          amountXof={amount}
          userId={user.id}
          onSuccess={handlePaymentSuccess}
          initialTab="card"
        />
      )}
    </div>
  );
}

// ─── HOME TAB ────────────────────────────────────────────────────────────────
function HomeTab({ user, onNavigate }: { user: UserWithAdmin; onNavigate: (t: Tab) => void }) {
  const { currency } = useCurrency();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [showBal, setShowBal] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: balanceData } = useGetBalance({ query: { retry: false } as any });
  const { data: servicesData } = useGetServices({ query: { retry: false, staleTime: 60000 } as any });
  const { data: historyData } = useGetOrderHistory({ page: 1, limit: 5 }, { query: { retry: false } as any });
  const { notifs: adminNotifs } = useNotifications();

  const balance = balanceData?.balance ?? 0;
  const displayBal = showBal ? fmt(balance, currency) : "••••••";
  const services = (servicesData?.services ?? []).slice(0, 4);
  const orders = historyData?.orders ?? [];
  const STATUS_MAP = getStatusMap(t);

  const firstName = user.name?.split(" ")[0] ?? "là";

  const AVANTAGES = [
    { emoji: "🌍", title: t("dash_adv1_title"), desc: t("dash_adv1_desc") },
    { emoji: "⚡", title: t("dash_adv2_title"), desc: t("dash_adv2_desc") },
    { emoji: "💰", title: t("dash_adv3_title"), desc: t("dash_adv3_desc") },
    { emoji: "🔒", title: t("dash_adv4_title"), desc: t("dash_adv4_desc") },
    { emoji: "🎁", title: t("dash_adv5_title"), desc: t("dash_adv5_desc") },
    { emoji: "📱", title: t("dash_adv6_title"), desc: t("dash_adv6_desc") },
  ];


  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">

      {/* Notification panel */}
      <AnimatePresence>
        {notifOpen && (
          <>
            <motion.div
              key="notif-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 40 }}
              onClick={() => setNotifOpen(false)}
            />
            <motion.div
              key="notif-panel"
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: "#111111", borderBottomLeftRadius: "24px", borderBottomRightRadius: "24px", overflow: "hidden" }}
            >
              <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                <div>
                  <p style={{ color: "#ffffff", fontWeight: 900, fontSize: "16px", margin: 0 }}>{t("dash_notifications")}</p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "2px" }}>
                    {adminNotifs.length > 0 ? `${adminNotifs.length} notification${adminNotifs.length > 1 ? "s" : ""}` : t("dash_no_notif")}
                  </p>
                </div>
                <button
                  onClick={() => setNotifOpen(false)}
                  style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <X style={{ width: 16, height: 16, color: "#ffffff" }} />
                </button>
              </div>
              <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 8, maxHeight: "60vh", overflowY: "auto" }}>
                {adminNotifs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <p style={{ fontSize: "32px", marginBottom: 8 }}>🔔</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>{t("dash_notif_none_msg")}</p>
                  </div>
                ) : adminNotifs.map((n) => (
                  <div
                    key={n.id}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px", borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.07)", cursor: n.linkUrl ? "pointer" : "default" }}
                    onClick={() => { if (n.linkUrl) { if (n.linkUrl.startsWith("http")) window.open(n.linkUrl, "_blank", "noopener,noreferrer"); else window.location.href = n.linkUrl; } }}
                  >
                    {n.imageUrl && n.type === "image" ? (
                      <img src={n.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span style={{ fontSize: "22px", flexShrink: 0, marginTop: 2 }}>🔔</span>
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      {n.subject && <p style={{ color: "#ffffff", fontWeight: 700, fontSize: "14px", margin: 0, lineHeight: 1.3 }}>{n.subject}</p>}
                      {n.content && <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", marginTop: n.subject ? 3 : 0, lineHeight: 1.4 }}>{n.content}</p>}
                      {!n.content && !n.subject && <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px" }}>Notification</p>}
                    </div>
                    {n.linkUrl && <span style={{ color: "#00C87A", fontSize: "18px", flexShrink: 0 }}>›</span>}
                  </div>
                ))}
                {adminNotifs.length === 0 && (
                  <>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: 8, paddingTop: 16 }}>
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", textAlign: "center", marginBottom: 10 }}>{t("dash_advantages_title")}</p>
                    </div>
                    {AVANTAGES.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px", borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.07)" }}>
                        <span style={{ fontSize: "22px", flexShrink: 0, marginTop: 2 }}>{a.emoji}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ color: "#ffffff", fontWeight: 700, fontSize: "14px", margin: 0, lineHeight: 1.3 }}>{a.title}</p>
                          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", marginTop: 3, lineHeight: 1.4 }}>{a.desc}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header — black */}
      <div style={{ backgroundColor: "#111111", padding: "10px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        {/* Left: avatar + greeting */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <button
            onClick={() => onNavigate("compte")}
            style={{ position: "relative", flexShrink: 0, background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <img
              src="/avatar-user.png"
              alt="profil"
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid #00C87A", display: "block" }}
            />
            <span style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, backgroundColor: "#00C87A", borderRadius: "50%", border: "2px solid #111111", display: "block" }} />
          </button>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: 500, margin: 0, lineHeight: 1 }}>{t("dash_hello")}</p>
            <p style={{ color: "#ffffff", fontSize: "16px", fontWeight: 900, margin: "3px 0 0", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firstName}</p>
          </div>
        </div>
        {/* Right: bell */}
        <div style={{ flexShrink: 0, marginLeft: 12 }}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            style={{ position: "relative", width: 40, height: 40, borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, backgroundColor: "#00C87A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#ffffff", fontSize: "9px", fontWeight: 900 }}>{adminNotifs.length > 0 ? adminNotifs.length : ""}</span>
            </span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
      <div className="px-4 pt-4 space-y-4">
        {/* Balance card */}
        <div className="rounded-[32px] p-4" style={{ backgroundColor: "#00C87A" }}>
          {/* Top row: logo + solde */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
                <img src="/logo.jpg" alt="ZyNum" className="w-full h-full object-cover" />
              </div>
              <span className="font-extrabold text-[#1a2b8c] text-lg tracking-tight">ZyNum</span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-white mb-0.5">{t("dash_balance_label")}</p>
              <div className="flex items-center gap-1.5 justify-end">
                <p className="text-xl font-black text-white tracking-tight">
                  {showBal ? displayBal : "••••••"}
                </p>
                <button onClick={() => setShowBal(s => !s)} className="text-white/80 hover:text-white transition-colors">
                  {showBal ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* White inner card with actions */}
          <div className="bg-white rounded-[24px] overflow-hidden">
            <button
              onClick={() => navigate("/recharge")}
              className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 transition-colors"
            >
              <span className="font-bold text-[#1a2b8c] text-[15px]">{t("dash_recharge_account")}</span>
              <ChevronRight className="w-5 h-5 text-[#1a2b8c]" strokeWidth={3} />
            </button>
            <div className="mx-5 h-[2px]" style={{ backgroundColor: "#00C87A" }} />
            <button
              onClick={() => onNavigate("numeros")}
              className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 transition-colors"
            >
              <span className="font-bold text-[#1a2b8c] text-[15px]">{t("dash_buy_virtual")}</span>
              <ChevronRight className="w-5 h-5 text-[#1a2b8c]" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Services populaires */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm">{t("dash_popular_services")}</h3>
            <button onClick={() => onNavigate("numeros")} className="text-xs text-blue-600 font-semibold">{t("dash_see_all")}</button>
          </div>
          {services.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {services.map((svc: any) => (
                <button key={svc.service} onClick={() => onNavigate("numeros")} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                  <ServiceIcon icon={svc.icon} color={svc.color} name={svc.name} size={56} />
                  <p className="text-[10px] text-gray-600 font-semibold text-center leading-tight line-clamp-1">{svc.name}</p>
                  {svc.price != null && (
                    <p className="text-[10px] text-blue-600 font-bold">
                      {currency === "FCFA"
                        ? `${Math.round(svc.price * FCFA_RATE).toLocaleString("fr-FR")} FCFA`
                        : `$${svc.price.toFixed(2)}`}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {["Telegram","WhatsApp","Google","TikTok"].map(name => (
                <button key={name} onClick={() => onNavigate("numeros")} className="flex flex-col items-center gap-1.5">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-500">{name.slice(0,2)}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 font-semibold text-center">{name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pays populaires */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm">{t("dash_popular_countries")}</h3>
            <button onClick={() => onNavigate("numeros")} className="text-xs text-blue-600 font-semibold">{t("dash_see_all")}</button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {POPULAR_COUNTRIES.map(c => (
              <button key={c.name} onClick={() => onNavigate("numeros")} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <div className="w-14 h-14 rounded-full border-2 border-gray-100 bg-white shadow-sm flex items-center justify-center text-3xl">
                  {c.flag}
                </div>
                <p className="text-[10px] text-gray-600 font-semibold text-center leading-tight">{c.code}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm">{t("dash_recent_activity")}</h3>
            <button onClick={() => onNavigate("sms")} className="text-xs text-blue-600 font-semibold">{t("dash_see_all")}</button>
          </div>
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t("dash_no_activity")}</p>
              <button onClick={() => onNavigate("numeros")} className="mt-3 text-xs text-blue-600 font-semibold">{t("dash_buy_action")}</button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              {orders.slice(0, 4).map((order: any, i: number) => {
                const st = STATUS_MAP[order.status] ?? { label: order.status, cls: "bg-gray-100 text-gray-500 border-gray-200" };
                return (
                  <div key={order.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-50" : ""}`}>
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{order.serviceName}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{order.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {order.smsCode && (
                        <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">{order.smsCode}</span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── WALLET TAB ──────────────────────────────────────────────────────────────
function WalletTab({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { currency } = useCurrency();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [showBal, setShowBal] = useState(true);
  const { data: balanceData } = useGetBalance({ query: { retry: false } as any });
  const { data: historyData } = useGetOrderHistory({ page: 1, limit: 50 }, { query: { retry: false } as any });

  const balance = balanceData?.balance ?? 0;
  const displayBal = showBal ? fmt(balance, currency) : "••••••";

  const transactions = historyData?.orders ?? [];

  const METHODS = [
    { name: "TMoney", commission: "5%", color: "#F59E0B", letter: "TM" },
    { name: "Moov Money", commission: "5%", color: "#3B82F6", letter: "MM" },
    { name: "Orange Money", commission: "5%", color: "#F97316", letter: "OM" },
    { name: "USDT (TRC20)", commission: "2%", color: "#22C55E", letter: "U" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-gray-100">
        <h1 className="font-extrabold text-gray-900 text-xl">{t("dash_wallet")}</h1>
        <button className="relative p-2 rounded-xl bg-gray-100">
          <img src="/bell-icon.png" alt="Notifications" className="w-5 h-5 object-contain" style={{ filter: "brightness(0) opacity(0.45)" }} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
      <div className="px-4 pt-4 space-y-4">
        {/* Balance card */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-blue-500/25">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">{t("dash_current_balance")}</p>
            <button onClick={() => setShowBal(s => !s)} className="text-blue-200 hover:text-white transition-colors">
              {showBal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-3xl font-black mb-4">{displayBal}</p>
          <button onClick={() => onNavigate("sms")} className="inline-flex items-center gap-1.5 text-blue-200 text-xs font-semibold hover:text-white transition-colors">
            <History className="w-3.5 h-3.5" /> {t("dash_wallet_history")}
          </button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <Plus className="w-5 h-5" />, label: t("dash_action_recharge"), color: "text-blue-600 bg-blue-50", action: () => navigate("/recharge") },
            { icon: <ArrowUpRight className="w-5 h-5" />, label: t("dash_action_withdraw"), color: "text-purple-600 bg-purple-50", action: () => {} },
            { icon: <ArrowDownLeft className="w-5 h-5" />, label: t("dash_action_transfer"), color: "text-emerald-600 bg-emerald-50", action: () => {} },
            { icon: <Tag className="w-5 h-5" />, label: t("dash_action_promo"), color: "text-orange-600 bg-orange-50", action: () => {} },
          ].map(a => (
            <button key={a.label} onClick={a.action} className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${a.color}`}>{a.icon}</div>
              <p className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{a.label}</p>
            </button>
          ))}
        </div>

        {/* Payment methods */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">{t("dash_payment_methods")}</h3>
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {METHODS.map((m, i) => (
              <button
                key={m.name}
                onClick={() => navigate("/recharge")}
                className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-50" : ""}`}
              >
                <div style={{ background: m.color }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-black">{m.letter}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-400">{t("dash_commission")} {m.commission}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        {transactions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm">{t("dash_recent_tx")}</h3>
              <button onClick={() => onNavigate("sms")} className="text-xs text-blue-600 font-semibold">{t("dash_see_all")}</button>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              {transactions.slice(0, 5).map((order: any, i: number) => (
                <div key={order.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-50" : ""}`}>
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t("dash_number_purchase")}</p>
                    <p className="text-xs text-gray-400 truncate">{order.serviceName}</p>
                  </div>
                  <span className="text-sm font-bold text-red-500 shrink-0">
                    -{currency === "FCFA"
                        ? `${Math.round(order.priceUsd * FCFA_RATE).toLocaleString("fr-FR")} FCFA`
                        : `$${Number(order.priceUsd).toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── SHARED SUB-PAGE WRAPPER ─────────────────────────────────────────────────
function SubPage({ title, onBack, children, rightAction }: { title: string; onBack: () => void; children: React.ReactNode; rightAction?: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 shrink-0 border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-1 rounded-xl hover:bg-gray-100 active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900 text-base flex-1">{title}</h1>
        {rightAction}
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
        {children}
      </div>
    </div>
  );
}

// ─── INFOS PAGE ───────────────────────────────────────────────────────────────
function InfosPage({ user, onBack }: { user: UserWithAdmin; onBack: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const memberSince = user.createdAt
    ? format(new Date(user.createdAt), "d MMMM yyyy", { locale: fr })
    : "";

  const copyId = () => {
    navigator.clipboard.writeText(`ZY${user.id.toString().padStart(6, "0")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: t("infos_id_copied"), duration: 2000 });
  };

  const saveName = async () => {
    if (!name.trim() || name === user.name) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("zynum_token");
      const res = await fetch("/api/v1/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error(t("error"));
      toast({ title: t("infos_name_updated") });
    } catch {
      toast({ variant: "destructive", title: t("error"), description: t("infos_name_error") });
    } finally { setSaving(false); }
  };

  return (
    <SubPage title={t("infos_page_title")} onBack={onBack}>
      <div className="px-4 pt-5 space-y-4">
        {/* Avatar */}
        <div className="flex flex-col items-center py-4">
          <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-xl shadow-blue-500/30 mb-3">
            <img
              src="/avatar-user.png"
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">{t("infos_verified_account")}</span>
        </div>

        {/* Name field */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t("infos_full_name")}</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              onClick={saveName}
              disabled={saving || !name.trim() || name === user.name}
              className="h-11 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-40 active:scale-95 transition-all"
            >
              {saving ? "..." : "OK"}
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t("infos_email_label")}</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
            <span className="shrink-0 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{t("infos_verified")}</span>
          </div>
        </div>

        {/* ID & date */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-50">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">{t("infos_id")}</p>
              <p className="text-sm font-bold text-gray-900 font-mono">ZY{user.id.toString().padStart(6, "0")}</p>
            </div>
            <button onClick={copyId} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl active:scale-90 transition-transform">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t("infos_copied") : t("infos_copy")}
            </button>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs text-gray-400 mb-0.5">{t("infos_member_since")}</p>
            <p className="text-sm font-bold text-gray-900">{memberSince}</p>
          </div>
        </div>
      </div>
    </SubPage>
  );
}

// ─── SECURITY PAGE ────────────────────────────────────────────────────────────
function SecurityPage({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) { toast({ variant: "destructive", title: t("security_pwd_short_title"), description: t("security_pwd_short_desc") }); return; }
    if (newPwd !== confirmPwd) { toast({ variant: "destructive", title: t("security_pwd_mismatch_title"), description: t("security_pwd_mismatch_desc") }); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("zynum_token");
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("error"));
      toast({ title: t("security_pwd_success") });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err: any) {
      toast({ variant: "destructive", title: t("error"), description: err.message });
    } finally { setLoading(false); }
  };

  const fields = [
    { val: currentPwd, set: setCurrentPwd, ph: t("security_current_pwd"), icon: <Lock className="w-4 h-4" /> },
    { val: newPwd,     set: setNewPwd,     ph: t("security_new_pwd"),     icon: <KeyRound className="w-4 h-4" /> },
    { val: confirmPwd, set: setConfirmPwd, ph: t("security_confirm_pwd"), icon: <KeyRound className="w-4 h-4" /> },
  ];

  return (
    <SubPage title={t("security_page_title")} onBack={onBack}>
      <div className="px-4 pt-5 space-y-4">
        {/* Security notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-xs text-orange-700 leading-relaxed">
            {t("security_notice")}
          </p>
        </div>

        {/* Password form */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-4">{t("security_change_pwd")}</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            {fields.map(f => (
              <div key={f.ph} className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{f.icon}</div>
                <input
                  type={showPwd ? "text" : "password"}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.ph}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setShowPwd(s => !s)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPwd ? t("security_hide_pwd") : t("security_show_pwd")} {t("security_pwd_label")}
            </button>
            <button
              type="submit"
              disabled={loading || !currentPwd || !newPwd || !confirmPwd}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              {loading ? t("security_saving") : t("security_save_btn")}
            </button>
          </form>
        </div>

        {/* 2FA info */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{t("security_2fa_title")}</p>
                <p className="text-xs text-gray-400">{t("security_2fa_desc")}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{t("security_coming_soon")}</span>
          </div>
        </div>
      </div>
    </SubPage>
  );
}

// ─── REFERRAL PAGE ────────────────────────────────────────────────────────────
function ReferralPage({ user, onBack }: { user: UserWithAdmin; onBack: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const RATE = 620;

  const [stats, setStats]           = useState<any>(null);
  const [loadingStats, setLoading]  = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showWithdrawInfo, setShowWithdrawInfo] = useState(false);

  const token = () => localStorage.getItem("zynum_token") ?? "";
  const authH = () => ({ Authorization: `Bearer ${token()}` });

  const refCode = stats?.referralCode ?? `ZY${user.id.toString().padStart(6, "0")}`;
  const refLink = `https://zynum.net/register?ref=${refCode}`;

  const load = async () => {
    setLoading(true);
    try {
      const s = await fetch("/api/v1/affiliate/stats", { headers: authH() }).then(r => r.json());
      setStats(s);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({ title: t("referral_copy_toast"), duration: 2000 });
  };

  const shareCode = () => {
    const text = `${t("referral_share_text")}${refCode}\n${refLink}`;
    if (navigator.share) {
      navigator.share({ title: t("referral_share_title"), text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(refLink);
      toast({ title: t("referral_link_copied"), description: t("referral_link_copied_desc"), duration: 2000 });
    }
  };

  const filleuls     = stats?.filleulCount ?? 0;
  const balanceUsd   = stats?.affiliateBalance ?? 0;
  const pointsBonus  = Math.round(balanceUsd * RATE);

  return (
    <SubPage title={t("referral_page_title")} onBack={onBack} rightAction={
      <button onClick={load} style={{ padding: 6, background: "none", border: "none", cursor: "pointer" }}>
        <RefreshCw style={{ width: 18, height: 18, color: "#2563EB" }} />
      </button>
    }>
      <div style={{ background: "#F5F9FF", minHeight: "100%", paddingBottom: 32 }}>

        {/* ── Hero section ── */}
        <div style={{ background: "linear-gradient(160deg, #D0E8FF 0%, #B8D9FF 100%)", padding: "32px 24px 28px", textAlign: "center" }}>
          {/* Illustration */}
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "rgba(255,255,255,0.55)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Gift style={{ width: 40, height: 40, color: "#0284C7" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 8px", lineHeight: 1.3 }}>
            {t("referral_hero_title")}
          </h2>
          <p style={{ fontSize: 13, color: "#4B7FC4", margin: 0, fontWeight: 500 }}>
            {t("referral_hero_sub")}
          </p>
        </div>

        <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Code card ── */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#E0F2FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Gift style={{ width: 18, height: 18, color: "#0284C7" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#1E293B" }}>{t("referral_code_title")}</span>
            </div>

            {/* Code box + copy button */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{
                flex: 1, border: "1.5px solid #BAE6FD", borderRadius: 14,
                padding: "12px 16px", background: "#F0F9FF",
              }}>
                {loadingStats ? (
                  <div style={{ height: 22, background: "#BAE6FD", borderRadius: 6, width: 120, animation: "pulse 1.5s infinite" }} />
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#0284C7", letterSpacing: 2, fontFamily: "monospace" }}>
                    {refCode}
                  </span>
                )}
              </div>
              <button
                onClick={copyCode}
                style={{
                  width: 46, height: 46, borderRadius: 14, border: "none", cursor: "pointer",
                  background: copiedCode ? "#22C55E" : "#0284C7",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s", flexShrink: 0,
                }}
              >
                {copiedCode
                  ? <Check style={{ width: 20, height: 20, color: "#fff" }} />
                  : <Copy style={{ width: 20, height: 20, color: "#fff" }} />
                }
              </button>
            </div>

            {/* Share button */}
            <button
              onClick={shareCode}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 50, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #0EA5E9, #2563EB)",
                color: "#fff", fontWeight: 800, fontSize: 15,
                boxShadow: "0 4px 14px rgba(14,165,233,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "opacity 0.15s",
              }}
            >
              <Share2 style={{ width: 18, height: 18 }} />
              {t("referral_share_btn")}
            </button>
          </div>

          {/* ── Stats row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Filleuls */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "18px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <Users style={{ width: 22, height: 22, color: "#2563EB" }} />
              </div>
              <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, margin: "0 0 4px" }}>{t("referral_filleuls")}</p>
              <p style={{ fontSize: 26, fontWeight: 900, color: "#2563EB", margin: 0 }}>
                {loadingStats ? "—" : filleuls}
              </p>
            </div>

            {/* Points Bonus */}
            <div style={{ background: "#fff", borderRadius: 20, padding: "18px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <Star style={{ width: 22, height: 22, color: "#F97316" }} />
              </div>
              <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, margin: "0 0 4px" }}>{t("referral_bonus")}</p>
              <p style={{ fontSize: 26, fontWeight: 900, color: "#F97316", margin: 0 }}>
                {loadingStats ? "—" : pointsBonus.toLocaleString("fr-FR")}
              </p>
            </div>
          </div>

          {/* ── Withdrawal button ── */}
          <button
            onClick={() => setShowWithdrawInfo(true)}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 50, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #7C3AED, #4F46E5)",
              color: "#fff", fontWeight: 800, fontSize: 15,
              boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <ArrowDownToLine style={{ width: 18, height: 18 }} />
            {t("referral_withdraw_btn")}
          </button>

          {/* ── How it works ── */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "18px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 16px" }}>{t("referral_how_title")}</p>
            {[
              { icon: <Link2 style={{ width: 18, height: 18, color: "#4F46E5" }} />, color: "#4F46E5", bg: "#EEF2FF", title: t("referral_step1_title"), desc: t("referral_step1_desc") },
              { icon: <UserPlus style={{ width: 18, height: 18, color: "#059669" }} />, color: "#059669", bg: "#ECFDF5", title: t("referral_step2_title"), desc: t("referral_step2_desc") },
              { icon: <WalletIcon style={{ width: 18, height: 18, color: "#D97706" }} />, color: "#D97706", bg: "#FFFBEB", title: t("referral_step3_title"), desc: t("referral_step3_desc") },
            ].map((step, i, arr) => (
              <div key={step.title} style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: step.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {step.icon}
                  </div>
                  {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: "#F1F5F9", margin: "4px 0" }} />}
                </div>
                <div style={{ paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#1E293B", margin: "2px 0 2px" }}>{step.title}</p>
                  <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Withdrawal info bottom sheet ── */}
      {showWithdrawInfo && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }}
          onClick={() => setShowWithdrawInfo(false)}
        >
          <div
            style={{ width: "100%", background: "#fff", borderRadius: "24px 24px 0 0", padding: "0 0 40px", boxShadow: "0 -4px 32px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: "#E2E8F0" }} />
            </div>
            <div style={{ padding: "16px 20px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💸</div>
              <h3 style={{ fontWeight: 800, fontSize: 18, color: "#0F172A", margin: "0 0 10px" }}>
                {t("withdraw_title")}
              </h3>
              <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 20px", lineHeight: 1.6 }}>
                {t("withdraw_desc")}
              </p>
              <div style={{ background: "#EFF6FF", borderRadius: 16, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
                <p style={{ fontSize: 13, color: "#1D4ED8", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                  {t("withdraw_info")}
                </p>
              </div>
              <button
                onClick={() => setShowWithdrawInfo(false)}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 50, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #0EA5E9, #2563EB)",
                  color: "#fff", fontWeight: 800, fontSize: 15,
                }}
              >
                {t("withdraw_understood")}
              </button>
            </div>
          </div>
        </div>
      )}
    </SubPage>
  );
}

// ─── API PAGE ─────────────────────────────────────────────────────────────────
function APIPage({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchKey = useCallback(async () => {
    const token = localStorage.getItem("zynum_token");
    try {
      const res = await fetch("/api/v1/developer/apikey", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setApiKey(data.apiKey ?? null);
    } catch { setApiKey(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchKey(); }, [fetchKey]);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const token = localStorage.getItem("zynum_token");
      const res = await fetch("/api/v1/developer/apikey", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApiKey(data.apiKey ?? null);
      toast({ title: t("api_key_regenerated") });
    } catch { toast({ variant: "destructive", title: t("error"), description: t("api_key_regen_error") }); }
    finally { setRegenerating(false); }
  };

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: t("api_key_copied"), duration: 2000 });
  };

  return (
    <SubPage title={t("dash_api_title")} onBack={onBack}>
      <div className="px-4 pt-5 space-y-4">
        {/* Header */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
          <Code2 className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-indigo-900">{t("api_access_title")}</p>
            <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">{t("api_access_desc")}</p>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t("api_your_key")}</p>
          {loading ? (
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-mono text-xs text-gray-700 truncate">
                {apiKey ? (showKey ? apiKey : "•".repeat(32)) : t("api_no_key")}
              </div>
              <button onClick={() => setShowKey(s => !s)} className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
                {showKey ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
              </button>
              <button onClick={copyKey} disabled={!apiKey} className="p-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-40 active:scale-90 transition-transform">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="w-full h-11 rounded-xl border-2 border-indigo-200 text-indigo-600 font-bold text-sm hover:bg-indigo-50 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? t("api_generating_key") : apiKey ? t("api_regen_key") : t("api_generate_key")}
          </button>
        </div>

        {/* Base URL */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t("api_base_url_label")}</p>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 font-mono text-xs text-gray-700 border border-gray-200">
            {window.location.origin}/api/v1
          </div>
        </div>

        {/* Endpoints summary */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-3">{t("api_endpoints_title")}</p>
          {[
            { method: "GET",  path: "/services",    desc: t("api_ep_services") },
            { method: "GET",  path: "/countries",   desc: t("api_ep_countries") },
            { method: "POST", path: "/numbers/buy", desc: t("api_ep_buy") },
            { method: "GET",  path: "/orders",      desc: t("api_ep_orders") },
          ].map((ep, i) => (
            <div key={ep.path} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-50" : ""}`}>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 ${ep.method === "GET" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{ep.method}</span>
              <span className="font-mono text-xs text-gray-600 flex-1">{ep.path}</span>
              <span className="text-xs text-gray-400">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </SubPage>
  );
}

// ─── TOGGLE SWITCH ────────────────────────────────────────────────────────────
function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-12 h-6 rounded-full flex items-center px-0.5 transition-all duration-200 shrink-0 ${on ? "bg-[#00C87A] justify-end" : "bg-gray-200 justify-start"}`}
    >
      <div className="w-5 h-5 rounded-full bg-white shadow" />
    </button>
  );
}

function loadNotifPrefs() {
  try {
    const raw = localStorage.getItem("zynum_notif_prefs");
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch {}
  return { sms: true, recharge: true, promo: false };
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let os = "Inconnu";
  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Inconnu";
  if (/Chrome\//.test(ua) && !/Chromium|Edg/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";

  const screen = `${window.screen.width} × ${window.screen.height}`;
  const lang = navigator.language || "—";
  return { os, browser, screen, lang };
}

// ─── PARAMS PAGE ──────────────────────────────────────────────────────────────
function ParamsPage({ onBack }: { onBack: () => void }) {
  const { lang, setLang } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const [notifs, setNotifs] = useState<Record<string, boolean>>(loadNotifPrefs);
  const device = getDeviceInfo();

  const toggleNotif = (key: string) => {
    setNotifs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("zynum_notif_prefs", JSON.stringify(next));
      return next;
    });
  };

  const { t } = useLanguage();

  const notifItems = [
    { key: "sms",      label: t("params_sms_label"),     sub: t("params_sms_sub") },
    { key: "recharge", label: t("params_recharge_label"), sub: t("params_recharge_sub") },
    { key: "promo",    label: t("params_promo_label"),    sub: t("params_promo_sub") },
  ];

  return (
    <SubPage title={t("params_title")} onBack={onBack}>
      <div className="px-4 pt-5 space-y-4 pb-8">

        {/* ── Langue ── */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-3">
            {t("params_lang_title")}
          </p>
          {(["fr", "en"] as const).map((l, i) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-gray-50" : ""} active:bg-gray-50 transition-colors`}
            >
              <span className="text-2xl">{l === "fr" ? "🇫🇷" : "🇬🇧"}</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">{l === "fr" ? "Français" : "English"}</p>
                <p className="text-xs text-gray-400">{l === "fr" ? "Langue française" : "English language"}</p>
              </div>
              {lang === l
                ? <div className="w-5 h-5 rounded-full bg-[#00C87A] flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                : <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
              }
            </button>
          ))}
        </div>

        {/* ── Devise ── */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-3">
            {t("params_currency_title")}
          </p>
          {(["FCFA", "USD"] as const).map((c, i) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-gray-50" : ""} active:bg-gray-50 transition-colors`}
            >
              <span className="text-2xl">{c === "USD" ? "🇺🇸" : "🌍"}</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">{c === "USD" ? "Dollar US" : "Franc CFA"}</p>
                <p className="text-xs text-gray-400">{c === "USD" ? "USD — Dollar américain" : "FCFA / XAF — Afrique de l'Ouest"}</p>
              </div>
              {currency === c
                ? <div className="w-5 h-5 rounded-full bg-[#00C87A] flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>
                : <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
              }
            </button>
          ))}
        </div>

      </div>
    </SubPage>
  );
}

// ─── HELP PAGE ────────────────────────────────────────────────────────────────
function HelpPage({ onBack }: { onBack: () => void }) {
  const { settings: publicSettings } = usePublicSettings();
  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const FAQ = [
    { q: t("help_q1"), a: t("help_a1") },
    { q: t("help_q2"), a: t("help_a2") },
    { q: t("help_q3"), a: t("help_a3") },
    { q: t("help_q4"), a: t("help_a4") },
    { q: t("help_q5"), a: t("help_a5") },
    { q: t("help_q6"), a: t("help_a6") },
  ];

  const whatsappUrl = publicSettings.support_whatsapp || "";
  const whatsappEnabled = publicSettings.support_whatsapp_enabled !== "false" && !!whatsappUrl;
  const channelUrl = publicSettings.support_whatsapp_channel || "";
  const channelEnabled = publicSettings.support_whatsapp_channel_enabled !== "false" && !!channelUrl;
  const facebookUrl = publicSettings.support_facebook || "";
  const facebookEnabled = publicSettings.support_facebook_enabled !== "false" && !!facebookUrl;
  const emailVal = publicSettings.support_email || "support@zynum.net";
  const emailEnabled = publicSettings.support_email_enabled !== "false";

  const openLink = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  const contactButtons = [
    whatsappEnabled && {
      label: "WhatsApp Support",
      sub: "Discutez avec notre équipe",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12.003 2.003a9.997 9.997 0 0 0-8.649 14.983L2 22l5.14-1.345A9.996 9.996 0 1 0 12.003 2.003zm0 18.333a8.33 8.33 0 0 1-4.243-1.161l-.305-.181-3.051.799.814-2.973-.198-.315a8.333 8.333 0 1 1 6.983 3.831z"/>
        </svg>
      ),
      bg: "#25D366", color: "#ffffff",
      action: () => openLink(whatsappUrl),
    },
    channelEnabled && {
      label: "Canal WhatsApp",
      sub: "Rejoignez notre canal officiel",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12.003 2.003a9.997 9.997 0 0 0-8.649 14.983L2 22l5.14-1.345A9.996 9.996 0 1 0 12.003 2.003zm0 18.333a8.33 8.33 0 0 1-4.243-1.161l-.305-.181-3.051.799.814-2.973-.198-.315a8.333 8.333 0 1 1 6.983 3.831z"/>
        </svg>
      ),
      bg: "#128C7E", color: "#ffffff",
      action: () => openLink(channelUrl),
    },
    facebookEnabled && {
      label: "Page Facebook",
      sub: "Suivez-nous sur Facebook",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 22, height: 22 }}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      bg: "#1877F2", color: "#ffffff",
      action: () => openLink(facebookUrl),
    },
    emailEnabled && {
      label: "Email Support",
      sub: emailVal,
      icon: <Mail style={{ width: 22, height: 22 }} />,
      bg: "#6366F1", color: "#ffffff",
      action: () => { window.location.href = `mailto:${emailVal}`; },
    },
  ].filter(Boolean) as { label: string; sub: string; icon: React.ReactNode; bg: string; color: string; action: () => void }[];

  return (
    <SubPage title={t("dash_help_title")} onBack={onBack}>
      <div className="pb-8">

        {/* ── Bannière WhatsApp ── */}
        {whatsappEnabled && (
          <button
            onClick={() => openLink(whatsappUrl)}
            style={{ display: "block", width: "100%", padding: "16px 16px 0", background: "none", border: "none", cursor: "pointer" }}
          >
            <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(37,211,102,0.25)" }}>
              <img
                src="/whatsapp-support-banner.jpg"
                alt="WhatsApp & service client"
                style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 160 }}
              />
            </div>
          </button>
        )}

        <div className="px-4 pt-5 space-y-4">

          {/* ── Boutons de contact ── */}
          {contactButtons.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                Nous contacter
              </p>
              {contactButtons.map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: 18,
                    background: "#ffffff", border: "1px solid #F3F4F6",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                    background: btn.bg, color: btn.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {btn.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "#111827", margin: 0 }}>{btn.label}</p>
                    <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{btn.sub}</p>
                  </div>
                  <ChevronRight style={{ width: 16, height: 16, color: "#D1D5DB", flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}

          {/* ── FAQ ── */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              {t("dash_faq_title")}
            </p>
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              {FAQ.map((item, i) => (
                <div key={i} className={`${i > 0 ? "border-t border-gray-50" : ""}`}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <p className="flex-1 text-sm font-semibold text-gray-900 leading-snug">{item.q}</p>
                    <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform duration-200 shrink-0 ${openFaq === i ? "rotate-90" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-sm text-gray-500 leading-relaxed pl-[52px]">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </SubPage>
  );
}

// ─── COMPTE TAB ───────────────────────────────────────────────────────────────
// ─── NUMEROS TAB ──────────────────────────────────────────────────────────────
function NumerosTab() {
  const [stepTitle, setStepTitle] = useState("Acheter un numéro");
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <BuyNumber isEmbedded={true} onStepChange={setStepTitle} />
      </div>
    </div>
  );
}

function CompteTab({ user, onLogout }: { user: UserWithAdmin; onLogout: () => void }) {
  const [, setLocation] = useLocation();
  const { settings: publicSettings } = usePublicSettings();
  const { lang, setLang } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const [section, setSection] = useState<string | null>(null);

  const memberSince = user.createdAt
    ? format(new Date(user.createdAt), "MMMM yyyy", { locale: fr })
    : "";

  const { t } = useLanguage();

  const MENU = [
    { id: "infos",    iconSrc: "/icon-profile.png",  iconBg: "#EFF6FF", label: t("dash_menu_infos"),    accent: "#3B82F6" },
    { id: "security", iconSrc: "/icon-password.png", iconBg: "#111827", label: t("dash_menu_security"), accent: "#F97316" },
    { id: "referral", iconSrc: "/icon-records.png",  iconBg: "#111827", label: t("dash_menu_referral"), accent: "#8B5CF6", badge: "10%" },
    { id: "params",   iconSrc: imgParamsIcon,          iconBg: "#111827", label: t("dash_menu_params"),   accent: "#6B7280" },
    { id: "help",     iconSrc: "/icon-support.png",  iconBg: "#111827", label: t("dash_menu_help"),     accent: "#14B8A6" },
  ];

  const nav = (s: string) => setSection(s);
  const back = () => setSection(null);

  const content = (() => {
    if (section === "infos")    return <InfosPage    key="infos"    user={user} onBack={back} />;
    if (section === "security") return <SecurityPage key="security" onBack={back} />;
    if (section === "referral") return <ReferralPage key="referral" user={user} onBack={back} />;
    if (section === "api")      return <APIPage      key="api"      onBack={back} />;
    if (section === "params")   return <ParamsPage   key="params"   onBack={back} />;
    if (section === "help")     return <HelpPage     key="help"     onBack={back} />;

    return (
      <motion.div
        key="main"
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -30, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-gray-100">
          <h1 className="font-extrabold text-gray-900 text-xl">{t("dash_account_tab")}</h1>
          <button onClick={() => nav("params")} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
        <div className="px-4 pt-4 space-y-4">
          {/* User card */}
          <button onClick={() => nav("infos")} className="w-full bg-white rounded-3xl p-5 shadow-sm border border-gray-100 text-left active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative shrink-0">
                <img src="/avatar-user.png" alt="profil" className="w-16 h-16 rounded-2xl object-cover" />
                <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#00C87A] rounded-full border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 text-base truncate">{user.name}</p>
                  <span className="shrink-0 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{t("dash_verified")}</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t("dash_member_since")} {memberSince}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </div>
            <div className="border-t border-gray-50 pt-3 flex items-center justify-between text-xs text-gray-400">
              <span>ID: ZY{user.id.toString().padStart(6, "0")}</span>
              <span className="text-blue-500 font-semibold">{t("dash_edit_profile")}</span>
            </div>
          </button>

          {/* Menu */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {MENU.map((item, i) => (
              <button
                key={item.id}
                onClick={() => nav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 transition-colors text-left ${i > 0 ? "border-t border-gray-50" : ""}`}
              >
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: item.iconBg }}
                >
                  <img
                    src={item.iconSrc}
                    className="w-8 h-8 object-contain"
                    style={
                      item.iconBg === "#EFF6FF"
                        ? { filter: "saturate(0) brightness(0.4)" }
                        : item.id === "params"
                        ? { mixBlendMode: "screen" as const }
                        : {}
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">{item.badge}</span>
                )}
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: item.accent }} />
              </button>
            ))}
          </div>



          {/* Admin panel button — visible admins only */}
          {user.isAdmin && (
            <button
              onClick={() => setLocation("/admin")}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-gray-900 hover:bg-gray-800 active:scale-95 transition-all shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-bold text-sm">{t("dash_admin_panel")}</p>
                <p className="text-gray-400 text-xs">{t("dash_admin_desc")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            </button>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            {t("dash_logout")}
          </button>

          <div className="text-center pb-2">
            <p className="text-xs text-gray-300 font-medium">ZyNum v1.0.0 · {t("dash_version")}</p>
          </div>
        </div>
        </div>
      </motion.div>
    );
  })();

  return <AnimatePresence mode="wait">{content}</AnimatePresence>;
}

// ─── BOTTOM NAV ──────────────────────────────────────────────────────────────
function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const { t } = useLanguage();
  const TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: "accueil",
      label: t("dash_nav_home"),
      icon: (a) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={a ? "#2563EB" : "none"} stroke={a ? "#2563EB" : "#9CA3AF"} strokeWidth={2}>
          <path d="M3 12L12 3l9 9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 10v11h14V10" fill={a ? "#2563EB" : "none"} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: "numeros",
      label: t("dash_nav_numbers"),
      icon: (a) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={a ? "#2563EB" : "#9CA3AF"} strokeWidth={2}>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" fill={a ? "#EFF6FF" : "none"}/>
          <line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeWidth={2.5}/>
        </svg>
      ),
    },
    {
      id: "sms",
      label: t("dash_nav_history"),
      icon: (a) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={a ? "#2563EB" : "#9CA3AF"} strokeWidth={2}>
          <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: "compte",
      label: t("dash_nav_account"),
      icon: (a) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={a ? "#EFF6FF" : "none"} stroke={a ? "#2563EB" : "#9CA3AF"} strokeWidth={2}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4" fill={a ? "#2563EB" : "none"} stroke={a ? "#2563EB" : "#9CA3AF"}/>
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-stretch h-16 w-full">
        {TABS.map(tab => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-90 relative"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full"
                />
              )}
              {tab.icon(isActive)}
              <span className={`text-[10px] font-bold transition-colors ${isActive ? "text-blue-600" : "text-gray-400"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("accueil");

  const { data: rawUser, isLoading, isFetching } = useGetCurrentUser({
    query: { retry: false, staleTime: 30_000 } as any,
  });
  const showLoader = isLoading && !rawUser;
  const user = rawUser as UserWithAdmin | undefined;

  const logoutMutation = useLogoutUser({
    mutation: {
      onSuccess: () => {
        localStorage.removeItem("zynum_token");
        queryClient.clear();
        setLocation("/");
        toast({ title: t("dash_disconnected") });
      },
    },
  });

  // Handle ?auth_token= from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get("auth_token");
    if (authToken) {
      localStorage.setItem("zynum_token", authToken);
      queryClient.invalidateQueries();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Handle ?tab= redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "buy") {
      setActiveTab("numeros");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const [historyFilter, setHistoryFilter] = useState<"all" | "received" | "pending" | "canceled">("all");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      localStorage.removeItem("zynum_token");
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  if (showLoader || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const navigate = (tab: Tab) => setActiveTab(tab);

  const HISTORY_FILTERS: { key: typeof historyFilter; label: string; color: string }[] = [
    { key: "all",      label: t("dash_filter_all"),      color: "#2563EB" },
    { key: "received", label: t("dash_filter_received"), color: "#059669" },
    { key: "pending",  label: t("dash_filter_pending"),  color: "#D97706" },
    { key: "canceled", label: t("dash_filter_canceled"), color: "#6B7280" },
  ];

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 flex flex-col w-full relative">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "accueil" && <HomeTab user={user} onNavigate={navigate} />}
        {activeTab === "numeros" && (
          <NumerosTab />
        )}
        {activeTab === "sms" && (
          <div className="flex-1 overflow-y-auto pb-24" style={{ background: "#F8FAFC" }}>
            {/* Sticky title header */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-gray-900 leading-tight">{t("dash_nav_history")}</h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {historyFilter === "all"      ? t("dash_history_all") :
                     historyFilter === "received" ? t("dash_history_received") :
                     historyFilter === "pending"  ? t("dash_history_pending") :
                     t("dash_history_canceled")}
                  </p>
                </div>
                <button
                  onClick={() => setFilterDrawerOpen(true)}
                  style={{
                    width: 36, height: 36, borderRadius: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: historyFilter !== "all" ? "#2563EB" : "#F3F4F6",
                    border: "none", cursor: "pointer", position: "relative",
                  }}
                >
                  <SlidersHorizontal style={{ width: 16, height: 16, color: historyFilter !== "all" ? "#ffffff" : "#6B7280" }} />
                  {historyFilter !== "all" && (
                    <span style={{
                      position: "absolute", top: -4, right: -4,
                      width: 10, height: 10, borderRadius: "50%",
                      background: "#EF4444", border: "2px solid white",
                    }} />
                  )}
                </button>
              </div>
            </div>
            <OrderHistory filter={historyFilter} setFilter={setHistoryFilter} />
          </div>
        )}
        {activeTab === "compte" && <CompteTab user={user} onLogout={() => logoutMutation.mutate(undefined as any)} />}
      </div>

      <BottomNav active={activeTab} onChange={navigate} />

      {/* ── Filter Drawer ── */}
      {filterDrawerOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setFilterDrawerOpen(false)}
        >
          <div
            style={{
              width: "100%", background: "#fff",
              borderRadius: "24px 24px 0 0",
              padding: "0 0 32px",
              boxShadow: "0 -4px 32px rgba(0,0,0,0.12)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: "#E5E7EB" }} />
            </div>
            <div style={{ padding: "8px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: "#111827", margin: 0 }}>{t("dash_filter_history")}</p>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                style={{ background: "#F3F4F6", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X style={{ width: 16, height: 16, color: "#6B7280" }} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px" }}>
              {HISTORY_FILTERS.map(f => {
                const active = historyFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => { setHistoryFilter(f.key); setFilterDrawerOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px", borderRadius: 16, border: "none", cursor: "pointer",
                      background: active ? f.color : "#F9FAFB",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, color: active ? "#ffffff" : "#374151" }}>{f.label}</span>
                    {active && (
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Check style={{ width: 12, height: 12, color: "#ffffff" }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {historyFilter !== "all" && (
              <div style={{ padding: "12px 16px 0" }}>
                <button
                  onClick={() => { setHistoryFilter("all"); setFilterDrawerOpen(false); }}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 16,
                    border: "1.5px solid #E5E7EB", background: "white",
                    fontSize: 14, fontWeight: 600, color: "#6B7280", cursor: "pointer",
                  }}
                >
                  {t("dash_filter_reset")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
