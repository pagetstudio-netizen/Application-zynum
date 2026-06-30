import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Eye, EyeOff, Check, ChevronLeft, ChevronDown, Gift, Phone } from "lucide-react";
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
  { name: "France", code: "FR", dial: "+33" },
  { name: "Maroc", code: "MA", dial: "+212" },
];

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
  const [phone, setPhone] = useState("");
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
    if (!phone) e.phone = "Le numéro de téléphone est requis";
    else if (phone.replace(/\s/g, "").length < 6) e.phone = "Numéro de téléphone invalide";
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
    const fullPhone = `${selectedCountry.dial}${phone.replace(/\s/g, "")}`;
    registerMutation.mutate({
      data: {
        name: phone.replace(/\s/g, ""),
        email: `${phone.replace(/\s/g, "")}@zynum.local`,
        phone: fullPhone,
        password,
        confirmPassword,
        ...(referral ? { referralCode: referral } : {}),
      },
    } as any);
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

          {/* Pays — select wrapper */}
          <div>
            <div style={{ ...FIELD_WRAP, paddingRight: 14 }}>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                style={{
                  flex: 1,
                  height: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 15,
                  color: "#1a1a2e",
                  fontWeight: 600,
                  paddingLeft: 16,
                  cursor: "pointer",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.dial})</option>
                ))}
              </select>
              <ChevronDown style={{ width: 18, height: 18, color: "#9ca3af", flexShrink: 0, pointerEvents: "none" }} />
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <div style={{ display: "flex", gap: 8 }}>
              {/* Badge indicatif */}
              <div style={{
                height: 54,
                borderRadius: 14,
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                fontWeight: 700,
                color: "#1a1a2e",
                fontSize: 15,
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}>
                {selectedCountry.dial}
              </div>
              {/* Input numéro */}
              <div style={{ ...FIELD_WRAP, flex: 1, borderColor: errors.phone ? "#ef4444" : undefined, border: errors.phone ? "1.5px solid #ef4444" : undefined }}>
                <span style={ICON_LEFT}><Phone style={{ width: 18, height: 18 }} /></span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="Numéro de téléphone"
                  autoComplete="tel"
                  style={NAKED_INPUT}
                />
              </div>
            </div>
            {errors.phone && <p style={ERROR_STYLE}>{errors.phone}</p>}
          </div>

          {/* Mot de passe */}
          <div>
            <div style={{ ...FIELD_WRAP, borderColor: errors.password ? "#ef4444" : undefined, border: errors.password ? "1.5px solid #ef4444" : undefined }}>
              <span style={ICON_LEFT}><Lock style={{ width: 18, height: 18 }} /></span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe"
                autoComplete="new-password"
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
            {errors.password && <p style={ERROR_STYLE}>{errors.password}</p>}
          </div>

          {/* Confirmer le mot de passe */}
          <div>
            <div style={{ ...FIELD_WRAP, borderColor: errors.confirm ? "#ef4444" : undefined, border: errors.confirm ? "1.5px solid #ef4444" : undefined }}>
              <span style={ICON_LEFT}><Lock style={{ width: 18, height: 18 }} /></span>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Répéter le mot de passe"
                autoComplete="new-password"
                style={NAKED_INPUT}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 14 }}>
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
          <div style={FIELD_WRAP}>
            <span style={ICON_LEFT}><Gift style={{ width: 18, height: 18 }} /></span>
            <input
              type="text"
              value={referral}
              onChange={e => setReferral(e.target.value)}
              placeholder="Code de parrainage (optionnel)"
              style={NAKED_INPUT}
            />
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
              backgroundColor: "#1a3fc8", color: "#ffffff",
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
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 14 }}>Déjà inscrit ? </span>
          <Link href="/login">
            <span style={{ color: "#ffffff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Connectez-vous</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
