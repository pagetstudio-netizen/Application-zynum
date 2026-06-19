import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CreditCard, CheckCircle2, AlertCircle, Loader2, ExternalLink, QrCode } from "lucide-react";
import { useGetCurrentUser, useGetBalance, getGetBalanceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";

const FCFA_PER_USD = 620;
const AMOUNT_PRESETS_FCFA = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];

type Step = "amount" | "card" | "processing";
type PayState = "loading" | "qr" | "push" | "success" | "error";

export default function CardPaymentPage() {
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const { currency }  = useCurrency();
  const queryClient   = useQueryClient();

  const { data: userData }    = useGetCurrentUser({ query: { retry: false } });
  const { data: balanceData, refetch: refetchBalance } = useGetBalance({ query: { retry: false } });
  const user    = userData as { id: number; name: string } | undefined;
  const balance = balanceData?.balance ?? 0;

  const [step, setStep]         = useState<Step>("amount");
  const [amountRaw, setAmountRaw] = useState("");
  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry]       = useState("");
  const [cvv, setCvv]             = useState("");
  const [payState, setPayState]   = useState<PayState>("loading");
  const [payError, setPayError]   = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [qrCode, setQrCode]       = useState("");
  const [txRef, setTxRef]         = useState("");

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);
  const apiBase   = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const isFcfa = currency === "FCFA";
  const amountFcfa: number = (() => {
    const v = parseFloat(amountRaw || "0");
    if (!v || isNaN(v)) return 0;
    return isFcfa ? Math.round(v) : Math.round(v * FCFA_PER_USD);
  })();

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    pollCount.current = 0;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollStatus = useCallback(async (reference: string) => {
    pollCount.current += 1;
    if (pollCount.current > 120) { stopPolling(); return; }
    try {
      const res  = await fetch(`${apiBase}/api/v1/payments/paxity/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ reference, userId: String(user?.id ?? 0) }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (json.credited) {
        stopPolling(); setPayState("success");
        queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
        refetchBalance();
        setTimeout(() => navigate("/recharge"), 2500);
      }
    } catch { /* retry */ }
  }, [apiBase, user, stopPolling, queryClient, refetchBalance, navigate]);

  function startPolling(ref: string) {
    stopPolling(); pollCount.current = 0;
    pollRef.current = setInterval(() => pollStatus(ref), 3000);
  }

  function formatCard(v: string) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }
  function formatExpiry(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0,2)}/${digits.slice(2)}` : digits;
  }

  async function submitCard() {
    if (!user) { toast({ variant: "destructive", title: "Non connecté" }); return; }
    const [mm, yyyy] = expiry.split("/").map(s => s.trim());
    if (!holderName || !cardNumber || !mm || !yyyy || !cvv) {
      toast({ variant: "destructive", title: "Remplissez tous les champs" }); return;
    }
    setStep("processing");
    setPayState("loading");
    setPayError("");

    try {
      const res = await fetch(`${apiBase}/api/v1/payments/paxity/initiate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          method: "card", amount: amountFcfa, currency: "XOF", userId: String(user.id),
          cardHolderName: holderName, cardNumber: cardNumber.replace(/\s/g, ""),
          expiryMonth: mm, expiryYear: yyyy.length === 2 ? `20${yyyy}` : yyyy, cvv,
        }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setPayState("error"); setPayError(String(json.message ?? "Paiement refusé.")); return; }
      const tx   = (json.data ?? json) as Record<string, unknown>;
      const ref  = String(tx.transactionId ?? tx.reference ?? "");
      setTxRef(ref);
      const link = String(tx.link ?? tx.payment_url ?? "");
      const qr   = String(tx.qrCode ?? "");
      if (link) { setPaymentUrl(link); setPayState("qr"); }
      else if (qr) { setQrCode(qr); setPayState("qr"); }
      else { setPayState("push"); }
      if (ref) startPolling(ref);
    } catch {
      setPayState("error"); setPayError("Erreur de connexion. Veuillez réessayer.");
    }
  }

  // ── AMOUNT STEP ─────────────────────────────────────────────────────────────
  function AmountStep() {
    return (
      <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100 shrink-0 bg-[#1A3FFF]">
          <button onClick={() => navigate("/recharge")} className="p-2 rounded-xl active:bg-blue-700 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-extrabold text-white text-base flex-1 text-center pr-8">Recharge Carte Bancaire</h1>
        </div>

        <div className="px-5 pt-4 pb-3 shrink-0">
          <h2 className="text-2xl font-black text-gray-900 mb-1">Montant</h2>
          <p className="text-gray-400 text-sm">
            {isFcfa ? "Choisissez le montant en FCFA à recharger." : "Choose the amount in USD to top up."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {/* Amount input */}
          <div className="flex items-center gap-2 h-20 bg-gray-50 rounded-2xl border-2 border-gray-200 px-4 mb-4 focus-within:border-blue-500 transition w-full">
            <span className="text-xl font-black text-gray-400 shrink-0">{isFcfa ? "FCFA" : "$"}</span>
            <input
              type="number" inputMode="decimal" placeholder="0"
              value={amountRaw} onChange={e => setAmountRaw(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-3xl font-black text-gray-900 focus:outline-none placeholder:text-gray-200"
              autoFocus
            />
          </div>

          {amountFcfa > 0 && (
            <p className="text-sm text-gray-400 text-center mb-5">
              ≈ {isFcfa ? `$${(amountFcfa / FCFA_PER_USD).toFixed(2)}` : `${amountFcfa.toLocaleString("fr-FR")} FCFA`}
            </p>
          )}

          {/* Presets */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {AMOUNT_PRESETS_FCFA.map(a => {
              const display = isFcfa ? a : a / FCFA_PER_USD;
              const label   = isFcfa ? `${a >= 1000 ? `${a/1000}k` : a}` : `$${display.toFixed(0)}`;
              const isActive = amountFcfa === a;
              return (
                <button key={a}
                  onClick={() => setAmountRaw(isFcfa ? String(a) : String((a / FCFA_PER_USD).toFixed(2)))}
                  className={`py-3 rounded-2xl text-sm font-bold transition-all ${
                    isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Balance */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Solde actuel</span>
              <span className="font-semibold text-gray-900">
                {isFcfa ? `${Math.round(balance * FCFA_PER_USD).toLocaleString("fr-FR")} FCFA` : `$${balance.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-8 pt-4 border-t border-gray-100 bg-white">
          <button
            onClick={() => {
              if (amountFcfa < 500) { toast({ variant: "destructive", title: "Minimum 500 FCFA" }); return; }
              setStep("card");
            }}
            disabled={amountFcfa < 500}
            className="w-full py-4 rounded-full font-black text-white text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#1A3FFF]"
          >
            {amountFcfa >= 500
              ? `Continuer · ${isFcfa ? `${amountFcfa.toLocaleString("fr-FR")} FCFA` : `$${(amountFcfa / FCFA_PER_USD).toFixed(2)}`}`
              : "Continuer"}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">Minimum : 500 FCFA</p>
        </div>
      </div>
    );
  }

  // ── CARD FORM STEP ──────────────────────────────────────────────────────────
  function CardStep() {
    return (
      <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100 shrink-0 bg-[#1A3FFF]">
          <button onClick={() => setStep("amount")} className="p-2 rounded-xl active:bg-blue-700 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-extrabold text-white text-base flex-1 text-center pr-8">Informations de carte</h1>
        </div>

        {/* Card preview */}
        <div className="px-5 pt-6 pb-4">
          <div className="w-full h-44 rounded-3xl p-5 text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1A3FFF 0%, #0033DD 100%)" }}>
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 translate-y-12 -translate-x-8" />
            <div className="flex justify-between items-start mb-4 relative">
              <CreditCard className="w-7 h-7 text-white" />
              <div className="text-right">
                <p className="text-[10px] text-white/70 uppercase tracking-wider">Montant</p>
                <p className="font-black text-base text-white">{amountFcfa.toLocaleString("fr-FR")} FCFA</p>
              </div>
            </div>
            <p className="font-mono text-base tracking-[0.2em] text-white mb-4 relative">
              {cardNumber || "•••• •••• •••• ••••"}
            </p>
            <div className="flex justify-between items-end relative">
              <div>
                <p className="text-[10px] text-white/70 uppercase tracking-wider mb-0.5">Titulaire</p>
                <p className="font-bold text-sm text-white uppercase">{holderName || "VOTRE NOM"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/70 uppercase tracking-wider mb-0.5">Expire</p>
                <p className="font-bold text-sm text-white">{expiry || "MM/AA"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Nom du titulaire</label>
            <input
              type="text" placeholder="JEAN DUPONT"
              value={holderName} onChange={e => setHolderName(e.target.value.toUpperCase())}
              className="w-full h-14 px-4 rounded-2xl border-2 border-gray-200 text-gray-900 text-sm font-semibold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Numéro de carte</label>
            <input
              type="text" inputMode="numeric" placeholder="1234 5678 9012 3456" maxLength={19}
              value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))}
              className="w-full h-14 px-4 rounded-2xl border-2 border-gray-200 text-gray-900 text-base font-mono placeholder:font-sans placeholder:text-gray-300 placeholder:text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Expiration</label>
              <input
                type="text" inputMode="numeric" placeholder="MM/AA" maxLength={5}
                value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                className="w-full h-14 px-4 rounded-2xl border-2 border-gray-200 text-gray-900 text-base font-semibold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">CVV</label>
              <input
                type="password" inputMode="numeric" placeholder="•••" maxLength={4}
                value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full h-14 px-4 rounded-2xl border-2 border-gray-200 text-gray-900 text-base font-semibold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center">🔒 Paiement sécurisé — vos données sont chiffrées</p>
        </div>

        <div className="px-5 pb-8 pt-4 border-t border-gray-100 bg-white">
          <button
            onClick={submitCard}
            className="w-full py-4 rounded-full font-black text-white text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-all bg-[#1A3FFF]"
          >
            Payer {amountFcfa.toLocaleString("fr-FR")} FCFA
          </button>
        </div>
      </div>
    );
  }

  // ── PROCESSING STEP ─────────────────────────────────────────────────────────
  function ProcessingStep() {
    return (
      <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100 shrink-0 bg-[#1A3FFF]">
          {payState === "error" && (
            <button onClick={() => setStep("card")} className="p-2 rounded-xl active:bg-blue-700 transition-colors">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <h1 className="font-extrabold text-white text-base flex-1 text-center pr-8">Paiement</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-16 text-center gap-6">
          {payState === "loading" && (
            <>
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-xl mb-2">Traitement en cours…</p>
                <p className="text-gray-400 text-sm">Connexion au terminal de paiement</p>
              </div>
            </>
          )}

          {(payState === "qr") && (
            <>
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
                <QrCode className="w-12 h-12 text-blue-500" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-xl mb-2">Finalisez le paiement</p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Cliquez sur le bouton ci-dessous pour finaliser votre paiement de <span className="font-bold text-gray-800">{amountFcfa.toLocaleString("fr-FR")} FCFA</span>.
                </p>
              </div>
              {paymentUrl && (
                <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#1A3FFF] text-white font-bold shadow-lg shadow-blue-200">
                  <ExternalLink className="w-4 h-4" /> Payer maintenant
                </a>
              )}
              {qrCode && <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-2xl border border-gray-200" />}
              <div className="flex items-center gap-2">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2.5 h-2.5 rounded-full bg-blue-400"
                    style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              {txRef && <p className="text-xs text-gray-300">Réf : {txRef}</p>}
            </>
          )}

          {payState === "push" && (
            <>
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
                <CreditCard className="w-12 h-12 text-blue-500" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-xl mb-2">En attente de confirmation</p>
                <p className="text-gray-500 text-sm">Votre paiement est en cours de validation…</p>
              </div>
              <div className="flex items-center gap-2">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2.5 h-2.5 rounded-full bg-blue-400"
                    style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </>
          )}

          {payState === "success" && (
            <>
              <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-14 h-14 text-green-500" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-2xl mb-2">Paiement réussi !</p>
                <p className="text-gray-500 text-sm">
                  {amountFcfa.toLocaleString("fr-FR")} FCFA ont été ajoutés à votre solde.
                </p>
              </div>
            </>
          )}

          {payState === "error" && (
            <>
              <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-14 h-14 text-red-500" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-xl mb-2">Paiement échoué</p>
                <p className="text-gray-500 text-sm">{payError}</p>
              </div>
              <button onClick={() => setStep("card")}
                className="w-full py-4 rounded-full font-black text-white text-lg bg-[#1A3FFF] shadow-lg shadow-blue-500/30">
                Réessayer
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: "100dvh", overflow: "hidden" }}>
      <AnimatePresence mode="wait">
        {step === "amount" && (
          <motion.div key="amount" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {AmountStep()}
          </motion.div>
        )}
        {step === "card" && (
          <motion.div key="card" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.22 }}>
            {CardStep()}
          </motion.div>
        )}
        {step === "processing" && (
          <motion.div key="processing" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.22 }}>
            {ProcessingStep()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
