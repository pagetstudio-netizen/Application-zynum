import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, User, Lock, Eye, EyeOff, Mail, Globe2, Check } from "lucide-react";
import { useRegisterUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

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

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lang, setLang } = useLanguage();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [referralCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ref") ?? "";
  });

  const T = {
    title:    lang === "fr" ? "Créer un compte" : "Create account",
    subtitle: lang === "fr" ? "Rejoignez ZyNum gratuitement" : "Join ZyNum for free",
    fname:    lang === "fr" ? "Prénom" : "First name",
    lname:    lang === "fr" ? "Nom" : "Last name",
    email:    "Email",
    password: lang === "fr" ? "Mot de passe" : "Password",
    confirm:  lang === "fr" ? "Confirmer le mot de passe" : "Confirm password",
    terms1:   lang === "fr" ? "J'accepte les " : "I accept the ",
    terms2:   lang === "fr" ? "conditions d'utilisation" : "terms of use",
    terms3:   lang === "fr" ? " et la " : " and the ",
    terms4:   lang === "fr" ? "politique de confidentialité" : "privacy policy",
    submit:   lang === "fr" ? "S'inscrire maintenant" : "Register now",
    hasAcct:  lang === "fr" ? "Déjà un compte ? Se connecter" : "Already have an account? Login",
    langBtn:  lang === "fr" ? "English" : "Français",
  };

  const pwdStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthColor = ["rgba(255,255,255,0.2)", "rgba(239,68,68,0.8)", "rgba(251,146,60,0.8)", "rgba(250,204,21,0.8)", "rgba(34,197,94,0.9)"][pwdStrength];
  const strengthLabel = ["", lang === "fr" ? "Faible" : "Weak", lang === "fr" ? "Moyen" : "Fair", lang === "fr" ? "Bien" : "Good", lang === "fr" ? "Fort" : "Strong"][pwdStrength];

  const registerMutation = useRegisterUser({
    mutation: {
      onSuccess: (data: any) => {
        localStorage.setItem("zynum_token", data.token);
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        toast({ title: "Compte créé !", description: "Bienvenue sur ZyNum !" });
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        const msg = error?.response?.data?.message || error?.data?.message || "Une erreur s'est produite";
        setErrorMsg(msg);
        toast({ title: "Erreur d'inscription", description: msg, variant: "destructive", duration: 3500 });
      },
    },
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!firstName || !email || !password) { const m = "Veuillez remplir tous les champs"; setErrorMsg(m); toast({ title: "Champs manquants", description: m, variant: "destructive", duration: 3000 }); return; }
    if (password !== confirmPassword) { const m = "Les mots de passe ne correspondent pas"; setErrorMsg(m); toast({ title: "Erreur", description: m, variant: "destructive", duration: 3000 }); return; }
    if (password.length < 8) { const m = "Le mot de passe doit contenir au moins 8 caractères"; setErrorMsg(m); toast({ title: "Mot de passe trop court", description: m, variant: "destructive", duration: 3000 }); return; }
    if (!acceptTerms) { const m = "Veuillez accepter les conditions d'utilisation"; setErrorMsg(m); toast({ title: "Conditions requises", description: m, variant: "destructive", duration: 3000 }); return; }
    const name = `${firstName} ${lastName}`.trim();
    registerMutation.mutate({ data: { name, email, password, confirmPassword } } as any);
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

      {/* Fixed layout — top bar + scrollable form */}
      <div style={{ position: "relative", zIndex: 2, height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar — fixed, no scroll */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 20px 16px" }}>
          <Link href="/">
            <button style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </Link>

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

        {/* Form — seule zone scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px 48px", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ color: "#ffffff", fontSize: 28, fontWeight: 900, margin: "0 0 6px", letterSpacing: "-0.5px" }}>{T.title}</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: 0 }}>{T.subtitle}</p>
          </div>

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Name row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={LABEL}>{T.fname}</label>
                <div className="glass-input-icon">
                  <User className="input-icon" style={{ width: 17, height: 17 }} />
                  <input
                    type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Jean" className="glass-input"
                  />
                </div>
              </div>
              <div>
                <label style={LABEL}>{T.lname}</label>
                <input
                  type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Dupont" className="glass-input"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={LABEL}>{T.email}</label>
              <div className="glass-input-icon">
                <Mail className="input-icon" style={{ width: 17, height: 17 }} />
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
                <Lock className="input-icon" style={{ width: 17, height: 17 }} />
                <input
                  type={showPassword ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="new-password"
                  className="glass-input" style={{ paddingRight: 48 }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex" }}>
                  {showPassword ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                </button>
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{ height: 3, flex: 1, borderRadius: 4, background: i <= pwdStrength ? strengthColor : "rgba(255,255,255,0.2)", transition: "background 0.3s" }} />
                    ))}
                  </div>
                  {strengthLabel && <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 3 }}>{strengthLabel}</p>}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label style={LABEL}>{T.confirm}</label>
              <div className="glass-input-icon" style={{ position: "relative" }}>
                <Lock className="input-icon" style={{ width: 17, height: 17 }} />
                <input
                  type={showConfirm ? "text" : "password"} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="new-password"
                  className="glass-input" style={{
                    paddingRight: 48,
                    borderColor: confirmPassword && confirmPassword !== password ? "rgba(239,68,68,0.7)" : undefined
                  }}
                />
                <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 6 }}>
                  {confirmPassword && confirmPassword === password && (
                    <Check style={{ width: 16, height: 16, color: "rgba(34,197,94,0.9)" }} />
                  )}
                  <button type="button" onClick={() => setShowConfirm(s => !s)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex" }}>
                    {showConfirm ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <div
                onClick={() => setAcceptTerms(s => !s)}
                style={{
                  width: 20, height: 20, borderRadius: 6, border: "2px solid",
                  borderColor: acceptTerms ? "#1A3FFF" : "rgba(255,255,255,0.4)",
                  background: acceptTerms ? "#1A3FFF" : "rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 1, transition: "all 0.15s",
                }}
              >
                {acceptTerms && <Check style={{ width: 12, height: 12, color: "white" }} />}
              </div>
              <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.5 }}>
                {T.terms1}
                <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>{T.terms2}</span>
                {T.terms3}
                <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>{T.terms4}</span>
              </span>
            </label>

            {/* Error */}
            {errorMsg && (
              <div style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)", borderRadius: 12, padding: "10px 14px", color: "#fca5a5", fontSize: 13, fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={registerMutation.isPending}
              style={{ ...BTN_PRIMARY, marginTop: 4, opacity: registerMutation.isPending ? 0.7 : 1 }}>
              {registerMutation.isPending
                ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                : T.submit}
            </button>
          </form>

          {/* Login link */}
          <div style={{ marginTop: 14 }}>
            <Link href="/login">
              <button style={BTN_OUTLINE}>{T.hasAcct}</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
