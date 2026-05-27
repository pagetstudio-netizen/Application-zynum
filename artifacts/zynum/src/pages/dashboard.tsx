import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Bell, Eye, EyeOff, Plus, ChevronRight, Home, Smartphone,
  MessageSquare, Wallet as WalletIcon, User, LogOut,
  Copy, Check, Shield, Gift, Code2, HelpCircle, Settings,
  ArrowUpRight, ArrowDownLeft, Tag, History, RefreshCw,
  Phone, Globe2, Star, Lock, KeyRound, X, Menu,
  ChevronLeft, Clock, XCircle, Package,
} from "lucide-react";
import {
  useGetCurrentUser, useLogoutUser, useGetBalance,
  useGetOrderHistory, useGetServices, useGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-currency";
import { useLanguage } from "@/hooks/use-language";
import { useToast } from "@/hooks/use-toast";
import BuyNumber from "@/pages/buy";
import OrderHistory from "@/pages/history";
import Recharge from "@/pages/recharge";
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

// ─── HOME TAB ────────────────────────────────────────────────────────────────
function HomeTab({ user, onNavigate }: { user: UserWithAdmin; onNavigate: (t: Tab) => void }) {
  const { currency } = useCurrency();
  const [showBal, setShowBal] = useState(true);
  const { data: balanceData } = useGetBalance({ query: { retry: false } });
  const { data: servicesData } = useGetServices(undefined, { query: { retry: false, staleTime: 60000 } });
  const { data: historyData } = useGetOrderHistory({ page: 1, limit: 5 }, { query: { retry: false } });

  const balance = balanceData?.balance ?? 0;
  const displayBal = showBal ? fmt(balance, currency) : "••••••";
  const services = (servicesData?.services ?? []).slice(0, 4);
  const orders = historyData?.orders ?? [];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-14 pb-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
            <span className="text-white font-black text-sm">Z</span>
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">ZyNum</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Balance card */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-blue-500/25">
          <div className="flex items-start justify-between mb-1">
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Solde Actuel</p>
            <button onClick={() => setShowBal(s => !s)} className="text-blue-200 hover:text-white transition-colors">
              {showBal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-3xl font-black mb-4 tracking-tight">{displayBal}</p>
          <button
            onClick={() => onNavigate("compte")}
            className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-4 py-2 rounded-xl transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Recharger
          </button>
        </div>

        {/* Buy number CTA */}
        <button
          onClick={() => onNavigate("numeros")}
          className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-98"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-bold text-gray-900 text-sm">Acheter un numéro</p>
            <p className="text-xs text-gray-500 mt-0.5">Obtenez un numéro virtuel</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

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
      <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
        <div className="bg-white px-4 pt-14 pb-4 flex items-center gap-3 sticky top-0 z-10 border-b border-gray-100">
          <button onClick={() => setView("main")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900 text-base">Recharger</h1>
        </div>
        <Recharge />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-14 pb-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
        <h1 className="font-extrabold text-gray-900 text-xl">Wallet</h1>
        <button className="relative p-2 rounded-xl bg-gray-100">
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
      </div>

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
  );
}

// ─── COMPTE TAB ───────────────────────────────────────────────────────────────
function CompteTab({ user, onLogout }: { user: UserWithAdmin; onLogout: () => void }) {
  const { settings: publicSettings } = usePublicSettings();
  const { lang, setLang } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const { toast } = useToast();
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const memberSince = user.createdAt
    ? format(new Date(user.createdAt), "MMMM yyyy", { locale: fr })
    : "";

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) { toast({ variant: "destructive", title: "Trop court", description: "8 caractères minimum" }); return; }
    if (newPwd !== confirmPwd) { toast({ variant: "destructive", title: "Erreur", description: "Les mots de passe ne correspondent pas" }); return; }
    setPwdLoading(true);
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
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); setActiveSection(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Échec", description: err.message });
    } finally { setPwdLoading(false); }
  };

  const MENU = [
    { id: "infos",    icon: <User className="w-5 h-5" />,      label: "Informations personnelles", color: "text-blue-600 bg-blue-50" },
    { id: "kyc",      icon: <Shield className="w-5 h-5" />,     label: "Vérification (KYC)",        color: "text-green-600 bg-green-50", badge: "Vérifié" },
    { id: "security", icon: <Lock className="w-5 h-5" />,       label: "Sécurité",                  color: "text-orange-600 bg-orange-50" },
    { id: "referral", icon: <Gift className="w-5 h-5" />,       label: "Parrainage",                color: "text-purple-600 bg-purple-50", badge: "Gagnez 10%" },
    { id: "api",      icon: <Code2 className="w-5 h-5" />,      label: "API & Développeurs",        color: "text-indigo-600 bg-indigo-50" },
    { id: "params",   icon: <Settings className="w-5 h-5" />,   label: "Paramètres",                color: "text-gray-600 bg-gray-100" },
    { id: "help",     icon: <HelpCircle className="w-5 h-5" />, label: "Centre d'aide",             color: "text-teal-600 bg-teal-50" },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-14 pb-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
        <h1 className="font-extrabold text-gray-900 text-xl">Compte</h1>
        <button className="p-2 rounded-xl bg-gray-100">
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* User card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-blue-500/30">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-base truncate">{user.name}</p>
                <span className="shrink-0 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Vérifié</span>
              </div>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">Membre depuis {memberSince}</p>
            </div>
          </div>
          <div className="border-t border-gray-50 pt-3 flex items-center justify-between text-xs text-gray-400">
            <span>ID: ZY{user.id.toString().padStart(6, "0")}</span>
            <button className="flex items-center gap-1 text-blue-500">
              <Copy className="w-3 h-3" /> Copier ID
            </button>
          </div>
        </div>

        {/* Currency & Lang toggles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-3 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-2">Devise</p>
            <div className="flex bg-gray-100 rounded-xl p-0.5">
              {(["USD", "FCFA"] as const).map(c => (
                <button key={c} onClick={() => setCurrency(c)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${currency === c ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-2">Langue</p>
            <div className="flex bg-gray-100 rounded-xl p-0.5">
              {(["fr", "en"] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>{l === "fr" ? "FR" : "EN"}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          {MENU.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(activeSection === item.id ? null : item.id)}
              className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors text-left ${i > 0 ? "border-t border-gray-50" : ""}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>{item.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">{item.badge}</span>
              )}
              <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${activeSection === item.id ? "rotate-90" : ""}`} />
            </button>
          ))}
        </div>

        {/* Security section expanded */}
        <AnimatePresence>
          {activeSection === "security" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-sm mb-4">Changer le mot de passe</h3>
                <form onSubmit={handleChangePwd} className="space-y-3">
                  {[
                    { val: currentPwd, set: setCurrentPwd, ph: "Mot de passe actuel" },
                    { val: newPwd,     set: setNewPwd,     ph: "Nouveau mot de passe" },
                    { val: confirmPwd, set: setConfirmPwd, ph: "Confirmer le nouveau" },
                  ].map(f => (
                    <div key={f.ph} className="relative">
                      <input
                        type={showPwd ? "text" : "password"}
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                        placeholder={f.ph}
                        className="w-full h-11 px-4 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  ))}
                  <button type="button" onClick={() => setShowPwd(s => !s)} className="text-xs text-gray-400 hover:text-gray-600">
                    {showPwd ? "Masquer" : "Afficher"} les mots de passe
                  </button>
                  <button type="submit" disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd} className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-50 transition-colors">
                    {pwdLoading ? "Modification..." : "Modifier le mot de passe"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Support */}
        <button
          onClick={() => publicSettings.support_telegram
            ? openTelegramSupport(publicSettings.support_telegram)
            : undefined}
          className="w-full bg-[#26A5E4]/10 border border-[#26A5E4]/20 rounded-2xl p-4 flex items-center gap-3 hover:bg-[#26A5E4]/15 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#26A5E4] flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-gray-900">Contacter le support</p>
            <p className="text-xs text-gray-500">Disponible sur Telegram</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

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
  );
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
      label: "SMS",
      icon: (a) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={a ? "#EFF6FF" : "none"} stroke={a ? "#2563EB" : "#9CA3AF"} strokeWidth={2}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round"/>
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
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col max-w-lg mx-auto relative">
      <NotificationBanner />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="flex-1 flex flex-col"
        >
          {activeTab === "accueil" && <HomeTab user={user} onNavigate={navigate} />}
          {activeTab === "numeros" && (
            <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
              <div className="bg-white px-4 pt-14 pb-4 sticky top-0 z-10 border-b border-gray-100">
                <h1 className="font-extrabold text-gray-900 text-xl">Acheter un numéro</h1>
              </div>
              <div className="p-4">
                <BuyNumber isEmbedded={true} />
              </div>
            </div>
          )}
          {activeTab === "sms" && (
            <div className="flex-1 overflow-y-auto bg-gray-50 pb-24">
              <div className="bg-white px-4 pt-14 pb-4 sticky top-0 z-10 border-b border-gray-100">
                <h1 className="font-extrabold text-gray-900 text-xl">Mes SMS</h1>
              </div>
              <div className="p-4">
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
