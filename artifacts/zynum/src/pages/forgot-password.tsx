import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Mail, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const FIELD_WRAP: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 54,
  borderRadius: 14,
  backgroundColor: "#ffffff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
  display: "flex",
  alignItems: "center",
};

const NAKED_INPUT: React.CSSProperties = {
  flex: 1,
  height: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: 15,
  color: "#1a1a2e",
  paddingRight: 14,
};

const ICON_LEFT: React.CSSProperties = {
  width: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  color: "#9ca3af",
  pointerEvents: "none",
};

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { t, lang, setLang } = useLanguage();
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
      setError(t("forgot_error_network"));
    } finally {
      setLoading(false);
    }
  };

  const LangSwitcher = (
    <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.25)", borderRadius: 20, padding: 3, gap: 2 }}>
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            background: lang === l ? "#1a3fc8" : "transparent",
            border: "none",
            borderRadius: 16,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 800,
            color: lang === l ? "#ffffff" : "rgba(255,255,255,0.7)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          {l === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(to bottom, #e8f4ff 0%, #c5ddf5 20%, #5b9fd6 55%, #1a5fc8 100%)",
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
            <span style={{ fontWeight: 700, fontSize: 17, color: "#1a3a6b" }}>{t("forgot_title")}</span>
          </div>
          {LangSwitcher}
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
                {t("forgot_heading")}
              </h1>
              <p style={{ color: "#4a6fa5", fontSize: 14, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                {t("forgot_desc")}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={FIELD_WRAP}>
                <span style={ICON_LEFT}><Mail style={{ width: 18, height: 18 }} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t("login_email_placeholder")}
                  autoComplete="email"
                  autoFocus
                  style={NAKED_INPUT}
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
                  backgroundColor: "#1a3fc8", color: "#ffffff",
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
                  : <>{t("forgot_send_btn")} <ArrowRight style={{ width: 18, height: 18 }} /></>}
              </button>

              <button
                type="button"
                onClick={() => navigate("/reset-password")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: 13, textAlign: "center", marginTop: 4 }}
              >
                {t("forgot_have_code")}
              </button>
            </form>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 style={{ width: 40, height: 40, color: "#ffffff" }} />
            </div>
            <div>
              <h2 style={{ color: "#1a3a6b", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>{t("forgot_sent_title")}</h2>
              <p style={{ color: "#4a6fa5", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                {t("forgot_sent_desc1")}<br />
                <strong style={{ color: "#1a3a6b" }}>{email}</strong>.<br />
                {t("forgot_sent_desc2")}
              </p>
            </div>
            <button
              onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
              style={{
                width: "100%", height: 54, borderRadius: 30,
                backgroundColor: "#1a3fc8", color: "#ffffff",
                fontWeight: 800, fontSize: 16, border: "none",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 20px rgba(26,63,200,0.4)",
              }}
            >
              {t("forgot_enter_code")} <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontSize: 13 }}
            >
              {t("forgot_resend_email")}
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 32, marginBottom: 40 }}>
          <Link href="/login">
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, cursor: "pointer" }}>{t("forgot_back_login")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
