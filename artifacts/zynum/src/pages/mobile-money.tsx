import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, ChevronLeft, ChevronDown, CheckCircle2, AlertCircle, Loader2, ExternalLink, Copy, Check, X, Phone } from "lucide-react";
import { useGetCurrentUser, useGetBalance, getGetBalanceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

import imgMTN         from "@assets/mtn_(1)_1763835082904-BVdEqpuz-1_1774832430292.png";
import imgOrangeMoney from "@assets/images_1774832430265.png";
import imgWave        from "@assets/wave_(1)_1763835083242-BDJmxeWc_(1)_1774832430315.png";
import imgMoov        from "@assets/moov_(1)_1763835082986-GKkwwfPK_1774832019539.png";
import imgAirtel      from "@assets/Airtel_logo-01_1774832430216.png";
import imgTMoney      from "@assets/images_(1)_1774832430242.png";

const FCFA_PER_USD = 620;
const AMOUNT_PRESETS_FCFA = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
const HEADER_H = 60;

interface Operator {
  id: string; label: string; logo: string; aggregator: string;
  needsOtp: boolean; needsReturnUrl: boolean;
  paxityOperatorId?: string;
  atpOperatorId?: string;
  ussdCode?: string;
}
interface Country { code: string; name: string; flag: string; prefix: string; currency: string; operators: Operator[]; }

const ALL_COUNTRIES: Country[] = [
  { code:"BF", name:"Burkina Faso", flag:"🇧🇫", prefix:"226", currency:"XOF", operators:[
    { id:"ORANGE_BF", label:"Orange Money", logo:imgOrangeMoney, aggregator:"omnipay", needsOtp:true,  needsReturnUrl:false, ussdCode:"#144*82#" },
    { id:"MOOV_BF",   label:"Moov Money",   logo:imgMoov,        aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
  ]},
  { code:"BJ", name:"Bénin", flag:"🇧🇯", prefix:"229", currency:"XOF", operators:[
    { id:"MTN_BJ",  label:"MTN MoMo",   logo:imgMTN,  aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"MOOV_BJ", label:"Moov Money", logo:imgMoov, aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
  ]},
  { code:"CD", name:"Congo (RDC)", flag:"🇨🇩", prefix:"243", currency:"CDF", operators:[
    { id:"AIRTEL_CD", label:"Airtel Money", logo:imgAirtel, aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_AIRTEL_CD" },
    { id:"MPESA_CD",  label:"M-Pesa",       logo:imgMTN,   aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_MPESA_CD"  },
  ]},
  { code:"CG", name:"Congo (Brazzaville)", flag:"🇨🇬", prefix:"242", currency:"XAF", operators:[
    { id:"MTN_CG",    label:"MTN MoMo",     logo:imgMTN,    aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_MTN_CG"    },
    { id:"AIRTEL_CG", label:"Airtel Money", logo:imgAirtel, aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_AIRTEL_CG" },
  ]},
  { code:"CI", name:"Côte d'Ivoire", flag:"🇨🇮", prefix:"225", currency:"XOF", operators:[
    { id:"ORANGE_CI", label:"Orange Money", logo:imgOrangeMoney, aggregator:"omnipay", needsOtp:true,  needsReturnUrl:false, ussdCode:"#144*82#" },
    { id:"MTN_CI",    label:"MTN MoMo",     logo:imgMTN,         aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"MOOV_CI",   label:"Moov Money",   logo:imgMoov,        aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"WAVE_CI",   label:"Wave",          logo:imgWave,        aggregator:"omnipay", needsOtp:false, needsReturnUrl:true  },
  ]},
  { code:"CM", name:"Cameroun", flag:"🇨🇲", prefix:"237", currency:"XAF", operators:[
    { id:"MTN_CM",    label:"MTN MoMo",     logo:imgMTN,         aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"ORANGE_CM", label:"Orange Money", logo:imgOrangeMoney, aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
  ]},
  { code:"GA", name:"Gabon", flag:"🇬🇦", prefix:"241", currency:"XAF", operators:[
    { id:"AIRTEL_GA", label:"Airtel Money", logo:imgAirtel, aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_AIRTEL_GA" },
    { id:"MOOV_GA",   label:"Moov Money",   logo:imgMoov,   aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_MOOV_GA"   },
  ]},
  { code:"GH", name:"Ghana", flag:"🇬🇭", prefix:"233", currency:"GHS", operators:[
    { id:"MTN_GH",    label:"MTN MoMo",   logo:imgMTN,    aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MTNGH" },
    { id:"AIRTEL_GH", label:"AirtelTigo", logo:imgAirtel, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"ATGH"  },
  ]},
  { code:"GN", name:"Guinée", flag:"🇬🇳", prefix:"224", currency:"GNF", operators:[
    { id:"MTN_GN",    label:"MTN Mobile Money", logo:imgMTN,         aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"ORANGE_GN", label:"Orange Money",     logo:imgOrangeMoney, aggregator:"paxity",  needsOtp:false, needsReturnUrl:false, paxityOperatorId:"OMGN" },
  ]},
  { code:"KE", name:"Kenya", flag:"🇰🇪", prefix:"254", currency:"KES", operators:[
    { id:"MPESA_KE", label:"M-Pesa", logo:imgMTN, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MPESAKE" },
  ]},
  { code:"MG", name:"Madagascar", flag:"🇲🇬", prefix:"261", currency:"MGA", operators:[
    { id:"MVOLA_MG",  label:"MVola",        logo:imgOrangeMoney, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MVOLAMG"  },
    { id:"AIRTEL_MG", label:"Airtel Money", logo:imgAirtel,      aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"AIRTELMG" },
  ]},
  { code:"ML", name:"Mali", flag:"🇲🇱", prefix:"223", currency:"XOF", operators:[
    { id:"ORANGE_ML", label:"Orange Money", logo:imgOrangeMoney, aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"MOOV_ML",   label:"Moov Money",   logo:imgMoov,        aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
  ]},
  { code:"MR", name:"Mauritanie", flag:"🇲🇷", prefix:"222", currency:"MRU", operators:[
    { id:"MATTEL_MR", label:"Mattel Money", logo:imgOrangeMoney, aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_MATTEL_MR" },
  ]},
  { code:"NE", name:"Niger", flag:"🇳🇪", prefix:"227", currency:"XOF", operators:[
    { id:"AIRTEL_NE", label:"Airtel Money", logo:imgAirtel, aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_AIRTEL_NE" },
    { id:"MOOV_NE",   label:"Moov Money",   logo:imgMoov,   aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_MOOV_NE"   },
  ]},
  { code:"NG", name:"Nigeria", flag:"🇳🇬", prefix:"234", currency:"NGN", operators:[
    { id:"MTN_NG", label:"MTN MoMo", logo:imgMTN, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MTNNG" },
  ]},
  { code:"RW", name:"Rwanda", flag:"🇷🇼", prefix:"250", currency:"RWF", operators:[
    { id:"MTN_RW", label:"MTN MoMo", logo:imgMTN, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MTNRW" },
  ]},
  { code:"SN", name:"Sénégal", flag:"🇸🇳", prefix:"221", currency:"XOF", operators:[
    { id:"WAVE_SN",   label:"Wave",         logo:imgWave,        aggregator:"omnipay", needsOtp:false, needsReturnUrl:true  },
    { id:"ORANGE_SN", label:"Orange Money", logo:imgOrangeMoney, aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
  ]},
  { code:"TD", name:"Tchad", flag:"🇹🇩", prefix:"235", currency:"XAF", operators:[
    { id:"AIRTEL_TD", label:"Airtel Money", logo:imgAirtel, aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_AIRTEL_TD" },
    { id:"MOOV_TD",   label:"Moov Money",   logo:imgMoov,   aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_MOOV_TD"   },
  ]},
  { code:"TG", name:"Togo", flag:"🇹🇬", prefix:"228", currency:"XOF", operators:[
    { id:"TOGOCEL_TG", label:"T-Money",    logo:imgTMoney, aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_TMONEY_TG" },
    { id:"MOOV_TG",    label:"Moov Money", logo:imgMoov,   aggregator:"ashtechpay", needsOtp:false, needsReturnUrl:false, atpOperatorId:"ATP_FLOOZ_TG"  },
  ]},
  { code:"TZ", name:"Tanzanie", flag:"🇹🇿", prefix:"255", currency:"TZS", operators:[
    { id:"MPESA_TZ",  label:"M-Pesa",       logo:imgMTN,    aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MPESATZ"  },
    { id:"AIRTEL_TZ", label:"Airtel Money", logo:imgAirtel, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"AIRTELTZ" },
  ]},
  { code:"UG", name:"Ouganda", flag:"🇺🇬", prefix:"256", currency:"UGX", operators:[
    { id:"MTN_UG",    label:"MTN MoMo",     logo:imgMTN,    aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MTNUG"    },
    { id:"AIRTEL_UG", label:"Airtel Money", logo:imgAirtel, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"AIRTELUG" },
  ]},
  { code:"ZM", name:"Zambie", flag:"🇿🇲", prefix:"260", currency:"ZMW", operators:[
    { id:"MTN_ZM",    label:"MTN MoMo",     logo:imgMTN,    aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MTNZM"    },
    { id:"AIRTEL_ZM", label:"Airtel Money", logo:imgAirtel, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"AIRTELZM" },
  ]},
].sort((a, b) => a.name.localeCompare(b.name, "fr"));

type Step = "phone" | "country" | "amount" | "processing";
type PayState = "loading" | "push" | "wave" | "success" | "error";

// ── OTP Modal ────────────────────────────────────────────────────────────────
function OtpModal({
  operator, amountFcfa, onConfirm, onCancel,
}: {
  operator: Operator; amountFcfa: number; onConfirm: (otp: string) => void; onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [otp, setOtp] = useState("");
  const [copied, setCopied] = useState(false);
  const ussd = operator.ussdCode ?? "#144#";

  const { toast: snack } = useToast();
  function copyUssd() {
    navigator.clipboard.writeText(ussd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    snack({ title: t("mm_ussd_toast"), duration: 2000 });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white px-5 pt-6 pb-10"
        style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.18)" }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold text-gray-900">{t("mm_otp_title")}</h2>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Operator badge */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-gray-100 overflow-hidden">
            <img src={operator.logo} alt={operator.label} className="w-9 h-9 object-contain" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t("mm_operator")}</p>
            <p className="font-bold text-gray-900">{operator.label}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500">{t("mm_amount_label")}</p>
            <p className="font-bold text-blue-700">{amountFcfa.toLocaleString("fr-FR")} FCFA</p>
          </div>
        </div>

        {/* USSD instruction */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
            {t("mm_ussd_step1")}
          </p>
          <div className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-amber-200">
            <span className="font-mono text-xl font-black text-gray-900 tracking-widest">{ussd}</span>
            <button
              onClick={copyUssd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: copied ? "#ECFDF5" : "#EFF6FF", color: copied ? "#059669" : "#2563EB" }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t("mm_ussd_copied") : t("mm_ussd_copy")}
            </button>
          </div>
          <p className="text-xs text-amber-600 mt-2">{t("mm_ussd_hint")}</p>
        </div>

        {/* OTP input */}
        <div className="mb-5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
            {t("mm_otp_step2")}
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Ex : 123456"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="w-full h-14 px-4 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-900 text-xl font-black text-center tracking-[0.3em] placeholder:text-gray-300 placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:border-blue-500 transition"
            autoFocus
          />
        </div>

        {/* Buttons */}
        <button
          onClick={() => { if (otp.length >= 4) onConfirm(otp); }}
          disabled={otp.length < 4}
          className="w-full py-4 rounded-2xl font-black text-white text-base mb-3 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
        >
          {t("mm_otp_confirm")}
        </button>
        <button
          onClick={onCancel}
          className="w-full py-3 rounded-2xl font-semibold text-gray-500 text-sm border border-gray-200 hover:bg-gray-50 transition-all"
        >
          {t("mm_cancel")}
        </button>
      </div>
    </div>
  );
}

export default function MobileMoneyPage() {
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const { t }         = useLanguage();
  const { currency }  = useCurrency();
  const queryClient   = useQueryClient();

  const { data: userData }    = useGetCurrentUser({ query: { retry: false } as any });
  const { data: balanceData, refetch: refetchBalance } = useGetBalance({ query: { retry: false } as any });
  const user    = userData as { id: number; name: string } | undefined;

  const [step, setStep]         = useState<Step>("phone");
  const [country, setCountry]   = useState<Country>(ALL_COUNTRIES.find(c => c.code === "TG") ?? ALL_COUNTRIES[0]);
  const [operator, setOperator] = useState<Operator>(country.operators[0]);
  const [phone, setPhone]       = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [payState, setPayState] = useState<PayState>("loading");
  const [payError, setPayError] = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [txRef, setTxRef]       = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);
  const gwRef     = useRef<string>("omnipay");

  // Country picker state (hoisted to avoid conditional hook violation)
  const [cpQuery, setCpQuery] = useState("");
  const cpInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === "country") setTimeout(() => cpInputRef.current?.focus(), 100);
  }, [step]);
  const cpFiltered = useMemo(() => {
    const q = cpQuery.toLowerCase().trim();
    return q ? ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) : ALL_COUNTRIES;
  }, [cpQuery]);

  const apiBase = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    pollCount.current = 0;
  }, []);
  useEffect(() => () => stopPolling(), [stopPolling]);

  const isFcfa = currency === "FCFA";
  const amountFcfa: number = (() => {
    const v = parseFloat(amountRaw || "0");
    if (!v || isNaN(v)) return 0;
    return isFcfa ? Math.round(v) : Math.round(v * FCFA_PER_USD);
  })();

  function selectCountry(c: Country) {
    setCountry(c);
    setOperator(c.operators[0]);
    setPhone("");
    setStep("phone");
  }

  function goToAmount() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 5) {
      toast({ variant: "destructive", title: t("mm_invalid_phone"), description: t("mm_invalid_phone_desc") });
      return;
    }
    setStep("amount");
  }

  const pollStatus = useCallback(async (reference: string) => {
    pollCount.current += 1;
    if (pollCount.current > 120) { stopPolling(); return; }
    try {
      const gw = gwRef.current;
      const endpoint = gw === "paxity"
        ? `${apiBase}/api/v1/payments/paxity/confirm`
        : gw === "ashtechpay"
        ? `${apiBase}/api/v1/payments/ashtechpay/confirm`
        : `${apiBase}/api/v1/payments/omnipay/confirm`;
      const res  = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ reference, userId: String(user?.id ?? 0) }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (json.credited) {
        stopPolling(); setPayState("success");
        queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
        refetchBalance();
        setTimeout(() => navigate("/recharge"), 2500);
      } else if (json.failed) {
        stopPolling(); setPayState("error");
        setPayError(String(json.message ?? "Transaction échouée."));
      }
    } catch { /* retry */ }
  }, [apiBase, user, stopPolling, queryClient, refetchBalance, navigate]);

  function startPolling(ref: string) {
    stopPolling(); pollCount.current = 0;
    void pollStatus(ref);
    pollRef.current = setInterval(() => pollStatus(ref), 2000);
  }

  async function doPayment(otp?: string) {
    if (!user) { toast({ variant: "destructive", title: "Non connecté" }); return; }
    if (amountFcfa < 300) { toast({ variant: "destructive", title: "Minimum 300 FCFA" }); return; }
    setShowOtpModal(false);
    setStep("processing");
    setPayState("loading");
    setPayError("");
    gwRef.current = operator.aggregator;

    try {
      if (operator.aggregator === "paxity") {
        const res  = await fetch(`${apiBase}/api/v1/payments/paxity/initiate`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({
            method: "mobile", amount: amountFcfa, currency: country.currency,
            userId: String(user.id), phone: phone.replace(/\D/g, ""),
            operator: operator.paxityOperatorId,
          }),
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok) { setPayState("error"); setPayError(String(json.message ?? "Paiement refusé.")); return; }
        const tx  = (json.data ?? json) as Record<string, unknown>;
        const ref = String(tx.transactionId ?? tx.reference ?? "");
        setTxRef(ref);
        const link = String(tx.link ?? tx.payment_url ?? "");
        if (link) { setPaymentUrl(link); setPayState("wave"); } else { setPayState("push"); }
        if (ref) startPolling(ref);
      } else if (operator.aggregator === "ashtechpay") {
        const res  = await fetch(`${apiBase}/api/v1/payments/ashtechpay/initiate`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({
            amount: amountFcfa, userId: String(user.id),
            phone: phone.replace(/\D/g, ""),
            operatorId: operator.atpOperatorId,
          }),
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (res.status === 202 || json.status === "pending") {
          const ref = String(json.reference ?? "");
          setTxRef(ref);
          const waveUrl = String(json.waveUrl ?? "");
          if (waveUrl) { setPaymentUrl(waveUrl); setPayState("wave"); } else { setPayState("push"); }
          if (ref) startPolling(ref);
        } else {
          setPayState("error"); setPayError(String(json.message ?? "Paiement refusé."));
        }
      } else {
        const body: Record<string, unknown> = {
          amount: amountFcfa, userId: String(user.id), phone: phone.replace(/\D/g, ""),
          operatorId: operator.id,
          firstName: user.name?.split(" ")[0] ?? "ZyNum",
          lastName:  user.name?.split(" ").slice(1).join(" ") || `User${user.id}`,
        };
        if (otp) body.otp = otp.trim();
        const res  = await fetch(`${apiBase}/api/v1/payments/omnipay/initiate`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok || String(json.success) !== "1") {
          setPayState("error"); setPayError(String(json.message ?? "Paiement refusé.")); return;
        }
        const ref = String(json.reference ?? "");
        setTxRef(ref);
        if (json.payment_url) { setPaymentUrl(String(json.payment_url)); setPayState("wave"); }
        else { setPayState("push"); }
        if (ref) startPolling(ref);
      }
    } catch {
      setPayState("error"); setPayError("Erreur de connexion. Veuillez réessayer.");
    }
  }

  function handlePayClick() {
    if (!user) { toast({ variant: "destructive", title: t("error") }); return; }
    if (amountFcfa < 300) { toast({ variant: "destructive", title: t("mm_min_amount") }); return; }
    if (operator.needsOtp) {
      setShowOtpModal(true);
    } else {
      doPayment();
    }
  }

  // ── COUNTRY PICKER ──────────────────────────────────────────────────────────
  if (step === "country") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        <div className="fixed top-0 left-0 right-0 z-10 px-4 pt-3 pb-3 bg-[#1A3FFF]">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setStep("phone")} className="p-2 -ml-2 rounded-xl active:bg-blue-700 transition-colors">
              <ChevronLeft className="w-6 h-6 text-force-white" />
            </button>
            <h1 className="text-lg font-black text-force-white">{t("mm_select_country")}</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-force-white" style={{ opacity: 0.8 }} />
            <input
              ref={cpInputRef}
              type="text"
              placeholder={t("mm_search_country")}
              value={cpQuery}
              onChange={e => setCpQuery(e.target.value)}
              className="w-full h-11 pl-12 pr-4 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-white/40 search-input-white"
              style={{
                backgroundColor: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                caretColor: '#ffffff',
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8" style={{ paddingTop: 120 }}>
          {cpFiltered.length === 0 && <p className="text-center text-gray-400 py-10">{t("mm_no_country")}</p>}
          {cpFiltered.map(c => (
            <button
              key={c.code}
              onClick={() => selectCountry(c)}
              className={`w-full flex items-center gap-4 py-3.5 border-b border-gray-100 text-left transition-colors active:bg-blue-50 ${country.code === c.code ? "bg-blue-50" : ""}`}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-white flex items-center justify-center text-xl">
                {c.flag}
              </div>
              <span className={`flex-1 font-semibold text-base ${country.code === c.code ? "text-blue-600" : "text-gray-900"}`}>{c.name}</span>
              <span className="text-gray-400 text-sm">+{c.prefix}</span>
              {country.code === c.code && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── PHONE STEP ──────────────────────────────────────────────────────────────
  if (step === "phone") {
    return (
      <div className="flex flex-col bg-white" style={{ minHeight: "100dvh" }}>
        {/* Fixed header */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 bg-[#1A3FFF]" style={{ height: HEADER_H }}>
          <button onClick={() => navigate("/recharge")} className="p-2 rounded-xl active:bg-blue-700 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-extrabold text-base flex-1 text-center pr-8" style={{ color: '#ffffff' }}>{t("mm_page_title")}</h1>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 pb-32" style={{ paddingTop: HEADER_H + 16 }}>
          <p className="text-gray-500 text-sm mb-5 leading-relaxed">
            {t("mm_phone_hint")}
          </p>

          {/* Country + phone */}
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t("mm_phone_label")}</label>
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setCpQuery(""); setStep("country"); }}
              className="flex items-center gap-2 px-3 py-3 rounded-2xl border-2 border-gray-200 bg-white shrink-0 active:bg-gray-50 transition-colors"
            >
              <span className="text-xl">{country.flag}</span>
              <span className="text-sm font-semibold text-gray-700">+{country.prefix}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            <input
              type="tel"
              inputMode="numeric"
              placeholder={t("mm_phone_placeholder")}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="flex-1 h-14 px-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-900 text-base font-semibold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Operators */}
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">{t("mm_operator_label")}</label>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {country.operators.map(op => (
              <button
                key={op.id}
                onClick={() => setOperator(op)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                  operator.id === op.id
                    ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-100"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                  <img src={op.logo} alt={op.label} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <span className={`text-xs font-bold text-center leading-tight ${operator.id === op.id ? "text-blue-600" : "text-gray-700"}`}>
                  {op.label}
                </span>
                {op.needsOtp && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {t("mm_otp_required")}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Info OTP si nécessaire */}
          {operator.needsOtp && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <Phone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 mb-0.5">{t("mm_otp_required_title")}</p>
                <p className="text-xs text-amber-700">
                  {t("mm_otp_required_desc")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fixed footer */}
        <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white border-t border-gray-100">
          <button
            onClick={goToAmount}
            className="w-full py-4 rounded-full font-black text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-transform bg-[#1A3FFF]"
            style={{ color: '#ffffff' }}
          >
            {t("mm_next")}
          </button>
        </div>
      </div>
    );
  }

  // ── AMOUNT STEP ─────────────────────────────────────────────────────────────
  if (step === "amount") {
    const balance = balanceData?.balance ?? 0;
    return (
      <div className="flex flex-col bg-white" style={{ minHeight: "100dvh" }}>
        {/* Fixed header */}
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 bg-[#1A3FFF]" style={{ height: HEADER_H }}>
          <button onClick={() => setStep("phone")} className="p-2 rounded-xl active:bg-blue-700 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-extrabold text-base flex-1 text-center pr-8" style={{ color: '#ffffff' }}>{t("mm_amount_title")}</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-32" style={{ paddingTop: HEADER_H + 16 }}>
          {/* Operator summary */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-200 mb-5">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-gray-100 overflow-hidden">
              <img src={operator.logo} alt={operator.label} className="w-9 h-9 object-contain" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{t("mm_operator_selected")}</p>
              <p className="font-bold text-gray-900 text-sm">{operator.label} — {country.name}</p>
            </div>
            <div className="ml-auto">
              <p className="text-xs text-gray-400">{t("mm_number")}</p>
              <p className="font-bold text-gray-900 text-sm">+{country.prefix} {phone}</p>
            </div>
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-1">{t("mm_amount_h")}</h2>
          <p className="text-gray-400 text-sm mb-4">
            {isFcfa ? t("mm_balance") : t("mm_amount_usd")}
          </p>

          {/* Amount input */}
          <div className="flex items-center gap-2 h-20 bg-gray-50 rounded-2xl border-2 border-gray-200 px-4 mb-3 focus-within:border-blue-500 transition">
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

          <div className="grid grid-cols-4 gap-2 mb-5">
            {AMOUNT_PRESETS_FCFA.map(a => {
              const label = isFcfa ? a.toLocaleString("fr-FR") : `$${(a/FCFA_PER_USD).toFixed(0)}`;
              return (
                <button
                  key={a}
                  onClick={() => setAmountRaw(isFcfa ? String(a) : String((a / FCFA_PER_USD).toFixed(2)))}
                  className={`py-3 rounded-2xl text-sm font-bold transition-all ${amountFcfa === a ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t("mm_balance")}</span>
              <span className="font-semibold text-gray-900">
                {isFcfa ? `${Math.round(balance * FCFA_PER_USD).toLocaleString("fr-FR")} FCFA` : `$${balance.toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Fixed footer */}
        <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white border-t border-gray-100">
          <button
            onClick={handlePayClick}
            disabled={amountFcfa < 300}
            className="w-full py-4 rounded-full font-black text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-all bg-[#1A3FFF] disabled:opacity-50"
            style={{ color: '#ffffff' }}
          >
            {amountFcfa > 0
              ? `${t("mm_pay")} ${isFcfa ? `${amountFcfa.toLocaleString("fr-FR")} FCFA` : `$${(amountFcfa / FCFA_PER_USD).toFixed(2)}`}`
              : t("mm_pay")}
          </button>
        </div>

        {/* OTP Modal */}
        {showOtpModal && (
          <OtpModal
            operator={operator}
            amountFcfa={amountFcfa}
            onConfirm={(otp) => doPayment(otp)}
            onCancel={() => setShowOtpModal(false)}
          />
        )}
      </div>
    );
  }

  // ── PROCESSING STEP ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white" style={{ minHeight: "100dvh" }}>
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 bg-[#1A3FFF]" style={{ height: HEADER_H }}>
        {payState === "error" && (
          <button onClick={() => setStep("amount")} className="p-2 rounded-xl active:bg-blue-700 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <h1 className="font-extrabold text-base flex-1 text-center pr-8 text-force-white">{t("mm_payment_progress")}</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6" style={{ paddingTop: HEADER_H }}>
        {payState === "loading" && (
          <>
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-xl mb-2">{t("mm_payment_loading")}</p>
              <p className="text-gray-400 text-sm">{t("mm_wait")}</p>
            </div>
          </>
        )}

        {(payState === "wave" || payState === "push") && (
          <>
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
              {payState === "wave"
                ? <ExternalLink className="w-12 h-12 text-blue-500" />
                : <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              }
            </div>
            <div>
              <p className="font-black text-gray-900 text-xl mb-2">
                {payState === "wave" ? t("mm_finalize") : t("mm_push_waiting")}
              </p>
              <p className="text-gray-500 text-sm leading-relaxed">
                {payState === "wave"
                  ? `${t("mm_pay")} — ${amountFcfa.toLocaleString("fr-FR")} FCFA`
                  : t("mm_push_desc")}
              </p>
            </div>
            {payState === "wave" && paymentUrl && (
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#1A3FFF] text-white font-bold shadow-lg shadow-blue-200">
                <ExternalLink className="w-4 h-4" /> {t("mm_pay_now")}
              </a>
            )}
            <div className="flex items-center gap-2">
              {[0,1,2].map(i => (
                <span key={i} className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            {payState === "push" && (
              <button
                onClick={() => { stopPolling(); navigate("/recharge"); }}
                className="mt-2 w-full py-4 rounded-full font-black text-base bg-white border-2 border-blue-200 text-blue-600 active:scale-95 transition-all"
              >
                {t("mm_return_recharge")}
              </button>
            )}
          </>
        )}

        {payState === "success" && (
          <>
            <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-2xl mb-2">{t("mm_success")}</p>
              <p className="text-gray-500 text-sm">{amountFcfa.toLocaleString("fr-FR")} FCFA</p>
            </div>
          </>
        )}

        {payState === "error" && (
          <>
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-14 h-14 text-red-500" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-xl mb-2">{t("mm_error_title")}</p>
              <p className="text-gray-500 text-sm">{payError}</p>
            </div>
            <button onClick={() => setStep("amount")}
              className="w-full py-4 rounded-full font-black text-lg bg-[#1A3FFF] shadow-lg shadow-blue-500/30 text-force-white">
              {t("mm_retry")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
