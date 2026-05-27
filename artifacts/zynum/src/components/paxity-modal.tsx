import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CreditCard, ChevronRight, Loader2, CheckCircle2,
  AlertCircle, Phone, ExternalLink, QrCode,
  Smartphone, Search, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import imgMTN         from "@assets/mtn_(1)_1763835082904-BVdEqpuz-1_1774832430292.png";
import imgOrangeMoney from "@assets/images_1774832430265.png";
import imgWave        from "@assets/wave_(1)_1763835083242-BDJmxeWc_(1)_1774832430315.png";
import imgOPay        from "@assets/opay-new-2023-logo-png_seeklogo-503616_1774832430151.png";
import imgVodacom     from "@assets/vodacom_1774832430195.png";
import imgAirtel      from "@assets/Airtel_logo-01_1774832430216.png";
import imgTMoney      from "@assets/images_(1)_1774832430242.png";
import imgWizall      from "@assets/wizall_1763835083090-BfalgIrK_1774832430339.png";
import imgMoov        from "@assets/moov_(1)_1763835082986-GKkwwfPK_1774832019539.png";

export interface PaxityModalProps {
  open: boolean;
  onClose: () => void;
  amountXof: number;
  userId: string | number;
  onSuccess: () => void;
  initialTab?: Tab;
}

type Tab = "mobile" | "card";
type View = "form" | "country-picker";
type PayState = "idle" | "loading" | "qr" | "push" | "success" | "error";

interface OperatorDef {
  id: string;
  label: string;
  logo: string;
  type: "CODE_QR" | "PUSH" | "CODE_OTP";
}

interface CountryDef {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  operators: OperatorDef[];
}

interface PaxityTxData {
  transactionId?: string;
  link?: string;
  qrCode?: string;
  status?: string;
  amount?: number;
  realAmount?: number;
  currency?: string;
}

const MTN_LOGO    = imgMTN;
const OM_LOGO     = imgOrangeMoney;
const WAVE_LOGO   = imgWave;
const MOOV_LOGO   = imgMoov;
const MPESA_LOGO  = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/120px-M-PESA_LOGO-01.svg.png";
const OPAY_LOGO   = imgOPay;
const AIRTEL_LOGO = imgAirtel;
const TMONEY_LOGO = imgTMoney;
const VODACOM_LOGO = imgVodacom;
const WIZALL_LOGO  = imgWizall;

