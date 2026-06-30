import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft, Copy, Check, Loader2, CheckCircle2,
  AlertCircle, Clock, ExternalLink,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBalanceQueryKey, useGetCurrentUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

const FCFA_PER_USD = 620;

const NP_CURRENCIES = [
  { id: "usdttrc20", label: "USDT",     sub: "TRC20",  color: "#26A17B" },
  { id: "usdterc20", label: "USDT",     sub: "ERC20",  color: "#627EEA" },
  { id: "btc",       label: "Bitcoin",  sub: "BTC",    color: "#F7931A" },
  { id: "eth",       label: "Ethereum", sub: "ETH",    color: "#627EEA" },
  { id: "ltc",       label: "Litecoin", sub: "LTC",    color: "#345D9D" },
  { id: "trx",       label: "TRON",     sub: "TRX",    color: "#EF0027" },
];

type Provider = "nowpayments" | "oxapay";
type Step     = "amount" | "pending" | "success" | "failed";

interface NpData {
  paymentId: string; orderId: string; payAddress: string;
  payAmount: number; payCurrency: string; network: string;
  priceUsd: number;  amountFcfa: number;
}
interface OpData {
  trackId: string; orderId: string; payLink: string;
  amountUsd: number; amountFcfa: number;
}

export default function CryptoRecharge() {
  const [, navigate] = useLocation();
  const { toast }   = useToast();
  const { t }       = useLanguage();
  const queryClient = useQueryClient();

  const { data: userData } = useGetCurrentUser({ query: { retry: false } as any });
  const user = userData as { id: number } | undefined;

  const [provider,            setProvider]            = useState<Provider>("nowpayments");
  const [step,                setStep]                = useState<Step>("amount");
  const [amountInput,         setAmountInput]         = useState("");
  const [payCur,              setPayCur]              = useState("usdttrc20");
  const [loading,             setLoading]             = useState(false);
  const [copied,              setCopied]              = useState(false);
  const [timeLeft,            setTimeLeft]            = useState(60 * 60);
  const [npData,              setNpData]              = useState<NpData | null>(null);
  const [opData,              setOpData]              = useState<OpData | null>(null);
  const [oxapayEnabled,       setOxapayEnabled]       = useState(true);
  const [nowpaymentsEnabled,  setNowpaymentsEnabled]  = useState(true);

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const amountFcfa = Math.max(0, Math.round(parseFloat(amountInput) || 0));
  const amountUsd  = (amountFcfa / FCFA_PER_USD).toFixed(2);
  const selectedCur = NP_CURRENCIES.find(c => c.id === payCur) ?? NP_CURRENCIES[0];

  useEffect(() => {
    fetch("/api/v1/settings")
      .then(r => r.json())
      .then((d: { settings?: Record<string, string> }) => {
        const s = d.settings ?? {};
        const oxEnabled = s["oxapay_enabled"] !== "false";
        const npEnabled = s["nowpayments_enabled"] !== "false";
        setOxapayEnabled(oxEnabled);
        setNowpaymentsEnabled(npEnabled);
        if (!npEnabled && oxEnabled) setProvider("oxapay");
        if (!oxEnabled && npEnabled) setProvider("nowpayments");
      })
      .catch(() => {});
  }, []);

  const stopAll = useCallback(() => {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const startTimer = useCallback((duration: number) => {
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { stopAll(); setStep("failed"); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [stopAll]);

  const startNpPolling = useCallback((paymentId: string, orderId: string, uid: number) => {
    pollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("zynum_token");
        const res = await fetch(
          `/api/v1/payments/nowpayments/status/${paymentId}?orderId=${orderId}&userId=${uid}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        const data = await res.json();
        if (data.credited) {
          stopAll();
          setStep("success");
          queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
        } else if (data.failed) {
          stopAll();
          setStep("failed");
        }
      } catch { /* retry */ }
    }, 10_000);
  }, [queryClient, stopAll]);

  const startOpPolling = useCallback((trackId: string, orderId: string, uid: number) => {
    pollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("zynum_token");
        const res = await fetch("/api/v1/payments/oxapay/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ trackId, orderId, userId: uid }),
        });
        const data = await res.json();
        if (data.credited) {
          stopAll();
          setStep("success");
          queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
        } else if (data.failed) {
          stopAll();
          setStep("failed");
        }
      } catch { /* retry */ }
    }, 8_000);
  }, [queryClient, stopAll]);

  const authHeader = () => {
    const tk = localStorage.getItem("zynum_token");
    return tk ? { Authorization: `Bearer ${tk}` } : {};
  };

  const initiateNowPayments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/payments/nowpayments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() } as Record<string, string>,
        body: JSON.stringify({ amountFcfa, userId: user.id, payCurrency: payCur }),
      });
      const data = await res.json();
      if (!res.ok || !data.payAddress) throw new Error(data.error ?? data.message ?? "Erreur NowPayments");
      setNpData(data);
      setStep("pending");
      startTimer(60 * 60);
      startNpPolling(data.paymentId, data.orderId, user.id);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const initiateOxaPay = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/payments/oxapay/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() } as Record<string, string>,
        body: JSON.stringify({ amountFcfa, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.payLink) throw new Error(data.error ?? data.message ?? "Erreur OxaPay");
      setOpData(data);
      setStep("pending");
      startTimer(30 * 60);
      startOpPolling(data.trackId, data.orderId, user.id);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const minFcfa = 300;
  const minUsd  = (minFcfa / FCFA_PER_USD).toFixed(2);

  const handlePay = () => {
    if (amountFcfa < minFcfa) {
      toast({ title: t("crypto_min_amount"), description: `${minFcfa} FCFA (~$${minUsd})`, variant: "destructive" });
      return;
    }
    if (provider === "nowpayments") initiateNowPayments();
    else initiateOxaPay();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const reset = () => {
    stopAll();
    setStep("amount");
    setNpData(null);
    setOpData(null);
    setAmountInput("");
    setTimeLeft(60 * 60);
  };

  const canGoBack = step === "amount" || step === "success" || step === "failed";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#f9fafb", overflow: "hidden", maxWidth: "100vw" }}>

      {/* ── Header ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #f3f4f6",
        padding: "16px 16px 14px", display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={() => { if (canGoBack) { stopAll(); navigate("/recharge"); } }}
          style={{
            width: 38, height: 38, borderRadius: 12, border: "none",
            background: canGoBack ? "#f3f4f6" : "#e5e7eb",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: canGoBack ? "pointer" : "not-allowed", flexShrink: 0,
          }}
        >
          <ChevronLeft style={{ width: 20, height: 20, color: canGoBack ? "#374151" : "#9ca3af" }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 17, color: "#111827", margin: 0 }}>{t("crypto_title")}</p>
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
            {step === "pending" && (npData || opData)
              ? `⏱ ${t("crypto_expires_in")} ${formatTime(timeLeft)}`
              : t("crypto_currencies")}
          </p>
        </div>
        <img src="/crypto-icon.png" alt="Crypto" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 16px 40px" }}>

        {/* ══════ STEP: amount ══════ */}
        {step === "amount" && (
          <>
            {/* Provider not available */}
            {!oxapayEnabled && !nowpaymentsEnabled ? (
              <div style={{ background: "#fef2f2", borderRadius: 16, padding: "16px", textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "#dc2626", fontWeight: 700, margin: 0 }}>
                  {t("crypto_no_gateway")}
                </p>
              </div>
            ) : (
              <>
                {/* Provider tabs */}
                {(() => {
                  const tabs = [
                    { id: "nowpayments" as Provider, label: "NowPayments", enabled: nowpaymentsEnabled },
                    { id: "oxapay"      as Provider, label: "OxaPay",      enabled: oxapayEnabled },
                  ].filter(p => p.enabled);
                  return tabs.length > 1 ? (
                    <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 14, padding: 4, marginBottom: 20, gap: 4 }}>
                      {tabs.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setProvider(p.id)}
                          style={{
                            flex: 1, padding: "10px 4px", borderRadius: 11, border: "none", cursor: "pointer",
                            fontWeight: 700, fontSize: 13, transition: "all 0.15s",
                            background: provider === p.id ? "#fff" : "transparent",
                            color: provider === p.id ? "#111827" : "#9ca3af",
                            boxShadow: provider === p.id ? "0 1px 6px rgba(0,0,0,0.10)" : "none",
                          }}
                        >
                          {p.label}
                          {p.id === "nowpayments" && provider === p.id && (
                            <span style={{ display: "block", fontSize: 9, color: "#10b981", fontWeight: 800, marginTop: 2 }}>
                              {t("crypto_recommended")}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: "#f0fdf4", borderRadius: 14, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                      <CheckCircle2 style={{ width: 18, height: 18, color: "#059669", flexShrink: 0 }} />
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#059669", margin: 0 }}>{tabs[0]?.label}</p>
                    </div>
                  );
                })()}

                {/* NowPayments: currency selector */}
                {provider === "nowpayments" && (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, marginTop: 0 }}>
                      {t("crypto_currency_label")}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 24 }}>
                      {NP_CURRENCIES.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setPayCur(c.id)}
                          style={{
                            padding: "12px 6px", borderRadius: 14, border: "2px solid",
                            borderColor: payCur === c.id ? c.color : "#e5e7eb",
                            background: payCur === c.id ? `${c.color}18` : "#fff",
                            cursor: "pointer", textAlign: "center", transition: "all 0.15s",
                          }}
                        >
                          <p style={{ fontWeight: 800, color: payCur === c.id ? c.color : "#374151", fontSize: 13, margin: 0 }}>{c.label}</p>
                          <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{c.sub}</p>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* OxaPay info */}
                {provider === "oxapay" && (
                  <div style={{ background: "#eff6ff", borderRadius: 14, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>ℹ️</span>
                    <p style={{ fontSize: 13, color: "#1d4ed8", margin: 0, lineHeight: 1.5 }}>
                      {t("crypto_oxapay_info")}
                    </p>
                  </div>
                )}

                {/* Amount input */}
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  {t("crypto_amount_label")}
                </p>

                {/* Big amount input */}
                <div style={{
                  background: "#fff", borderRadius: 20, padding: "20px 20px",
                  border: "2px solid", borderColor: amountFcfa > 0 ? "#f97316" : "#e5e7eb",
                  marginBottom: 14, transition: "border-color 0.2s",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}>
                  <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, margin: "0 0 6px" }}>{t("crypto_amount_fcfa_label")}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="number"
                      placeholder="Ex: 5000"
                      value={amountInput}
                      onChange={e => setAmountInput(e.target.value)}
                      inputMode="numeric"
                      style={{
                        flex: 1, background: "none", border: "none", outline: "none",
                        fontSize: 32, fontWeight: 900, color: "#111827",
                        fontFamily: "monospace",
                      }}
                    />
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#9ca3af", flexShrink: 0 }}>FCFA</span>
                  </div>
                </div>

                {/* USD equivalent */}
                {amountFcfa > 0 && (
                  <div style={{
                    background: "#f0fdf4", borderRadius: 14, padding: "12px 16px",
                    marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>
                      {provider === "nowpayments"
                        ? `≈ en ${selectedCur.label} (${selectedCur.sub})`
                        : t("crypto_equiv_usd")}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#059669" }}>${amountUsd}</span>
                  </div>
                )}

                {/* Min amount notice */}
                <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", margin: "0 0 20px" }}>
                  {t("crypto_min_amount")} : <strong style={{ color: "#374151" }}>{minFcfa} FCFA</strong>
                  <span style={{ color: "#9ca3af" }}> (~${minUsd})</span>
                </p>

                {/* CTA */}
                <button
                  onClick={handlePay}
                  disabled={loading || amountFcfa < minFcfa}
                  style={{
                    width: "100%", height: 58, borderRadius: 18,
                    background: loading || amountFcfa < minFcfa ? "#d1d5db" : "#f97316",
                    color: "#fff", fontWeight: 800, fontSize: 16, border: "none",
                    cursor: loading || amountFcfa < minFcfa ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    transition: "all 0.15s",
                    boxShadow: amountFcfa >= minFcfa && !loading ? "0 4px 18px rgba(249,115,22,0.35)" : "none",
                  }}
                >
                  {loading
                    ? <><Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} /> {t("crypto_generating")}</>
                    : provider === "nowpayments"
                      ? `${t("crypto_generate_address")} ${selectedCur.label} →`
                      : t("crypto_oxapay_open")}
                </button>
              </>
            )}
          </>
        )}

        {/* ══════ STEP: pending — NowPayments ══════ */}
        {step === "pending" && provider === "nowpayments" && npData && (
          <>
            {/* Timer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: timeLeft < 300 ? "#fef2f2" : "#fffbeb",
              borderRadius: 14, padding: "12px 16px", marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock style={{ width: 16, height: 16, color: timeLeft < 300 ? "#ef4444" : "#f59e0b" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: timeLeft < 300 ? "#dc2626" : "#92400e" }}>
                  {t("crypto_expires_in")}
                </span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, color: timeLeft < 300 ? "#dc2626" : "#92400e", fontVariantNumeric: "tabular-nums" }}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Amount to send */}
            <div style={{ background: "#f0fdf4", borderRadius: 20, padding: 20, marginBottom: 20, textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 6px" }}>{t("crypto_send_exactly")}</p>
              <p style={{ fontSize: 32, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>
                {npData.payAmount}{" "}
                <span style={{ color: selectedCur.color, fontSize: 22 }}>{selectedCur.label}</span>
              </p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                ≈ {npData.amountFcfa.toLocaleString("fr-FR")} FCFA · ${npData.priceUsd.toFixed(2)}
              </p>
            </div>

            {/* Network */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                {t("crypto_network")}
              </p>
              <span style={{ background: "#f3f4f6", borderRadius: 10, padding: "5px 12px", fontSize: 13, fontWeight: 700, color: "#374151" }}>
                {npData.network || selectedCur.sub}
              </span>
            </div>

            {/* QR Code */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <div style={{ background: "#fff", border: "2px solid #e5e7eb", borderRadius: 20, padding: 12 }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(npData.payAddress)}&bgcolor=ffffff&color=000000`}
                  alt="QR Code"
                  style={{ width: 180, height: 180, display: "block" }}
                />
              </div>
            </div>

            {/* Address */}
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {t("crypto_pay_address")}
            </p>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#f9fafb", borderRadius: 16, padding: "14px 16px",
              border: "1.5px solid #e5e7eb", marginBottom: 20,
            }}>
              <p style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#374151", margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>
                {npData.payAddress}
              </p>
              <button
                onClick={() => handleCopy(npData.payAddress)}
                style={{
                  background: copied ? "#d1fae5" : "#e5e7eb", border: "none", borderRadius: 10,
                  padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                  flexShrink: 0, transition: "background 0.15s",
                }}
              >
                {copied
                  ? <><Check style={{ width: 14, height: 14, color: "#059669" }} /><span style={{ fontSize: 12, fontWeight: 700, color: "#059669" }}>{t("crypto_copied")}</span></>
                  : <><Copy style={{ width: 14, height: 14, color: "#6b7280" }} /><span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{t("crypto_copy")}</span></>}
              </button>
            </div>

            {/* Waiting indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#eff6ff", borderRadius: 14, padding: "14px 16px" }}>
              <Loader2 style={{ width: 18, height: 18, color: "#3b82f6", animation: "spin 1s linear infinite", flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: "#1d4ed8", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                {t("crypto_waiting")}
              </p>
            </div>
          </>
        )}

        {/* ══════ STEP: pending — OxaPay ══════ */}
        {step === "pending" && provider === "oxapay" && opData && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 24 }}>
            {/* Timer bar */}
            <div style={{ width: "100%", height: 5, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                background: timeLeft < 300 ? "#ef4444" : "#f97316",
                width: `${(timeLeft / (30 * 60)) * 100}%`,
                transition: "width 1s linear", borderRadius: 3,
              }} />
            </div>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ExternalLink style={{ width: 34, height: 34, color: "#f97316" }} />
            </div>
            <div>
              <p style={{ fontWeight: 900, fontSize: 20, color: "#111827", margin: "0 0 8px" }}>{t("crypto_oxapay_finalize")}</p>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>{t("crypto_oxapay_desc")}</p>
            </div>
            <a
              href={opData.payLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", height: 56, borderRadius: 18,
                background: "#f97316", color: "#fff",
                fontWeight: 800, fontSize: 15, textDecoration: "none",
              }}
            >
              <ExternalLink style={{ width: 18, height: 18 }} />
              {t("crypto_oxapay_btn")}
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Loader2 style={{ width: 14, height: 14, color: "#9ca3af", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13, color: "#9ca3af" }}>{t("crypto_oxapay_waiting")} ({formatTime(timeLeft)})</span>
            </div>
          </div>
        )}

        {/* ══════ STEP: success ══════ */}
        {step === "success" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20, paddingTop: 40 }}>
            <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 style={{ width: 50, height: 50, color: "#059669" }} />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 24, color: "#111827", margin: "0 0 10px" }}>{t("crypto_success_title")}</h2>
              <p style={{ fontSize: 15, color: "#6b7280", margin: 0 }}>{t("crypto_success_desc")}</p>
            </div>
            <button
              onClick={() => { stopAll(); navigate("/recharge"); }}
              style={{
                width: "100%", height: 56, borderRadius: 18,
                background: "#059669", color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer",
              }}
            >
              {t("crypto_back_recharge")}
            </button>
          </div>
        )}

        {/* ══════ STEP: failed ══════ */}
        {step === "failed" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20, paddingTop: 40 }}>
            <div style={{ width: 90, height: 90, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle style={{ width: 50, height: 50, color: "#dc2626" }} />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 24, color: "#111827", margin: "0 0 10px" }}>{t("crypto_failed_title")}</h2>
              <p style={{ fontSize: 15, color: "#6b7280", margin: 0 }}>{t("crypto_failed_desc")}</p>
            </div>
            <button
              onClick={reset}
              style={{
                width: "100%", height: 56, borderRadius: 18,
                background: "#f97316", color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer",
              }}
            >
              {t("crypto_retry")}
            </button>
            <button
              onClick={() => { stopAll(); navigate("/recharge"); }}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 15, cursor: "pointer", marginTop: 4 }}
            >
              {t("crypto_back_recharge")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
