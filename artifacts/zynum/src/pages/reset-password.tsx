import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const emailFromLink = params.get("email") || "";
  const verifiedFromLink = params.get("verified") === "1";

  const [email, setEmail] = useState(emailFromLink);
  const [code, setCode] = useState("");
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const pwdMatch = confirmPassword ? newPassword === confirmPassword : true;

  const handleCodeChange = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...codeDigits];
    next[idx] = digit;
    setCodeDigits(next);
    if (digit && idx < 5) codeRefs.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !codeDigits[idx] && idx > 0) codeRefs.current[idx - 1]?.focus();
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCodeDigits(pasted.split(""));
      codeRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !newPassword) return;
    if (newPassword !== confirmPassword) { setErrorMsg("Les mots de passe ne correspondent pas."); return; }
    if (newPassword.length < 8) { setErrorMsg("Le mot de passe doit contenir au moins 8 caractères."); return; }

    const finalCode = verifiedFromLink ? undefined : codeDigits.join("");
    if (!verifiedFromLink && finalCode!.length < 6) { setErrorMsg("Entrez le code à 6 chiffres."); return; }

    setIsLoading(true);
    setErrorMsg("");
    try {
      const r = await fetch(`${API}/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: finalCode, newPassword }),
      });
      const data = await r.json();
      if (!r.ok) { setErrorMsg(data.message || "Erreur lors de la réinitialisation."); return; }
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full pl-12 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[15px] outline-none transition-all focus:border-red-400 focus:ring-2 focus:ring-red-500/15 focus:bg-white placeholder:text-gray-400";

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[42%] bg-gradient-to-br from-red-500 to-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-black/20">
              <img src="/logo.jpg" alt="ZyNum" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">ZyNum</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">Sécurité<br />renforcée</h2>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">Créez un nouveau mot de passe fort pour protéger votre compte.</p>
        </div>
        <div className="relative z-10 text-white/50 text-xs">© 2025 ZyNum. Tous droits réservés.</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md">
              <img src="/logo.jpg" alt="ZyNum" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">ZyNum</span>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Mot de passe modifié !</h2>
              <p className="text-[15px] text-gray-500 mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
              <button
                onClick={() => setLocation("/login")}
                className="w-full py-4 rounded-xl font-bold text-white text-[16px] transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-primary hover:from-red-600 hover:to-primary/90 shadow-lg shadow-red-500/30"
              >
                Se connecter <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
                  <ShieldCheck className="w-7 h-7 text-red-500" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-2">Nouveau mot de passe 🔐</h1>
                <p className="text-[15px] text-gray-500">
                  {verifiedFromLink ? "Votre identité a été confirmée. Créez votre nouveau mot de passe." : "Entrez le code reçu par email et créez votre nouveau mot de passe."}
                </p>
                {!verifiedFromLink && (
                  <p className="mt-3 text-[13px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    📩 Si vous ne trouvez pas l'email, vérifiez votre dossier <strong>spam / courrier indésirable</strong>.
                  </p>
                )}
              </div>

              {errorMsg && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {!emailFromLink && (
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">Adresse email <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} style={{ paddingTop: "0.875rem", paddingBottom: "0.875rem" }} />
                    </div>
                  </div>
                )}

                {!verifiedFromLink && (
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 mb-2">Code de vérification <span className="text-red-500">*</span></label>
                    <div className="flex gap-2 justify-center" onPaste={handleCodePaste}>
                      {codeDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => { codeRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleCodeChange(i, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(i, e)}
                          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-gray-50 text-gray-900 outline-none transition-all focus:border-red-400 focus:ring-2 focus:ring-red-500/15 focus:bg-white"
                          style={{ borderColor: d ? "#f87171" : undefined }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-2">Nouveau mot de passe <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type={showNew ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full pl-12 pr-12 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 text-[15px] outline-none transition-all focus:border-red-400 focus:ring-2 focus:ring-red-500/15 focus:bg-white placeholder:text-gray-400"
                      style={{ paddingTop: "0.875rem", paddingBottom: "0.875rem" }}
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-2">Confirmer <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className={`w-full pl-12 pr-12 rounded-xl text-gray-900 text-[15px] outline-none transition-all placeholder:text-gray-400 ${
                        !pwdMatch ? "bg-red-50 border border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-500/15"
                          : "bg-gray-50 border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-500/15 focus:bg-white"
                      }`}
                      style={{ paddingTop: "0.875rem", paddingBottom: "0.875rem" }}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!pwdMatch && <p className="text-xs text-red-600 mt-1.5 font-medium">Les mots de passe ne correspondent pas.</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="w-full py-4 rounded-xl font-bold text-white text-[16px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] bg-gradient-to-r from-red-500 to-primary hover:from-red-600 hover:to-primary/90 shadow-lg shadow-red-500/30"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Enregistrer le nouveau mot de passe <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