const COUNTRIES: CountryDef[] = [
  {
    code: "SN", name: "Sénégal", flag: "🇸🇳", currency: "XOF", currencySymbol: "FCFA",
    operators: [
      { id: "WAVESN",   label: "Wave",         logo: WAVE_LOGO,   type: "CODE_QR" },
      { id: "OMSN",     label: "Orange Money", logo: OM_LOGO,     type: "CODE_QR" },
      { id: "WIZALLSN", label: "Wizall Money", logo: WIZALL_LOGO, type: "PUSH"    },
    ],
  },
  {
    code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", currency: "XOF", currencySymbol: "FCFA",
    operators: [
      { id: "MTNCI",  label: "MTN Mobile Money", logo: MTN_LOGO,  type: "PUSH"    },
      { id: "WAVECI", label: "Wave",              logo: WAVE_LOGO, type: "CODE_QR" },
      { id: "OMCI",   label: "Orange Money",      logo: OM_LOGO,   type: "CODE_QR" },
    ],
  },
  {
    code: "CM", name: "Cameroun", flag: "🇨🇲", currency: "XAF", currencySymbol: "FCFA",
    operators: [
      { id: "MTNCM", label: "MTN Mobile Money", logo: MTN_LOGO, type: "PUSH" },
      { id: "OMCM",  label: "Orange Money",     logo: OM_LOGO,  type: "PUSH" },
    ],
  },
  {
    code: "BJ", name: "Bénin", flag: "🇧🇯", currency: "XOF", currencySymbol: "FCFA",
    operators: [
      { id: "MOOVBJ", label: "Moov Money",      logo: MOOV_LOGO, type: "PUSH" },
      { id: "MTNBJ",  label: "MTN Mobile Money", logo: MTN_LOGO,  type: "PUSH" },
    ],
  },
  {
    code: "BF", name: "Burkina Faso", flag: "🇧🇫", currency: "XOF", currencySymbol: "FCFA",
    operators: [
      { id: "MOOVBF", label: "Moov Money",   logo: MOOV_LOGO, type: "PUSH"     },
      { id: "OMBF",   label: "Orange Money", logo: OM_LOGO,   type: "CODE_OTP" },
    ],
  },
  {
    code: "GH", name: "Ghana", flag: "🇬🇭", currency: "GHS", currencySymbol: "GHS",
    operators: [
      { id: "ATGH",  label: "AirtelTigo", logo: AIRTEL_LOGO,  type: "PUSH" },
      { id: "MTNGH", label: "MTN",        logo: MTN_LOGO,     type: "PUSH" },
      { id: "TLGH",  label: "Telecel",    logo: VODACOM_LOGO, type: "PUSH" },
    ],
  },
  {
    code: "GN", name: "Guinée", flag: "🇬🇳", currency: "GNF", currencySymbol: "GNF",
    operators: [
      { id: "MTNGN", label: "MTN Mobile Money", logo: MTN_LOGO, type: "PUSH"    },
      { id: "OMGN",  label: "Orange Money",     logo: OM_LOGO,  type: "CODE_QR" },
    ],
  },
  {
    code: "KE", name: "Kenya", flag: "🇰🇪", currency: "KES", currencySymbol: "KES",
    operators: [
      { id: "MPESAKE", label: "M-Pesa", logo: MPESA_LOGO, type: "PUSH" },
    ],
  },
  {
    code: "ML", name: "Mali", flag: "🇲🇱", currency: "XOF", currencySymbol: "FCFA",
    operators: [
      { id: "MOOVML", label: "Moov Money",   logo: MOOV_LOGO, type: "PUSH" },
      { id: "OMML",   label: "Orange Money", logo: OM_LOGO,   type: "PUSH" },
    ],
  },
  {
    code: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN", currencySymbol: "₦",
    operators: [
      { id: "MTNNG", label: "MTN MoMo", logo: MTN_LOGO,  type: "PUSH"    },
      { id: "OPNG",  label: "OPay",     logo: OPAY_LOGO, type: "CODE_QR" },
    ],
  },
  {
    code: "TG", name: "Togo", flag: "🇹🇬", currency: "XOF", currencySymbol: "FCFA",
    operators: [
      { id: "TMONEYTG", label: "T-Money",    logo: TMONEY_LOGO, type: "PUSH" },
      { id: "MOOVTG",   label: "Moov Money", logo: MOOV_LOGO,   type: "PUSH" },
    ],
  },
].sort((a, b) => a.name.localeCompare(b.name, "fr"));

