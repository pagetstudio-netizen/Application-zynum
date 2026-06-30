import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Copy, Check, Users, DollarSign, Clock,
  ArrowDownToLine, RefreshCw, ChevronRight, AlertCircle,
} from "lucide-react";
import { NoData } from "@/components/ui/no-data";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";

const API = "/api";
const RATE = 620;

function authHeaders() {
  const token = localStorage.getItem("zynum_token") ?? "";
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function apiFetch(url: string) {
  const r = await fetch(`${API}${url}`, { headers: authHeaders() });
  return r.json();
}

async function apiPost(url: string, body: unknown) {
  const r = await fetch(`${API}${url}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return r.json();
}

type Stats = {
  referralCode: string | null;
  affiliateBalance: number;
  filleulCount: number;
  totalEarned: number;
  pendingWithdrawal: number;
};

type Referral = { id: number; name: string; email: string; createdAt: string };
type Withdrawal = {
  id: number;
  amountUsd: number;
  phone: string;
  country: string;
  status: string;
  note: string | null;
  createdAt: string;
};

const COUNTRIES = [
  "Sénégal", "Côte d'Ivoire", "Cameroun", "Mali", "Burkina Faso",
  "Guinée", "Bénin", "Togo", "Niger", "Congo", "Gabon",
  "Mauritanie", "Madagascar", "Rwanda", "Burundi", "Ghana",
  "Nigeria", "Kenya", "France", "Belgique", "Suisse", "Canada",
  "Autre",
];

export default function AffiliatePage() {
  const { toast } = useToast();
  const { currency } = useCurrency();
  const [stats, setStats] = useState<Stats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawCountry, setWithdrawCountry] = useState("Sénégal");
  const [submitting, setSubmitting] = useState(false);

  // Format a USD amount in the active currency
  const fmt = (usd: number) =>
    currency === "FCFA"
      ? `${Math.round(usd * RATE).toLocaleString("fr-FR")} FCFA`
      : `$${usd.toFixed(2)}`;

  // Convert the form input (in active currency) to USD for the API
  const toUsd = (val: string) => {
    const n = parseFloat(val);
    if (!n || n <= 0) return 0;
    return currency === "FCFA" ? n / RATE : n;
  };

  // Current balance in display currency
  const balanceDisplay = (usd: number) =>
    currency === "FCFA"
      ? Math.round(usd * RATE)
      : usd;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r, w] = await Promise.all([
        apiFetch("/v1/affiliate/stats"),
        apiFetch("/v1/affiliate/referrals"),
        apiFetch("/v1/affiliate/withdrawals"),
      ]);
      setStats(s);
      setReferrals(r.referrals ?? []);
      setWithdrawals(w.withdrawals ?? []);
    } catch {
      toast({ variant: "destructive", title: "Erreur de chargement" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const referralLink = stats?.referralCode
    ? `https://zynum.net/register?ref=${stats.referralCode}`
    : null;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Lien copié !", description: "Partagez-le avec vos contacts.", duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountUsd = toUsd(withdrawAmount);
    if (!amountUsd || amountUsd <= 0) {
      toast({ variant: "destructive", title: "Montant invalide" });
      return;
    }
    if (stats && amountUsd > stats.affiliateBalance) {
      toast({ variant: "destructive", title: "Solde insuffisant" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost("/v1/affiliate/withdraw", {
        amountUsd,
        phone: withdrawPhone,
        country: withdrawCountry,
      });
      if (res.withdrawal) {
        toast({ title: "Demande soumise !", description: "Traitement sous 48h." });
        setShowWithdrawForm(false);
        setWithdrawAmount("");
        setWithdrawPhone("");
        await load();
      } else {
        toast({ variant: "destructive", title: "Erreur", description: res.message ?? "Impossible de soumettre" });
      }
    } catch {
      toast({ variant: "destructive", title: "Erreur réseau" });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
      validated: "bg-green-100 text-green-700 border-green-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
    };
    const labels: Record<string, string> = {
      pending: "En attente",
      validated: "Validé",
      rejected: "Rejeté",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${map[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
        {labels[status] ?? status}
      </span>
    );
  };

  const maxInput = stats
    ? (currency === "FCFA" ? Math.round(stats.affiliateBalance * RATE) : stats.affiliateBalance)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Programme d'affiliation</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gagnez 10% de commission sur chaque achat de vos filleuls</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Mes filleuls */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-white/70 mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>Mes filleuls</p>
            <p className="text-3xl font-bold" style={{ color: "#ffffff" }}>{stats?.filleulCount ?? 0}</p>
            <p className="text-xs text-white/60 mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Personnes inscrites via votre lien</p>
          </div>
        </motion.div>

        {/* Commissions gagnées */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 flex items-start gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-white/70 mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>Commissions gagnées</p>
            <p className="text-3xl font-bold" style={{ color: "#ffffff" }}>{fmt(stats?.totalEarned ?? 0)}</p>
            <p className="text-xs text-white/60 mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
              Solde disponible : <span className="font-bold" style={{ color: "#ffffff" }}>{fmt(stats?.affiliateBalance ?? 0)}</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Referral link */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-primary" />
          Votre lien d'invitation
        </h3>
        {referralLink ? (
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm text-gray-700 font-mono truncate">
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-primary text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Code de parrainage non disponible.</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Code : <span className="font-bold text-gray-600">{stats?.referralCode ?? "—"}</span>
        </p>
      </div>

      {/* Withdrawal section */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4 text-primary" />
            Retrait des commissions
          </h3>
          {!showWithdrawForm && (
            <button
              onClick={() => setShowWithdrawForm(true)}
              disabled={(stats?.affiliateBalance ?? 0) <= 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-primary text-white text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Demander un retrait
            </button>
          )}
        </div>

        {(stats?.affiliateBalance ?? 0) <= 0 && !showWithdrawForm && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Votre solde d'affiliation est de {fmt(0)}. Invitez des filleuls pour commencer à gagner !
          </div>
        )}

        {showWithdrawForm && (
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Montant ({currency}) <span className="text-red-500">*</span>
                  <span className="ml-1 text-gray-400 font-normal">
                    Disponible : {fmt(stats?.affiliateBalance ?? 0)}
                  </span>
                </label>
                <input
                  type="number"
                  step={currency === "FCFA" ? "1" : "0.01"}
                  min={currency === "FCFA" ? "620" : "1"}
                  max={maxInput}
                  placeholder={currency === "FCFA" ? "Ex: 3100" : "Ex: 5.00"}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15 focus:bg-white"
                />
                {currency === "FCFA" && withdrawAmount && parseFloat(withdrawAmount) > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    ≈ ${(parseFloat(withdrawAmount) / RATE).toFixed(2)} USD
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pays <span className="text-red-500">*</span></label>
                <select
                  value={withdrawCountry}
                  onChange={(e) => setWithdrawCountry(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15 focus:bg-white"
                >
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Numéro Mobile Money / Téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="Ex: +221 77 123 45 67"
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Les retraits sont traités dans un délai de 48h ouvrables.
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowWithdrawForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-primary text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
              >
                {submitting ? "Envoi..." : "Confirmer le retrait"}
              </button>
            </div>
          </form>
        )}

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Historique des retraits</h4>
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{fmt(w.amountUsd)}</p>
                    <p className="text-xs text-gray-400">{w.phone} · {w.country}</p>
                    {w.note && <p className="text-xs text-gray-500 mt-0.5">{w.note}</p>}
                  </div>
                  <div className="text-right">
                    {statusBadge(w.status)}
                    <p className="text-xs text-gray-400 mt-1">{new Date(w.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Referrals list */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            Mes filleuls ({referrals.length})
          </h3>
        </div>

        {referrals.length === 0 ? (
          <NoData
            title="Aucun filleul pour l'instant"
            description="Partagez votre lien pour commencer à gagner !"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400 truncate">{r.email}</p>
                </div>
                <p className="text-xs text-gray-400 shrink-0">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
