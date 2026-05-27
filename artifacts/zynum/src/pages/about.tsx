import React from "react";
import { motion } from "framer-motion";
import { Users, Globe2, Zap, ShieldCheck, Target, Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="w-full">
      <section className="w-full py-24 relative overflow-hidden bg-gradient-to-b from-blue-50 to-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="container max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-4">{t("about_badge")}</p>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold text-gray-900 mb-6">
              {t("about_title")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-500">ZyNum</span>
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">{t("about_sub")}</p>
          </motion.div>
        </div>
      </section>

      <section className="w-full py-16 border-t border-gray-100">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-4">{t("about_mission_badge")}</p>
              <h2 className="text-3xl font-display font-bold text-gray-900 mb-5">{t("about_mission_title")}</h2>
              <p className="text-gray-500 mb-4 leading-relaxed">{t("about_mission_p1")}</p>
              <p className="text-gray-500 leading-relaxed">{t("about_mission_p2")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Target className="w-6 h-6 text-primary" />, title: t("about_card_mission"), val: t("about_card_mission_val") },
                { icon: <Heart className="w-6 h-6 text-red-500" />, title: t("about_card_value"), val: t("about_card_value_val") },
                { icon: <Zap className="w-6 h-6 text-yellow-500" />, title: t("about_card_speed"), val: t("about_card_speed_val") },
                { icon: <Globe2 className="w-6 h-6 text-blue-500" />, title: t("about_card_coverage"), val: t("about_card_coverage_val") },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-3">{item.icon}</div>
                  <p className="text-xs text-gray-400 mb-1">{item.title}</p>
                  <p className="font-bold text-gray-900">{item.val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-16 border-t border-gray-100 bg-gray-50">
        <div className="container max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-display font-bold text-gray-900 text-center mb-10">{t("about_values_title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: <ShieldCheck className="w-8 h-8 text-green-500" />, title: t("about_val_security"), desc: t("about_val_security_desc") },
              { icon: <Zap className="w-8 h-8 text-yellow-500" />, title: t("about_val_speed"), desc: t("about_val_speed_desc") },
              { icon: <Users className="w-8 h-8 text-blue-500" />, title: t("about_val_community"), desc: t("about_val_community_desc") },
            ].map((v) => (
              <div key={v.title} className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-center mb-4">{v.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-20 border-t border-gray-100">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-5">{t("about_cta_title")}</h2>
          <p className="text-gray-500 mb-8">{t("about_cta_desc")}</p>
          <Link href="/register">
            <Button size="lg" className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-xl shadow-primary/25">
              {t("about_cta_btn")}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
