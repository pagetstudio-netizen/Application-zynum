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

export default function Terms() {
  const { t } = useLanguage();

  return (
    <div className="w-full py-16">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-12">
          <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-4">{t("terms_badge")}</p>
          <h1 className="text-4xl font-display font-extrabold text-white mb-3">{t("terms_title")}</h1>
          <p className="text-muted-foreground">{t("terms_updated")}</p>
        </div>
        <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <Section title={t("terms_s1_title")}>{t("terms_s1")}</Section>
          <Section title={t("terms_s2_title")}>{t("terms_s2")}</Section>
          <Section title={t("terms_s3_title")}>{t("terms_s3")}</Section>
          <Section title={t("terms_s4_title")}>{t("terms_s4")}</Section>
          <Section title={t("terms_s5_title")}>{t("terms_s5")}</Section>
          <Section title={t("terms_s6_title")}>{t("terms_s6")}</Section>
          <Section title={t("terms_s7_title")}>{t("terms_s7")}</Section>
          <Section title={t("terms_s8_title")}>{t("terms_s8")}</Section>
          <Section title={t("terms_s9_title")}>{t("terms_s9")}</Section>
          <Section title={t("terms_s10_title")}>{t("terms_s10")}</Section>
        </div>
      </div>
    </div>
  );
}
