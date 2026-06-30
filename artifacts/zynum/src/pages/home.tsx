import React, { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, ShieldCheck, Zap, Globe2, MessageSquare,
  Code, CheckCircle, Star, ChevronRight, Smartphone,
  Headphones, DollarSign, Users, Share2, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { useGetServices } from "@workspace/api-client-react";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: "easeOut" as any },
});

function HomeSvcLogo({ icon, color, name, size = 48 }: { icon: string; color: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const lightBg = ["#FFFC00", "#F0B90B", "#FAE100", "#FFC629"].some(c => color.toUpperCase() === c);
  const showFallback = failed || !icon;
  return (
    <div style={{ width: size, height: size, background: color, borderRadius: size * 0.22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {!showFallback ? (
        <img src={icon} alt={name} style={{ width: size * 0.58, height: size * 0.58, objectFit: "contain" }} onError={() => setFailed(true)} />
      ) : (
        <span style={{ fontWeight: 700, fontSize: size * 0.36, color: lightBg ? "#000" : "#fff", lineHeight: 1, userSelect: "none" }}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function Home() {
  const { t } = useLanguage();
  const { data: servicesData } = useGetServices();

  const STATS = [
    { value: "50K+",  label: t("home_stats_numbers") },
    { value: "180+",  label: t("home_stats_countries") },
    { value: "200+",  label: t("home_stats_services") },
    { value: "99.9%", label: t("home_stats_uptime") },
  ];

  const STEPS = [
    {
      num: "01",
      icon: <Smartphone className="w-7 h-7" />,
      title: t("home_step1_title"),
      desc: t("home_step1_desc"),
    },
    {
      num: "02",
      icon: <Globe2 className="w-7 h-7" />,
      title: t("home_step2_title"),
      desc: t("home_step2_desc"),
    },
    {
      num: "03",
      icon: <CheckCircle className="w-7 h-7" />,
      title: t("home_step3_title"),
      desc: t("home_step3_desc"),
    },
  ];

  const FEATURES = [
    { icon: <Zap className="w-6 h-6 text-yellow-500" />, bg: "bg-yellow-50 border-yellow-200", title: t("home_feat_instant"), desc: t("home_feat_instant_desc") },
    { icon: <Globe2 className="w-6 h-6 text-blue-500" />, bg: "bg-blue-50 border-blue-200", title: t("home_feat_global"), desc: t("home_feat_global_desc") },
    { icon: <ShieldCheck className="w-6 h-6 text-green-500" />, bg: "bg-green-50 border-green-200", title: t("home_feat_secure"), desc: t("home_feat_secure_desc") },
    { icon: <Headphones className="w-6 h-6 text-purple-500" />, bg: "bg-purple-50 border-purple-200", title: t("home_feat_support"), desc: t("home_feat_support_desc") },
    { icon: <DollarSign className="w-6 h-6 text-rose-500" />, bg: "bg-rose-50 border-rose-200", title: t("home_feat_affiliate"), desc: t("home_feat_affiliate_desc") },
  ];

  return (
    <div className="w-full flex flex-col items-center overflow-x-hidden">

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="w-full relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Grid + blobs */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 grid-overlay-60" />
          <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-blue-200/30 blur-[120px]" />
          <div className="absolute bottom-0 right-[-5%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute top-[30%] right-[15%] w-[350px] h-[350px] rounded-full bg-rose-200/20 blur-[100px]" />
        </div>

        <div className="container max-w-7xl mx-auto px-4 relative z-10 py-24 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-8 text-sm font-medium text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {t("home_badge")}
            </motion.div>

            <motion.h1 {...fadeUp(0.1)} className="text-5xl md:text-6xl xl:text-7xl font-display font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-6">
              {t("home_hero_title1")}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-primary to-rose-500">
                {t("home_hero_accent")}
              </span>{" "}
              {t("home_hero_title2")}
            </motion.h1>

            <motion.p {...fadeUp(0.2)} className="text-lg text-gray-500 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              {t("home_hero_sub")}
            </motion.p>

            <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 rounded-xl text-base font-bold bg-gradient-to-r from-primary to-rose-500 hover:from-primary/90 hover:to-rose-500/90 text-white shadow-2xl shadow-primary/30 transition-all hover:-translate-y-1 border-0">
                  {t("home_start_free")} <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/buy">
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-xl text-base font-semibold border-gray-300 bg-white hover:bg-gray-50 text-gray-800 transition-all shadow-sm">
                  {t("nav_buy")}
                </Button>
              </Link>
            </motion.div>

            <motion.div {...fadeUp(0.4)} className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-10 max-w-sm lg:max-w-none mx-auto lg:mx-0 text-sm text-gray-500">
              <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {t("home_cta_no_card")}</span>
              <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {t("footer_countries")}</span>
              <span className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm"><CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {t("home_feat_instant")}</span>
            </motion.div>
          </div>

          {/* Right: floating card — intentionally kept dark as product demo */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex-shrink-0 w-full max-w-sm lg:max-w-md relative"
          >
            <div className="dark-card relative rounded-3xl border border-white/10 bg-[#0d1526]/90 backdrop-blur-xl p-6 shadow-2xl shadow-black/20">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                  <img src="https://cdn.simpleicons.org/telegram/ffffff" className="w-6 h-6" alt="Telegram" />
                </div>
                <div>
                  <p className="text-white font-bold">Telegram</p>
                  <p className="text-white/50 text-xs">{t("login_subtitle").split("/")[0].trim()}</p>
                </div>
                <span className="ml-auto text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">ACTIF</span>
              </div>

              <div className="bg-black/40 rounded-2xl p-4 mb-4 border border-white/5">
                <p className="text-xs text-white/40 mb-1">{t("buy_phone")}</p>
                <p className="text-2xl font-bold text-white font-mono tracking-wider">+63 912 345 6789</p>
                <p className="text-xs text-white/40 mt-1">🇵🇭 Philippines · virtual2</p>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-0.5">SMS reçu il y a 3 sec</p>
                  <p className="text-sm text-white font-medium">Telegram code: <span className="text-green-400 font-bold text-lg">84 271</span></p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <div className="flex-1 bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/40">{t("buy_price")}</p>
                  <p className="font-bold text-white">62 FCFA</p>
                </div>
                <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-white/40">{t("buy_time_left")}</p>
                  <p className="font-bold text-white">3 sec</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-primary rounded-2xl px-4 py-3 shadow-xl shadow-primary/30 flex items-center gap-2">
              <Zap className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-bold">{t("home_feat_instant")}</span>
            </div>

            <Link href="/register">
              <div className="absolute -bottom-4 -left-4 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all group">
                <div className="relative">
                  <div className="flex -space-x-2">
                    {["/avatar1.jpeg", "/avatar2.jpeg", "/avatar3.jpeg"].map((src, i) => (
                      <img key={i} src={src} alt="user" className="w-6 h-6 rounded-full border-2 border-white object-cover" style={{ zIndex: 3 - i }} />
                    ))}
                  </div>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white animate-pulse" />
                </div>
                <div>
                  <p className="text-gray-900 text-xs font-bold group-hover:text-primary transition-colors">50K+ utilisateurs</p>
                  <p className="text-[10px] text-gray-400 leading-none">Rejoindre →</p>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <section className="w-full border-y border-gray-200 bg-white">
        <div className="container max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-primary to-blue-400 mb-1">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────────── */}
      <section className="w-full py-24 relative overflow-hidden bg-gray-50">
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <motion.div {...fadeUp()} className="text-center mb-14">
            <p className="text-rose-500 font-semibold text-sm uppercase tracking-widest mb-3">200+ {t("home_stats_services").toLowerCase()}</p>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">{t("home_services_title")}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t("home_services_sub")}</p>
          </motion.div>

          {(() => {
            const FEATURED_IDS = ["whatsapp","telegram","facebook","tiktok","instagram","google","twitter","discord","snapchat","netflix"];
            const all = servicesData?.services ?? [];
            const featured = FEATURED_IDS.map(id => all.find(s => s.id === id)).filter(Boolean) as typeof all;
            const rest = all.filter(s => !FEATURED_IDS.includes(s.id)).slice(0, 18);
            return (
              <>
                {/* Featured row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                  {featured.map((svc, i) => (
                    <Link key={svc.id} href={`/buy?service=${svc.id}`}>
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.04 }}
                        className="relative flex flex-col items-center gap-3 p-5 rounded-2xl cursor-pointer group overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
                        style={{ border: `1px solid ${svc.color}30` }}
                      >
                        <div className="group-hover:scale-110 transition-transform duration-200">
                          <HomeSvcLogo icon={svc.icon} color={svc.color} name={svc.name} size={52} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors text-center leading-tight">{svc.name}</span>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${svc.color}12 0%, transparent 100%)` }} />
                      </motion.div>
                    </Link>
                  ))}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 uppercase tracking-widest">Autres services</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Other services smaller grid */}
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {rest.map((svc, i) => (
                    <Link key={svc.id} href={`/buy?service=${svc.id}`}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.02 }}
                        className="flex flex-col items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
                      >
                        <div className="group-hover:scale-110 transition-transform">
                          <HomeSvcLogo icon={svc.icon} color={svc.color} name={svc.name} size={40} />
                        </div>
                        <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-800 transition-colors text-center leading-tight line-clamp-1">{svc.name}</span>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </>
            );
          })()}

          <div className="text-center mt-10">
            <Link href="/buy">
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                {t("home_see_prices")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section className="w-full py-24 relative overflow-hidden bg-white">
        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">{t("home_how_title")}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t("home_how_sub")}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            {STEPS.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center p-8 rounded-3xl border border-gray-200 bg-gray-50 hover:bg-white hover:shadow-md transition-all"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5">{step.icon}</div>
                <span className="absolute top-6 right-6 text-4xl font-black text-gray-100 leading-none select-none">{step.num}</span>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/register">
              <Button size="lg" className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-xl shadow-primary/25">
                {t("home_start_free")} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="w-full py-24 border-t border-gray-200 bg-gray-50">
        <div className="container max-w-7xl mx-auto px-4">
          <motion.div {...fadeUp()} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">{t("home_why_title")}</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-5 ${feat.bg} group-hover:scale-110 transition-transform`}>{feat.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Affiliate section ──────────────────────────────────────── */}
      <section className="w-full py-24 relative overflow-hidden bg-white border-t border-gray-200">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full bg-rose-100/60 blur-[100px]" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-amber-100/40 blur-[100px]" />
        </div>

        <div className="container max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">

            {/* Left: content */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-rose-200 bg-rose-50 mb-6 text-sm font-semibold text-rose-600"
              >
                <DollarSign className="w-4 h-4" />
                {t("home_aff_badge")}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.05 }}
                className="text-3xl md:text-5xl font-display font-extrabold text-gray-900 leading-tight mb-5"
              >
                {t("home_aff_title")}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg text-gray-500 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0"
              >
                {t("home_aff_subtitle")}
              </motion.p>

              {/* 3 pills */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap gap-3 justify-center lg:justify-start mb-10"
              >
                <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-700">
                  <DollarSign className="w-4 h-4" /> 10% {t("home_aff_commission")}
                </span>
                <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-700">
                  <Users className="w-4 h-4" /> {t("home_aff_no_limit")}
                </span>
                <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-700">
                  <Wallet className="w-4 h-4" /> {t("home_aff_withdraw")}
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Link href="/register">
                  <Button size="lg" className="h-12 px-8 rounded-xl bg-gradient-to-r from-rose-500 to-primary hover:opacity-90 text-white font-bold shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-1">
                    {t("home_aff_cta")} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Right: 3 steps */}
            <div className="flex-1 w-full max-w-md">
              {[
                { num: "01", icon: <Share2 className="w-5 h-5" />, title: t("home_aff_step1"), desc: t("home_aff_step1_desc"), color: "from-rose-500 to-primary" },
                { num: "02", icon: <Users className="w-5 h-5" />, title: t("home_aff_step2"), desc: t("home_aff_step2_desc"), color: "from-blue-500 to-indigo-500" },
                { num: "03", icon: <DollarSign className="w-5 h-5" />, title: t("home_aff_step3"), desc: t("home_aff_step3_desc"), color: "from-amber-500 to-orange-500" },
              ].map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 mb-6 last:mb-0"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                    {step.icon}
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400 tracking-widest">{step.num}</span>
                      <h3 className="text-base font-bold text-gray-900">{step.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}

              {/* Commission highlight */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35 }}
                className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-rose-500 to-primary text-white text-center shadow-xl shadow-rose-500/20"
              >
                <p className="text-sm font-semibold text-white/70 mb-1">{t("home_aff_commission")}</p>
                <p className="text-6xl font-extrabold leading-none">10%</p>
                <p className="text-sm text-white/60 mt-1">{t("home_aff_no_limit").toLowerCase()} · {t("home_aff_withdraw").toLowerCase()}</p>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ── API CTA — intentionally dark contrast section ────────── */}
      <section className="w-full py-24 relative overflow-hidden bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="dark-card rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1a35] via-[#0d1226] to-[#1a0d1a] p-8 md:p-16 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/15 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/10 blur-[60px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
                <Code className="w-4 h-4" /> {t("footer_api")}
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-5">
                Intégrez ZyNum<br />dans votre application
              </h2>
              <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10">
                API REST simple et puissante. Documentation complète, uptime garanti à 99.9%.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/api-docs">
                  <Button size="lg" className="h-12 px-8 rounded-xl bg-white text-black hover:bg-gray-100 font-bold shadow-xl transition-all hover:-translate-y-1">
                    <Code className="mr-2 w-5 h-5" /> Voir la documentation
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" variant="outline" className="h-12 px-8 rounded-xl border-white/20 text-white hover:bg-white/10">
                    {t("home_start_free")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section className="w-full py-24 border-t border-gray-200 relative overflow-hidden bg-gradient-to-b from-white to-blue-50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-primary/5 to-transparent blur-[80px]" />
        </div>
        <div className="container max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div {...fadeUp()}>
            <div className="flex justify-center mb-6 gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-extrabold text-gray-900 mb-5">
              {t("home_cta_title")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-rose-400">{t("home_cta_accent")}</span> {t("home_cta_title2")}
            </h2>
            <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
              {t("home_cta_sub")}
            </p>
            <Link href="/register">
              <Button size="lg" className="h-14 px-10 rounded-xl text-base font-bold bg-gradient-to-r from-primary to-rose-500 hover:from-primary/90 hover:to-rose-500/90 text-white shadow-2xl shadow-primary/30 transition-all hover:-translate-y-1 border-0">
                {t("home_cta_btn")} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-xs text-gray-400 mt-4">{t("home_cta_no_card")}</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
