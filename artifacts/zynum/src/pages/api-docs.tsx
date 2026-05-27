import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Code2, Zap, Globe2, Lock, Bell, ArrowRight, MessageSquare, Terminal, GitBranch, Webhook, Key, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

const FEATURES = {
  fr: [
    { icon: <Terminal className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", title: "API REST complète", desc: "Achetez des numéros, récupérez les SMS et gérez vos commandes directement depuis votre code." },
    { icon: <Webhook className="w-5 h-5" />, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", title: "Webhooks en temps réel", desc: "Recevez les codes OTP instantanément via webhook dès qu'un SMS arrive sur votre numéro." },
    { icon: <Globe2 className="w-5 h-5" />, color: "text-green-400", bg: "bg-green-400/10 border-green-400/20", title: "180+ pays disponibles", desc: "Accédez à tous nos numéros virtuels dans 180 pays via des endpoints simples et bien documentés." },
    { icon: <GitBranch className="w-5 h-5" />, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", title: "SDKs multi-langages", desc: "Librairies officielles pour Node.js, Python, PHP et d'autres langages en préparation." },
    { icon: <Key className="w-5 h-5" />, color: "text-pink-400", bg: "bg-pink-400/10 border-pink-400/20", title: "Authentification sécurisée", desc: "Clé API unique par compte, permissions granulaires et logs de chaque appel en temps réel." },
    { icon: <Zap className="w-5 h-5" />, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20", title: "Latence ultra-faible", desc: "Infrastructure dédiée avec une latence inférieure à 200ms pour des intégrations réactives." },
  ],
  en: [
    { icon: <Terminal className="w-5 h-5" />, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", title: "Full REST API", desc: "Buy numbers, retrieve SMS and manage orders directly from your code." },
    { icon: <Webhook className="w-5 h-5" />, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", title: "Real-time webhooks", desc: "Receive OTP codes instantly via webhook as soon as an SMS arrives on your number." },
    { icon: <Globe2 className="w-5 h-5" />, color: "text-green-400", bg: "bg-green-400/10 border-green-400/20", title: "180+ countries available", desc: "Access all our virtual numbers in 180 countries via simple, well-documented endpoints." },
    { icon: <GitBranch className="w-5 h-5" />, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20", title: "Multi-language SDKs", desc: "Official libraries for Node.js, Python, PHP and more languages in preparation." },
    { icon: <Key className="w-5 h-5" />, color: "text-pink-400", bg: "bg-pink-400/10 border-pink-400/20", title: "Secure authentication", desc: "Unique API key per account, granular permissions and real-time logs for every call." },
    { icon: <Zap className="w-5 h-5" />, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20", title: "Ultra-low latency", desc: "Dedicated infrastructure with latency under 200ms for responsive integrations." },
  ],
};

const STEPS = {
  fr: [
    { num: "01", label: "Inscrivez-vous sur ZyNum", desc: "Créez votre compte gratuitement." },
    { num: "02", label: "Récupérez votre clé API", desc: "Générée automatiquement dans votre espace développeur." },
    { num: "03", label: "Appelez notre API", desc: "Un seul endpoint pour acheter un numéro et recevoir un SMS." },
    { num: "04", label: "Recevez le code OTP", desc: "Via polling ou webhook selon votre architecture." },
  ],
  en: [
    { num: "01", label: "Sign up on ZyNum", desc: "Create your account for free." },
    { num: "02", label: "Get your API key", desc: "Automatically generated in your developer space." },
    { num: "03", label: "Call our API", desc: "A single endpoint to buy a number and receive an SMS." },
    { num: "04", label: "Receive the OTP code", desc: "Via polling or webhook depending on your architecture." },
  ],
};

export default function ApiDocs() {
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const features = FEATURES[lang] ?? FEATURES.fr;
  const steps = STEPS[lang] ?? STEPS.fr;

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast({ title: t("api_invalid_email"), variant: "destructive" });
      return;
    }
    try {
      await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // silent — still show success to user
    }
    setSubmitted(true);
    toast({ title: t("api_notify_toast") });
  };

  return (
    <div className="w-full">
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-500/5 blur-[80px] rounded-full" />
          <div className="absolute inset-0 grid-overlay-50" />
        </div>
        <div className="container max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              {t("api_badge")}
            </div>
            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10">
              <Code2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-extrabold text-white mb-6 leading-tight">
              {t("api_title1")}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-purple-400">{t("api_title2")}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-4">{t("api_desc1")}</p>
            <p className="text-muted-foreground text-base max-w-xl mx-auto mb-12">{t("api_desc2")}</p>
            {!submitted ? (
              <form onSubmit={handleNotify} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <div className="relative flex-1">
                  <Bell className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" className="w-full h-12 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition" />
                </div>
                <Button type="submit" size="lg" className="h-12 px-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-xl shadow-primary/25 shrink-0">
                  {t("api_notify_btn")} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-400 font-semibold px-6 py-3 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-green-400/20 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-green-400" />
                </div>
                {t("api_notified")}
              </motion.div>
            )}
            <p className="text-xs text-muted-foreground/60 mt-4">{t("api_no_spam")}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border border-white/[0.06] bg-[#0a0f1e] overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="w-3 h-3 rounded-full bg-red-400/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
              <div className="w-3 h-3 rounded-full bg-green-400/60" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">zynum-api.js</span>
              <span className="ml-auto text-xs text-muted-foreground/50 italic">{t("api_snippet_preview")}</span>
            </div>
            <pre className="p-6 text-sm font-mono overflow-x-auto leading-relaxed text-left select-none opacity-70">
              <code>
                <span className="text-muted-foreground">{"// Buy a virtual number in a few lines\n"}</span>
                <span className="text-blue-400">{"const "}</span>
                <span className="text-white">{"client "}</span>
                <span className="text-muted-foreground">{"= new "}</span>
                <span className="text-yellow-400">{"ZyNum"}</span>
                <span className="text-white">{"({ apiKey: "}</span>
                <span className="text-green-400">{"'zyn_xxxxxxxxxxxx'"}</span>
                <span className="text-white">{" });\n\n"}</span>
                <span className="text-muted-foreground">{"// 1. Buy a Telegram number (Senegal)\n"}</span>
                <span className="text-blue-400">{"const "}</span>
                <span className="text-white">{"{ phone, orderId } "}</span>
                <span className="text-muted-foreground">{"= await "}</span>
                <span className="text-white">{"client.numbers."}</span>
                <span className="text-blue-400">{"buy"}</span>
                <span className="text-white">{"({ service: "}</span>
                <span className="text-green-400">{"'telegram'"}</span>
                <span className="text-white">{", country: "}</span>
                <span className="text-green-400">{"'senegal'"}</span>
                <span className="text-white">{" });\n\n"}</span>
                <span className="text-muted-foreground">{"// 2. Wait for the OTP code\n"}</span>
                <span className="text-blue-400">{"const "}</span>
                <span className="text-white">{"{ smsCode } "}</span>
                <span className="text-muted-foreground">{"= await "}</span>
                <span className="text-white">{"client.orders."}</span>
                <span className="text-blue-400">{"waitForSms"}</span>
                <span className="text-white">{"(orderId);\n"}</span>
                <span className="text-white">{"console.log("}</span>
                <span className="text-green-400">{"'OTP Code:'"}</span>
                <span className="text-white">{", smsCode); "}</span>
                <span className="text-muted-foreground">{"// → 847291"}</span>
              </code>
            </pre>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">{t("api_features_title")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t("api_features_sub")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${f.bg} ${f.color}`}>{f.icon}</div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">{t("api_how_title")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {steps.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, x: i % 2 === 0 ? -12 : 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-start gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <span className="text-3xl font-extrabold text-primary/30 font-mono leading-none mt-1">{s.num}</span>
                <div>
                  <p className="font-bold text-white mb-1">{s.label}</p>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1a35] to-[#060d1f] p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-48 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <Lock className="w-10 h-10 text-primary mx-auto mb-5" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">{t("api_wait_title")}</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">{t("api_wait_desc")}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-xl shadow-primary/25">
                    <Zap className="w-4 h-4 mr-2" /> {t("api_create_account")}
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="h-12 px-8 border-white/20 text-white hover:bg-white/10 rounded-xl">
                    <MessageSquare className="w-4 h-4 mr-2" /> {t("api_contact_team")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