/* ── Country Picker View ────────────────────────────────────────── */
function CountryPicker({
  current,
  onSelect,
  onBack,
}: {
  current: CountryDef;
  onSelect: (c: CountryDef) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <motion.div
      key="country-picker"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.22 }}
      className="absolute inset-0 flex flex-col bg-white z-10"
      style={{ borderRadius: "inherit" }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 shrink-0 border-b border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Retour</span>
        </button>
        <h2 className="text-xl font-extrabold text-gray-900 leading-tight">Quel pays ?</h2>
        <p className="text-sm text-gray-500 mt-1">
          Sélectionnez le pays pour votre paiement Mobile Money.
        </p>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un pays…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-sm placeholder:text-gray-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15 transition"
          />
        </div>
      </div>

      {/* Country list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 overscroll-contain">
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">Aucun pays trouvé</p>
        )}
        {filtered.map((c) => {
          const isActive = c.code === current.code;
          return (
            <button
              key={c.code}
              onClick={() => onSelect(c)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition-all text-left ${
                isActive
                  ? "border-red-200 bg-gradient-to-r from-red-50 to-primary/5"
                  : "border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200"
              }`}
            >
              <span className="text-2xl leading-none shrink-0">{c.flag}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-[15px] leading-tight ${isActive ? "text-red-600" : "text-gray-900"}`}>
                  {c.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.operators.length} opérateur{c.operators.length > 1 ? "s" : ""} disponible{c.operators.length > 1 ? "s" : ""}
                  {" · "}{c.currencySymbol}
                </p>
              </div>
              <div className="flex items-center -space-x-1.5 shrink-0">
                {c.operators.slice(0, 3).map((op) => (
                  <div
                    key={op.id}
                    className="w-6 h-6 rounded-full bg-gray-100 border border-white overflow-hidden flex items-center justify-center shadow-sm"
                  >
                    <img
                      src={op.logo}
                      alt={op.label}
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                ))}
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? "text-red-400" : "text-gray-300"}`} />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ── Main modal ─────────────────────────────────────────────────── */
export function PaxityModal({ open, onClose, amountXof, userId, onSuccess, initialTab = "mobile" }: PaxityModalProps) {
  const [tab, setTab]           = useState<Tab>(initialTab);
  const [view, setView]         = useState<View>("form");
  const [state, setState]       = useState<PayState>("idle");

  useEffect(() => { if (open) { setTab(initialTab); setView("form"); reset(); } }, [open, initialTab]);
  const [errorMsg, setErrorMsg] = useState("");
  const [txData, setTxData]     = useState<PaxityTxData | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountryDef>(COUNTRIES.find(c => c.code === "SN")!);
  const [operator, setOperator]               = useState<OperatorDef>(COUNTRIES.find(c => c.code === "SN")!.operators[0]);
  const [phone, setPhone]                     = useState("");

  const [holderName, setHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry]         = useState("");
  const [cvv, setCvv]               = useState("");

  const apiBase       = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef  = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    pollCountRef.current = 0;
  }, []);

  function selectCountry(c: CountryDef) {
    setSelectedCountry(c);
    setOperator(c.operators[0]);
    setPhone("");
    reset();
    setView("form");
  }

  function reset() {
    stopPolling();
    setState("idle");
    setErrorMsg("");
    setTxData(null);
  }

  function handleClose() {
    reset();
    setView("form");
    onClose();
  }

  // Automatic polling — called every 3 s after payment is initiated
  const pollStatus = useCallback(async (reference: string) => {
    pollCountRef.current += 1;
    if (pollCountRef.current > 120) { stopPolling(); return; } // max 6 min
    try {
      const res  = await fetch(`${apiBase}/api/v1/payments/paxity/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reference, userId: String(userId) }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (json.credited) {
        stopPolling();
        setState("success");
        onSuccess();
        setTimeout(() => { reset(); setView("form"); onClose(); }, 2500);
      }
    } catch { /* réseau — on continue */ }
  }, [apiBase, userId, stopPolling, onSuccess, onClose]);

  function startPolling(reference: string) {
    stopPolling();
    pollCountRef.current = 0;
    pollRef.current = setInterval(() => pollStatus(reference), 3000);
  }

  // Nettoyage si le modal se ferme
  useEffect(() => { return () => stopPolling(); }, [stopPolling]);

  async function submit() {
    setState("loading");
    setErrorMsg("");

    try {
      let body: Record<string, unknown>;

      if (tab === "mobile") {
        if (!phone) {
          setState("error");
          setErrorMsg("Veuillez entrer votre numéro de téléphone.");
          return;
        }
        body = {
          method:   "mobile",
          amount:   Math.round(amountXof),
          currency: selectedCountry.currency,
          userId:   String(userId),
          phone:    phone.replace(/\D/g, ""),
          operator: operator.id,
        };
      } else {
        const [mm, yyyy] = expiry.split("/").map((s) => s.trim());
        if (!holderName || !cardNumber || !mm || !yyyy || !cvv) {
          setState("error");
          setErrorMsg("Veuillez remplir tous les champs de la carte.");
          return;
        }
        body = {
          method:     "card",
          amount:     Math.round(amountXof),
          currency:   "XOF",
          userId:     String(userId),
          holderName,
          cardNumber: cardNumber.replace(/\s/g, ""),
          expMonth:   mm,
          expYear:    yyyy,
          cvv,
        };
      }

      const res  = await fetch(`${apiBase}/api/v1/payments/paxity/initiate`, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify(body),
      });
      const json = (await res.json()) as Record<string, unknown>;

      if (!res.ok) {
        setState("error");
        setErrorMsg(String((json?.message as string) ?? (json?.error as string) ?? "Paiement refusé."));
        return;
      }

      const tx = (json?.data ?? json) as PaxityTxData;
      setTxData(tx);

      if (tab === "card") {
        setState("success");
        onSuccess();
        setTimeout(handleClose, 2500);
      } else if (tx.qrCode || tx.link) {
        setState("qr");
        if (tx.transactionId) startPolling(tx.transactionId);
      } else {
        setState("push");
        if (tx.transactionId) startPolling(tx.transactionId);
      }
    } catch {
      setState("error");
      setErrorMsg("Erreur de connexion. Veuillez réessayer.");
    }
  }

  function formatCard(v: string) {
    return v.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);
  }
  function formatExpiry(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  const phonePrefix: Record<string, string> = {
    SN:"221", CI:"225", CM:"237", BJ:"229", BF:"226",
    GH:"233", GN:"224", KE:"254", ML:"223", NG:"234",
    TG: operator.id === "TMONEYTG" ? "228" : "226",
  };

  const inputCls = "w-full h-11 px-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15 transition";

  const isForm = state === "idle" || state === "loading" || state === "error";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit={{   scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="relative w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Country picker overlay (slides in from right) ── */}
            <AnimatePresence>
              {view === "country-picker" && (
                <CountryPicker
                  current={selectedCountry}
                  onSelect={selectCountry}
                  onBack={() => setView("form")}
                />
              )}
            </AnimatePresence>

            {/* ── Main form area ── */}
            <div className="flex flex-col" style={{ maxHeight: "90vh" }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-gray-900 font-bold text-lg leading-tight">Paiement sécurisé</h2>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Montant :{" "}
                    <span className="text-red-500 font-bold">
                      {Math.round(amountXof).toLocaleString("fr-FR")} FCFA
                    </span>
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">

                {/* ── QR Code screen ── */}
                {state === "qr" && txData && (
                  <div className="p-6 space-y-5">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <QrCode className="w-4 h-4 text-primary" />
                        Scannez ou cliquez pour payer
                      </div>
                      {txData.qrCode && (
                        <div className="bg-white p-3 rounded-2xl shadow-lg border border-gray-100">
                          <img src={`data:image/png;base64,${txData.qrCode}`} alt="QR Code" className="w-48 h-48 object-contain" />
                        </div>
                      )}
                      {txData.link && (
                        <a href={txData.link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                          Ouvrir dans {operator.label}
                        </a>
                      )}
                    </div>
                    {/* 3-dot auto-detection indicator */}
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="w-2 h-2 rounded-full bg-primary/60"
                            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">Détection automatique du paiement…</p>
                    </div>
                    <Button variant="outline" onClick={handleClose} className="w-full rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50">
                      Annuler
                    </Button>
                    {txData.transactionId && (
                      <p className="text-center text-xs text-gray-300">Réf : {txData.transactionId}</p>
                    )}
                  </div>
                )}

                {/* ── PUSH screen ── */}
                {state === "push" && (
                  <div className="flex flex-col items-center justify-center py-10 px-6 gap-6">
                    {/* Operator logo in circle */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/10 to-primary/10 border-2 border-red-100 flex items-center justify-center shadow-lg">
                        <img src={operator.logo} alt={operator.label} className="w-12 h-12 object-contain rounded-full"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                      {/* Pulse ring */}
                      <span className="absolute inset-0 rounded-full border-2 border-red-300/40 animate-ping" />
                    </div>

                    <div className="text-center space-y-1.5">
                      <p className="text-gray-900 font-bold text-lg">Confirmez sur votre téléphone</p>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        Une notification push a été envoyée sur{" "}
                        <span className="text-gray-900 font-semibold">{phone}</span>.<br />
                        Acceptez dans votre app <span className="font-semibold text-gray-700">{operator.label}</span>.
                      </p>
                    </div>

                    {/* Animated 3 dots */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-red-400 to-primary"
                            style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 font-medium">En attente de confirmation…</p>
                    </div>

                    {/* Steps */}
                    <div className="w-full bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-3">
                      {[
                        { n: 1, text: "Ouvrez votre application " + operator.label, done: true },
                        { n: 2, text: "Acceptez la demande de paiement", done: false },
                        { n: 3, text: "Votre solde est crédité automatiquement", done: false },
                      ].map((s) => (
                        <div key={s.n} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${s.done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                            {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.n}
                          </div>
                          <p className={`text-xs ${s.done ? "text-gray-700 font-medium" : "text-gray-500"}`}>{s.text}</p>
                        </div>
                      ))}
                    </div>

                    <Button variant="outline" onClick={handleClose} className="w-full rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50">
                      Annuler
                    </Button>
                    {txData?.transactionId && (
                      <p className="text-center text-xs text-gray-300">Réf : {txData.transactionId}</p>
                    )}
                  </div>
                )}

                {/* ── Success screen ── */}
                {state === "success" && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center py-14 px-6 gap-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30"
                    >
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </motion.div>
                    <div className="text-center space-y-1">
                      <p className="text-gray-900 font-bold text-xl">Paiement confirmé !</p>
                      <p className="text-gray-500 text-sm">Votre solde a été crédité avec succès.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Solde mis à jour
                    </div>
                  </motion.div>
                )}

                {/* ── Payment form ── */}
                {isForm && (
                  <div className="p-5 space-y-4">

                    {/* Tabs */}
                    <div className="flex gap-2 p-1 rounded-2xl bg-gray-100 border border-gray-200">
                      {([
                        { id: "mobile", icon: <Smartphone className="w-4 h-4" />, label: "Mobile Money" },
                        { id: "card",   icon: <CreditCard  className="w-4 h-4" />, label: "Carte bancaire" },
                      ] as { id: Tab; icon: React.ReactNode; label: string }[]).map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { setTab(t.id); reset(); }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            tab === t.id
                              ? "bg-gradient-to-r from-red-500 to-primary text-white shadow-md shadow-red-500/20"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {t.icon}{t.label}
                        </button>
                      ))}
                    </div>

                    {/* ── Mobile Money form ── */}
                    {tab === "mobile" && (
                      <div className="space-y-4">

                        {/* Country button */}
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-2">Pays</label>
                          <button
                            onClick={() => setView("country-picker")}
                            className="w-full flex items-center gap-3 h-12 px-4 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
                          >
                            <span className="text-2xl leading-none">{selectedCountry.flag}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 font-semibold text-sm leading-tight">{selectedCountry.name}</p>
                              <p className="text-gray-400 text-xs">{selectedCountry.operators.length} opérateur{selectedCountry.operators.length > 1 ? "s" : ""} · {selectedCountry.currencySymbol}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                          </button>
                        </div>

                        {/* Operator selector */}
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-2">Opérateur</label>
                          <div className={`grid gap-2 ${selectedCountry.operators.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                            {selectedCountry.operators.map((op) => (
                              <button
                                key={op.id}
                                onClick={() => setOperator(op)}
                                className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                                  operator.id === op.id
                                    ? "border-red-200 bg-gradient-to-br from-red-50 to-primary/5 text-gray-900 shadow-sm"
                                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300"
                                }`}
                              >
                                <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                                  <img
                                    src={op.logo}
                                    alt={op.label}
                                    className="w-full h-full object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                </div>
                                <span className="text-center leading-tight">{op.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Phone input */}
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-2">Numéro de téléphone</label>
                          <div className="flex gap-2">
                            <div className="flex items-center gap-1.5 h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-sm shrink-0 select-none">
                              <span>{selectedCountry.flag}</span>
                              <span className="text-gray-400 text-xs">+{phonePrefix[selectedCountry.code]}</span>
                            </div>
                            <div className="relative flex-1">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="tel"
                                placeholder="77 123 45 67"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full h-11 pl-9 pr-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15 transition"
                              />
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1.5">Saisissez le numéro sans l'indicatif du pays</p>
                        </div>
                      </div>
                    )}

                    {/* ── Card form ── */}
                    {tab === "card" && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-2">Nom du titulaire</label>
                          <input type="text" placeholder="JEAN DUPONT" value={holderName}
                            onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-2">Numéro de carte</label>
                          <input type="text" placeholder="1234 5678 9012 3456" value={cardNumber} maxLength={19}
                            onChange={(e) => setCardNumber(formatCard(e.target.value))}
                            className={`${inputCls} font-mono`} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-2">Expiration</label>
                            <input type="text" placeholder="MM/AAAA" value={expiry} maxLength={7}
                              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                              className={`${inputCls} font-mono`} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 block mb-2">CVV</label>
                            <input type="text" placeholder="123" value={cvv} maxLength={3}
                              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                              className={`${inputCls} font-mono`} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {state === "error" && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-200">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{errorMsg}</p>
                      </div>
                    )}

                    {/* Submit */}
                    <Button
                      onClick={submit}
                      disabled={state === "loading"}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-red-500 to-primary hover:from-red-600 hover:to-primary/90 text-white font-bold shadow-lg shadow-red-500/25 disabled:opacity-60"
                    >
                      {state === "loading" ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Traitement en cours…</>
                      ) : (
                        <>Payer {Math.round(amountXof).toLocaleString("fr-FR")} FCFA<ChevronRight className="w-4 h-4 ml-2" /></>
                      )}
                    </Button>

                    <p className="text-center text-xs text-gray-400 pb-1">
                      Paiement sécurisé et rapide
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
