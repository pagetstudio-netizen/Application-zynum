import React, { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Lock, Eye, EyeOff, Globe2 } from "lucide-react";
import { useLoginUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

type Step = "credentials" | "verify_2fa";

const BG = "/auth-bg.png";

const BTN_PRIMARY: React.CSSProperties = {
  width: "100%", height: 54, borderRadius: 30,
  background: "#1A3FFF", color: "#ffffff",
  fontWeight: 900, fontSize: 16, border: "none",
  cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", gap: 8,
  boxShadow: "0 6px 32px rgba(26,63,255,0.45)",
  transition: "opacity 0.15s",
};
const BTN_OUTLINE: React.CSSProperties = {
  width: "100%", height: 54, borderRadius: 30,
  background: "rgba(255,255,255,0.12)",
  border: "2px solid rgba(255,255,255,0.7)",
  color: "#ffffff", fontWeight: 800, fontSize: 15,
  cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", gap: 8,
  transition: "opacity 0.15s",
};
const LABEL: React.CSSProperties = {
  color: "rgba(255,255,255,0.7)", fontSize: 11,
  fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.08em", display: "block", marginBottom: 6,
};

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lang, setLang } = useLanguage();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const T = {
    title:    lang === "fr" ? "Connexion" : "Sign In",
    subtitle: lang === "fr" ? "Accédez à votre compte ZyNum" : "Access your ZyNum account",
    email:    lang === "fr" ? "Email" : "Email",
    password: lang === "fr" ? "Mot de passe" : "Password",
    forgot:   lang === "fr" ? "Mot de passe oublié ?" : "Forgot password?",
    submit:   lang === "fr" ? "Se connecter" : "Login",
    noAcct:   lang === "fr" ? "Pas encore de compte ?" : "Don't have an account?",
    register: lang === "fr" ? "S'inscrire" : "Register",
    verifTitle: lang === "fr" ? "Vérification" : "Verification",
    verifSub:   lang === "fr" ? `Code envoyé à ${email}` : `Code sent to ${email}`,
    verify:     lang === "fr" ? "Vérifier" : "Verify",
    langBtn:    lang === "fr" ? "English" : "Français",
  };

  const loginMutation = useLoginUser({
    mutation: {
      onSuccess: (data: any) => {
        if (data.requires2FA) {
          setStep("verify_2fa");
          setErrorMsg("");
          setTimeout(() => codeRefs.current[0]?.focus(), 100);
          return;
        }
        localStorage.setItem("zynum_token", data.token);
        sessionStorage.removeItem("zynum_dismissed_popups");
        sessionStorage.setItem("zynum_login_at", String(Date.now()));
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        toast({ title: "Connecté !", description: "Bienvenue sur ZyNum." });
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        const msg = error?.data?.message || error?.message || "Email ou mot de passe incorrect";
        setErrorMsg(msg);
        toast({ title: "Erreur de connexion", description: msg, variant: "destructive", duration: 3500 });
      },
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email || !password) { const m = "Veuillez remplir tous les champs"; setErrorMsg(m); toast({ title: "Champs manquants", description: m, variant: "destructive", duration: 3000 }); return; }
    loginMutation.mutate({ data: { email, password } });
  };

  const handleCodeChange = (i: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/\d/.test(val)) return;
    const next = [...codeDigits];
    next[i] = val;
    setCodeDigits(next);
    if (val && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const handleCodeKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeDigits[i] && i > 0) codeRefs.current[i - 1]?.focus();
  };

  const handleVerify = async () => {
    const code = codeDigits.join("");
    if (code.length !== 6) { setErrorMsg("Entrez les 6 chiffres"); return; }
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/v1/auth/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Code invalide");
      localStorage.setItem("zynum_token", data.token);
      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      toast({ title: "Connecté !" });
      setLocation("/dashboard");
    } catch (err: any) {
      setErrorMsg(err.message);
      toast({ title: "Code invalide", description: err.message, variant: "destructive", duration: 3500 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ height: "100dvh", position: "relative", overflow: "hidden" }}>
      {/* Background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `url(${BG})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }} />
      <div style={{ position: "fixed", inset: 0, zIndex: 1, background: "rgba(8,12,40,0.62)" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 16px" }}>
          {step !== "credentials" ? (
            <button
              onClick={() => { setStep("credentials"); setCodeDigits(["","","","","",""]); setErrorMsg(""); }}
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          ) : (
            <Link href="/">
              <button style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            </Link>
          )}

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)" }}>
              <img src="/logo.jpg" alt="ZyNum" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <span style={{ color: "#ffffff", fontWeight: 900, fontSize: 18, letterSpacing: "-0.3px" }}>ZyNum</span>
          </div>

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, padding: "7px 12px", cursor: "pointer" }}
          >
            <Globe2 style={{ width: 15, height: 15, color: "white" }} />
            <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>{T.langBtn}</span>
          </button>
        </div>

        {/* Form area — fixed, no scroll */}
        <div style={{ flex: 1, overflow: "hidden", padding: "0 24px 40px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>

          {step === "credentials" && (
            <>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ color: "#ffffff", fontSize: 30, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.5px" }}>{T.title}</h1>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: 0 }}>{T.subtitle}</p>
              </div>

              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Email */}
                <div>
                  <label style={LABEL}>{T.email}</label>
                  <div className="glass-input-icon">
                    <Mail className="input-icon" style={{ width: 18, height: 18 }} />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="votre@email.com" autoComplete="email"
                      className="glass-input"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={LABEL}>{T.password}</label>
                  <div className="glass-input-icon" style={{ position: "relative" }}>
                    <Lock className="input-icon" style={{ width: 18, height: 18 }} />
                    <input
                      type={showPassword ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" autoComplete="current-password"
                      className="glass-input" style={{ paddingRight: 48 }}
                    />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex" }}>
                      {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                    </button>
                  </div>
                </div>

                {/* Forgot */}
                <div style={{ textAlign: "right" }}>
                  <Link href="/forgot-password">
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{T.forgot}</span>
                  </Link>
                </div>

                {/* Error */}
                {errorMsg && (
                  <div style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)", borderRadius: 12, padding: "10px 14px", color: "#fca5a5", fontSize: 13, fontWeight: 500 }}>
                    {errorMsg}
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loginMutation.isPending} style={{ ...BTN_PRIMARY, marginTop: 4, opacity: loginMutation.isPending ? 0.7 : 1 }}>
                  {loginMutation.isPending ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} /> : T.submit}
                </button>
              </form>

              {/* Register link */}
              <div style={{ marginTop: 14 }}>
                <Link href="/register">
                  <button style={BTN_OUTLINE}>
                    {T.noAcct} {T.register}
                  </button>
                </Link>
              </div>
            </>
          )}

          {step === "verify_2fa" && (
            <>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ color: "#ffffff", fontSize: 28, fontWeight: 900, margin: "0 0 6px" }}>{T.verifTitle}</h1>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: 0 }}>{T.verifSub}</p>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
                {codeDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { codeRefs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={1}
                    value={d}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleCodeKey(i, e)}
                    style={{
                      width: 46, height: 56, borderRadius: 14,
                      background: "rgba(255,255,255,0.15)",
                      border: "2px solid rgba(255,255,255,0.4)",
                      color: "white", fontSize: 22, fontWeight: 900,
                      textAlign: "center", outline: "none",
                    }}
                  />
                ))}
              </div>

              {errorMsg && (
                <div style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)", borderRadius: 12, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 12 }}>
                  {errorMsg}
                </div>
              )}

              <button onClick={handleVerify} disabled={isSubmitting || codeDigits.join("").length !== 6}
                style={{ ...BTN_PRIMARY, opacity: (isSubmitting || codeDigits.join("").length !== 6) ? 0.6 : 1 }}>
                {isSubmitting ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} /> : T.verify}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
