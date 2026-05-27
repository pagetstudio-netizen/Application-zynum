import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, ChevronLeft } from "lucide-react";
import { useLoginUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

type Step = "credentials" | "verify_2fa" | "verify_email";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

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
        if (data.requiresVerification) {
          setStep("verify_email");
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
        const msg =
          error?.data?.message ||
          error?.message ||
          "Email ou mot de passe incorrect";
        setErrorMsg(msg);
      },
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!email || !password) { setErrorMsg("Veuillez remplir tous les champs"); return; }
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
    if (e.key === "Backspace" && !codeDigits[i] && i > 0) {
      codeRefs.current[i - 1]?.focus();
    }
  };

  const handleVerify = async (type: "2fa" | "email") => {
    const code = codeDigits.join("");
    if (code.length !== 6) { setErrorMsg("Entrez les 6 chiffres"); return; }
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const endpoint = type === "2fa" ? "/api/v1/auth/verify-login" : "/api/v1/auth/verify-email";
      const res = await fetch(endpoint, {
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
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotSent(true);
    } catch {}
    finally { setForgotLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2">
        {step !== "credentials" ? (
          <button onClick={() => { setStep("credentials"); setCodeDigits(["","","","","",""]); setErrorMsg(""); }} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        ) : (
          <Link href="/" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </Link>
        )}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-black text-xs">Z</span>
          </div>
          <span className="font-extrabold text-gray-900 text-base">ZyNum</span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-6 pb-10 max-w-sm mx-auto w-full">

        {/* ── STEP: CREDENTIALS ─────────────────────────── */}
        {step === "credentials" && !showForgot && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Connexion</h1>
              <p className="text-sm text-gray-500">Accédez à votre compte ZyNum</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    autoComplete="email"
                    className="w-full h-12 pl-10 pr-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full h-12 pl-10 pr-12 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot */}
              <div className="flex justify-end">
                <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); setErrorMsg(""); }} className="text-xs text-blue-600 font-semibold hover:text-blue-700">
                  Mot de passe oublié ?
                </button>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl px-3 py-2.5">
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-13 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-60 active:scale-98 transition-all"
              >
                {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Se connecter <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            {/* Register link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Pas encore de compte ?{" "}
                <Link href="/register" className="text-blue-600 font-bold hover:text-blue-700">Créer un compte</Link>
              </p>
            </div>
          </>
        )}

        {/* ── STEP: FORGOT PASSWORD ─────────────────────── */}
        {step === "credentials" && showForgot && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Mot de passe oublié</h1>
              <p className="text-sm text-gray-500">Entrez votre email pour recevoir un lien de réinitialisation.</p>
            </div>

            {forgotSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm font-semibold text-gray-800">Email envoyé !</p>
                <p className="text-xs text-gray-500">Vérifiez votre boîte mail et cliquez sur le lien reçu.</p>
                <button onClick={() => { setShowForgot(false); setForgotSent(false); }} className="text-sm text-blue-600 font-bold">← Retour à la connexion</button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full h-12 pl-10 pr-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
                <button type="submit" disabled={forgotLoading || !forgotEmail} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-60">
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer le lien"}
                </button>
                <button type="button" onClick={() => setShowForgot(false)} className="w-full text-sm text-gray-500 font-medium hover:text-gray-700">
                  ← Retour
                </button>
              </form>
            )}
          </>
        )}

        {/* ── STEP: CODE VERIFICATION ───────────────────── */}
        {(step === "verify_2fa" || step === "verify_email") && (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Vérification</h1>
              <p className="text-sm text-gray-500">
                {step === "verify_2fa"
                  ? `Un code à 6 chiffres a été envoyé à ${email}`
                  : `Vérifiez votre email ${email} pour activer votre compte`}
              </p>
            </div>

            {/* Code input */}
            <div className="flex gap-2 justify-center mb-6">
              {codeDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleCodeChange(i, e.target.value)}
                  onKeyDown={e => handleCodeKey(i, e)}
                  className="w-12 h-14 rounded-2xl border-2 border-gray-200 bg-gray-50 text-center text-xl font-black text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all caret-transparent"
                />
              ))}
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl px-3 py-2.5 mb-4">
                {errorMsg}
              </div>
            )}

            <button
              onClick={() => handleVerify(step === "verify_2fa" ? "2fa" : "email")}
              disabled={isSubmitting || codeDigits.join("").length !== 6}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Vérifier <ArrowRight className="w-4 h-4" /></>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
