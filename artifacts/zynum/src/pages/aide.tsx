import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, Mail, MessageCircle, Facebook, HelpCircle,
} from "lucide-react";
import { usePublicSettings } from "@/hooks/use-public-settings";
import { useLanguage } from "@/hooks/use-language";
const whatsappBanner = "/whatsapp-support-banner.jpg";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_FR: FaqItem[] = [
  {
    q: "Comment acheter un numéro virtuel ?",
    a: "Connectez-vous à votre compte ZyNum, rechargez votre solde, puis rendez-vous sur la page \"Acheter\". Choisissez le service (Telegram, WhatsApp, etc.), le pays, et confirmez. Votre numéro est disponible instantanément.",
  },
  {
    q: "Comment recharger mon solde ?",
    a: "Allez dans la section \"Recharger\" depuis votre tableau de bord. Vous pouvez payer via Orange Money, MTN, Wave, Moov ou en cryptomonnaie (USDT, BTC). La recharge est instantanée après confirmation.",
  },
  {
    q: "Combien de temps le numéro est-il valide ?",
    a: "Un numéro virtuel est valide pendant 20 minutes maximum à partir de l'achat. Si vous ne recevez pas de SMS dans ce délai, la commande est automatiquement annulée et votre solde est remboursé.",
  },
  {
    q: "Que faire si je ne reçois pas de SMS ?",
    a: "Attendez 2 à 3 minutes. Si aucun SMS n'arrive, cliquez sur \"Annuler\" pour être remboursé, puis réessayez avec un autre pays ou opérateur. Certains services bloquent temporairement des plages de numéros.",
  },
  {
    q: "Mon solde est-il remboursable ?",
    a: "Le solde non utilisé n'est pas remboursable en cash, mais reste disponible sur votre compte sans date d'expiration. En cas de problème technique, notre support examine chaque situation individuellement.",
  },
  {
    q: "Comment fonctionne le programme de parrainage ?",
    a: "Partagez votre lien de parrainage unique depuis l'onglet \"Affiliation\" de votre compte. Pour chaque ami qui s'inscrit et effectue un achat, vous recevez une commission automatiquement créditée sur votre solde.",
  },
  {
    q: "Quels services sont compatibles avec ZyNum ?",
    a: "ZyNum est compatible avec plus de 200 services : Telegram, WhatsApp, Gmail, Facebook, Instagram, TikTok, Snapchat, Twitter/X, et bien d'autres. La liste complète est disponible sur la page d'achat.",
  },
  {
    q: "Puis-je utiliser plusieurs numéros en même temps ?",
    a: "Oui, vous pouvez commander plusieurs numéros simultanément pour différents services. Chaque commande est indépendante et visible dans votre historique.",
  },
];

const FAQ_EN: FaqItem[] = [
  {
    q: "How do I buy a virtual number?",
    a: "Log in to your ZyNum account, top up your balance, then go to the \"Buy\" page. Choose the service (Telegram, WhatsApp, etc.), the country, and confirm. Your number is available instantly.",
  },
  {
    q: "How do I top up my balance?",
    a: "Go to the \"Recharge\" section from your dashboard. You can pay via Orange Money, MTN, Wave, Moov or cryptocurrency (USDT, BTC). The top-up is instant after confirmation.",
  },
  {
    q: "How long is the number valid?",
    a: "A virtual number is valid for a maximum of 20 minutes from purchase. If you don't receive an SMS within this time, the order is automatically cancelled and your balance is refunded.",
  },
  {
    q: "What if I don't receive an SMS?",
    a: "Wait 2 to 3 minutes. If no SMS arrives, click \"Cancel\" to get a refund, then try again with another country or operator. Some services temporarily block certain number ranges.",
  },
  {
    q: "Is my balance refundable?",
    a: "Unused balance is not refundable in cash, but remains available in your account without an expiry date. In case of technical issues, our support team reviews each situation individually.",
  },
  {
    q: "How does the referral program work?",
    a: "Share your unique referral link from the \"Affiliate\" tab in your account. For each friend who signs up and makes a purchase, you receive a commission automatically credited to your balance.",
  },
  {
    q: "Which services are compatible with ZyNum?",
    a: "ZyNum is compatible with over 200 services: Telegram, WhatsApp, Gmail, Facebook, Instagram, TikTok, Snapchat, Twitter/X, and many more. The full list is available on the purchase page.",
  },
  {
    q: "Can I use multiple numbers at the same time?",
    a: "Yes, you can order multiple numbers simultaneously for different services. Each order is independent and visible in your history.",
  },
];

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium text-white text-sm leading-snug">{item.q}</span>
            </div>
            <motion.div
              animate={{ rotate: open === i ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0"
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-white/[0.06] pt-4 ml-10">
                  {item.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

export default function HelpCenter() {
  const { settings } = usePublicSettings();
  const { lang } = useLanguage();

  const faqItems = lang === "en" ? FAQ_EN : FAQ_FR;

  const whatsappLink = settings.support_whatsapp ?? "";
  const whatsappEnabled = settings.support_whatsapp_enabled !== "false";
  const facebookLink = settings.support_facebook ?? "";
  const facebookEnabled = settings.support_facebook_enabled !== "false" && !!facebookLink;
  const channelLink = settings.support_whatsapp_channel ?? "";
  const channelEnabled = settings.support_whatsapp_channel_enabled !== "false" && !!channelLink;
  const emailLink = settings.support_email ?? "support@zynum.net";

  const showWhatsapp = whatsappEnabled && !!whatsappLink;

  return (
    <div className="w-full min-h-screen">
      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-display font-bold text-white">
            {lang === "en" ? "Help Center" : "Centre d'aide"}
          </h1>
        </motion.div>

        {/* WhatsApp Banner */}
        {showWhatsapp && (
          <motion.a
            href={whatsappLink.startsWith("http") ? whatsappLink : `https://wa.me/${whatsappLink.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="block rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
          >
            <img
              src={whatsappBanner}
              alt="WhatsApp & service client"
              className="w-full object-cover"
            />
          </motion.a>
        )}

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
        >
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
            {lang === "en" ? "Frequently Asked Questions" : "Questions fréquentes"}
          </p>
          <FaqAccordion items={faqItems} />
        </motion.div>

        {/* Contact Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3"
        >
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
            {lang === "en" ? "Contact Support" : "Contacter le support"}
          </p>

          {/* Email */}
          <a href={`mailto:${emailLink}`} className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-all group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                {lang === "en" ? "Email Support" : "Support par email"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{emailLink}</p>
            </div>
          </a>

          {/* WhatsApp support */}
          {showWhatsapp && (
            <a
              href={whatsappLink.startsWith("http") ? whatsappLink : `https://wa.me/${whatsappLink.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  {lang === "en" ? "Chat with our team" : "Discutez avec notre équipe"}
                </p>
              </div>
            </a>
          )}

          {/* WhatsApp Channel */}
          {channelEnabled && (
            <a
              href={channelLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">
                  {lang === "en" ? "WhatsApp Channel" : "Canal WhatsApp"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lang === "en" ? "Follow our official channel" : "Suivez notre canal officiel"}
                </p>
              </div>
            </a>
          )}

          {/* Facebook */}
          {facebookEnabled && (
            <a
              href={facebookLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 flex items-center justify-center shrink-0">
                <Facebook className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">Facebook</p>
                <p className="text-xs text-muted-foreground">
                  {lang === "en" ? "Follow us on Facebook" : "Suivez-nous sur Facebook"}
                </p>
              </div>
            </a>
          )}
        </motion.div>
      </div>
    </div>
  );
}
