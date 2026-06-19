import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

export default function ResetPassword() {
  const [, navigate] = useLocation();

  const params    = new URLSearchParams(window.location.search);
  const emailInit = params.get("email") ?? "";

  const [email, setEmail]         = useState(emailInit);
  const [codeDigits, setCode]     = useState(["","","","","",""]);
  const [newPwd, setNewPwd]       = useState("");
  const [confirmPwd, setConfirm]  = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState("");
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
    if (code.length !== 6) { setError("Entrez les 6 chiffres du code"); return; }
    if (!newPwd || newPwd.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères"); return; }
    if (newPwd !== confirmPwd) { setError("Les mots de passe ne correspondent pas"); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${apiBase}/api/v1/auth/reset-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, code, newPassword: newPwd }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message ?? "Code invalide ou expiré."); return; }
      setDone(true);
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
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
  const strengthColor = ["bg-gray-200","bg-red-400","bg-orange-400","bg-yellow-400","bg-green-500"][pwdStrength];
  const strengthLabel = ["","Faible","Moyen","Bien","Fort"][pwdStrength];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 pt-12 pb-2">
        <Link href="/forgot-password" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-black text-xs">Z</span>
          </div>
          <span className="font-extrabold text-gray-900 text-base">ZyNum</span>
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 pb-10 max-w-sm mx-auto w-full overflow-y-auto">

        {done ? (
          <div className="flex flex-col items-center text-center gap-5 pt-8">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">Mot de passe modifié !</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
            >
              Se connecter <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                <Lock className="w-7 h-7 text-blue-500" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Nouveau mot de passe</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Entrez le code à 6 chiffres reçu par email et choisissez un nouveau mot de passe.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {!emailInit && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full h-12 px-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">
                  Code de vérification
                </label>
                <div className="flex gap-2 justify-between">
                  {codeDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { codeRefs.current[i] = el; }}
                      type="text" inputMode="numeric" maxLength={1}
                      value={d}
                      onChange={e => handleDigit(i, e.target.value)}
                      onKeyDown={e => handleKey(i, e)}
                      className="w-12 h-14 rounded-2xl border-2 border-gray-200 bg-gray-50 text-center text-xl font-black text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all caret-transparent"
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPwd ? "text" : "password"}
                    value={newPwd} onChange={e => setNewPwd(e.target.value)}
                    placeholder="Min. 8 caractères"
                    autoComplete="new-password"
                    className="w-full h-12 pl-10 pr-12 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPwd && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1,2,3,4].map(n => (
                        <div key={n} className={`h-1 rounded-full flex-1 transition-colors ${pwdStrength >= n ? strengthColor : "bg-gray-200"}`} />
                      ))}
                    </div>
                    <span className={`text-xs font-bold ${pwdStrength >= 3 ? "text-green-600" : pwdStrength >= 2 ? "text-yellow-600" : "text-red-500"}`}>
                      {strengthLabel}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPwd ? "text" : "password"}
                    value={confirmPwd} onChange={e => setConfirm(e.target.value)}
                    placeholder="Répéter le mot de passe"
                    autoComplete="new-password"
                    className={`w-full h-12 pl-10 pr-4 rounded-2xl border bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                      confirmPwd && confirmPwd !== newPwd
                        ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                    }`}
                  />
                </div>
                {confirmPwd && confirmPwd !== newPwd && (
                  <p className="text-xs text-red-500 mt-1.5">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl px-3 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || codeDigits.join("").length !== 6 || !newPwd || !confirmPwd}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-60 transition-all"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <>Réinitialiser <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/forgot-password" className="text-sm text-blue-600 font-semibold hover:text-blue-700">
                ← Renvoyer un code
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
