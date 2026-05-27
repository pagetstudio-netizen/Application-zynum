import { useState } from "react";
import {
  Wallet,
  ArrowRight, Check, Lock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { useLanguage } from "@/hooks/use-language";
import { useGetBalance, useGetCurrentUser, getGetBalanceQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { OmnipayModal } from "@/components/omnipay-modal";
import iconMobile from "@assets/icons8-argent-mobile-53_1774828244252.png";
import iconCrypto from "@assets/cryptocurrency-3d-illustration-png_1774828244226.png";
import iconCard   from "@assets/9242877_1774828244157.png";

const AMOUNTS_USD   = [5, 10, 20, 50, 100, 200];
const FCFA_PER_USD  = 620;

export default function Recharge() {
  const { t }         = useLanguage();
  const { currency }  = useCurrency();
  const { toast }     = useToast();
  const queryClient   = useQueryClient();
  const { data: user }         = useGetCurrentUser({ query: { retry: false } });
  const { data: balanceData, refetch: refetchBalance } =
    useGetBalance({ query: { enabled: !!user, retry: false } });

  const [selectedAmount,   setSelectedAmount]   = useState<number | null>(20);
  const [customAmount,     setCustomAmount]     = useState("");
  const [selectedMethod,   setSelectedMethod]   = useState<string | null>("mobile");
  const [omnipayOpen,      setOmnipayOpen]      = useState(false);

  const METHODS: {
    id: string; label: string; sub: string; icon: React.ReactNode;
    color: string; bg: string; available: boolean; soon?: boolean;
  }[] = [
    {
      id:        "mobile",
      icon:      <img src={iconMobile} alt="Mobile Money" className="w-8 h-8 object-contain" />,
      label:     "Mobile Money",
      sub:       "Wave, Orange Money, MTN, Moov… · 10 pays",
      color:     "text-emerald-400",
      bg:        "bg-emerald-400/10 border-emerald-400/20",
      available: true,
    },
    {
      id:        "card",
      icon:      <img src={iconCard} alt="Carte bancaire" className="w-9 h-9 object-contain" />,
      label:     "Carte bancaire",
      sub:       "Visa, Mastercard — paiement sécurisé",
      color:     "text-blue-400",
      bg:        "bg-blue-400/10 border-blue-400/20",
      available: false,
      soon:      true,
    },
    {
      id:        "crypto",
      icon:      <img src={iconCrypto} alt="Cryptomonnaie" className="w-9 h-9 object-contain" />,
      label:     "Cryptomonnaie",
      sub:       "USDT, BTC, ETH, BNB…",
      color:     "text-yellow-400",
      bg:        "bg-yellow-400/10 border-yellow-400/20",
      available: false,
      soon:      true,
    },
  ];

  const balance       = balanceData?.balance ?? 0;
  const formatBalance = (v: number) =>
    currency === "FCFA"
      ? `${Math.round(v * FCFA_PER_USD).toLocaleString("fr-FR")} FCFA`
      : `$${v.toFixed(2)}`;

  const finalAmountUsd  = customAmount ? parseFloat(customAmount) : selectedAmount;
  const finalAmountXof  = finalAmountUsd
    ? currency === "FCFA" ? finalAmountUsd : Math.round(finalAmountUsd * FCFA_PER_USD)
    : 0;
  const finalAmountUsdNorm = currency === "FCFA"
    ? (finalAmountUsd ?? 0) / FCFA_PER_USD
    : (finalAmountUsd ?? 0);

  const handleDeposit = () => {
    if (!selectedMethod) {
      toast({ variant: "destructive", title: t("recharge_choose_method") });
      return;
    }
    const minFcfa    = 300;
    const minUsd     = minFcfa / FCFA_PER_USD;
    const rawFcfa    = currency === "FCFA" ? (finalAmountUsd ?? 0) : Math.round((finalAmountUsd ?? 0) * FCFA_PER_USD);
    if (!finalAmountUsd || finalAmountUsd <= 0 || rawFcfa < minFcfa) {
      toast({ variant: "destructive", title: "Montant trop faible", description: `Le dépôt minimum est de ${minFcfa.toLocaleString("fr-FR")} FCFA ($${minUsd.toFixed(2)}).` });
      return;
    }
    if (!user) {
      toast({ variant: "destructive", title: "Non connecté", description: "Veuillez vous connecter." });
      return;
    }
    if (selectedMethod === "mobile") {
      setOmnipayOpen(true);
      return;
    }
    toast({ title: t("recharge_soon_toast_title"), description: t("recharge_soon_toast_desc") });
  };

  const handlePaymentSuccess = () => {
    toast({ title: "Paiement initié !", description: "Votre solde sera mis à jour dans quelques instants." });
    setTimeout(() => {
      refetchBalance();
      queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{t("recharge_header")}</h2>
        <p className="text-muted-foreground text-sm">{t("recharge_sub")}</p>
      </div>

      <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-500/10 via-primary/5 to-blue-500/5 p-5 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-primary/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("recharge_balance_label")}</p>
            <p className="text-2xl font-bold text-gray-900">{formatBalance(balance)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-600">
          <ShieldCheck className="w-3.5 h-3.5" /> {t("recharge_verified")}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
        <h3 className="font-semibold text-gray-900">{t("recharge_amount_title")}</h3>
        <div className="grid grid-cols-3 gap-2">
          {AMOUNTS_USD.map((amt) => {
            const displayAmt = currency === "FCFA" ? amt * FCFA_PER_USD : amt;
            const active     = selectedAmount === amt && !customAmount;
            return (
              <button
                key={amt}
                onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                className={`py-3 rounded-xl border text-sm font-bold transition-all ${
                  active
                    ? "border-primary/50 bg-primary/10 text-primary shadow-lg shadow-primary/10"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {currency === "FCFA" ? `${displayAmt.toLocaleString("fr-FR")} F` : `$${amt}`}
              </button>
            );
          })}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">{t("recharge_custom_label")}</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
              {currency === "FCFA" ? "FCFA" : "$"}
            </span>
            <input
              type="number"
              min="1"
              placeholder="0"
              value={customAmount}
              onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
              className="w-full h-12 pl-14 pr-4 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition shadow-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {finalAmountUsd && finalAmountUsd > 0
              ? `≈ ${currency === "FCFA" ? `$${(finalAmountUsd / FCFA_PER_USD).toFixed(2)}` : `${Math.round(finalAmountUsd * FCFA_PER_USD).toLocaleString("fr-FR")} FCFA`}`
              : `Minimum : 300 FCFA ($${(300 / FCFA_PER_USD).toFixed(2)})`}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">{t("recharge_method_title")}</h3>
        <div className="space-y-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => m.available && setSelectedMethod(m.id)}
              disabled={!m.available}
              className={`w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border text-left transition-all ${
                selectedMethod === m.id
                  ? "border-primary/50 bg-primary/10"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100"
              } ${!m.available ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  {m.icon}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">{m.label}</p>
                    {m.soon && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600">
                        Bientôt
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{m.sub}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!m.available ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-muted-foreground">
                    {t("recharge_soon_badge")}
                  </span>
                ) : (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedMethod === m.id ? "border-primary bg-primary" : "border-gray-300"}`}>
                    {selectedMethod === m.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">{t("recharge_summary")}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("recharge_deposited")}</span>
            <span className="text-gray-900 font-semibold">
              {finalAmountUsd && finalAmountUsd > 0
                ? currency === "FCFA"
                  ? `${Math.round(finalAmountUsd).toLocaleString("fr-FR")} FCFA`
                  : `$${finalAmountUsd.toFixed(2)}`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("recharge_fees")}</span>
            <span className="text-green-600 font-semibold">{t("recharge_free_label")}</span>
          </div>
          <div className="h-px bg-gray-200 my-2" />
          <div className="flex justify-between font-bold text-gray-900 text-base">
            <span>{t("recharge_new_balance")}</span>
            <span className="text-primary">
              {finalAmountUsd && finalAmountUsd > 0
                ? formatBalance(balance + finalAmountUsdNorm)
                : formatBalance(balance)}
            </span>
          </div>
        </div>

        <Button
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-xl shadow-primary/20"
          onClick={handleDeposit}
          disabled={!finalAmountUsd || finalAmountUsd <= 0}
        >
          <Lock className="w-4 h-4 mr-2" />
          {finalAmountUsd && finalAmountUsd > 0
            ? `${t("recharge_deposit_btn")} ${currency === "FCFA" ? `${Math.round(finalAmountUsd).toLocaleString("fr-FR")} FCFA` : `$${finalAmountUsd}`}`
            : t("recharge_deposit_btn")}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
          {t("recharge_security_note")}
        </p>
      </div>

      {user && (
        <OmnipayModal
          open={omnipayOpen}
          onClose={() => setOmnipayOpen(false)}
          amountXof={finalAmountXof}
          userId={user.id}
          onSuccess={handlePaymentSuccess}
          userFirstName={user.name?.split(" ")[0] ?? "ZyNum"}
          userLastName={user.name?.split(" ").slice(1).join(" ") || `User${user.id}`}
        />
      )}

    </div>
  );
}
