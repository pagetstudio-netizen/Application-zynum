import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Mail, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  height: 54,
  borderRadius: 14,
  border: "none",
  background: "#ffffff",
  paddingLeft: 48,
  paddingRight: 16,
  fontSize: 15,
  color: "#1a1a2e",
  outline: "none",
  boxSizing: "border-box" as const,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const apiBase = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await fetch(`${apiBase}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(to bottom, #f0f7ff 0%, #d0e8f8 25%, #4a90d9 60%, #1a5fc8 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px", boxSizing: "border-box" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", paddingTop: 52, paddingBottom: 8 }}>
          <Link href="/login">
            <button style={{ background: "rgba(255,255,255,0.35)", border: "none", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronLeft style={{ width: 22, height: 22, color: "#1a3a6b" }} />
            </button>
          </Link>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#1a3a6b" }}>Mot de passe oublié</span>
          </div>
          <div style={{ width: 40 }} />
        </div>

        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", margin: "20px 0 32px" }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
            <img src="/logo.jpg" alt="ZyNum" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        {!sent ? (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ color: "#1a3a6b", fontSize: 22, fontWeight: 800, margin: "0 0 8px", textAlign: "center" }}>
                Mot de passe oublié ?
              </h1>
              <p style={{ color: "#4a6fa5", fontSize: 14, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                Entrez votre email. Nous vous enverrons un code à 6 chiffres pour réinitialiser votre mot de passe.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", display: "flex", pointerEvents: "none" }}>
                  <Mail style={{ width: 18, height: 18 }} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Adresse email"
                  autoComplete="email"
                  autoFocus
                  style={INPUT_STYLE}
                />
              </div>

              {error && (
                <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  width: "100%", height: 54, borderRadius: 30,
                  background: "#1a3fc8", color: "#fff",
                  fontWeight: 800, fontSize: 16, border: "none",
                  cursor: (loading || !email) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 20px rgba(26,63,200,0.4)",
                  marginTop: 4,
                  opacity: (loading || !email) ? 0.65 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {loading
                  ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                  : <>Envoyer le code <ArrowRight style={{ width: 18, height: 18 }} /></>}
              </button>

              <button
                type="button"
                onClick={() => navigate("/reset-password")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 13, textAlign: "center", marginTop: 4 }}
              >
                J'ai déjà un code →
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 style={{ width: 40, height: 40, color: "#ffffff" }} />
            </div>
            <div>
              <h2 style={{ color: "#1a3a6b", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Email envoyé !</h2>
              <p style={{ color: "#4a6fa5", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                Un code à 6 chiffres a été envoyé à<br />
                <strong style={{ color: "#1a3a6b" }}>{email}</strong>.<br />
                Vérifiez votre boîte de réception (et les spams).
              </p>
            </div>
            <button
              onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
              style={{
                width: "100%", height: 54, borderRadius: 30,
                background: "#1a3fc8", color: "#fff",
                fontWeight: 800, fontSize: 16, border: "none",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 20px rgba(26,63,200,0.4)",
              }}
            >
              Saisir le code <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 13 }}
            >
              Renvoyer l'email
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 32, marginBottom: 40 }}>
          <Link href="/login">
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, cursor: "pointer" }}>← Retour à la connexion</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
