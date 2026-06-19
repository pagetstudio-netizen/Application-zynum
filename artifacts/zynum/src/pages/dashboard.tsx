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
  ChevronLeft, Clock, XCircle, Package,
} from "lucide-react";
import {
  useGetCurrentUser, useLogoutUser, useGetBalance,
  useGetOrderHistory, useGetServices, useGetCurrentUserQueryKey,
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
import { NotificationBanner } from "@/components/notification-banner";
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

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: "En attente", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  RECEIVED: { label: "Reçu",       cls: "bg-green-50 text-green-700 border-green-200" },
  FINISHED: { label: "Terminé",    cls: "bg-blue-50 text-blue-700 border-blue-200" },
  TIMEOUT:  { label: "Expiré",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
  CANCELED: { label: "Annulé",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
  BANNED:   { label: "Banni",      cls: "bg-red-50 text-red-600 border-red-200" },
};

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

function RechargeView({ user, onBack }: { user: UserWithAdmin; onBack: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: balanceData, refetch: refetchBalance } = useGetBalance({ query: { retry: false } });
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("1000");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<{ id: string; name: string; color: string } | null>(null);
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [omnipayOpen, setOmnipayOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const methods = METHODS_BY_COUNTRY[selectedCountry.code] ?? [];
  const amountNum = parseInt(amount) || 0;
  const feeRate = selectedMethod ? (FEES[selectedMethod.id] ?? 5) : 0;
  const feeXof = selectedMethod ? Math.round(amountNum * feeRate / 100) : 0;
  const totalXof = amountNum + feeXof;
  const amountUsd = amountNum / 620;

  const handleConfirm = () => {
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "Numéro requis", description: "Entrez votre numéro Mobile Money." });
      return;
    }
    if (amountNum < 300) {
      toast({ variant: "destructive", title: "Montant trop faible", description: "Minimum 300 FCFA." });
      return;
    }
    if (!selectedMethod) {
      toast({ variant: "destructive", title: "Méthode requise", description: "Sélectionnez une méthode de paiement." });
      return;
    }
    setOmnipayOpen(true);
  };

  const handlePaymentSuccess = () => {
    toast({ title: "Paiement initié !", description: "Votre solde sera mis à jour dans quelques instants." });
    setLoading(true);
    setTimeout(() => {
      refetchBalance();
      queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
      setLoading(false);
      onBack();
    }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0" style={{ backgroundColor: "#111111" }}>
        <button onClick={onBack} className="p-2 rounded-xl active:scale-90 transition-transform">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <span className="text-white font-bold text-base">Recharger</span>
        <div className="p-2">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        <div className="px-4 pt-5 space-y-3">

          {/* Phone number */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-400 font-semibold mb-1">Numéro de téléphone</p>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="ex: 90 00 00 00"
              className="w-full text-lg font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none bg-transparent"
            />
          </div>

          {/* Amount + Country */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 flex overflow-hidden">
            {/* Amount */}
            <div className="flex-1 px-4 py-3 border-r border-gray-100">
              <p className="text-xs text-gray-400 font-semibold mb-1">Montant</p>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full text-xl font-black text-gray-900 focus:outline-none bg-transparent"
                />
                <span className="text-sm font-bold text-gray-400 shrink-0">{selectedCountry.currency}</span>
              </div>
            </div>
            {/* Country picker */}
            <button
              onClick={() => setShowCountryPicker(true)}
              className="px-4 py-3 flex flex-col items-end gap-1 active:bg-gray-50 transition-colors"
            >
              <p className="text-xs text-gray-400 font-semibold">Pays d'envoi</p>
              <div className="flex items-center gap-1">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm font-black text-gray-900">{selectedCountry.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
              </div>
            </button>
          </div>

          {/* Preset amounts */}
          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  parseInt(amount) === a
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {a.toLocaleString("fr-FR")}
              </button>
            ))}
          </div>

          {/* Select method */}
          <button
            onClick={() => setShowMethodPicker(true)}
            className="w-full bg-white rounded-2xl border-2 border-gray-200 px-4 py-4 flex items-center gap-3 active:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: selectedMethod?.color ?? "#6B7280" }}>
              <WalletIcon className="w-5 h-5 text-white" />
            </div>
            <span className={`flex-1 text-left font-semibold text-sm ${selectedMethod ? "text-gray-900" : "text-gray-400"}`}>
              {selectedMethod ? selectedMethod.name : "Sélectionner une méthode"}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

        </div>

        {/* Summary */}
        <div className="mx-4 mt-5 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-bold text-blue-600">◈ Récapitulatif</p>
          </div>
          <div className="px-4 pb-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Montant envoyé</span>
              <span className="text-sm font-semibold text-gray-900">{amountNum > 0 ? `${amountNum.toLocaleString("fr-FR")} ${selectedCountry.currency}` : "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Transfer fee</span>
              <span className="text-sm font-semibold text-gray-500">{selectedMethod && amountNum > 0 ? `${feeXof.toLocaleString("fr-FR")} ${selectedCountry.currency} (${feeRate}%)` : "—"}</span>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-gray-900">Total to pay</span>
              <span className="text-sm font-black text-blue-600">{amountNum > 0 ? `${totalXof.toLocaleString("fr-FR")} ${selectedCountry.currency}` : "—"}</span>
            </div>
          </div>
        </div>

        {/* Confirm button */}
        <div className="px-4 mt-4">
          <button
            onClick={handleConfirm}
            disabled={loading || !phone || amountNum < 300 || !selectedMethod}
            className="w-full h-14 rounded-2xl bg-blue-600 text-white font-black text-base disabled:opacity-40 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
          >
            {loading ? "Traitement..." : "Confirmé le paiement"}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">🔒 Paiement 100% sécurisé</p>
        </div>
      </div>

      {/* Country picker modal */}
      <AnimatePresence>
        {showCountryPicker && (
          <>
            <motion.div key="cp-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-40" onClick={() => setShowCountryPicker(false)} />
            <motion.div key="cp" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[70%] overflow-y-auto"
            >
              <div className="px-4 pt-4 pb-2 border-b border-gray-100">
                <p className="font-bold text-gray-900 text-base">Pays d'envoi</p>
              </div>
              {COUNTRIES.map(c => (
                <button key={c.code} onClick={() => { setSelectedCountry(c); setSelectedMethod(null); setShowCountryPicker(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 active:bg-gray-50 ${selectedCountry.code === c.code ? "bg-blue-50" : ""}`}
                >
                  <span className="text-2xl">{c.flag}</span>
                  <span className="font-semibold text-gray-900 flex-1 text-left">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.currency}</span>
                  {selectedCountry.code === c.code && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Method picker modal */}
      <AnimatePresence>
        {showMethodPicker && (
          <>
            <motion.div key="mp-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-40" onClick={() => setShowMethodPicker(false)} />
            <motion.div key="mp" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50"
            >
              <div className="px-4 pt-4 pb-2 border-b border-gray-100">
                <p className="font-bold text-gray-900 text-base">Méthode de paiement</p>
                <p className="text-xs text-gray-400 mt-0.5">{selectedCountry.flag} {selectedCountry.name}</p>
              </div>
              {methods.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Aucune méthode disponible pour ce pays.</p>
              ) : (
                methods.map(m => (
                  <button key={m.id} onClick={() => { setSelectedMethod(m); setShowMethodPicker(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-4 border-b border-gray-50 active:bg-gray-50 ${selectedMethod?.id === m.id ? "bg-blue-50" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: m.color }}>
                      <span className="text-white text-xs font-black">{m.name.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                      <p className="text-xs text-gray-400">Commission {FEES[m.id] ?? 5}%</p>
                    </div>
                    {selectedMethod?.id === m.id && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                ))
              )}
              <div className="h-6" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Omnipay Modal */}
      {user && (
        <OmnipayModal
          open={omnipayOpen}
          onClose={() => setOmnipayOpen(false)}
          amountXof={amountNum}
          userId={user.id}
          onSuccess={handlePaymentSuccess}
          userFirstName={user.name?.split(" ")[0] ?? "ZyNum"}
          userLastName={user.name?.split(" ").slice(1).join(" ") || `User${user.id}`}
        />
      )}
    </div>
  );
}

// ─── HOME TAB ────────────────────────────────────────────────────────────────
function HomeTab({ user, onNavigate }: { user: UserWithAdmin; onNavigate: (t: Tab) => void }) {
  const { currency } = useCurrency();
  const [showBal, setShowBal] = useState(true);
  const [view, setView] = useState<"home" | "recharge">("home");
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: balanceData } = useGetBalance({ query: { retry: false } });
  const { data: servicesData } = useGetServices(undefined, { query: { retry: false, staleTime: 60000 } });
  const { data: historyData } = useGetOrderHistory({ page: 1, limit: 5 }, { query: { retry: false } });

  const balance = balanceData?.balance ?? 0;
  const displayBal = showBal ? fmt(balance, currency) : "••••••";
  const services = (servicesData?.services ?? []).slice(0, 4);
  const orders = historyData?.orders ?? [];

  const initials = user.name?.charAt(0).toUpperCase() ?? "Z";
  const firstName = user.name?.split(" ")[0] ?? "là";

  const AVANTAGES = [
    { emoji: "🌍", title: "180+ pays disponibles",         desc: "Recevez des SMS depuis n'importe quel pays du monde." },
    { emoji: "⚡", title: "Réception instantanée",          desc: "Votre SMS arrive en quelques secondes après l'achat." },
    { emoji: "💰", title: "Paiement Mobile Money",         desc: "TMoney, Flooz, Orange Money, Wave et plus encore." },
    { emoji: "🔒", title: "100% anonyme et sécurisé",      desc: "Aucune donnée personnelle requise pour acheter." },
    { emoji: "🎁", title: "Programme de parrainage",        desc: "Invitez vos amis et gagnez des FCFA à chaque achat." },
    { emoji: "📱", title: "Toutes les apps supportées",    desc: "WhatsApp, Telegram, TikTok, Gmail, Facebook et +." },
  ];

  if (view === "recharge") {
    return <RechargeView user={user} onBack={() => setView("home")} />;
  }

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
                  <p style={{ color: "#ffffff", fontWeight: 900, fontSize: "16px", margin: 0 }}>Avantages ZyNum</p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "2px" }}>Pourquoi choisir ZyNum ?</p>
                </div>
                <button
                  onClick={() => setNotifOpen(false)}
                  style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.12)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <X style={{ width: 16, height: 16, color: "#ffffff" }} />
                </button>
              </div>
              <div style={{ padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 6, maxHeight: "60vh", overflowY: "auto" }}>
                {AVANTAGES.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px", borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.07)" }}>
                    <span style={{ fontSize: "22px", flexShrink: 0, marginTop: 2 }}>{a.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "#ffffff", fontWeight: 700, fontSize: "14px", margin: 0, lineHeight: 1.3 }}>{a.title}</p>
                      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", marginTop: 3, lineHeight: 1.4 }}>{a.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header — black */}
      <div style={{ backgroundColor: "#111111", padding: "18px 16px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
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
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: 500, margin: 0, lineHeight: 1 }}>Bonjour 👋</p>
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
              <span style={{ color: "#ffffff", fontSize: "9px", fontWeight: 900 }}>{AVANTAGES.length}</span>
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
              <p className="text-xs font-semibold text-white mb-0.5">Solde du compte</p>
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
              onClick={() => setView("recharge")}
              className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 transition-colors"
            >
              <span className="font-bold text-[#1a2b8c] text-[15px]">Recharger votre compte</span>
              <ChevronRight className="w-5 h-5 text-[#1a2b8c]" strokeWidth={3} />
            </button>
            <div className="mx-5 h-[2px]" style={{ backgroundColor: "#00C87A" }} />
            <button
              onClick={() => onNavigate("numeros")}
              className="w-full flex items-center justify-between px-5 py-4 active:bg-gray-50 transition-colors"
            >
              <span className="font-bold text-[#1a2b8c] text-[15px]">Acheter un numéro virtuel</span>
              <ChevronRight className="w-5 h-5 text-[#1a2b8c]" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Services populaires */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm">Services populaires</h3>
            <button onClick={() => onNavigate("numeros")} className="text-xs text-blue-600 font-semibold">Voir tout</button>
          </div>
          {services.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {services.map((svc: any) => (
                <button key={svc.service} onClick={() => onNavigate("numeros")} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                  <ServiceIcon icon={svc.icon} color={svc.color} name={svc.name} size={56} />
                  <p className="text-[10px] text-gray-600 font-semibold text-center leading-tight line-clamp-1">{svc.name}</p>
                  <p className="text-[10px] text-blue-600 font-bold">{Math.round((svc.price ?? 0.8) * FCFA_RATE)} FCFA</p>
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
            <h3 className="font-bold text-gray-900 text-sm">Pays populaires</h3>
            <button onClick={() => onNavigate("numeros")} className="text-xs text-blue-600 font-semibold">Voir tout</button>
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
            <h3 className="font-bold text-gray-900 text-sm">Activité récente</h3>
            <button onClick={() => onNavigate("sms")} className="text-xs text-blue-600 font-semibold">Voir tout</button>
          </div>
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucune activité récente</p>
              <button onClick={() => onNavigate("numeros")} className="mt-3 text-xs text-blue-600 font-semibold">Acheter un numéro →</button>
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
  const [showBal, setShowBal] = useState(true);
  const [view, setView] = useState<"main" | "recharge">("main");
  const { data: balanceData } = useGetBalance({ query: { retry: false } });
  const { data: historyData } = useGetOrderHistory({ page: 1, limit: 50 }, { query: { retry: false } });

  const balance = balanceData?.balance ?? 0;
  const displayBal = showBal ? fmt(balance, currency) : "••••••";

  const transactions = historyData?.orders ?? [];

  const METHODS = [
    { name: "TMoney", commission: "5%", color: "#F59E0B", letter: "TM" },
    { name: "Moov Money", commission: "5%", color: "#3B82F6", letter: "MM" },
    { name: "Orange Money", commission: "5%", color: "#F97316", letter: "OM" },
    { name: "USDT (TRC20)", commission: "2%", color: "#22C55E", letter: "U" },
  ];

  if (view === "recharge") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 shrink-0 border-b border-gray-100">
          <button onClick={() => setView("main")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900 text-base">Recharger</h1>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
          <Recharge />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center justify-between shrink-0 border-b border-gray-100">
        <h1 className="font-extrabold text-gray-900 text-xl">Wallet</h1>
        <button className="relative p-2 rounded-xl bg-gray-100">
          <img src="/bell-icon.png" alt="Notifications" className="w-5 h-5 object-contain" style={{ filter: "brightness(0) opacity(0.45)" }} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
      <div className="px-4 pt-4 space-y-4">
        {/* Balance card */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-blue-500/25">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Solde actuel</p>
            <button onClick={() => setShowBal(s => !s)} className="text-blue-200 hover:text-white transition-colors">
              {showBal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-3xl font-black mb-4">{displayBal}</p>
          <button onClick={() => onNavigate("sms")} className="inline-flex items-center gap-1.5 text-blue-200 text-xs font-semibold hover:text-white transition-colors">
            <History className="w-3.5 h-3.5" /> Historique
          </button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <Plus className="w-5 h-5" />, label: "Recharger", color: "text-blue-600 bg-blue-50", action: () => setView("recharge") },
            { icon: <ArrowUpRight className="w-5 h-5" />, label: "Retirer", color: "text-purple-600 bg-purple-50", action: () => {} },
            { icon: <ArrowDownLeft className="w-5 h-5" />, label: "Transférer", color: "text-emerald-600 bg-emerald-50", action: () => {} },
            { icon: <Tag className="w-5 h-5" />, label: "Code promo", color: "text-orange-600 bg-orange-50", action: () => {} },
          ].map(a => (
            <button key={a.label} onClick={a.action} className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${a.color}`}>{a.icon}</div>
              <p className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{a.label}</p>
            </button>
          ))}
        </div>

        {/* Payment methods */}
        <div>
          <h3 className="font-bold text-gray-900 text-sm mb-3">Méthodes de paiement</h3>
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {METHODS.map((m, i) => (
              <button
                key={m.name}
                onClick={() => setView("recharge")}
                className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-50" : ""}`}
              >
                <div style={{ background: m.color }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-black">{m.letter}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-400">Commission {m.commission}</p>
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
              <h3 className="font-bold text-gray-900 text-sm">Transactions récentes</h3>
              <button onClick={() => onNavigate("sms")} className="text-xs text-blue-600 font-semibold">Voir tout</button>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              {transactions.slice(0, 5).map((order: any, i: number) => (
                <div key={order.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-50" : ""}`}>
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">Achat numéro</p>
                    <p className="text-xs text-gray-400 truncate">{order.serviceName}</p>
                  </div>
                  <span className="text-sm font-bold text-red-500 shrink-0">
                    -{Math.round(order.priceUsd * FCFA_RATE)} FCFA
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
function SubPage({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      key={title}
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 shrink-0 border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-1 rounded-xl hover:bg-gray-100 active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900 text-base">{title}</h1>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
        {children}
      </div>
    </motion.div>
  );
}

// ─── INFOS PAGE ───────────────────────────────────────────────────────────────
function InfosPage({ user, onBack }: { user: UserWithAdmin; onBack: () => void }) {
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
      if (!res.ok) throw new Error("Erreur");
      toast({ title: "Nom mis à jour !" });
    } catch {
      toast({ variant: "destructive", title: "Échec", description: "Impossible de mettre à jour le profil" });
    } finally { setSaving(false); }
  };

  return (
    <SubPage title="Informations personnelles" onBack={onBack}>
      <div className="px-4 pt-5 space-y-4">
        {/* Avatar */}
        <div className="flex flex-col items-center py-4">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-blue-500/30 mb-3">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">Compte vérifié</span>
        </div>

        {/* Name field */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nom complet</p>
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
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Adresse email</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
            <span className="shrink-0 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Vérifié</span>
          </div>
        </div>

        {/* ID & date */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-50">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Identifiant ZyNum</p>
              <p className="text-sm font-bold text-gray-900 font-mono">ZY{user.id.toString().padStart(6, "0")}</p>
            </div>
            <button onClick={copyId} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl active:scale-90 transition-transform">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs text-gray-400 mb-0.5">Membre depuis</p>
            <p className="text-sm font-bold text-gray-900">{memberSince}</p>
          </div>
        </div>
      </div>
    </SubPage>
  );
}

// ─── SECURITY PAGE ────────────────────────────────────────────────────────────
function SecurityPage({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) { toast({ variant: "destructive", title: "Trop court", description: "8 caractères minimum" }); return; }
    if (newPwd !== confirmPwd) { toast({ variant: "destructive", title: "Erreur", description: "Les mots de passe ne correspondent pas" }); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem("zynum_token");
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      toast({ title: "Mot de passe modifié !" });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Échec", description: err.message });
    } finally { setLoading(false); }
  };

  const fields = [
    { val: currentPwd, set: setCurrentPwd, ph: "Mot de passe actuel",    icon: <Lock className="w-4 h-4" /> },
    { val: newPwd,     set: setNewPwd,     ph: "Nouveau mot de passe",    icon: <KeyRound className="w-4 h-4" /> },
    { val: confirmPwd, set: setConfirmPwd, ph: "Confirmer le mot de passe", icon: <KeyRound className="w-4 h-4" /> },
  ];

  return (
    <SubPage title="Sécurité" onBack={onBack}>
      <div className="px-4 pt-5 space-y-4">
        {/* Security notice */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-xs text-orange-700 leading-relaxed">
            Utilisez un mot de passe fort d'au moins 8 caractères avec des lettres, chiffres et symboles.
          </p>
        </div>

        {/* Password form */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-4">Changer le mot de passe</p>
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
              {showPwd ? "Masquer" : "Afficher"} les mots de passe
            </button>
            <button
              type="submit"
              disabled={loading || !currentPwd || !newPwd || !confirmPwd}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
            >
              {loading ? "Modification en cours..." : "Enregistrer le nouveau mot de passe"}
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
                <p className="text-sm font-bold text-gray-900">Authentification 2FA</p>
                <p className="text-xs text-gray-400">Double vérification à la connexion</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Bientôt</span>
          </div>
        </div>
      </div>
    </SubPage>
  );
}

// ─── REFERRAL PAGE ────────────────────────────────────────────────────────────
function ReferralPage({ user, onBack }: { user: UserWithAdmin; onBack: () => void }) {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const refCode = `ZY${user.id.toString().padStart(6, "0")}`;
  const refLink = `${window.location.origin}/?ref=${refCode}`;

  useEffect(() => {
    const token = localStorage.getItem("zynum_token");
    fetch("/api/v1/affiliate/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setStats(d)).catch(() => {});
  }, []);

  const copy = (text: string, which: "code" | "link") => {
    navigator.clipboard.writeText(text);
    if (which === "code") { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 1500); }
    else { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1500); }
    toast({ title: "Copié !", description: which === "code" ? "Code de parrainage copié" : "Lien de parrainage copié" });
  };

  return (
    <SubPage title="Parrainage" onBack={onBack}>
      <div className="px-4 pt-5 space-y-4">
        {/* Banner */}
        <div className="rounded-3xl p-5 text-white" style={{ backgroundColor: "#7C3AED" }}>
          <Gift className="w-8 h-8 mb-2 opacity-80" />
          <p className="font-black text-xl mb-1">Gagnez 10% de commission</p>
          <p className="text-sm text-purple-200">Pour chaque ami qui s'inscrit et recharge son compte via votre lien</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Filleuls", value: stats?.totalReferrals ?? 0 },
            { label: "Actifs", value: stats?.activeReferrals ?? 0 },
            { label: "Gains", value: stats?.totalEarnings ? `$${Number(stats.totalEarnings).toFixed(2)}` : "$0.00" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 border border-gray-100 text-center">
              <p className="text-lg font-black text-gray-900">{s.value}</p>
              <p className="text-[10px] text-gray-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Code */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Votre code de parrainage</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-center">
              <p className="text-xl font-black text-gray-900 tracking-widest">{refCode}</p>
            </div>
            <button
              onClick={() => copy(refCode, "code")}
              className="h-full px-4 py-3 rounded-xl bg-purple-600 text-white font-bold text-xs active:scale-95 transition-transform flex items-center gap-1.5"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedCode ? "Copié" : "Copier"}
            </button>
          </div>
        </div>

        {/* Link */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lien de parrainage</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 truncate font-mono border border-gray-200">{refLink}</p>
            <button
              onClick={() => copy(refLink, "link")}
              className="shrink-0 px-3 py-2.5 rounded-xl bg-blue-600 text-white active:scale-95 transition-transform"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Comment ça marche ?</p>
          {[
            { n: "1", title: "Partagez votre code", desc: "Envoyez votre lien ou code à vos amis" },
            { n: "2", title: "Ils s'inscrivent",   desc: "Vos amis créent un compte ZyNum" },
            { n: "3", title: "Vous gagnez",         desc: "10% de commission sur chaque recharge" },
          ].map(s => (
            <div key={s.n} className="flex gap-3 mb-3 last:mb-0">
              <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-black text-purple-700 shrink-0">{s.n}</div>
              <div>
                <p className="text-sm font-bold text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SubPage>
  );
}

// ─── API PAGE ─────────────────────────────────────────────────────────────────
function APIPage({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
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
      toast({ title: "Clé API régénérée !" });
    } catch { toast({ variant: "destructive", title: "Erreur", description: "Impossible de régénérer la clé" }); }
    finally { setRegenerating(false); }
  };

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast({ title: "Clé API copiée !" });
  };

  return (
    <SubPage title="API & Développeurs" onBack={onBack}>
      <div className="px-4 pt-5 space-y-4">
        {/* Header */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
          <Code2 className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-indigo-900">Accès API ZyNum</p>
            <p className="text-xs text-indigo-600 mt-0.5 leading-relaxed">Intégrez ZyNum dans vos applications avec notre API REST.</p>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Votre clé API</p>
          {loading ? (
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-mono text-xs text-gray-700 truncate">
                {apiKey ? (showKey ? apiKey : "•".repeat(32)) : "Aucune clé générée"}
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
            {regenerating ? "Génération..." : apiKey ? "Régénérer la clé" : "Générer une clé API"}
          </button>
        </div>

        {/* Base URL */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">URL de base</p>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 font-mono text-xs text-gray-700 border border-gray-200">
            {window.location.origin}/api/v1
          </div>
        </div>

        {/* Endpoints summary */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-3">Endpoints disponibles</p>
          {[
            { method: "GET",  path: "/services",    desc: "Lister les services" },
            { method: "GET",  path: "/countries",   desc: "Lister les pays" },
            { method: "POST", path: "/numbers/buy", desc: "Acheter un numéro" },
            { method: "GET",  path: "/orders",      desc: "Historique commandes" },
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

  const notifItems = [
    { key: "sms",      label: lang === "fr" ? "SMS reçus"        : "SMS received",    sub: lang === "fr" ? "Alertes lors de la réception d'un SMS"   : "Alerts on SMS reception" },
    { key: "recharge", label: lang === "fr" ? "Recharges"         : "Top-up",          sub: lang === "fr" ? "Confirmation de recharge de solde"        : "Balance top-up confirmation" },
    { key: "promo",    label: lang === "fr" ? "Offres spéciales"  : "Special offers",  sub: lang === "fr" ? "Promotions et remises exclusives"          : "Exclusive promotions & discounts" },
  ];

  return (
    <SubPage title={lang === "fr" ? "Paramètres" : "Settings"} onBack={onBack}>
      <div className="px-4 pt-5 space-y-4 pb-8">

        {/* ── Langue ── */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-3">
            {lang === "fr" ? "Langue de l'application" : "App language"}
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
            {lang === "fr" ? "Devise d'affichage" : "Display currency"}
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

        {/* ── Notifications ── */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-3">
            {lang === "fr" ? "Notifications" : "Notifications"}
          </p>
          {notifItems.map((n, i) => (
            <div
              key={n.key}
              className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-gray-50" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{n.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{n.sub}</p>
              </div>
              <ToggleSwitch on={!!notifs[n.key]} onToggle={() => toggleNotif(n.key)} />
            </div>
          ))}
        </div>

        {/* ── Informations de l'appareil ── */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-3">
            {lang === "fr" ? "Informations de l'appareil" : "Device information"}
          </p>
          {[
            { label: lang === "fr" ? "Système"     : "OS",       value: device.os },
            { label: lang === "fr" ? "Navigateur"  : "Browser",  value: device.browser },
            { label: lang === "fr" ? "Résolution"  : "Screen",   value: device.screen },
            { label: lang === "fr" ? "Langue sys."  : "Sys. lang", value: device.lang },
            { label: "Version app",                               value: "1.0.0" },
          ].map((row, i) => (
            <div key={row.label} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-gray-50" : ""}`}>
              <span className="text-sm text-gray-500">{row.label}</span>
              <span className="text-sm font-semibold text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>

      </div>
    </SubPage>
  );
}

// ─── HELP PAGE ────────────────────────────────────────────────────────────────
function HelpPage({ onBack }: { onBack: () => void }) {
  const { settings: publicSettings } = usePublicSettings();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const FAQ = [
    {
      q: "Comment acheter un numéro virtuel ?",
      a: "Allez dans l'onglet 'Numéros', choisissez un service (ex: WhatsApp), sélectionnez un pays et appuyez sur 'Acheter'. Le numéro sera disponible en quelques secondes.",
    },
    {
      q: "Comment recharger mon solde ?",
      a: "Dans l'onglet 'Compte', accédez à vos paramètres ou utilisez le bouton Recharger depuis l'accueil. Nous acceptons TMoney, Moov Money, Orange Money et USDT.",
    },
    {
      q: "Combien de temps le numéro est-il valide ?",
      a: "Chaque numéro virtuel est valide pendant 20 minutes par défaut. Si aucun SMS n'est reçu, la commande est annulée et vous êtes remboursé.",
    },
    {
      q: "Que faire si je ne reçois pas de SMS ?",
      a: "Attendez quelques minutes. Si le SMS n'arrive toujours pas, annulez la commande depuis l'historique pour être remboursé automatiquement.",
    },
    {
      q: "Mon solde est-il remboursable ?",
      a: "Les soldes ZyNum ne sont pas remboursables en argent. En cas de commande annulée ou expirée, votre solde est automatiquement recrédité.",
    },
    {
      q: "Comment fonctionne le programme de parrainage ?",
      a: "Partagez votre code unique avec vos amis. Lorsqu'ils s'inscrivent et rechargent leur compte, vous recevez 10% de commission sur chaque recharge.",
    },
  ];

  return (
    <SubPage title="Centre d'aide" onBack={onBack}>
      <div className="px-4 pt-5 space-y-4">


        {/* FAQ */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-3">Questions fréquentes</p>
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

        {/* Quick links */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          {[
            { icon: <Shield className="w-4 h-4 text-green-600" />,   label: "Politique de confidentialité", color: "bg-green-50", href: "https://zynum.net/privacy" },
            { icon: <Star className="w-4 h-4 text-yellow-600" />,    label: "Conditions d'utilisation",   color: "bg-yellow-50", href: "https://zynum.net/terms" },
          ].map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors ${i > 0 ? "border-t border-gray-50" : ""}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${link.color}`}>{link.icon}</div>
              <p className="flex-1 text-sm font-semibold text-gray-900">{link.label}</p>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </a>
          ))}
        </div>
      </div>
    </SubPage>
  );
}

// ─── COMPTE TAB ───────────────────────────────────────────────────────────────
function CompteTab({ user, onLogout }: { user: UserWithAdmin; onLogout: () => void }) {
  const { settings: publicSettings } = usePublicSettings();
  const { lang, setLang } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const [section, setSection] = useState<string | null>(null);

  const memberSince = user.createdAt
    ? format(new Date(user.createdAt), "MMMM yyyy", { locale: fr })
    : "";

  const MENU = [
    { id: "infos",    iconSrc: "/icon-profile.png",  iconBg: "#EFF6FF", label: "Informations personnelles", accent: "#3B82F6" },
    { id: "security", iconSrc: "/icon-password.png", iconBg: "#111827", label: "Sécurité",                  accent: "#F97316" },
    { id: "referral", iconSrc: "/icon-records.png",  iconBg: "#111827", label: "Parrainage",                accent: "#8B5CF6", badge: "10%" },
    { id: "params",   iconSrc: "/icon-params.png",   iconBg: "#111827", label: "Paramètres",                accent: "#6B7280" },
    { id: "help",     iconSrc: "/icon-support.png",  iconBg: "#111827", label: "Centre d'aide",             accent: "#14B8A6" },
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
          <h1 className="font-extrabold text-gray-900 text-xl">Compte</h1>
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
                  <span className="shrink-0 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Vérifié</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">Membre depuis {memberSince}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </div>
            <div className="border-t border-gray-50 pt-3 flex items-center justify-between text-xs text-gray-400">
              <span>ID: ZY{user.id.toString().padStart(6, "0")}</span>
              <span className="text-blue-500 font-semibold">Modifier le profil →</span>
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
                    style={item.iconBg === "#EFF6FF" ? { filter: "saturate(0) brightness(0.4)" } : {}}
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



          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>

          <div className="text-center pb-2">
            <p className="text-xs text-gray-300 font-medium">ZyNum v1.0.0 · Votre numéro virtuel, votre liberté.</p>
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
  const TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: "accueil",
      label: "Accueil",
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
      label: "Numéros",
      icon: (a) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={a ? "#2563EB" : "#9CA3AF"} strokeWidth={2}>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" fill={a ? "#EFF6FF" : "none"}/>
          <line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeWidth={2.5}/>
        </svg>
      ),
    },
    {
      id: "sms",
      label: "Historique",
      icon: (a) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={a ? "#2563EB" : "#9CA3AF"} strokeWidth={2}>
          <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      id: "compte",
      label: "Compte",
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
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("accueil");

  const { data: rawUser, isLoading } = useGetCurrentUser({ query: { retry: false } });
  const user = rawUser as UserWithAdmin | undefined;

  const logoutMutation = useLogoutUser({
    mutation: {
      onSuccess: () => {
        localStorage.removeItem("zynum_token");
        queryClient.clear();
        setLocation("/");
        toast({ title: "Déconnecté" });
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

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      localStorage.removeItem("zynum_token");
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
            <span className="text-white font-black text-lg">Z</span>
          </div>
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const navigate = (tab: Tab) => setActiveTab(tab);

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 flex flex-col max-w-lg mx-auto relative">
      <NotificationBanner />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          {activeTab === "accueil" && <HomeTab user={user} onNavigate={navigate} />}
          {activeTab === "numeros" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-white px-4 pt-4 pb-3 shrink-0 border-b border-gray-100">
                <h1 className="font-extrabold text-gray-900 text-xl">Acheter un numéro</h1>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
                <div className="p-4">
                  <BuyNumber isEmbedded={true} />
                </div>
              </div>
            </div>
          )}
          {activeTab === "sms" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-white px-4 pt-4 pb-3 shrink-0 border-b border-gray-100">
                <h1 className="font-extrabold text-gray-900 text-xl">Historique d'achat</h1>
              </div>
              <div className="flex-1 overflow-y-auto bg-white pb-24">
                <OrderHistory />
              </div>
            </div>
          )}
          {activeTab === "compte" && <CompteTab user={user} onLogout={() => logoutMutation.mutate({})} />}
        </motion.div>
      </AnimatePresence>

      <BottomNav active={activeTab} onChange={navigate} />
    </div>
  );
}
