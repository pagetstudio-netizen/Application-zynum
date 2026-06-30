import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Eye, EyeOff, Mail, Check, ChevronLeft, Gift, ChevronDown } from "lucide-react";
import { useRegisterUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const COUNTRIES = [
  { name: "Cameroun", code: "CM", dial: "+237" },
  { name: "Côte d'Ivoire", code: "CI", dial: "+225" },
  { name: "Sénégal", code: "SN", dial: "+221" },
  { name: "Mali", code: "ML", dial: "+223" },
  { name: "Burkina Faso", code: "BF", dial: "+226" },
  { name: "Niger", code: "NE", dial: "+227" },
  { name: "Tchad", code: "TD", dial: "+235" },
  { name: "Gabon", code: "GA", dial: "+241" },
  { name: "Congo", code: "CG", dial: "+242" },
  { name: "RD Congo", code: "CD", dial: "+243" },
  { name: "Guinée", code: "GN", dial: "+224" },
  { name: "Togo", code: "TG", dial: "+228" },
  { name: "Bénin", code: "BJ", dial: "+229" },
  { name: "Madagascar", code: "MG", dial: "+261" },
  { name: "France", code: "FR", dial: "+33" },
  { name: "Belgique", code: "BE", dial: "+32" },
  { name: "Maroc", code: "MA", dial: "+212" },
  { name: "Algérie", code: "DZ", dial: "+213" },
  { name: "Tunisie", code: "TN", dial: "+216" },
];

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
  boxSizing: "border-box",
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
};

const ICON_WRAP: React.CSSProperties = {
  position: "relative",
  width: "100%",
};

const ICON_POS: React.CSSProperties = {
  position: "absolute",
  left: 15,
  top: "50%",
  transform: "translateY(-50%)",
  color: "#9ca3af",
  display: "flex",
  pointerEvents: "none",
};

const ERROR_STYLE: React.CSSProperties = {
  color: "#ef4444",
  fontSize: 12,
  marginTop: 4,
  fontWeight: 500,
};

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [country, setCountry] = useState("CM");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [referralCode] = useState(() => new URLSearchParams(window.location.search).get("ref") ?? "");
  const [referral, setReferral] = useState(referralCode);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  const selectedCountry = COUNTRIES.find(c => c.code === country) ?? COUNTRIES[0];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "L'email est requis";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Email invalide";
    if (!password) e.password = "Le mot de passe est requis";
    else if (password.length < 6) e.password = "Au moins 6 caractères";
    if (!confirmPassword) e.confirm = "Confirmez le mot de passe";
    else if (confirmPassword !== password) e.confirm = "Les mots de passe ne correspondent pas";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

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
        setGlobalError(msg);
        toast({ title: "Erreur d'inscription", description: msg, variant: "destructive", duration: 3500 });
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    if (!validate()) return;
    registerMutation.mutate({
      data: { name: email.split("@")[0], email, password, confirmPassword, ...(referral ? { referralCode: referral } : {}) },
    } as any);
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
          <Link href="/">
            <button style={{ background: "rgba(255,255,255,0.35)", border: "none", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <ChevronLeft style={{ width: 22, height: 22, color: "#1a3a6b" }} />
            </button>
          </Link>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#1a3a6b" }}>Créer un compte</span>
          </div>
          <div style={{ width: 40 }} />
        </div>

        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", margin: "20px 0 28px" }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
            <img src="/logo.jpg" alt="ZyNum" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Pays */}
          <div>
            <div style={ICON_WRAP}>
              <span style={ICON_POS}>🌍</span>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                style={{ ...INPUT_STYLE, paddingLeft: 44, appearance: "none", cursor: "pointer" }}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.dial})</option>
                ))}
              </select>
              <ChevronDown style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "#9ca3af", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Email */}
          <div>
            <div style={ICON_WRAP}>
              <span style={ICON_POS}><Mail style={{ width: 18, height: 18 }} /></span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Adresse email"
                autoComplete="email"
                style={{ ...INPUT_STYLE, borderColor: errors.email ? "#ef4444" : "transparent", border: errors.email ? "1.5px solid #ef4444" : "none" }}
              />
            </div>
            {errors.email && <p style={ERROR_STYLE}>{errors.email}</p>}
          </div>

          {/* Mot de passe */}
          <div>
            <div style={{ ...ICON_WRAP, position: "relative" }}>
              <span style={ICON_POS}><Lock style={{ width: 18, height: 18 }} /></span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe"
                autoComplete="new-password"
                style={{ ...INPUT_STYLE, paddingRight: 48, border: errors.password ? "1.5px solid #ef4444" : "none" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex" }}
              >
                {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
              </button>
            </div>
            {errors.password && <p style={ERROR_STYLE}>{errors.password}</p>}
          </div>

          {/* Confirmer le mot de passe */}
          <div>
            <div style={{ ...ICON_WRAP, position: "relative" }}>
              <span style={ICON_POS}><Lock style={{ width: 18, height: 18 }} /></span>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Répéter le mot de passe"
                autoComplete="new-password"
                style={{ ...INPUT_STYLE, paddingRight: 48, border: errors.confirm ? "1.5px solid #ef4444" : "none" }}
              />
              <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 6 }}>
                {confirmPassword && confirmPassword === password && (
                  <Check style={{ width: 16, height: 16, color: "#22c55e" }} />
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex" }}
                >
                  {showConfirm ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                </button>
              </div>
            </div>
            {errors.confirm && <p style={ERROR_STYLE}>{errors.confirm}</p>}
          </div>

          {/* Code de parrainage */}
          <div>
            <div style={ICON_WRAP}>
              <span style={ICON_POS}><Gift style={{ width: 18, height: 18 }} /></span>
              <input
                type="text"
                value={referral}
                onChange={e => setReferral(e.target.value)}
                placeholder="Code de parrainage (optionnel)"
                style={INPUT_STYLE}
              />
            </div>
          </div>

          {/* Global error */}
          {globalError && (
            <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 12, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
              {globalError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={registerMutation.isPending}
            style={{
              width: "100%", height: 54, borderRadius: 30,
              background: "#1a3fc8", color: "#fff",
              fontWeight: 800, fontSize: 16, border: "none",
              cursor: registerMutation.isPending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 20px rgba(26,63,200,0.4)",
              marginTop: 4,
              opacity: registerMutation.isPending ? 0.75 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {registerMutation.isPending
              ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
              : "Inscrivez-vous maintenant"}
          </button>
        </form>

        {/* Login link */}
        <div style={{ textAlign: "center", marginTop: 20, marginBottom: 40 }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>Déjà inscrit ? </span>
          <Link href="/login">
            <span style={{ color: "#ffffff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Connectez-vous</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
