import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Mail, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const apiBase = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await fetch(`${apiBase}/api/v1/auth/forgot-password`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2">
        <Link href="/login" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
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

      <div className="flex-1 flex flex-col px-6 pt-8 pb-10 max-w-sm mx-auto w-full">

        {!sent ? (
          <>
            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                <Mail className="w-7 h-7 text-blue-500" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Mot de passe oublié ?</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Entrez votre adresse email. Nous vous enverrons un code à 6 chiffres pour réinitialiser votre mot de passe.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    autoComplete="email"
                    autoFocus
                    className="w-full h-12 pl-10 pr-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-medium rounded-xl px-3 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-60 transition-all"
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <>Envoyer le code <ArrowRight className="w-4 h-4" /></>}
              </button>

              <button
                type="button"
                onClick={() => navigate("/reset-password")}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors text-center pt-1"
              >
                J'ai déjà un code →
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center gap-5 pt-8">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">Email envoyé !</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Un code à 6 chiffres a été envoyé à<br />
                <span className="font-bold text-gray-800">{email}</span>.<br />
                Vérifiez votre boîte de réception (et les spams).
              </p>
            </div>
            <button
              onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
            >
              Saisir le code <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Renvoyer l'email
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/login" className="text-sm text-blue-600 font-semibold hover:text-blue-700">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
