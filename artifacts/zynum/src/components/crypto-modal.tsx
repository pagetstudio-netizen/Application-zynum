import { useState, useEffect, useRef, useCallback } from "react";
import { X, Copy, Check, Loader2, CheckCircle2, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBalanceQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const FCFA_PER_USD = 620;
const PRESETS_FCFA = [1000, 2000, 5000, 10000, 20000, 50000];

// ─── Crypto currencies (NowPayments codes) ───────────────────────────────────
const NP_CURRENCIES = [
  { id: "usdttrc20", label: "USDT",    sub: "TRC20",    color: "#26A17B", emoji: "💚" },
  { id: "usdterc20", label: "USDT",    sub: "ERC20",    color: "#627EEA", emoji: "💜" },
  { id: "btc",       label: "Bitcoin", sub: "BTC",      color: "#F7931A", emoji: "🟠" },
  { id: "eth",       label: "Ethereum",sub: "ETH",      color: "#627EEA", emoji: "🔵" },
  { id: "ltc",       label: "Litecoin",sub: "LTC",      color: "#345D9D", emoji: "⚪" },
  { id: "trx",       label: "TRON",    sub: "TRX",      color: "#EF0027", emoji: "🔴" },
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

interface Props {
  open:      boolean;
  onClose:   () => void;
  userId:    number;
  onSuccess: () => void;
}

export function CryptoModal({ open, onClose, userId, onSuccess }: Props) {
  const { toast }    = useToast();
  const queryClient  = useQueryClient();

  const [provider,     setProvider]     = useState<Provider>("nowpayments");
  const [step,         setStep]         = useState<Step>("amount");
  const [amountFcfa,   setAmountFcfa]   = useState(5000);
  const [customInput,  setCustomInput]  = useState("");
  const [payCur,       setPayCur]       = useState("usdttrc20");
  const [loading,      setLoading]      = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [timeLeft,     setTimeLeft]     = useState(60 * 60);   // 60 min NowPayments
  const [npData,       setNpData]       = useState<NpData | null>(null);
  const [opData,       setOpData]       = useState<OpData | null>(null);
  const [oxapayEnabled,     setOxapayEnabled]     = useState(true);
  const [nowpaymentsEnabled, setNowpaymentsEnabled] = useState(true);

  // Fetch which providers are enabled by admin
  useEffect(() => {
    fetch("/api/v1/settings")
      .then(r => r.json())
      .then((d: { settings?: Record<string, string> }) => {
        const s = d.settings ?? {};
        const oxEnabled = s["oxapay_enabled"] !== "false";
        const npEnabled = s["nowpayments_enabled"] !== "false";
        setOxapayEnabled(oxEnabled);
        setNowpaymentsEnabled(npEnabled);
        // Auto-select an enabled provider
        if (!npEnabled && oxEnabled) setProvider("oxapay");
        if (!oxEnabled && npEnabled) setProvider("nowpayments");
      })
      .catch(() => {});
  }, [open]);

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveAmount = customInput
    ? Math.max(300, Math.round(parseFloat(customInput) || 0))
    : amountFcfa;
  const amountUsd = (effectiveAmount / FCFA_PER_USD).toFixed(2);

  const stopAll = useCallback(() => {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    if (!open) {
      stopAll();
      setStep("amount");
      setNpData(null);
      setOpData(null);
      setCustomInput("");
      setTimeLeft(60 * 60);
    }
  }, [open, stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  const startTimer = useCallback((duration: number) => {
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { stopAll(); setStep("failed"); return 0; }
        return t - 1;
      });
    }, 1000);
  }, [stopAll]);

  // ── NowPayments polling ──────────────────────────────────────────────────
  const startNpPolling = useCallback((paymentId: string, orderId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("zynum_token");
        const res = await fetch(
          `/api/v1/payments/nowpayments/status/${paymentId}?orderId=${orderId}&userId=${userId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        const data = await res.json();
        if (data.credited) {
          stopAll();
          setStep("success");
          queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
          onSuccess();
        } else if (data.failed) {
          stopAll();
          setStep("failed");
        }
      } catch { /* retry */ }
    }, 10_000);
  }, [userId, queryClient, onSuccess, stopAll]);

  // ── OxaPay polling ───────────────────────────────────────────────────────
  const startOpPolling = useCallback((trackId: string, orderId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("zynum_token");
        const res = await fetch("/api/v1/payments/oxapay/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ trackId, orderId, userId }),
        });
        const data = await res.json();
        if (data.credited) {
          stopAll();
          setStep("success");
          queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
          onSuccess();
        } else if (data.failed) {
          stopAll();
          setStep("failed");
        }
      } catch { /* retry */ }
    }, 8_000);
  }, [userId, queryClient, onSuccess, stopAll]);

  const token = () => localStorage.getItem("zynum_token");
  const authHeader = () => {
    const t = token();
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // ── Initiate NowPayments ─────────────────────────────────────────────────
  const initiateNowPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/payments/nowpayments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ amountFcfa: effectiveAmount, userId, payCurrency: payCur }),
      });
      const data = await res.json();
      if (!res.ok || !data.payAddress) throw new Error(data.error ?? data.message ?? "Erreur NowPayments");
      setNpData(data);
      setStep("pending");
      startTimer(60 * 60);
      startNpPolling(data.paymentId, data.orderId);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Initiate OxaPay ──────────────────────────────────────────────────────
  const initiateOxaPay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/payments/oxapay/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ amountFcfa: effectiveAmount, userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.payLink) throw new Error(data.error ?? data.message ?? "Erreur OxaPay");
      setOpData(data);
      setStep("pending");
      startTimer(30 * 60);
      startOpPolling(data.trackId, data.orderId);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePay = () => {
    if (effectiveAmount < 300) {
      toast({ title: "Montant minimum", description: "300 FCFA minimum", variant: "destructive" });
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
    setTimeLeft(60 * 60);
  };

  const selectedCur = NP_CURRENCIES.find(c => c.id === payCur) ?? NP_CURRENCIES[0];

  if (!open) return null;

  const isPaying = step === "pending";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end" }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }}
        onClick={() => { if (!isPaying || step === "success" || step === "failed") { stopAll(); onClose(); } }}
      />

      {/* Sheet */}
      <div style={{
        position: "relative", width: "100%",
        height: isPaying && provider === "oxapay" ? "92dvh" : "auto",
        maxHeight: "92dvh",
        background: "#fff", borderRadius: "24px 24px 0 0",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: "#e5e7eb" }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "4px 20px 14px", borderBottom: "1px solid #f3f4f6", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/crypto-icon.png" alt="Crypto" style={{ width: 30, height: 30, objectFit: "contain" }} />
            <div>
              <p style={{ fontWeight: 800, color: "#111827", fontSize: 15, margin: 0 }}>Payer en Crypto</p>
              <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
                {isPaying && (npData ?? opData)
                  ? `⏱ Expire dans ${formatTime(timeLeft)}`
                  : "Bitcoin · USDT · ETH et plus"}
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopAll(); onClose(); }}
            style={{ background: "#f3f4f6", border: "none", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <X style={{ width: 16, height: 16, color: "#6b7280" }} />
          </button>
        </div>

        {/* ══════════════════ STEP: amount ══════════════════ */}
        {step === "amount" && (
          <div style={{ overflowY: "auto", padding: "16px 20px 36px" }}>

            {/* Provider tabs — only show enabled providers */}
            {(!oxapayEnabled && !nowpaymentsEnabled) ? (
              <div style={{ background: "#fef2f2", borderRadius: 12, padding: "12px 14px", marginBottom: 20, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, margin: 0 }}>
                  ⚠️ Aucune passerelle crypto disponible pour le moment.
                </p>
              </div>
            ) : (
              (() => {
                const tabs = [
                  { id: "nowpayments" as Provider, label: "NowPayments", badge: "Recommandé", enabled: nowpaymentsEnabled },
                  { id: "oxapay"      as Provider, label: "OxaPay",      badge: null,          enabled: oxapayEnabled },
                ].filter(p => p.enabled);
                return tabs.length > 1 ? (
                  <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
                    {tabs.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setProvider(p.id)}
                        style={{
                          flex: 1, padding: "8px 4px", borderRadius: 9, border: "none", cursor: "pointer",
                          fontWeight: 700, fontSize: 12, transition: "all 0.15s",
                          background: provider === p.id ? "#fff" : "transparent",
                          color: provider === p.id ? "#111827" : "#9ca3af",
                          boxShadow: provider === p.id ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                        }}
                      >
                        {p.label}
                        {p.badge && provider === p.id && (
                          <span style={{ display: "block", fontSize: 9, color: "#10b981", fontWeight: 800, marginTop: 1 }}>
                            {p.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✅</span>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#059669", margin: 0 }}>{tabs[0]?.label}</p>
                  </div>
                );
              })()
            )}

            {/* NowPayments: currency selector */}
            {provider === "nowpayments" && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, marginTop: 0 }}>Crypto monnaie</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 18 }}>
                  {NP_CURRENCIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setPayCur(c.id)}
                      style={{
                        padding: "8px 4px", borderRadius: 10, border: "2px solid",
                        borderColor: payCur === c.id ? c.color : "#e5e7eb",
                        background: payCur === c.id ? `${c.color}18` : "#f9fafb",
                        cursor: "pointer", textAlign: "center", transition: "all 0.15s",
                      }}
                    >
                      <p style={{ fontWeight: 800, color: payCur === c.id ? c.color : "#374151", fontSize: 12, margin: 0 }}>{c.label}</p>
                      <p style={{ fontSize: 10, color: "#9ca3af", margin: "1px 0 0" }}>{c.sub}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* OxaPay info */}
            {provider === "oxapay" && (
              <div style={{ background: "#eff6ff", borderRadius: 12, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8 }}>
                <span style={{ fontSize: 16 }}>ℹ️</span>
                <p style={{ fontSize: 12, color: "#1d4ed8", margin: 0, lineHeight: 1.5 }}>
                  La page de paiement OxaPay s'affichera ici — vous y verrez l'adresse et le QR code.
                </p>
              </div>
            )}

            {/* Amount presets */}
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, marginTop: 0 }}>Montant (FCFA)</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, marginBottom: 10 }}>
              {PRESETS_FCFA.map(a => (
                <button
                  key={a}
                  onClick={() => { setAmountFcfa(a); setCustomInput(""); }}
                  style={{
                    padding: "11px 4px", borderRadius: 11, border: "2px solid",
                    borderColor: amountFcfa === a && !customInput ? "#f97316" : "#e5e7eb",
                    background: amountFcfa === a && !customInput ? "#fff7ed" : "#f9fafb",
                    color: amountFcfa === a && !customInput ? "#ea580c" : "#374151",
                    fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {a.toLocaleString("fr-FR")} F
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f9fafb", borderRadius: 12, padding: "11px 14px", border: "1.5px solid #e5e7eb", marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>FCFA</span>
              <input
                type="number"
                placeholder="Autre montant"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, fontWeight: 700, color: "#111827" }}
              />
            </div>

            {/* USD preview */}
            <div style={{ background: "#f0fdf4", borderRadius: 11, padding: "10px 14px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                {provider === "nowpayments" ? `≈ en ${selectedCur.label} (${selectedCur.sub})` : "Équivalent USD"}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>${amountUsd}</span>
            </div>

            <button
              onClick={handlePay}
              disabled={loading || effectiveAmount < 300}
              style={{
                width: "100%", height: 54, borderRadius: 16,
                background: loading || effectiveAmount < 300 ? "#d1d5db" : "#f97316",
                color: "#fff", fontWeight: 800, fontSize: 15, border: "none",
                cursor: loading || effectiveAmount < 300 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.15s",
              }}
            >
              {loading
                ? <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> Génération de l'adresse…</>
                : provider === "nowpayments"
                  ? `Générer l'adresse ${selectedCur.label} →`
                  : "Ouvrir la page OxaPay →"}
            </button>
          </div>
        )}

        {/* ══════════════════ STEP: pending — NowPayments ══════════════════ */}
        {step === "pending" && provider === "nowpayments" && npData && (
          <div style={{ overflowY: "auto", padding: "16px 20px 36px" }}>

            {/* Timer */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: timeLeft < 300 ? "#fef2f2" : "#fffbeb",
              borderRadius: 12, padding: "10px 14px", marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Clock style={{ width: 15, height: 15, color: timeLeft < 300 ? "#ef4444" : "#f59e0b" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: timeLeft < 300 ? "#dc2626" : "#92400e" }}>Expire dans</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, color: timeLeft < 300 ? "#dc2626" : "#92400e", fontVariantNumeric: "tabular-nums" }}>{formatTime(timeLeft)}</span>
            </div>

            {/* Amount card */}
            <div style={{ background: "#f0fdf4", borderRadius: 16, padding: 16, marginBottom: 18, textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px" }}>Envoyer exactement</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: "#111827", margin: "0 0 4px" }}>
                {npData.payAmount} <span style={{ color: selectedCur.color, fontSize: 20 }}>{selectedCur.label}</span>
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                ≈ {npData.amountFcfa.toLocaleString("fr-FR")} FCFA · ${npData.priceUsd.toFixed(2)}
              </p>
            </div>

            {/* Network badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Réseau</p>
              <span style={{ background: "#f3f4f6", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#374151" }}>
                {npData.network || selectedCur.sub}
              </span>
            </div>

            {/* QR Code */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <div style={{ background: "#fff", border: "2px solid #e5e7eb", borderRadius: 16, padding: 10 }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(npData.payAddress)}&bgcolor=ffffff&color=000000`}
                  alt="QR Code"
                  style={{ width: 170, height: 170, display: "block" }}
                />
              </div>
            </div>

            {/* Address */}
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>Adresse de paiement</p>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#f9fafb", borderRadius: 12, padding: "11px 14px",
              border: "1.5px solid #e5e7eb", marginBottom: 18,
            }}>
              <p style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#374151", margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>
                {npData.payAddress}
              </p>
              <button
                onClick={() => handleCopy(npData.payAddress)}
                style={{
                  background: copied ? "#d1fae5" : "#e5e7eb", border: "none", borderRadius: 8,
                  padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  flexShrink: 0, transition: "background 0.15s",
                }}
              >
                {copied
                  ? <><Check style={{ width: 14, height: 14, color: "#059669" }} /><span style={{ fontSize: 11, fontWeight: 700, color: "#059669" }}>Copié</span></>
                  : <><Copy style={{ width: 14, height: 14, color: "#6b7280" }} /><span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>Copier</span></>}
              </button>
            </div>

            {/* Waiting indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#eff6ff", borderRadius: 12, padding: "12px 14px" }}>
              <Loader2 style={{ width: 15, height: 15, color: "#3b82f6", animation: "spin 1s linear infinite", flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                En attente de votre paiement… La page se met à jour automatiquement dès confirmation.
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP: pending — OxaPay iframe ══════════════════ */}
        {step === "pending" && provider === "oxapay" && opData && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: "60dvh" }}>
            <div style={{ height: 4, background: "#f3f4f6", flexShrink: 0, position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute", top: 0, left: 0, height: "100%",
                background: timeLeft < 300 ? "#ef4444" : "#f97316",
                width: `${(timeLeft / (30 * 60)) * 100}%`,
                transition: "width 1s linear",
              }} />
            </div>
            <iframe
              src={opData.payLink}
              title="OxaPay Payment"
              style={{ flex: 1, border: "none", width: "100%", background: "#fff" }}
              allow="clipboard-write"
            />
            <div style={{ padding: "10px 20px", borderTop: "1px solid #f3f4f6", flexShrink: 0, display: "flex", gap: 10, alignItems: "center" }}>
              <Loader2 style={{ width: 13, height: 13, color: "#9ca3af", animation: "spin 1s linear infinite", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#9ca3af", flex: 1 }}>En attente de votre paiement… ({formatTime(timeLeft)})</span>
              <a
                href={opData.payLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 700, color: "#3b82f6", textDecoration: "none" }}
              >
                <ExternalLink style={{ width: 11, height: 11 }} /> Ouvrir
              </a>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP: success ══════════════════ */}
        {step === "success" && (
          <div style={{ padding: "44px 20px 44px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 style={{ width: 44, height: 44, color: "#059669" }} />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 22, color: "#111827", margin: "0 0 8px" }}>Paiement confirmé !</h2>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Votre solde a été crédité avec succès.</p>
            </div>
            <button
              onClick={() => { stopAll(); onClose(); }}
              style={{ width: "100%", height: 52, borderRadius: 16, background: "#059669", color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              Fermer
            </button>
          </div>
        )}

        {/* ══════════════════ STEP: failed ══════════════════ */}
        {step === "failed" && (
          <div style={{ padding: "44px 20px 44px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle style={{ width: 44, height: 44, color: "#dc2626" }} />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 22, color: "#111827", margin: "0 0 8px" }}>Paiement expiré</h2>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>La session a expiré. Recommencez pour générer une nouvelle adresse.</p>
            </div>
            <button
              onClick={reset}
              style={{ width: "100%", height: 52, borderRadius: 16, background: "#f97316", color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              Réessayer
            </button>
            <button
              onClick={() => { stopAll(); onClose(); }}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 14, cursor: "pointer" }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
