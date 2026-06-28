import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, CheckCircle2, Copy, AlertCircle,
  RefreshCw, Lock, Phone, ArrowLeft, Wallet,
  Check, X, RotateCcw, Smartphone, ChevronRight, Clock, History, MessageSquare,
} from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import {
  useGetServices,
  useGetCountries,
  useBuyNumber,
  useCheckSms,
  useCancelOrder,
  useGetOperators,
  useGetCurrentUser,
  useGetBalance,
  type Order,
} from "@workspace/api-client-react";

type BuyStep = "service" | "country" | "operator" | "preview" | "active";

const DURATION = 360;
function useCountdown(createdAt: string | undefined) {
  const [remaining, setRemaining] = useState<number>(DURATION);
  useEffect(() => {
    if (!createdAt) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      setRemaining(Math.max(0, DURATION - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = remaining / DURATION;
  const urgent = remaining <= 60;
  const expired = remaining === 0;
  return { remaining, mm, ss, pct, urgent, expired };
}

function CountdownRing({ createdAt, onExpired }: { createdAt: string; onExpired?: () => void }) {
  const { t } = useLanguage();
  const { mm, ss, pct, urgent, expired } = useCountdown(createdAt);
  const prevExpired = useRef(false);
  useEffect(() => {
    if (expired && !prevExpired.current) { prevExpired.current = true; onExpired?.(); }
  }, [expired, onExpired]);

  const r = 38; const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = expired ? "#ef4444" : urgent ? "#f97316" : "#3b82f6";

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="6" />
          <circle
            cx="44" cy="44" r={r} fill="none"
            stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 1s linear, stroke 0.5s" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Clock className="w-4 h-4 mb-0.5" style={{ color }} />
          <span className="text-lg font-bold font-mono" style={{ color }}>{mm}:{ss}</span>
        </div>
      </div>
      <div className="text-center">
        {expired ? (
          <p className="text-sm font-semibold text-red-400">{t("buy_countdown_expired")}</p>
        ) : urgent ? (
          <p className="text-sm font-semibold text-orange-400">{t("buy_countdown_urgent")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("buy_countdown_waiting")}</p>
        )}
      </div>
    </div>
  );
}

function ServiceLogo({ icon, color, name, size = 40 }: { icon: string; color: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const lightBg = ["#FFFC00", "#F0B90B", "#FAE100", "#FFC629"].some(c => color.toUpperCase() === c);
  const showFallback = failed || !icon;
  return (
    <div style={{ width: size, height: size, background: color, borderRadius: size * 0.22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {!showFallback ? (
        <img src={icon} alt={name} style={{ width: size * 0.58, height: size * 0.58, objectFit: "contain" }} onError={() => setFailed(true)} />
      ) : (
        <span style={{ fontWeight: 700, fontSize: size * 0.36, color: lightBg ? "#000" : "#fff", lineHeight: 1, userSelect: "none" }}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: BuyStep }) {
  const { t } = useLanguage();
  const STEPS_INFO = [
    { key: "service",  label: t("buy_step_service") },
    { key: "country",  label: t("buy_step_country") },
    { key: "operator", label: t("buy_step_operator") },
    { key: "preview",  label: t("buy_step_number") },
    { key: "active",   label: t("buy_step_sms") },
  ];
  const idx = STEPS_INFO.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS_INFO.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1 min-w-[40px]">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done   ? "bg-green-500 text-white shadow-lg shadow-green-500/30" :
                active ? "bg-gradient-to-br from-red-500 to-primary text-white shadow-lg shadow-red-500/30 ring-2 ring-red-400/30" :
                         "bg-gray-100 border border-gray-200 text-gray-400"
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${active ? "text-gray-900" : "text-gray-400"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS_INFO.length - 1 && (
              <div className={`flex-1 h-px mb-4 transition-all ${i < idx ? "bg-green-500/50" : "bg-gray-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepPage({ children, dir = 1 }: { children: React.ReactNode; dir?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: dir * 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir * -30 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

const STEP_TITLES: Record<BuyStep, string> = {
  service:  "Choisir un service",
  country:  "Choisir un pays",
  operator: "Choisir un opérateur",
  preview:  "Confirmation",
  active:   "Code de vérification",
};

export default function BuyNumber({ isEmbedded = false, onStepChange }: { isEmbedded?: boolean; onStepChange?: (title: string) => void }) {
  const { t } = useLanguage();
  const { currency } = useCurrency();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isUserLoading } = useGetCurrentUser({ query: { retry: false } });
  const { data: balanceData, refetch: refetchBalance } = useGetBalance({ query: { enabled: !!user, retry: false } });

  const [step, setStep] = useState<BuyStep>("service");

  useEffect(() => {
    onStepChange?.(STEP_TITLES[step]);
  }, [step, onStepChange]);
  const [dir, setDir] = useState(1);
  const [searchService, setSearchService] = useState("");
  const [searchCountry, setSearchCountry] = useState("");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [buyCount, setBuyCount] = useState(0);

  // ── Persistence de la commande active ───────────────────────────────────────
  const clearSavedOrder = useCallback(() => {
    localStorage.removeItem("zynum_active_order");
  }, []);

  // Restaurer la commande active depuis localStorage au montage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("zynum_active_order");
      if (!saved) return;
      const data = JSON.parse(saved);
      const order: Order = data.order;
      if (order && !["CANCELED", "TIMEOUT", "BANNED"].includes(order.status)) {
        setActiveOrder(order);
        setStep(data.step || "active");
        if (data.service) setSelectedService(data.service);
        if (data.country) setSelectedCountry(data.country);
        if (data.operator) setSelectedOperator(data.operator);
      } else {
        localStorage.removeItem("zynum_active_order");
      }
    } catch {
      localStorage.removeItem("zynum_active_order");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarder la commande active dans localStorage
  useEffect(() => {
    if (activeOrder && (step === "preview" || step === "active")) {
      localStorage.setItem("zynum_active_order", JSON.stringify({
        order: activeOrder,
        step,
        service: selectedService,
        country: selectedCountry,
        operator: selectedOperator,
      }));
    }
  }, [activeOrder, step, selectedService, selectedCountry, selectedOperator]);

  // ── Code de réduction ───────────────────────────────────────────────────────
  const [discountInput, setDiscountInput] = useState("");
  const [discountApplied, setDiscountApplied] = useState<{
    code: string; percent: number; discountedPriceUsd: number; discountedPriceFcfa: number; savedFcfa: number; savedUsd: number;
  } | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const validateDiscount = async () => {
    if (!discountInput.trim() || !selectedOperator) return;
    const op = operatorsData?.operators?.find((o) => o.name === selectedOperator);
    if (!op) return;
    setDiscountLoading(true);
    setDiscountError(null);
    setDiscountApplied(null);
    try {
      const r = await fetch(`/api/v1/validate-discount`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("zynum_token")}` },
        body: JSON.stringify({ code: discountInput.trim(), country: selectedCountry, priceUsd: op.priceUsd }),
      });
      const d = await r.json();
      if (!r.ok || !d.valid) { setDiscountError(d.error || "Code invalide"); }
      else { setDiscountApplied({ code: discountInput.trim().toUpperCase(), percent: d.percent, discountedPriceUsd: d.discountedPriceUsd, discountedPriceFcfa: d.discountedPriceFcfa, savedFcfa: d.savedFcfa, savedUsd: d.savedUsd }); }
    } catch { setDiscountError("Impossible de valider le code"); }
    setDiscountLoading(false);
  };

  const removeDiscount = () => { setDiscountApplied(null); setDiscountInput(""); setDiscountError(null); };

  useEffect(() => {
    const handler = (e: Event) => {
      const { service, country } = (e as CustomEvent<{ service: string; country: string }>).detail;
      if (service) setSelectedService(service);
      if (country) { setSelectedCountry(country); setDir(1); setStep("operator"); }
    };
    window.addEventListener("zynum:buy-intent", handler);
    return () => window.removeEventListener("zynum:buy-intent", handler);
  }, []);

  const { data: servicesData, isLoading: isLoadingServices } = useGetServices();
  const { data: countriesData, isLoading: isLoadingCountries } = useGetCountries(
    { service: selectedService || undefined },
    { query: { enabled: !!selectedService } }
  );
  const { data: operatorsData, isLoading: isLoadingOperators } = useGetOperators(selectedService, selectedCountry);

  useEffect(() => {
    if (operatorsData?.operators?.length) setSelectedOperator(operatorsData.operators[0].name);
  }, [operatorsData]);

  const goTo = (next: BuyStep, forward = true) => { setDir(forward ? 1 : -1); setStep(next); };
  const goBack = (prev: BuyStep) => goTo(prev, false);

  const buyMutation = useBuyNumber({
    mutation: {
      onSuccess: (data) => {
        setActiveOrder(data.order);
        goTo("preview");
        refetchBalance();
      },
      onError: (error: any) => {
        const msg: string = error?.response?.data?.message ?? "";
        const isBalance = /balance|no free|insufficient|solde/i.test(msg);
        toast({
          variant: "destructive",
          title: isBalance ? t("buy_insufficient") : t("buy_error_title"),
          description: isBalance ? t("buy_error_desc") : msg || t("buy_error_generic"),
        });
      },
    },
  });

  const cancelMutation = useCancelOrder({
    mutation: {
      onSuccess: () => {
        setActiveOrder(null);
        clearSavedOrder();
        goTo("service", false);
        refetchBalance();
        toast({ title: t("buy_refunded"), description: t("buy_refunded_desc") });
      },
      onError: () => { setActiveOrder(null); clearSavedOrder(); goTo("service", false); },
    },
  });

  const needsPolling = (order: typeof activeOrder) =>
    !!order && (order.status === "PENDING" || (order.status === "RECEIVED" && !order.smsCode));

  const { data: smsData, refetch: refetchSms } = useCheckSms(activeOrder?.id || "", {
    query: {
      enabled: !!activeOrder && step === "active" && needsPolling(activeOrder),
      refetchInterval: (q) => (needsPolling(q.state.data?.order ?? activeOrder) ? 5000 : false),
    },
  });

  useEffect(() => {
    if (!smsData?.order) return;
    setActiveOrder(smsData.order);
    if ((smsData.order.status === "RECEIVED" || smsData.order.status === "FINISHED") && smsData.order.smsCode) {
      toast({ title: t("buy_sms_toast"), description: `${t("buy_sms_code_toast")} ${smsData.order.smsCode}` });
    } else if (["TIMEOUT", "BANNED", "CANCELED"].includes(smsData.order.status)) {
      const wasAutocanceled = (smsData as any).autocanceled;
      clearSavedOrder();
      toast({
        variant: "destructive",
        title: wasAutocanceled ? t("buy_autocanceled_title") : t("buy_expired_toast"),
        description: wasAutocanceled ? t("buy_autocanceled_desc") : t("buy_expired_desc"),
      });
      refetchBalance();
    }
  }, [smsData, toast, t, clearSavedOrder, refetchBalance]);

  const handleGetNumber = useCallback(() => {
    if (!selectedService || !selectedCountry) return;
    setBuyCount((c) => c + 1);
    buyMutation.mutate({ data: {
      service: selectedService,
      country: selectedCountry,
      currency: currency as "USD" | "FCFA",
      operator: selectedOperator ?? "any",
      discountCode: discountApplied?.code,
    }});
  }, [selectedService, selectedCountry, selectedOperator, currency, discountApplied, buyMutation]);

  const handleChangeNumber = () => {
    if (!activeOrder) return;
    cancelMutation.mutate(activeOrder.id);
    if (selectedService && selectedCountry) {
      setTimeout(() => {
        setBuyCount((c) => c + 1);
        buyMutation.mutate({ data: { service: selectedService, country: selectedCountry, currency: currency as "USD" | "FCFA" } });
      }, 400);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} ${t("buy_copied")}` });
  };

  const balance = balanceData?.balance ?? 0;
  const formatBalance = () => currency === "FCFA"
    ? `${Math.round(balance * 620).toLocaleString("fr-FR")} FCFA`
    : `$${balance.toFixed(2)}`;

  const selectedServiceInfo = servicesData?.services.find((s) => s.id === selectedService);
  const selectedCountryInfo  = countriesData?.countries.find((c) => c.code === selectedCountry);
  const operators = operatorsData?.operators ?? [];

  if (isEmbedded && isUserLoading) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // ── BALANCE PILL (blanc ou coloré selon contexte) ───────────────────────────
  const BalancePill = ({ variant = "colored" }: { variant?: "colored" | "white" }) => {
    if (variant === "white") {
      return (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 999,
          background: "rgba(255,255,255,0.20)",
          border: "1px solid rgba(255,255,255,0.55)",
        }}>
          <Wallet style={{ width: 15, height: 15, color: "#ffffff", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap" }}>
            {t("buy_balance_pill")} {formatBalance()}
          </span>
          {balance === 0 && (
            <button
              onClick={() => { window.location.href = "/recharge"; }}
              style={{ fontSize: 12, fontWeight: 800, color: "#ffffff", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 2 }}
            >
              {t("buy_top_up_pill")} →
            </button>
          )}
        </div>
      );
    }
    return (
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: 999,
        background: balance > 0 ? "#f0fdf4" : "#fff1f2",
        border: `1px solid ${balance > 0 ? "#bbf7d0" : "#fecdd3"}`,
      }}>
        <Wallet style={{ width: 15, height: 15, color: balance > 0 ? "#16a34a" : "#e11d48", flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: balance > 0 ? "#15803d" : "#be123c", whiteSpace: "nowrap" }}>
          {t("buy_balance_pill")} {formatBalance()}
        </span>
        {balance === 0 && (
          <button
            onClick={() => { window.location.href = "/recharge"; }}
            style={{ fontSize: 12, fontWeight: 800, color: "#e11d48", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: 2 }}
          >
            {t("buy_top_up_pill")} →
          </button>
        )}
      </div>
    );
  };

  // ── STEP 1 — SERVICE ────────────────────────────────────────────────────────
  if (step === "service") {
    const filtered = (servicesData?.services ?? []).filter((s) =>
      s.name.toLowerCase().includes(searchService.toLowerCase())
    );
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#F5F6FA" }}>

        {/* ── En-tête fixé ── */}
        <div style={{ flexShrink: 0, position: "sticky", top: 0, zIndex: 20, background: "#F5F6FA", paddingBottom: 4 }}>
          {/* Carte titre + solde */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#ffffff", borderRadius: 18, margin: "12px 16px 0",
            padding: "14px 16px", overflow: "hidden",
            boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
          }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#111827", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>Choisir un service</span>
            {user && <div style={{ flexShrink: 0 }}><BalancePill variant="colored" /></div>}
          </div>

          {/* Barre de recherche */}
          <div style={{ position: "relative", margin: "10px 16px 8px" }}>
            <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9CA3AF", pointerEvents: "none" }} />
            <input
              placeholder="Rechercher un service..."
              value={searchService}
              onChange={(e) => setSearchService(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                paddingLeft: 42, paddingRight: 16, height: 44,
                borderRadius: 14, border: "1.5px solid #E5E7EB",
                background: "#ffffff", fontSize: 14, color: "#111827",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* ── Liste des services ── */}
        <div style={{ flex: 1, overflowY: "auto", background: "#ffffff", borderRadius: "18px 18px 0 0", margin: "0 0 0 0" }}>
          {isLoadingServices ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
              <Loader2 style={{ width: 32, height: 32, color: "#3b82f6", animation: "spin 1s linear infinite" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "64px 24px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
              Aucun service pour « <strong style={{ color: "#111827" }}>{searchService}</strong> »
            </div>
          ) : (
            filtered.map((svc, i) => (
              <button
                key={svc.id}
                onClick={() => { setSelectedService(svc.id); setSelectedCountry(null); setSelectedOperator(null); goTo("country"); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 20px", background: "transparent", border: "none",
                  borderBottom: i < filtered.length - 1 ? "1px solid #F3F4F6" : "none",
                  cursor: "pointer", textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <ServiceLogo icon={svc.icon} color={svc.color} name={svc.name} size={50} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", margin: 0 }}>{svc.name}</p>
                  <p style={{ fontSize: 12, color: "#9CA3AF", margin: "3px 0 0" }}>Disponible dans plusieurs pays</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#2563EB" }}>Sélectionner</span>
                  <ChevronRight style={{ width: 16, height: 16, color: "#60A5FA" }} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── STEP 2 — COUNTRY ────────────────────────────────────────────────────────
  if (step === "country") {
    const allCountries = countriesData?.countries ?? [];
    const filtered = allCountries
      .filter((c) => c.available > 0)
      .filter((c) => c.name.toLowerCase().includes(searchCountry.toLowerCase()));

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>

        {/* ── En-tête fixé ── */}
        <div style={{ flexShrink: 0, position: "sticky", top: 0, zIndex: 20, background: "#ffffff", borderBottom: "1px solid #F3F4F6" }}>
          {/* Barre retour + titre + solde */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 10px", overflow: "hidden" }}>
            <button
              onClick={() => goBack("service")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 10, display: "flex", alignItems: "center", flexShrink: 0 }}
            >
              <ArrowLeft style={{ width: 22, height: 22, color: "#374151" }} />
            </button>
            <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Changer de service</span>
            {user && <div style={{ flexShrink: 0 }}><BalancePill variant="white" /></div>}
          </div>

          {/* Carte service sélectionné */}
          {selectedServiceInfo && (
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              margin: "0 16px 12px", padding: "12px 14px",
              background: "#F9FAFB", borderRadius: 16,
              border: "1px solid #E5E7EB",
            }}>
              <ServiceLogo icon={selectedServiceInfo.icon} color={selectedServiceInfo.color} name={selectedServiceInfo.name} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Service sélectionné</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedServiceInfo.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Titre section + recherche (scrollable) ── */}
        <div style={{ flexShrink: 0, padding: "16px 16px 0" }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Dans quel pays ?</p>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 12px", lineHeight: 1.5 }}>
            Sélectionnez le pays pour lequel vous souhaitez un numéro virtuel.
          </p>

          {/* Barre recherche pays */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9CA3AF", pointerEvents: "none" }} />
            <input
              placeholder="Rechercher un pays..."
              value={searchCountry}
              onChange={(e) => setSearchCountry(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                paddingLeft: 42, paddingRight: 16, height: 44,
                borderRadius: 14, border: "1.5px solid #E5E7EB",
                background: "#F9FAFB", fontSize: 14, color: "#111827",
                outline: "none",
              }}
            />
          </div>

          {/* séparateur */}
          <div style={{ height: 1, background: "#F3F4F6", margin: "8px 0" }} />
        </div>

        {/* ── Liste pays ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {isLoadingCountries ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
              <Loader2 style={{ width: 28, height: 28, color: "#3b82f6", animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <>
              {filtered.map((country, i) => {
                const priceUsd = country.priceUsd ?? 0;
                const priceFcfa = country.priceFcfa ?? Math.round(priceUsd * 620);
                return (
                  <button
                    key={country.code}
                    onClick={() => {
                      setSelectedCountry(country.code);
                      if (isEmbedded) {
                        goTo("operator");
                      } else {
                        sessionStorage.setItem("zynum_buy_intent", JSON.stringify({ service: selectedService, country: country.code }));
                        if (user) { setLocation("/dashboard"); } else { setLocation("/login"); }
                      }
                    }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center",
                      padding: "13px 20px", background: "transparent", border: "none",
                      borderBottom: i < filtered.length - 1 ? "1px solid #F3F4F6" : "none",
                      cursor: "pointer", textAlign: "left",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F9FAFB")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 26, marginRight: 14, flexShrink: 0, lineHeight: 1 }}>{country.flag ?? "🌐"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", margin: 0 }}>{country.name}</p>
                      <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0" }}>
                        {country.available.toLocaleString("fr-FR")} {country.available > 1 ? t("buy_num_available_plural") : t("buy_num_available_single")}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>
                        {currency === "FCFA" ? `${priceFcfa.toLocaleString("fr-FR")} FCFA` : `$${priceUsd.toFixed(2)}`}
                      </span>
                      <ChevronRight style={{ width: 16, height: 16, color: "#D1D5DB" }} />
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: "64px 24px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
                  {t("buy_no_country_for")}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 3 — OPERATOR ───────────────────────────────────────────────────────
  if (step === "operator") {
    return (
      <div className="flex flex-col min-h-full">
        {/* Sticky header bleu */}
        <div className="sticky top-0 z-20 px-4 pt-3 pb-3 space-y-2" style={{ backgroundColor: "#1A3FFF" }}>
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => goBack("country")} className="p-2 -ml-2 rounded-xl active:bg-blue-700 transition-colors shrink-0">
              <ArrowLeft style={{ width: 20, height: 20, color: "#ffffff" }} />
            </button>
            <h1 className="text-base font-extrabold flex-1 min-w-0 truncate" style={{ color: "#ffffff" }}>{t("buy_s3_title")}</h1>
            {user && <div className="shrink-0"><BalancePill variant="white" /></div>}
          </div>

          {/* Carte service + pays */}
          {selectedServiceInfo && (
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
              <ServiceLogo icon={selectedServiceInfo.icon} color={selectedServiceInfo.color} name={selectedServiceInfo.name} size={38} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: '#ffffff' }}>{selectedServiceInfo.name}</p>
                <p className="font-bold text-sm truncate" style={{ color: '#ffffff' }}>{selectedCountryInfo?.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sous-titre */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs text-gray-500">{t("buy_s3_sub")}</p>
        </div>

        {/* Liste opérateurs */}
        <div className="flex-1 px-4 space-y-3 pb-4">
          {isLoadingOperators ? (
            <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>
          ) : operators.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">{t("buy_no_operator")}</div>
          ) : (
            operators.map((op, i) => {
              const active = selectedOperator === op.name;
              return (
                <motion.button
                  key={op.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setSelectedOperator(op.name)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-4 rounded-2xl border text-left transition-all ${
                    active ? "border-blue-400 bg-blue-50 shadow-md shadow-blue-100" : "border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                      {op.label?.slice(0, 1).toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{op.label ?? op.name}</p>
                        {i === 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700">{t("buy_recommended")}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{op.available} {t("buy_num_dispo")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-bold text-gray-900 text-sm">
                      {currency === "FCFA" ? `${op.priceFcfa?.toLocaleString("fr-FR")} FCFA` : `$${op.priceUsd?.toFixed(2)}`}
                    </p>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${active ? "border-blue-600 bg-blue-600" : "border-gray-300"}`}>
                      {active && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}

          {/* Code de réduction */}
          {selectedOperator && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Code de réduction</p>
              {discountApplied ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-green-700">{discountApplied.code} — {discountApplied.percent}% de réduction</p>
                        <p className="text-xs text-green-600">Économie : {discountApplied.savedFcfa.toLocaleString("fr-FR")} FCFA</p>
                      </div>
                    </div>
                    <button onClick={removeDiscount} className="p-1 rounded-lg hover:bg-green-100 text-green-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white border border-gray-200">
                    <span className="text-xs text-gray-500 line-through">
                      {currency === "FCFA"
                        ? `${(operatorsData?.operators?.find(o => o.name === selectedOperator)?.priceFcfa ?? 0).toLocaleString("fr-FR")} FCFA`
                        : `$${(operatorsData?.operators?.find(o => o.name === selectedOperator)?.priceUsd ?? 0).toFixed(2)}`}
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      {currency === "FCFA"
                        ? `${discountApplied.discountedPriceFcfa.toLocaleString("fr-FR")} FCFA`
                        : `$${discountApplied.discountedPriceUsd.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={discountInput}
                    onChange={e => { setDiscountInput(e.target.value.toUpperCase()); setDiscountError(null); }}
                    onKeyDown={e => e.key === "Enter" && validateDiscount()}
                    placeholder="Entrez votre code promo"
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 uppercase"
                  />
                  <button
                    onClick={validateDiscount}
                    disabled={!discountInput.trim() || discountLoading}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  >
                    {discountLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
                  </button>
                </div>
              )}
              {discountError && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{discountError}</p>}
            </div>
          )}
        </div>

        {/* Bouton fixé en bas */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4">
          <Button
            className="w-full h-13 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-base shadow-lg shadow-blue-500/30"
            disabled={!selectedOperator || buyMutation.isPending || balance === 0}
            onClick={handleGetNumber}
          >
            {buyMutation.isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t("buy_assigning")}</>
            ) : (
              <><Phone className="w-5 h-5 mr-2" /> {t("buy_get_number")}</>
            )}
          </Button>
          {balance === 0 && (
            <p className="text-center text-xs text-red-400 mt-2">
              {t("buy_insufficient")}.{" "}
              <button onClick={() => { window.location.href = "/recharge"; }} className="underline hover:text-red-700">
                {t("buy_insufficient_top_up")}
              </button>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── STEP 4 — PREVIEW ────────────────────────────────────────────────────────
  if (step === "preview" && activeOrder) {
    const svc = selectedServiceInfo;
    return (
      <AnimatePresence mode="wait">
        <StepPage key="preview" dir={dir}>
          <div className="flex flex-col min-h-full">
            {/* Sticky header */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => { cancelMutation.mutate(activeOrder.id); }}
                disabled={cancelMutation.isPending}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="font-extrabold text-gray-900 text-base flex-1">Votre numéro</h1>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                {currency === "FCFA" ? `${activeOrder.priceFcfa.toLocaleString("fr-FR")} FCFA` : `$${activeOrder.priceUsd.toFixed(2)}`}
              </span>
            </div>

            <div className="flex-1 px-4 pt-6 pb-6 space-y-4">
              {/* Service + country banner */}
              <div className="rounded-3xl overflow-hidden shadow-lg" style={{ background: svc ? `${svc.color}` : "#3b82f6" }}>
                <div className="px-6 py-6 flex items-center justify-center gap-4">
                  {svc && (
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden shadow-lg">
                      <img src={svc.icon} alt={svc.name} className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                  )}
                  <div>
                    <p className="font-black text-xl" style={{ color: '#ffffff' }}>{activeOrder.serviceName}</p>
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{activeOrder.countryName}</p>
                  </div>
                </div>
              </div>

              {/* Phone number */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-5">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Votre Numéro</p>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-blue-500 shrink-0" />
                  <span className="text-2xl font-black text-blue-600 font-mono tracking-wide flex-1 select-all">{activeOrder.phone}</span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => copy(activeOrder.phone, "Numéro")}
                className="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-98 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 transition-all"
              >
                <Copy className="w-5 h-5" />
                Copier le numéro
              </button>

              <button
                onClick={() => { setStep("active"); toast({ title: t("buy_confirmed"), description: t("buy_confirmed_desc") }); }}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
              >
                <MessageSquare className="w-5 h-5" />
                Obtenir le code
              </button>

              <button
                onClick={handleChangeNumber}
                disabled={buyMutation.isPending || cancelMutation.isPending}
                className="w-full h-11 rounded-2xl border-2 border-gray-200 text-gray-500 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {buyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {t("buy_get_another")}
              </button>

              <button
                onClick={() => cancelMutation.mutate(activeOrder.id)}
                disabled={cancelMutation.isPending}
                className="w-full text-red-500 text-sm font-semibold py-2 hover:text-red-700 transition-colors"
              >
                {cancelMutation.isPending ? "Annulation…" : t("buy_cancel_refund")}
              </button>
            </div>
          </div>
        </StepPage>
      </AnimatePresence>
    );
  }

  // ── STEP 5 — ACTIVE / SMS POLLING ───────────────────────────────────────────
  if (step === "active" && activeOrder) {
    const svc = selectedServiceInfo;
    const isPending = activeOrder.status === "PENDING" || (activeOrder.status === "RECEIVED" && !activeOrder.smsCode);
    const isSuccess = (activeOrder.status === "RECEIVED" || activeOrder.status === "FINISHED") && !!activeOrder.smsCode;
    const isFailed  = ["TIMEOUT", "BANNED", "CANCELED"].includes(activeOrder.status);

    return (
      <AnimatePresence mode="wait">
        <StepPage key="active" dir={dir}>
          <div className="flex flex-col min-h-full bg-gray-50">

            {/* ── Sticky header ── */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
              <button
                onClick={() => { setActiveOrder(null); clearSavedOrder(); goTo("service", false); setBuyCount(0); }}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="font-extrabold text-gray-900 text-base flex-1">Code de vérification</h1>
              {isPending && (
                <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">En attente</span>
              )}
              {isSuccess && (
                <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">✓ Reçu</span>
              )}
              {isFailed && (
                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">Expiré</span>
              )}
            </div>

            <div className="flex-1 px-4 pt-5 pb-6 space-y-4">

              {/* Service + country row */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex items-center gap-3">
                {svc && (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: svc.color }}>
                    <img src={svc.icon} alt={svc.name} className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{activeOrder.serviceName}</p>
                  <p className="text-sm text-gray-400">{activeOrder.countryName}</p>
                </div>
                <span className="text-xs font-bold text-gray-500">
                  {currency === "FCFA" ? `${activeOrder.priceFcfa.toLocaleString("fr-FR")} FCFA` : `$${activeOrder.priceUsd.toFixed(2)}`}
                </span>
              </div>

              {/* Phone number + copy */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Numéro de téléphone</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-gray-900 font-mono tracking-wide flex-1 select-all">{activeOrder.phone}</span>
                  <button
                    onClick={() => copy(activeOrder.phone, "Numéro")}
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copier
                  </button>
                </div>
              </div>

              {/* ── SMS code card ── */}
              {isPending && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-7 flex flex-col items-center gap-4 text-center">
                  <CountdownRing
                    createdAt={activeOrder.createdAt}
                    onExpired={() => {
                      if (!cancelMutation.isPending) {
                        cancelMutation.mutate(activeOrder.id);
                        toast({ title: t("buy_autocanceled_title"), description: t("buy_autocanceled_desc"), variant: "destructive" });
                      }
                    }}
                  />
                  <div>
                    <p className="font-bold text-gray-900 text-base">En attente du SMS…</p>
                    <p className="text-sm text-gray-400 mt-1 max-w-xs">
                      Utilisez le numéro ci-dessus dans <strong className="text-gray-700">{activeOrder.serviceName}</strong> pour demander la vérification.
                    </p>
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => refetchSms()}
                      className="flex-1 h-11 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> Vérifier
                    </button>
                    <button
                      onClick={() => cancelMutation.mutate(activeOrder.id)}
                      disabled={cancelMutation.isPending}
                      className="flex-1 h-11 rounded-xl border-2 border-red-100 text-red-500 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl border border-green-100 shadow-sm overflow-hidden"
                >
                  {/* SMS Received badge */}
                  <div className="flex justify-center pt-6 pb-2">
                    <span className="inline-flex items-center gap-2 bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-green-500/30">
                      <CheckCircle2 className="w-4 h-4" /> SMS Reçu
                    </span>
                  </div>

                  {/* Code */}
                  <div className="px-6 py-5 text-center">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">Code de vérification</p>
                    <button
                      onClick={() => copy(activeOrder.smsCode || "", "Code")}
                      className="group w-full"
                    >
                      <p className="text-5xl font-black text-teal-600 tracking-[0.25em] font-mono mb-1 group-hover:text-teal-700 transition-colors select-all">
                        {activeOrder.smsCode}
                      </p>
                      <p className="text-xs text-teal-500 font-semibold flex items-center justify-center gap-1.5 group-hover:text-teal-700 transition-colors">
                        <Copy className="w-3.5 h-3.5" /> Appuyer pour copier
                      </p>
                    </button>
                  </div>

                  {/* Full SMS message */}
                  {activeOrder.smsText && (
                    <div className="mx-4 mb-5 bg-gray-50 border border-gray-100 rounded-2xl p-4">
                      <p className="text-xs text-gray-400 font-semibold mb-1.5">Message complet</p>
                      <p className="text-sm text-gray-700 font-mono leading-relaxed">{activeOrder.smsText}</p>
                    </div>
                  )}

                  <div className="px-4 pb-5">
                    <button
                      onClick={() => copy(activeOrder.smsCode || "", "Code")}
                      className="w-full h-12 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all active:scale-98"
                    >
                      <Copy className="w-4 h-4" /> Copier le code
                    </button>
                  </div>
                </motion.div>
              )}

              {isFailed && (
                <div className="bg-white rounded-3xl border border-red-100 shadow-sm px-5 py-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base mb-1">Numéro expiré</p>
                    <p className="text-sm text-gray-400">Le délai est écoulé ou le numéro a été annulé.</p>
                  </div>
                  <button
                    onClick={() => { setActiveOrder(null); clearSavedOrder(); goTo("service", false); setBuyCount(0); }}
                    className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {/* Instructions */}
              {isPending && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-4">
                  <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5 mb-2">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    Que faire pendant l'attente ?
                  </p>
                  <ol className="space-y-1.5 text-xs text-blue-700">
                    <li className="flex gap-2"><span className="font-bold shrink-0">1.</span> Copiez le numéro de téléphone ci-dessus.</li>
                    <li className="flex gap-2"><span className="font-bold shrink-0">2.</span> Ouvrez {activeOrder.serviceName} et demandez un code de vérification avec ce numéro.</li>
                    <li className="flex gap-2"><span className="font-bold shrink-0">3.</span> Le code apparaîtra automatiquement ici dès réception.</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </StepPage>
      </AnimatePresence>
    );
  }

  return null;
}
