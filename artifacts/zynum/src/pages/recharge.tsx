import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft, Eye, EyeOff, Plus, ArrowDownLeft, History,
} from "lucide-react";
import { useGetBalance, useGetCurrentUser, getGetBalanceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { OmnipayModal } from "@/components/omnipay-modal";
import { PaxityModal } from "@/components/paxity-modal";
import imgTMoneyOp from "@assets/images_(1)_1774832430242.png";
import imgMoovOp   from "@assets/moov_(1)_1763835082986-GKkwwfPK_1774832019539.png";
import imgAirtelOp from "@assets/Airtel_logo-01_1774832430216.png";
import iconCard    from "@assets/9242877_1774828244157.png";

const FCFA_PER_USD = 620;
const RECHARGE_PRESETS = [1000, 2000, 5000, 10000, 20000, 50000];

type Tx = {
  id: number;
  type: string;
  amountUsd: number | null;
  amountFcfa: number | null;
  status: string;
  createdAt: string | null;
};

export default function Recharge() {
  const [, navigate] = useLocation();
  const { toast }    = useToast();
  const queryClient  = useQueryClient();
  const { currency } = useCurrency();

  const { data: userData }    = useGetCurrentUser({ query: { retry: false } });
  const { data: balanceData, refetch: refetchBalance } =
    useGetBalance({ query: { retry: false } });

  const [showBal,       setShowBal]       = useState(true);
  const [amount,        setAmount]        = useState(5000);
  const [customInput,   setCustomInput]   = useState("");
  const [pendingMethod, setPendingMethod] = useState<"mobile" | "card" | null>(null);
  const [omnipayOpen,   setOmnipayOpen]   = useState(false);
  const [paxityOpen,    setPaxityOpen]    = useState(false);
  const [transactions,  setTransactions]  = useState<Tx[]>([]);
  const [txLoading,     setTxLoading]     = useState(true);

  const user    = userData as { id: number; name: string; email: string } | undefined;
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

  const effectiveAmount = customInput ? Math.round(parseFloat(customInput)) : amount;

  const handleMethodClick = (method: "mobile" | "card") => {
    if (method === "mobile") navigate("/recharge/mobile");
    else navigate("/recharge/card");
  };

  const handleSuccess = () => {
    toast({ title: "Paiement initié !", description: "Votre solde sera mis à jour dans quelques instants." });
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

  const visibleTx = transactions.filter(tx =>
    tx.status === "completed" &&
    (tx.type === "recharge" || tx.type === "affiliate_withdrawal" || tx.type === "withdrawal" || tx.type === "bonus")
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 relative" style={{ minHeight: "100dvh" }}>

      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 shrink-0 border-b border-gray-100">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-2 rounded-xl active:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="font-extrabold text-gray-900 text-lg flex-1">Recharge de compte</h1>
      </div>

      {/* Fixed top section */}
      <div className="shrink-0 px-4 pt-4 pb-0 space-y-4 bg-gray-50">

        {/* Green balance card */}
        <div className="rounded-[32px] p-4" style={{ backgroundColor: "#00C87A" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
                <img src="/logo.jpg" alt="ZyNum" className="w-full h-full object-cover" />
              </div>
              <span className="font-extrabold text-[#1a2b8c] text-lg tracking-tight">ZyNum</span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-white mb-0.5">Solde du compte</p>
              <div className="flex items-center gap-1.5 justify-end">
                <p className="text-xl font-black text-white tracking-tight">{displayBal}</p>
                <button
                  onClick={() => setShowBal(s => !s)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  {showBal ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Method buttons */}
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
          {/* Mobile Money */}
          <button
            onClick={() => handleMethodClick("mobile")}
            className="w-full flex items-center justify-between px-5 py-5 active:bg-gray-50 transition-colors"
          >
            <span className="font-bold text-[#1a2b8c] text-[15px]">recharger via mobile Money</span>
            <div className="flex items-center -space-x-2 shrink-0">
              <img src={imgTMoneyOp}  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" alt="TMoney" />
              <img src={imgMoovOp}    className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" alt="Moov" />
              <img src={imgAirtelOp}  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" alt="Airtel" />
            </div>
          </button>

          {/* Green divider */}
          <div className="mx-5 h-[2px]" style={{ backgroundColor: "#00C87A" }} />

          {/* Card payment */}
          <button
            onClick={() => handleMethodClick("card")}
            className="w-full flex items-center justify-between px-5 py-5 active:bg-gray-50 transition-colors"
          >
            <span className="font-bold text-[#1a2b8c] text-[15px]">recharger via Carte bancaire</span>
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <img src={iconCard} alt="Carte bancaire" className="w-10 h-10 object-contain" />
            </div>
          </button>
        </div>

        {/* History title */}
        <p className="font-bold text-gray-900 text-base pb-2">Historique des transactions</p>
      </div>

      {/* Scrollable transactions */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {txLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Chargement…</div>
        ) : visibleTx.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <History className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Aucune transaction</p>
            <p className="text-xs text-gray-400 mt-1">Vos recharges et retraits apparaîtront ici</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {visibleTx.map(tx => {
              const isCredit = tx.type === "recharge" || tx.type === "bonus";
              const amountFcfa = tx.amountFcfa ?? Math.round((tx.amountUsd ?? 0) * FCFA_PER_USD);
              const date    = tx.createdAt ? new Date(tx.createdAt) : null;
              const dateStr = date ? format(date, "dd MMM · HH:mm", { locale: fr }) : "";
              const label   = tx.type === "recharge"
                ? "Rechargement"
                : tx.type === "bonus"
                ? "Bonus de parrainage"
                : "Retrait bonus";

              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isCredit ? "bg-blue-500" : "bg-orange-500"
                  }`}>
                    {isCredit
                      ? <Plus className="w-4 h-4 text-white" />
                      : <ArrowDownLeft className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{label}</p>
                    <p className="text-xs text-gray-400">{dateStr}</p>
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${isCredit ? "text-green-600" : "text-red-500"}`}>
                    {isCredit ? "+" : "−"}{amountFcfa.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Amount picker bottom sheet */}
      <AnimatePresence>
        {pendingMethod && (
          <>
            <motion.div
              key="bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-40"
              onClick={() => setPendingMethod(null)}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 pb-8"
            >
              <div className="px-5 pt-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                <p className="font-bold text-gray-900 text-base">
                  {pendingMethod === "mobile" ? "💳 Montant — Mobile Money" : "💳 Montant — Carte bancaire"}
                </p>
                <p className="text-xs text-gray-400 mt-1">Minimum 300 FCFA</p>
              </div>

              <div className="px-5 pt-4 space-y-4">
                {/* Preset amounts */}
                <div className="grid grid-cols-3 gap-2">
                  {RECHARGE_PRESETS.map(a => (
                    <button
                      key={a}
                      onClick={() => { setAmount(a); setCustomInput(""); }}
                      className={`py-3 rounded-2xl text-sm font-bold border transition-all ${
                        amount === a && !customInput
                          ? "border-[#00C87A] bg-green-50 text-green-700 shadow-sm"
                          : "border-gray-200 bg-gray-50 text-gray-600"
                      }`}
                    >
                      {a.toLocaleString("fr-FR")} F
                    </button>
                  ))}
                </div>

                {/* Custom amount input */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200">
                  <span className="text-sm font-semibold text-gray-400 shrink-0">FCFA</span>
                  <input
                    type="number"
                    placeholder="Montant personnalisé"
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    className="flex-1 bg-transparent text-gray-900 font-bold text-base focus:outline-none placeholder:text-gray-300"
                  />
                </div>

                {/* Confirm button */}
                <button
                  onClick={handleConfirm}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base active:scale-95 transition-transform shadow-lg"
                  style={{ backgroundColor: "#00C87A" }}
                >
                  Continuer — {effectiveAmount.toLocaleString("fr-FR")} FCFA →
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      {user && (
        <OmnipayModal
          open={omnipayOpen}
          onClose={() => setOmnipayOpen(false)}
          amountXof={effectiveAmount}
          userId={user.id}
          onSuccess={handleSuccess}
          userFirstName={user.name?.split(" ")[0] ?? "ZyNum"}
          userLastName={user.name?.split(" ").slice(1).join(" ") || `User${user.id}`}
        />
      )}
      {user && (
        <PaxityModal
          open={paxityOpen}
          onClose={() => setPaxityOpen(false)}
          amountXof={effectiveAmount}
          userId={user.id}
          onSuccess={handleSuccess}
          initialTab="card"
        />
      )}
    </div>
  );
}
