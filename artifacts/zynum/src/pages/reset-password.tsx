import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
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

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { t, lang, setLang } = useLanguage();
  const params = new URLSearchParams(window.location.search);
  const emailInit = params.get("email") ?? "";

  const [email, setEmail] = useState(emailInit);
  const [codeDigits, setCode] = useState(["", "", "", "", "", ""]);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const apiBase = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => { setTimeout(() => codeRefs.current[0]?.focus(), 100); }, []);

  const handleDigit = (i: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/\d/.test(val)) return;
    const next = [...codeDigits]; next[i] = val; setCode(next);
    if (val && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeDigits[i] && i > 0) codeRefs.current[i - 1]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeDigits.join("");
    if (code.length !== 6) { setError(t("reset_enter_6digits")); return; }
    if (!newPwd || newPwd.length < 8) { setError(t("reset_pwd_min8")); return; }
    if (newPwd !== confirmPwd) { setError(t("register_pwd_mismatch")); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: newPwd }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message ?? t("register_code_invalid")); return; }
      setDone(true);
    } catch {
      setError(t("forgot_error_network"));
    } finally {
      setLoading(false);
    }
  };

  const pwdStrength = (() => {
    if (!newPwd) return 0;
    let s = 0;
    if (newPwd.length >= 8) s++;
    if (/[A-Z]/.test(newPwd)) s++;
    if (/[0-9]/.test(newPwd)) s++;
    if (/[^A-Za-z0-9]/.test(newPwd)) s++;
    return s;
  })();
  const strengthColor = ["#e5e7eb", "#ef4444", "#f97316", "#eab308", "#22c55e"][pwdStrength];
  const strengthLabels = ["", t("reset_strength_weak"), t("reset_strength_fair"), t("reset_strength_good"), t("reset_strength_strong")];

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
          <Link href="/forgot-password">
            <button style={{ background: "rgba(255,255,255,0.35)", border: "none", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronLeft style={{ width: 22, height: 22, color: "#1a3a6b" }} />
            </button>
          </Link>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#1a3a6b" }}>{t("reset_title")}</span>
          </div>
          {LangSwitcher}
        </div>

        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", margin: "20px 0 28px" }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
            <img src="/logo.jpg" alt="ZyNum" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        {done ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20, paddingTop: 8 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 style={{ width: 40, height: 40, color: "#ffffff" }} />
            </div>
            <div>
              <h2 style={{ color: "#1a3a6b", fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>{t("reset_done_title")}</h2>
              <p style={{ color: "#4a6fa5", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                {t("reset_done_desc")}
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              style={{
                width: "100%", height: 54, borderRadius: 30,
                background: "#1a3fc8", color: "#fff",
                fontWeight: 800, fontSize: 16, border: "none",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 20px rgba(26,63,200,0.4)",
              }}
            >
              {t("login_btn")} <ArrowRight style={{ width: 18, height: 18 }} />
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: "#4a6fa5", fontSize: 14, textAlign: "center", margin: "0 0 24px", lineHeight: 1.6 }}>
              {t("reset_desc")}
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {!emailInit && (
                <div style={FIELD_WRAP}>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t("login_email_placeholder")}
                    style={{ ...NAKED_INPUT, paddingLeft: 16 }}
                  />
                </div>
              )}

              {/* OTP digits */}
              <div>
                <p style={{ color: "#1a3a6b", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
                  {t("reset_code_label")}
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {codeDigits.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        width: 48, height: 56, borderRadius: 14,
                        backgroundColor: "#ffffff",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <input
                        ref={el => { codeRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleDigit(i, e.target.value)}
                        onKeyDown={e => handleKey(i, e)}
                        style={{
                          width: "100%", height: "100%",
                          background: "transparent",
                          border: "none",
                          color: "#1a1a2e", fontSize: 22, fontWeight: 900,
                          textAlign: "center", outline: "none",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* New password */}
              <div>
                <div style={FIELD_WRAP}>
                  <span style={ICON_LEFT}>
                    <Lock style={{ width: 18, height: 18 }} />
                  </span>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder={t("reset_new_pwd")}
                    autoComplete="new-password"
                    style={NAKED_INPUT}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(s => !s)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: "0 14px 0 0" }}
                  >
                    {showPwd ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
                {newPwd && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, display: "flex", gap: 4 }}>
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} style={{ height: 4, flex: 1, borderRadius: 4, background: pwdStrength >= n ? strengthColor : "#e5e7eb", transition: "background 0.3s" }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: strengthColor, minWidth: 32 }}>{strengthLabels[pwdStrength]}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div style={{
                ...FIELD_WRAP,
                ...(confirmPwd && confirmPwd !== newPwd ? { boxShadow: "0 0 0 1.5px #ef4444, 0 2px 8px rgba(0,0,0,0.10)" } : {}),
              }}>
                <span style={ICON_LEFT}>
                  <Lock style={{ width: 18, height: 18 }} />
                </span>
                <input
                  type={showPwd ? "text" : "password"}
                  value={confirmPwd}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder={t("register_repeat_pwd")}
                  autoComplete="new-password"
                  style={NAKED_INPUT}
                />
              </div>
              {confirmPwd && confirmPwd !== newPwd && (
                <p style={{ color: "#dc2626", fontSize: 12, marginTop: -8, fontWeight: 500 }}>
                  {t("register_pwd_mismatch")}
                </p>
              )}

              {error && (
                <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || codeDigits.join("").length !== 6 || !newPwd || !confirmPwd}
                style={{
                  width: "100%", height: 54, borderRadius: 30,
                  background: "#1a3fc8", color: "#fff",
                  fontWeight: 800, fontSize: 16, border: "none",
                  cursor: (loading || codeDigits.join("").length !== 6 || !newPwd || !confirmPwd) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 20px rgba(26,63,200,0.4)",
                  marginTop: 4,
                  opacity: (loading || codeDigits.join("").length !== 6 || !newPwd || !confirmPwd) ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {loading
                  ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                  : <>{t("reset_btn")} <ArrowRight style={{ width: 18, height: 18 }} /></>}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 20, marginBottom: 40 }}>
              <Link href="/forgot-password">
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, cursor: "pointer" }}>{t("reset_resend_link")}</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
