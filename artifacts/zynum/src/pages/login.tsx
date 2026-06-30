import React, { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Eye, EyeOff, ChevronLeft, Mail } from "lucide-react";
import { useLoginUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

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

type Step = "credentials" | "verify_2fa";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

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
        if (remember) localStorage.setItem("zynum_remember", "1");
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
    if (!email || !password) {
      setErrorMsg("Veuillez remplir tous les champs");
      return;
    }
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
    setIsVerifying(true);
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
    } finally {
      setIsVerifying(false);
    }
  };

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
          {step !== "credentials" ? (
            <button
              onClick={() => { setStep("credentials"); setCodeDigits(["","","","","",""]); setErrorMsg(""); }}
              style={{ background: "rgba(255,255,255,0.35)", border: "none", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <ChevronLeft style={{ width: 22, height: 22, color: "#1a3a6b" }} />
            </button>
          ) : (
            <Link href="/">
              <button style={{ background: "rgba(255,255,255,0.35)", border: "none", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <ChevronLeft style={{ width: 22, height: 22, color: "#1a3a6b" }} />
              </button>
            </Link>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ width: 40 }} />
        </div>

        {/* Logo + title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "16px 0 36px" }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", marginBottom: 14 }}>
            <img src="/logo.jpg" alt="ZyNum" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <span style={{ fontWeight: 900, fontSize: 22, color: "#1a3a6b", letterSpacing: "-0.3px" }}>ZyNum</span>
          <span style={{ color: "#4a6fa5", fontSize: 14, marginTop: 4 }}>
            {step === "credentials" ? "Connectez-vous à votre compte" : "Vérification en deux étapes"}
          </span>
        </div>

        {step === "credentials" && (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Email */}
            <div style={FIELD_WRAP}>
              <span style={ICON_LEFT}><Mail style={{ width: 18, height: 18 }} /></span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Adresse email"
                autoComplete="email"
                style={NAKED_INPUT}
              />
            </div>

            {/* Mot de passe */}
            <div style={FIELD_WRAP}>
              <span style={ICON_LEFT}><Lock style={{ width: 18, height: 18 }} /></span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe"
                autoComplete="current-password"
                style={NAKED_INPUT}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: "0 14px 0 0" }}
              >
                {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>

            {/* Remember + forgot */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 2 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div
                  onClick={() => setRemember(s => !s)}
                  style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: "2px solid",
                    borderColor: remember ? "#1a3fc8" : "rgba(255,255,255,0.7)",
                    backgroundColor: remember ? "#1a3fc8" : "rgba(255,255,255,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                >
                  {remember && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 13 }}>Se souvenir</span>
              </label>
              <Link href="/forgot-password">
                <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Mot de passe oublié ?</span>
              </Link>
            </div>

            {/* Error */}
            {errorMsg && (
              <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              style={{
                width: "100%", height: 54, borderRadius: 30,
                backgroundColor: "#1a3fc8", color: "#ffffff",
                fontWeight: 800, fontSize: 16, border: "none",
                cursor: loginMutation.isPending ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(26,63,200,0.4)",
                marginTop: 4,
                opacity: loginMutation.isPending ? 0.75 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {loginMutation.isPending
                ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                : "Connexion"}
            </button>
          </form>
        )}

        {step === "verify_2fa" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center", margin: 0 }}>
              Code envoyé à <strong style={{ color: "#fff" }}>{email}</strong>
            </p>

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {codeDigits.map((d, i) => (
                <div key={i} style={{ width: 48, height: 56, borderRadius: 14, backgroundColor: "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <input
                    ref={el => { codeRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleCodeChange(i, e.target.value)}
                    onKeyDown={e => handleCodeKey(i, e)}
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

            {errorMsg && (
              <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={isVerifying || codeDigits.join("").length !== 6}
              style={{
                width: "100%", height: 54, borderRadius: 30,
                backgroundColor: "#1a3fc8", color: "#ffffff",
                fontWeight: 800, fontSize: 16, border: "none",
                cursor: (isVerifying || codeDigits.join("").length !== 6) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(26,63,200,0.4)",
                opacity: (isVerifying || codeDigits.join("").length !== 6) ? 0.6 : 1,
              }}
            >
              {isVerifying ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} /> : "Vérifier"}
            </button>
          </div>
        )}

        {/* Register link */}
        <div style={{ textAlign: "center", marginTop: 24, marginBottom: 40 }}>
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 14 }}>Pas encore de compte ? </span>
          <Link href="/register">
            <span style={{ color: "#ffffff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>S'inscrire</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
