import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, User, Lock, Eye, EyeOff, ArrowRight, ChevronLeft, Check } from "lucide-react";
import { useRegisterUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const registerMutation = useRegisterUser({
    mutation: {
      onSuccess: (data: any) => {
        localStorage.setItem("zynum_token", data.token);
        queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        toast({ title: "Compte créé !", description: "Bienvenue sur ZyNum !" });
        setLocation("/dashboard");
      },
      onError: (error: any) => {
        const msg = error?.response?.data?.message || "Une erreur s'est produite";
        setErrorMsg(msg);
      },
    },
  });

  const pwdStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthColor = ["bg-gray-200", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"][pwdStrength];
  const strengthLabel = ["", "Faible", "Moyen", "Bien", "Fort"][pwdStrength];

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!firstName || !email || !password) { setErrorMsg("Veuillez remplir tous les champs"); return; }
    if (password !== confirmPassword) { setErrorMsg("Les mots de passe ne correspondent pas"); return; }
    if (password.length < 8) { setErrorMsg("Le mot de passe doit contenir au moins 8 caractères"); return; }
    if (!acceptTerms) { setErrorMsg("Veuillez accepter les conditions d'utilisation"); return; }
    const name = `${firstName} ${lastName}`.trim();
    registerMutation.mutate({ data: { name, email, password, confirmPassword } } as any);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2">
        <Link href="/" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
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

      <div className="flex-1 flex flex-col px-6 pt-6 pb-10 max-w-sm mx-auto w-full overflow-y-auto">

        <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Créer un compte</h1>
              <p className="text-sm text-gray-500">Rejoignez ZyNum gratuitement</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Names row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Prénom</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Jean"
                      className="w-full h-12 pl-9 pr-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Dupont"
                    className="w-full h-12 px-3 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

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
                    autoComplete="new-password"
                    className="w-full h-12 pl-10 pr-12 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= pwdStrength ? strengthColor : "bg-gray-200"}`} />
                      ))}
                    </div>
                    <p className={`text-[11px] font-medium ${pwdStrength <= 1 ? "text-red-500" : pwdStrength <= 2 ? "text-orange-500" : pwdStrength <= 3 ? "text-yellow-600" : "text-green-600"}`}>
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={`w-full h-12 pl-10 pr-12 rounded-2xl border bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                      confirmPassword && confirmPassword !== password
                        ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
                        : "border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {confirmPassword && confirmPassword === password && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  onClick={() => setAcceptTerms(s => !s)}
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    acceptTerms ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white group-hover:border-blue-400"
                  }`}
                >
                  {acceptTerms && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs text-gray-500 leading-relaxed">
                  J'accepte les{" "}
                  <span className="text-blue-600 font-semibold">conditions d'utilisation</span>{" "}
                  et la{" "}
                  <span className="text-blue-600 font-semibold">politique de confidentialité</span>
                </span>
              </label>

              {/* Error */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl px-3 py-2.5">
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-60 active:scale-98 transition-all"
              >
                {registerMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <>Créer mon compte <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-gray-500">
                Déjà un compte ?{" "}
                <Link href="/login" className="text-blue-600 font-bold hover:text-blue-700">Se connecter</Link>
              </p>
            </div>
      </div>
    </div>
  );
}
