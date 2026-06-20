import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Search, ChevronLeft, ChevronDown, CheckCircle2, AlertCircle, Loader2, ExternalLink, KeyRound } from "lucide-react";
import { useGetCurrentUser, useGetBalance, getGetBalanceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";

import imgMTN         from "@assets/mtn_(1)_1763835082904-BVdEqpuz-1_1774832430292.png";
import imgOrangeMoney from "@assets/images_1774832430265.png";
import imgWave        from "@assets/wave_(1)_1763835083242-BDJmxeWc_(1)_1774832430315.png";
import imgMoov        from "@assets/moov_(1)_1763835082986-GKkwwfPK_1774832019539.png";
import imgAirtel      from "@assets/Airtel_logo-01_1774832430216.png";
import imgTMoney      from "@assets/images_(1)_1774832430242.png";

const FCFA_PER_USD = 620;
const AMOUNT_PRESETS_FCFA = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

const LOGO_MAP: Record<string, string> = {
  orange: imgOrangeMoney, mtn: imgMTN, wave: imgWave, moov: imgMoov,
  airtel: imgAirtel, tmoney: imgTMoney, "t-money": imgTMoney, togocel: imgTMoney,
  flooz: imgMoov, vodacom: imgMTN, afrimoney: imgAirtel, wizall: imgWave,
};

function resolveLogo(name: string): string {
  const lower = name.toLowerCase();
  if (LOGO_MAP[lower]) return LOGO_MAP[lower];
  const first = lower.split(/[\s_-]/)[0];
  if (LOGO_MAP[first]) return LOGO_MAP[first];
  for (const k of Object.keys(LOGO_MAP)) if (lower.includes(k)) return LOGO_MAP[k];
  return imgMTN;
}

interface Operator { id: string; label: string; logo: string; aggregator: string; needsOtp: boolean; needsReturnUrl: boolean; paxityOperatorId?: string; }
interface Country  { code: string; name: string; flag: string; prefix: string; currency: string; operators: Operator[]; }

const ALL_COUNTRIES: Country[] = [
  { code:"BF", name:"Burkina Faso", flag:"🇧🇫", prefix:"226", currency:"XOF", operators:[
    { id:"ORANGE_BF", label:"Orange Money", logo:imgOrangeMoney, aggregator:"omnipay", needsOtp:true,  needsReturnUrl:false },
    { id:"MOOV_BF",   label:"Moov Money",   logo:imgMoov,        aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
  ]},
  { code:"BJ", name:"Bénin",        flag:"🇧🇯", prefix:"229", currency:"XOF", operators:[
    { id:"MTN_BJ",  label:"MTN MoMo",   logo:imgMTN,  aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"MOOV_BJ", label:"Moov Money", logo:imgMoov, aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
  ]},
  { code:"CI", name:"Côte d'Ivoire", flag:"🇨🇮", prefix:"225", currency:"XOF", operators:[
    { id:"ORANGE_CI", label:"Orange Money", logo:imgOrangeMoney, aggregator:"omnipay", needsOtp:true,  needsReturnUrl:false },
    { id:"MTN_CI",    label:"MTN MoMo",     logo:imgMTN,         aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"MOOV_CI",   label:"Moov Money",   logo:imgMoov,        aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"WAVE_CI",   label:"Wave",          logo:imgWave,        aggregator:"omnipay", needsOtp:false, needsReturnUrl:true  },
  ]},
  { code:"CM", name:"Cameroun",     flag:"🇨🇲", prefix:"237", currency:"XAF", operators:[
    { id:"MTN_CM",    label:"MTN MoMo",     logo:imgMTN,         aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"ORANGE_CM", label:"Orange Money", logo:imgOrangeMoney, aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
  ]},
  { code:"GH", name:"Ghana",        flag:"🇬🇭", prefix:"233", currency:"GHS", operators:[
    { id:"MTN_GH",    label:"MTN MoMo",   logo:imgMTN,    aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MTNGH" },
    { id:"AIRTEL_GH", label:"AirtelTigo", logo:imgAirtel, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"ATGH" },
  ]},
  { code:"GN", name:"Guinée",       flag:"🇬🇳", prefix:"224", currency:"GNF", operators:[
    { id:"MTN_GN",    label:"MTN Mobile Money", logo:imgMTN,         aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"ORANGE_GN", label:"Orange Money",     logo:imgOrangeMoney, aggregator:"paxity",  needsOtp:false, needsReturnUrl:false, paxityOperatorId:"OMGN" },
  ]},
  { code:"KE", name:"Kenya",        flag:"🇰🇪", prefix:"254", currency:"KES", operators:[
    { id:"MPESA_KE", label:"M-Pesa", logo:imgMTN, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MPESAKE" },
  ]},
  { code:"ML", name:"Mali",         flag:"🇲🇱", prefix:"223", currency:"XOF", operators:[
    { id:"ORANGE_ML", label:"Orange Money", logo:imgOrangeMoney, aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
    { id:"MOOV_ML",   label:"Moov Money",   logo:imgMoov,        aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
  ]},
  { code:"NG", name:"Nigeria",      flag:"🇳🇬", prefix:"234", currency:"NGN", operators:[
    { id:"MTN_NG", label:"MTN MoMo", logo:imgMTN, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MTNNG" },
  ]},
  { code:"SN", name:"Sénégal",      flag:"🇸🇳", prefix:"221", currency:"XOF", operators:[
    { id:"WAVE_SN",   label:"Wave",         logo:imgWave,        aggregator:"omnipay", needsOtp:false, needsReturnUrl:true  },
    { id:"ORANGE_SN", label:"Orange Money", logo:imgOrangeMoney, aggregator:"omnipay", needsOtp:false, needsReturnUrl:false },
  ]},
  { code:"TG", name:"Togo",         flag:"🇹🇬", prefix:"228", currency:"XOF", operators:[
    { id:"TOGOCEL_TG", label:"T-Money",    logo:imgTMoney, aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"TMONEYTG" },
    { id:"MOOV_TG",    label:"Moov Money", logo:imgMoov,   aggregator:"paxity", needsOtp:false, needsReturnUrl:false, paxityOperatorId:"MOOVTG" },
  ]},
].sort((a, b) => a.name.localeCompare(b.name, "fr"));

type Step = "phone" | "country" | "amount" | "processing";
type PayState = "loading" | "push" | "wave" | "otp" | "success" | "error";

export default function MobileMoneyPage() {
  const [, navigate]  = useLocation();
  const { toast }     = useToast();
  const { currency }  = useCurrency();
  const queryClient   = useQueryClient();

  const { data: userData }    = useGetCurrentUser({ query: { retry: false } });
  const { data: balanceData, refetch: refetchBalance } = useGetBalance({ query: { retry: false } });
  const user    = userData as { id: number; name: string } | undefined;

  const [step, setStep]         = useState<Step>("phone");
  const [country, setCountry]   = useState<Country>(ALL_COUNTRIES.find(c => c.code === "CI") ?? ALL_COUNTRIES[0]);
  const [operator, setOperator] = useState<Operator>(country.operators[0]);
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");

  const [amountRaw, setAmountRaw]   = useState("");
  const [payState, setPayState]     = useState<PayState>("loading");
  const [payError, setPayError]     = useState("");
  const [paymentUrl, setPaymentUrl] = useState("");
  const [txRef, setTxRef]           = useState("");
  const [otpHint, setOtpHint]       = useState("");
  const [otpValue, setOtpValue]     = useState("");

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);
  const gwRef     = useRef<string>("omnipay");

  // ── CountryPicker hooks (hoisted to avoid conditional hook violation) ─────
  const [cpQuery, setCpQuery] = useState("");
  const cpInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === "country") setTimeout(() => cpInputRef.current?.focus(), 100);
  }, [step]);
  const cpFiltered = useMemo(() => {
    const q = cpQuery.toLowerCase().trim();
    return q ? ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) : ALL_COUNTRIES;
  }, [cpQuery]);

  const apiBase   = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

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
    if (digits.length < 5) { toast({ variant: "destructive", title: "Numéro invalide", description: "Entrez un numéro de téléphone valide." }); return; }
    if (operator.needsOtp && !otp.trim()) { toast({ variant: "destructive", title: "Code OTP requis", description: `Composez le code USSD pour obtenir votre OTP ${operator.label}.` }); return; }
    setStep("amount");
  }

  const pollStatus = useCallback(async (reference: string) => {
    pollCount.current += 1;
    if (pollCount.current > 120) { stopPolling(); return; }
    try {
      const gw = gwRef.current;
      const endpoint = gw === "paxity" ? `${apiBase}/api/v1/payments/paxity/confirm`
        : gw === "ashtechpay" ? `${apiBase}/api/v1/payments/ashtechpay/confirm`
        : gw === "sendavapay" ? `${apiBase}/api/v1/payments/sendavapay/confirm`
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

  async function submitPayment() {
    if (!user) { toast({ variant: "destructive", title: "Non connecté" }); return; }
    if (amountFcfa < 300) { toast({ variant: "destructive", title: "Minimum 300 FCFA" }); return; }
    setStep("processing");
    setPayState("loading");
    setPayError("");
    gwRef.current = operator.aggregator;

    try {
      if (operator.aggregator === "paxity") {
        const res  = await fetch(`${apiBase}/api/v1/payments/paxity/initiate`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ method: "mobile", amount: amountFcfa, currency: country.currency, userId: String(user.id), phone: phone.replace(/\D/g, ""), operator: operator.paxityOperatorId }),
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok) { setPayState("error"); setPayError(String(json.message ?? "Paiement refusé.")); return; }
        const tx   = (json.data ?? json) as Record<string, unknown>;
        const ref  = String(tx.transactionId ?? tx.reference ?? "");
        setTxRef(ref);
        const link = String(tx.link ?? tx.payment_url ?? "");
        if (link) { setPaymentUrl(link); setPayState("wave"); } else { setPayState("push"); }
        if (ref) startPolling(ref);

      } else {
        const body: Record<string, unknown> = {
          amount: amountFcfa, userId: String(user.id), phone: phone.replace(/\D/g, ""),
          operatorId: operator.id,
          firstName: user.name?.split(" ")[0] ?? "ZyNum",
          lastName:  user.name?.split(" ").slice(1).join(" ") || `User${user.id}`,
        };
        if (operator.needsOtp && otp) body.otp = otp.trim();
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

  async function confirmOtp() {
    if (!otpValue.trim()) return;
    setPayState("loading");
    try {
      const res = await fetch(`${apiBase}/api/v1/payments/ashtechpay/confirm-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ reference: txRef, otp: otpValue.trim(), userId: String(user?.id ?? 0) }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setPayState("error"); setPayError(String(json.message ?? "OTP invalide.")); return; }
      setPayState("push");
      if (txRef) startPolling(txRef);
    } catch { setPayState("error"); setPayError("Erreur de connexion."); }
  }

  // ── COUNTRY PICKER ─────────────────────────────────────────────────────────
  function CountryPicker() {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#ffffff" }}>
        <div className="sticky top-0 z-10 px-4 pt-3 pb-3 shrink-0 bg-[#1A3FFF]">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setStep("phone")} className="p-2 -ml-2 rounded-xl active:bg-blue-700 transition-colors">
              <ChevronLeft className="w-6 h-6" style={{ color: "white" }} />
            </button>
            <h1 className="text-lg font-black" style={{ color: "white" }}>Sélectionnez votre pays</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
            <input
              ref={cpInputRef}
              type="text"
              placeholder="Rechercher"
              value={cpQuery}
              onChange={e => setCpQuery(e.target.value)}
              style={{ color: "white", backgroundColor: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.3)" }}
              className="w-full h-11 pl-12 pr-4 rounded-2xl border-2 text-base focus:outline-none transition placeholder:text-white/60"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24" style={{ backgroundColor: "#ffffff" }}>
          {cpFiltered.length === 0 && <p className="text-center text-gray-400 py-10">Aucun pays trouvé</p>}
          {cpFiltered.map(c => (
            <button
              key={c.code}
              onClick={() => selectCountry(c)}
              className={`w-full flex items-center gap-4 py-3 border-b border-gray-100 text-left transition-colors active:bg-blue-50 ${country.code === c.code ? "bg-blue-50" : ""}`}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-white flex items-center justify-center text-xl">
                {c.flag}
              </div>
              <span className={`flex-1 font-semibold text-base ${country.code === c.code ? "text-blue-600" : "text-gray-900"}`}>{c.name}</span>
              <span className="text-gray-400 font-medium text-sm">+{c.prefix}</span>
            </button>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 border-t border-gray-100" style={{ backgroundColor: "#ffffff" }}>
          <button
            onClick={() => setStep("phone")}
            className="w-full py-4 rounded-full font-bold text-white text-lg bg-[#1A3FFF] shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
          >
            Suivant
          </button>
        </div>
      </div>
    );
  }

  // ── PHONE STEP ─────────────────────────────────────────────────────────────
  function PhoneStep() {
    return (
      <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>
        <div className="sticky top-0 z-10 px-4 pt-3 pb-3 flex items-center gap-3 shrink-0 bg-[#1A3FFF]">
          <button onClick={() => navigate("/recharge")} className="p-2 rounded-xl active:bg-blue-700 transition-colors">
            <ChevronLeft className="w-5 h-5" style={{ color: "white" }} />
          </button>
          <h1 className="font-extrabold text-base flex-1 text-center pr-8" style={{ color: "white" }}>Recharge Mobile Money</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4">
          <p className="text-gray-600 text-sm mb-3 leading-relaxed">
            Saisissez votre numéro de téléphone pour recharger votre compte.
          </p>

          {/* Country + phone row */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setStep("country")}
              className="flex items-center gap-2 px-3 py-3 rounded-2xl border-2 border-gray-300 bg-white shrink-0 active:bg-gray-50 transition-colors"
            >
              <span className="text-xl">{country.flag}</span>
              <span className="text-sm font-semibold text-gray-700">+{country.prefix}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            <input
              type="tel"
              inputMode="numeric"
              placeholder={`Numéro (+${country.prefix})`}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="flex-1 h-14 px-4 rounded-2xl border-2 border-gray-300 bg-white text-gray-900 text-base font-semibold placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:border-gray-500 transition"
            />
          </div>

          {/* Operators */}
          <div>
            <p className="text-xs font-black text-gray-500 tracking-widest mb-3 uppercase">Opérateur Mobile Money</p>
            <div className="grid grid-cols-2 gap-3">
              {country.operators.map(op => (
                <button
                  key={op.id}
                  onClick={() => setOperator(op)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${
                    operator.id === op.id
                      ? "bg-blue-50 shadow-md shadow-blue-100"
                      : "bg-white"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                    <img src={op.logo} alt={op.label} className="w-12 h-12 object-contain"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <span className={`text-xs font-bold text-center leading-tight ${operator.id === op.id ? "text-blue-600" : "text-gray-700"}`}>
                    {op.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* OTP field for Orange Money */}
          {operator.needsOtp && (
            <div className="mt-5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Code OTP Orange Money</label>
              <input
                type="text"
                placeholder="Code OTP"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="w-full h-12 px-4 rounded-2xl border-2 border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:border-blue-500 transition"
              />
              <p className="text-xs text-gray-400 mt-2">Composez #144*82# ou *144*4*6*montant# pour obtenir votre OTP.</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-8 pt-4 bg-white border-t border-gray-100">
          <button
            onClick={goToAmount}
            className="w-full py-4 rounded-full font-black text-white text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-transform bg-[#1A3FFF]"
          >
            Suivante
          </button>
        </div>
      </div>
    );
  }

  // ── AMOUNT STEP ────────────────────────────────────────────────────────────
  function AmountStep() {
    const balance = balanceData?.balance ?? 0;

    return (
      <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>
        <div className="sticky top-0 z-10 px-4 pt-3 pb-3 flex items-center gap-3 shrink-0 bg-[#1A3FFF]">
          <button onClick={() => setStep("phone")} className="p-2 rounded-xl active:bg-blue-700 transition-colors">
            <ChevronLeft className="w-5 h-5" style={{ color: "white" }} />
          </button>
          <h1 className="font-extrabold text-base flex-1 text-center pr-8" style={{ color: "white" }}>Montant à recharger</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="pt-6 pb-4">
            <h2 className="text-3xl font-black text-gray-900 mb-1">Montant</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {isFcfa ? "Entrez le montant en FCFA que vous souhaitez recharger." : "Enter the amount in USD you want to top up."}
            </p>
          </div>

          {/* Amount input */}
          <div className="flex items-center gap-2 h-20 bg-gray-50 rounded-2xl border-2 border-gray-200 px-4 mb-4 focus-within:border-blue-500 transition w-full">
            <span className="text-xl font-black text-gray-400 shrink-0">{isFcfa ? "FCFA" : "$"}</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={amountRaw}
              onChange={e => setAmountRaw(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-3xl font-black text-gray-900 focus:outline-none placeholder:text-gray-200"
              autoFocus
            />
          </div>

          {/* Equivalent */}
          {amountFcfa > 0 && (
            <p className="text-sm text-gray-400 text-center mb-5">
              ≈ {isFcfa ? `$${(amountFcfa / FCFA_PER_USD).toFixed(2)}` : `${amountFcfa.toLocaleString("fr-FR")} FCFA`}
            </p>
          )}

          {/* Preset amounts */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {AMOUNT_PRESETS_FCFA.map(a => {
              const display = isFcfa ? a : a / FCFA_PER_USD;
              const label   = isFcfa ? `${a >= 1000 ? `${a/1000}k` : a}` : `$${display.toFixed(0)}`;
              const isActive = amountFcfa === a;
              return (
                <button
                  key={a}
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

          {/* Summary */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-2">
            {[
              { label: "Pays",        value: `${country.flag} ${country.name}` },
              { label: "Opérateur",   value: operator.label },
              { label: "Numéro",      value: `+${country.prefix} ${phone}` },
              { label: "Solde actuel",value: isFcfa ? `${Math.round(balance * FCFA_PER_USD).toLocaleString("fr-FR")} FCFA` : `$${balance.toFixed(2)}` },
            ].map(row => (
              <div key={row.label} className="flex justify-between items-center gap-3 text-sm min-w-0">
                <span className="text-gray-500 shrink-0">{row.label}</span>
                <span className="font-semibold text-gray-900 truncate text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-8 pt-4 border-t border-gray-100 bg-white">
          <button
            onClick={submitPayment}
            className="w-full py-4 rounded-full font-black text-white text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-all bg-[#1A3FFF]"
          >
            {amountFcfa > 0
              ? `Payer ${isFcfa ? `${amountFcfa.toLocaleString("fr-FR")} FCFA` : `$${(amountFcfa / FCFA_PER_USD).toFixed(2)}`}`
              : "Payer"}
          </button>
        </div>
      </div>
    );
  }

  // ── PROCESSING STEP ────────────────────────────────────────────────────────
  function ProcessingStep() {
    return (
      <div className="flex flex-col bg-white" style={{ height: "100dvh" }}>
        <div className="sticky top-0 z-10 px-4 pt-3 pb-3 flex items-center gap-3 bg-[#1A3FFF]">
          {(payState === "error") && (
            <button onClick={() => setStep("amount")} className="p-2 rounded-xl active:bg-blue-700 transition-colors">
              <ChevronLeft className="w-5 h-5" style={{ color: "white" }} />
            </button>
          )}
          <h1 className="font-extrabold text-base flex-1 text-center pr-8" style={{ color: "white" }}>Paiement en cours</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-16 text-center gap-6">
          {payState === "loading" && (
            <>
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-xl mb-2">Traitement en cours…</p>
                <p className="text-gray-400 text-sm">Connexion à {operator.label}</p>
              </div>
            </>
          )}

          {payState === "push" && (
            <>
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden">
                <img src={operator.logo} alt={operator.label} className="w-16 h-16 object-contain" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-xl mb-2">Vérifiez votre téléphone</p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Une demande de paiement a été envoyée au <span className="font-bold text-gray-800">+{country.prefix} {phone}</span>.<br/>
                  Approuvez-la sur votre application {operator.label}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2.5 h-2.5 rounded-full bg-blue-400"
                    style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              {txRef && <p className="text-xs text-gray-300">Réf : {txRef}</p>}
            </>
          )}

          {payState === "wave" && (
            <>
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden">
                <img src={operator.logo} alt={operator.label} className="w-16 h-16 object-contain" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-xl mb-2">Paiement {operator.label}</p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Cliquez sur le bouton ci-dessous pour finaliser votre paiement.
                </p>
              </div>
              {paymentUrl && (
                <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-8 py-3 rounded-full bg-blue-500 text-white font-bold shadow-lg shadow-blue-200">
                  <ExternalLink className="w-4 h-4" /> Payer maintenant
                </a>
              )}
              <div className="flex items-center gap-2">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2.5 h-2.5 rounded-full bg-blue-400"
                    style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </>
          )}

          {payState === "otp" && (
            <>
              <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
                <KeyRound className="w-12 h-12 text-blue-500" />
              </div>
              <div className="w-full">
                <p className="font-black text-gray-900 text-xl mb-2">Code OTP</p>
                <p className="text-gray-500 text-sm mb-4 leading-relaxed">{otpHint || "Entrez le code OTP reçu par SMS."}</p>
                <input
                  type="text" inputMode="numeric" placeholder="Code OTP"
                  value={otpValue} onChange={e => setOtpValue(e.target.value)}
                  className="w-full h-14 px-4 rounded-2xl border-2 border-gray-300 text-center text-xl font-black text-gray-900 focus:outline-none focus:border-blue-500 transition mb-4"
                />
                <button onClick={confirmOtp}
                  className="w-full py-4 rounded-full font-black text-white text-lg bg-[#1A3FFF] shadow-lg shadow-blue-500/30">
                  Confirmer
                </button>
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
              <button onClick={() => setStep("amount")}
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
      {step === "country" && CountryPicker()}
      {step === "phone"   && PhoneStep()}
      {step === "amount"  && AmountStep()}
      {step === "processing" && ProcessingStep()}
    </div>
  );
}
