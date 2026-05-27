import React from "react";
import { useLanguage } from "@/hooks/use-language";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/5 pb-6">
      <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
      <p>{children}</p>
    </div>
  );
}

export default function Privacy() {
  const { t } = useLanguage();

  return (
    <div className="w-full py-16">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-12">
          <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-4">{t("privacy_badge")}</p>
          <h1 className="text-4xl font-display font-extrabold text-white mb-3">{t("privacy_title")}</h1>
          <p className="text-muted-foreground">{t("privacy_updated")}</p>
        </div>
        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <Section title={t("privacy_s1_title")}>{t("privacy_s1")}</Section>
          <Section title={t("privacy_s2_title")}>{t("privacy_s2")}</Section>
          <Section title={t("privacy_s3_title")}>{t("privacy_s3")}</Section>
          <Section title={t("privacy_s4_title")}>{t("privacy_s4")}</Section>
          <Section title={t("privacy_s5_title")}>{t("privacy_s5")}</Section>
          <Section title={t("privacy_s6_title")}>{t("privacy_s6")}</Section>
          <Section title={t("privacy_s7_title")}>{t("privacy_s7")}</Section>
          <Section title={t("privacy_s8_title")}>{t("privacy_s8")}</Section>
        </div>
      </div>
    </div>
  );
}
