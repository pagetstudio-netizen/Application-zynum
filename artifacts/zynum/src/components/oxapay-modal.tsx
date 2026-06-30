import { useState, useEffect, useRef, useCallback } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBalanceQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const PRESETS_FCFA = [1000, 2000, 5000, 10000, 20000, 50000];

type Step = "amount" | "paying" | "success" | "failed";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: number;
  onSuccess: () => void;
}

export function OxapayModal({ open, onClose, userId, onSuccess }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step,        setStep]        = useState<Step>("amount");
  const [amountFcfa,  setAmountFcfa]  = useState(5000);
  const [customInput, setCustomInput] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(30 * 60);
  const [paymentData, setPaymentData] = useState<{
    trackId: string; orderId: string; payLink: string;
    amountUsd: number; amountFcfa: number;
  } | null>(null);

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveAmount = customInput ? Math.max(300, Math.round(parseFloat(customInput) || 0)) : amountFcfa;
  const amountUsd = (effectiveAmount / 620).toFixed(2);

  const stopPolling = useCallback(() => {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    if (!open) {
      stopPolling();
      setStep("amount");
      setPaymentData(null);
      setCustomInput("");
      setTimeLeft(30 * 60);
    }
  }, [open, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startTimer = useCallback(() => {
    setTimeLeft(30 * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { stopPolling(); setStep("failed"); return 0; }
        return t - 1;
      });
    }, 1000);
  }, [stopPolling]);

  const startPolling = useCallback((trackId: string, orderId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("zynum_token");
        const res = await fetch("/api/v1/payments/oxapay/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ trackId, orderId, userId }),
        });
        const data = await res.json();
        if (data.credited || data.status?.toLowerCase() === "paid") {
          stopPolling();
          setStep("success");
          queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
          onSuccess();
        } else if (data.failed) {
          stopPolling();
          setStep("failed");
        }
      } catch { /* retry */ }
    }, 8000);
  }, [userId, queryClient, onSuccess, stopPolling]);

  const handleInitiate = async () => {
    if (effectiveAmount < 300) {
      toast({ title: "Montant minimum", description: "300 FCFA minimum", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("zynum_token");
      const res = await fetch("/api/v1/payments/oxapay/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ amountFcfa: effectiveAmount, userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.payLink) {
        throw new Error(data.error ?? data.message ?? "Erreur OxaPay");
      }
      setPaymentData(data);
      setStep("paying");
      startTimer();
      startPolling(data.trackId, data.orderId);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end" }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }}
        onClick={() => { if (step !== "paying") { stopPolling(); onClose(); } }}
      />

      <div style={{
        position: "relative", width: "100%",
        height: step === "paying" ? "92dvh" : "auto",
        maxHeight: "92dvh",
        background: "#fff", borderRadius: "24px 24px 0 0",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 4, background: "#e5e7eb" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px 14px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/crypto-icon.png" alt="Crypto" style={{ width: 30, height: 30, objectFit: "contain" }} />
            <div>
              <p style={{ fontWeight: 800, color: "#111827", fontSize: 15, margin: 0 }}>Payer en Crypto</p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                {step === "paying" && paymentData
                  ? `${paymentData.amountFcfa.toLocaleString("fr-FR")} FCFA · Expire dans ${formatTime(timeLeft)}`
                  : "Bitcoin, USDT, ETH et plus · Via OxaPay"
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => { stopPolling(); onClose(); }}
            style={{ background: "#f3f4f6", border: "none", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
          >
            <X style={{ width: 16, height: 16, color: "#6b7280" }} />
          </button>
        </div>

        {/* ── STEP: amount ── */}
        {step === "amount" && (
          <div style={{ padding: "20px 20px 32px", overflowY: "auto" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, marginTop: 0 }}>
              Montant à recharger (FCFA)
            </p>

            {/* Presets */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
              {PRESETS_FCFA.map(a => (
                <button
                  key={a}
                  onClick={() => { setAmountFcfa(a); setCustomInput(""); }}
                  style={{
                    padding: "12px 4px", borderRadius: 12, border: "2px solid",
                    borderColor: amountFcfa === a && !customInput ? "#f97316" : "#e5e7eb",
                    background: amountFcfa === a && !customInput ? "#fff7ed" : "#f9fafb",
                    color: amountFcfa === a && !customInput ? "#ea580c" : "#374151",
                    fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {a.toLocaleString("fr-FR")} F
                </button>
              ))}
            </div>

            {/* Custom */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f9fafb", borderRadius: 12, padding: "12px 14px", border: "1.5px solid #e5e7eb", marginBottom: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>FCFA</span>
              <input
                type="number"
                placeholder="Autre montant"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, fontWeight: 700, color: "#111827" }}
              />
            </div>

            {/* USD preview */}
            <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "12px 14px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#6b7280" }}>Équivalent USD</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>${amountUsd}</span>
            </div>

            {/* Info */}
            <div style={{ background: "#eff6ff", borderRadius: 12, padding: "12px 14px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>ℹ️</span>
              <p style={{ fontSize: 12, color: "#1d4ed8", margin: 0, lineHeight: 1.5 }}>
                Vous serez dirigé vers la page de paiement OxaPay sécurisée où vous verrez l'adresse crypto et le QR code. Votre solde sera crédité automatiquement après confirmation.
              </p>
            </div>

            <button
              onClick={handleInitiate}
              disabled={loading || effectiveAmount < 300}
              style={{
                width: "100%", height: 54, borderRadius: 16,
                background: loading || effectiveAmount < 300 ? "#d1d5db" : "#f97316",
                color: "#fff", fontWeight: 800, fontSize: 15,
                border: "none", cursor: loading || effectiveAmount < 300 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all 0.15s",
              }}
            >
              {loading
                ? <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> Génération…</>
                : `Procéder au paiement →`}
            </button>
          </div>
        )}

        {/* ── STEP: paying — iframe ── */}
        {step === "paying" && paymentData && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Timer bar */}
            <div style={{
              height: 4, background: "#f3f4f6", flexShrink: 0,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, left: 0, height: "100%",
                background: timeLeft < 300 ? "#ef4444" : "#f97316",
                width: `${(timeLeft / (30 * 60)) * 100}%`,
                transition: "width 1s linear, background 0.5s",
              }} />
            </div>

            {/* Iframe */}
            <iframe
              src={paymentData.payLink}
              title="OxaPay Payment"
              style={{
                flex: 1, border: "none", width: "100%",
                background: "#fff",
              }}
              allow="clipboard-write"
            />

            {/* Open in browser fallback */}
            <div style={{ padding: "10px 20px", borderTop: "1px solid #f3f4f6", flexShrink: 0, display: "flex", gap: 10, alignItems: "center" }}>
              <Loader2 style={{ width: 14, height: 14, color: "#9ca3af", animation: "spin 1s linear infinite", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#9ca3af", flex: 1 }}>En attente de votre paiement…</span>
              <a
                href={paymentData.payLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#3b82f6", textDecoration: "none", flexShrink: 0 }}
              >
                <ExternalLink style={{ width: 12, height: 12 }} />
                Ouvrir
              </a>
            </div>
          </div>
        )}

        {/* ── STEP: success ── */}
        {step === "success" && (
          <div style={{ padding: "40px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 style={{ width: 44, height: 44, color: "#059669" }} />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 22, color: "#111827", margin: "0 0 8px" }}>Paiement confirmé !</h2>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Votre solde a été mis à jour avec succès.</p>
            </div>
            <button
              onClick={() => { stopPolling(); onClose(); }}
              style={{ width: "100%", height: 52, borderRadius: 16, background: "#059669", color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              Fermer
            </button>
          </div>
        )}

        {/* ── STEP: failed ── */}
        {step === "failed" && (
          <div style={{ padding: "40px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle style={{ width: 44, height: 44, color: "#dc2626" }} />
            </div>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 22, color: "#111827", margin: "0 0 8px" }}>Paiement expiré</h2>
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>La session a expiré. Recommencez pour générer un nouveau lien.</p>
            </div>
            <button
              onClick={() => { setStep("amount"); setPaymentData(null); setTimeLeft(30 * 60); }}
              style={{ width: "100%", height: 52, borderRadius: 16, background: "#f97316", color: "#fff", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer" }}
            >
              Réessayer
            </button>
            <button
              onClick={() => { stopPolling(); onClose(); }}
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
