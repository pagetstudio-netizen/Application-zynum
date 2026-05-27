import React, { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Search, ChevronRight, ShoppingCart, CreditCard, User,
  MessageSquare, Smartphone, AlertCircle, Clock, CheckCircle,
  Zap, Globe2, ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";

interface Article { id: string; title: string; desc: string; readTime: string; }
interface Category { id: string; icon: React.ReactNode; color: string; bgColor: string; title: string; desc: string; count: number; articles: Article[]; }

const CATEGORIES_DATA: Record<string, Category[]> = {
  fr: [
    { id: "demarrer", icon: <Zap className="w-6 h-6" />, color: "text-yellow-400", bgColor: "bg-yellow-400/10 border-yellow-400/20", title: "Démarrer avec ZyNum", desc: "Tout ce qu'il faut savoir pour bien commencer.", count: 5, articles: [
      { id: "a1", title: "Comment créer un compte ZyNum", desc: "Créez votre compte en moins de 2 minutes.", readTime: "2 min" },
      { id: "a2", title: "Qu'est-ce qu'un numéro virtuel ?", desc: "Comprendre comment fonctionnent les numéros virtuels OTP.", readTime: "3 min" },
      { id: "a3", title: "Comment recevoir votre premier SMS", desc: "Guide pas à pas pour votre première vérification.", readTime: "4 min" },
      { id: "a4", title: "Changer la devise (USD / FCFA)", desc: "Afficher les prix dans votre devise préférée.", readTime: "1 min" },
      { id: "a5", title: "Comprendre votre tableau de bord", desc: "Vue d'ensemble de toutes les fonctionnalités.", readTime: "3 min" },
    ]},
    { id: "acheter", icon: <ShoppingCart className="w-6 h-6" />, color: "text-blue-400", bgColor: "bg-blue-400/10 border-blue-400/20", title: "Acheter un numéro", desc: "Comment acheter et utiliser vos numéros virtuels.", count: 6, articles: [
      { id: "b1", title: "Choisir le bon service (Telegram, WhatsApp…)", desc: "Comment sélectionner le bon service pour votre besoin.", readTime: "2 min" },
      { id: "b2", title: "Choisir un pays et un opérateur", desc: "Comprendre les différences entre pays et opérateurs.", readTime: "3 min" },
      { id: "b3", title: "Aperçu du numéro avant confirmation", desc: "Voir et confirmer votre numéro avant de l'utiliser.", readTime: "2 min" },
      { id: "b4", title: "Obtenir un autre numéro (changer de numéro)", desc: "Comment changer de numéro si le premier ne fonctionne pas.", readTime: "2 min" },
      { id: "b5", title: "Annuler une commande et être remboursé", desc: "Comment annuler et obtenir votre remboursement.", readTime: "2 min" },
      { id: "b6", title: "Je n'ai pas reçu mon SMS — que faire ?", desc: "Solutions si le code OTP n'arrive pas.", readTime: "4 min" },
    ]},
    { id: "paiements", icon: <CreditCard className="w-6 h-6" />, color: "text-green-400", bgColor: "bg-green-400/10 border-green-400/20", title: "Paiements et solde", desc: "Rechargez votre solde et gérez vos paiements.", count: 4, articles: [
      { id: "c1", title: "Comment recharger mon solde ZyNum", desc: "Méthodes disponibles pour ajouter du crédit.", readTime: "3 min" },
      { id: "c2", title: "Prix en FCFA — comment ça marche ?", desc: "Conversion automatique USD ↔ FCFA sur ZyNum.", readTime: "2 min" },
      { id: "c3", title: "Comprendre mon historique de commandes", desc: "Retrouver toutes vos transactions passées.", readTime: "2 min" },
      { id: "c4", title: "Pourquoi mon paiement a-t-il échoué ?", desc: "Raisons courantes d'échec et solutions.", readTime: "3 min" },
    ]},
    { id: "compte", icon: <User className="w-6 h-6" />, color: "text-purple-400", bgColor: "bg-purple-400/10 border-purple-400/20", title: "Mon compte", desc: "Gérez votre profil et vos paramètres.", count: 4, articles: [
      { id: "d1", title: "Modifier mon profil", desc: "Changer votre nom et vos informations.", readTime: "2 min" },
      { id: "d2", title: "Changer mon mot de passe", desc: "Sécuriser votre compte avec un nouveau mot de passe.", readTime: "2 min" },
      { id: "d3", title: "Supprimer mon compte", desc: "Comment supprimer définitivement votre compte ZyNum.", readTime: "3 min" },
      { id: "d4", title: "Récupérer l'accès à mon compte", desc: "Mot de passe oublié ou compte bloqué.", readTime: "3 min" },
    ]},
    { id: "services", icon: <Smartphone className="w-6 h-6" />, color: "text-pink-400", bgColor: "bg-pink-400/10 border-pink-400/20", title: "Services compatibles", desc: "Telegram, WhatsApp, Google et 200+ autres apps.", count: 5, articles: [
      { id: "e1", title: "Vérification Telegram — guide complet", desc: "Créer ou vérifier un compte Telegram avec un numéro virtuel.", readTime: "4 min" },
      { id: "e2", title: "Vérification WhatsApp", desc: "Activer WhatsApp avec un numéro ZyNum.", readTime: "3 min" },
      { id: "e3", title: "Vérification Gmail / Google", desc: "Créer un compte Google avec un numéro virtuel.", readTime: "4 min" },
      { id: "e4", title: "Vérification TikTok et Instagram", desc: "Créer des comptes sur les réseaux sociaux.", readTime: "3 min" },
      { id: "e5", title: "Quel pays choisir pour quel service ?", desc: "Recommandations de pays par service.", readTime: "5 min" },
    ]},
    { id: "problemes", icon: <AlertCircle className="w-6 h-6" />, color: "text-red-400", bgColor: "bg-red-400/10 border-red-400/20", title: "Résoudre un problème", desc: "Solutions aux problèmes les plus courants.", count: 4, articles: [
      { id: "f1", title: "Le numéro est déjà utilisé par quelqu'un", desc: "Que faire si le service refuse votre numéro virtuel.", readTime: "3 min" },
      { id: "f2", title: "Le SMS n'arrive pas après 5 minutes", desc: "Étapes à suivre si le code OTP est en retard.", readTime: "4 min" },
      { id: "f3", title: "Numéro en rupture de stock dans mon pays", desc: "Trouver des alternatives quand un pays n'est pas disponible.", readTime: "2 min" },
      { id: "f4", title: "Erreur lors de l'achat du numéro", desc: "Diagnostiquer et résoudre les erreurs d'achat.", readTime: "3 min" },
    ]},
  ],
  en: [
    { id: "demarrer", icon: <Zap className="w-6 h-6" />, color: "text-yellow-400", bgColor: "bg-yellow-400/10 border-yellow-400/20", title: "Getting started with ZyNum", desc: "Everything you need to know to get started.", count: 5, articles: [
      { id: "a1", title: "How to create a ZyNum account", desc: "Create your account in under 2 minutes.", readTime: "2 min" },
      { id: "a2", title: "What is a virtual number?", desc: "Understanding how OTP virtual numbers work.", readTime: "3 min" },
      { id: "a3", title: "How to receive your first SMS", desc: "Step-by-step guide for your first verification.", readTime: "4 min" },
      { id: "a4", title: "Change currency (USD / FCFA)", desc: "Display prices in your preferred currency.", readTime: "1 min" },
      { id: "a5", title: "Understanding your dashboard", desc: "Overview of all features.", readTime: "3 min" },
    ]},
    { id: "acheter", icon: <ShoppingCart className="w-6 h-6" />, color: "text-blue-400", bgColor: "bg-blue-400/10 border-blue-400/20", title: "Buy a number", desc: "How to buy and use your virtual numbers.", count: 6, articles: [
      { id: "b1", title: "Choosing the right service (Telegram, WhatsApp…)", desc: "How to select the right service for your need.", readTime: "2 min" },
      { id: "b2", title: "Choosing a country and operator", desc: "Understanding differences between countries and operators.", readTime: "3 min" },
      { id: "b3", title: "Number preview before confirmation", desc: "See and confirm your number before using it.", readTime: "2 min" },
      { id: "b4", title: "Get another number (change number)", desc: "How to change numbers if the first one doesn't work.", readTime: "2 min" },
      { id: "b5", title: "Cancel an order and get a refund", desc: "How to cancel and get your refund.", readTime: "2 min" },
      { id: "b6", title: "I didn't receive my SMS — what to do?", desc: "Solutions if the OTP code doesn't arrive.", readTime: "4 min" },
    ]},
    { id: "paiements", icon: <CreditCard className="w-6 h-6" />, color: "text-green-400", bgColor: "bg-green-400/10 border-green-400/20", title: "Payments & balance", desc: "Top up your balance and manage your payments.", count: 4, articles: [
      { id: "c1", title: "How to top up my ZyNum balance", desc: "Available methods to add credit.", readTime: "3 min" },
      { id: "c2", title: "FCFA prices — how does it work?", desc: "Automatic USD ↔ FCFA conversion on ZyNum.", readTime: "2 min" },
      { id: "c3", title: "Understanding my order history", desc: "Find all your past transactions.", readTime: "2 min" },
      { id: "c4", title: "Why did my payment fail?", desc: "Common failure reasons and solutions.", readTime: "3 min" },
    ]},
    { id: "compte", icon: <User className="w-6 h-6" />, color: "text-purple-400", bgColor: "bg-purple-400/10 border-purple-400/20", title: "My account", desc: "Manage your profile and settings.", count: 4, articles: [
      { id: "d1", title: "Edit my profile", desc: "Change your name and information.", readTime: "2 min" },
      { id: "d2", title: "Change my password", desc: "Secure your account with a new password.", readTime: "2 min" },
      { id: "d3", title: "Delete my account", desc: "How to permanently delete your ZyNum account.", readTime: "3 min" },
      { id: "d4", title: "Recover access to my account", desc: "Forgotten password or locked account.", readTime: "3 min" },
    ]},
    { id: "services", icon: <Smartphone className="w-6 h-6" />, color: "text-pink-400", bgColor: "bg-pink-400/10 border-pink-400/20", title: "Compatible services", desc: "Telegram, WhatsApp, Google and 200+ other apps.", count: 5, articles: [
      { id: "e1", title: "Telegram verification — complete guide", desc: "Create or verify a Telegram account with a virtual number.", readTime: "4 min" },
      { id: "e2", title: "WhatsApp verification", desc: "Activate WhatsApp with a ZyNum number.", readTime: "3 min" },
      { id: "e3", title: "Gmail / Google verification", desc: "Create a Google account with a virtual number.", readTime: "4 min" },
      { id: "e4", title: "TikTok and Instagram verification", desc: "Create accounts on social networks.", readTime: "3 min" },
      { id: "e5", title: "Which country to choose for which service?", desc: "Country recommendations by service.", readTime: "5 min" },
    ]},
    { id: "problemes", icon: <AlertCircle className="w-6 h-6" />, color: "text-red-400", bgColor: "bg-red-400/10 border-red-400/20", title: "Troubleshooting", desc: "Solutions to the most common issues.", count: 4, articles: [
      { id: "f1", title: "The number is already used by someone", desc: "What to do if the service rejects your virtual number.", readTime: "3 min" },
      { id: "f2", title: "SMS doesn't arrive after 5 minutes", desc: "Steps to follow if the OTP code is delayed.", readTime: "4 min" },
      { id: "f3", title: "Number out of stock in my country", desc: "Finding alternatives when a country is unavailable.", readTime: "2 min" },
      { id: "f4", title: "Error when purchasing the number", desc: "Diagnose and resolve purchase errors.", readTime: "3 min" },
    ]},
  ],
};

const POPULAR_DATA: Record<string, { cat: string; title: string; readTime: string }[]> = {
  fr: [
    { cat: "Acheter un numéro", title: "Je n'ai pas reçu mon SMS — que faire ?", readTime: "4 min" },
    { cat: "Démarrer avec ZyNum", title: "Qu'est-ce qu'un numéro virtuel ?", readTime: "3 min" },
    { cat: "Paiements et solde", title: "Comment recharger mon solde ZyNum", readTime: "3 min" },
    { cat: "Services compatibles", title: "Vérification Telegram — guide complet", readTime: "4 min" },
    { cat: "Résoudre un problème", title: "Le numéro est déjà utilisé par quelqu'un", readTime: "3 min" },
  ],
  en: [
    { cat: "Buy a number", title: "I didn't receive my SMS — what to do?", readTime: "4 min" },
    { cat: "Getting started with ZyNum", title: "What is a virtual number?", readTime: "3 min" },
    { cat: "Payments & balance", title: "How to top up my ZyNum balance", readTime: "3 min" },
    { cat: "Compatible services", title: "Telegram verification — complete guide", readTime: "4 min" },
    { cat: "Troubleshooting", title: "The number is already used by someone", readTime: "3 min" },
  ],
};

function ArticleView({ article, category, onBack }: { article: Article; category: Category; onBack: () => void }) {
  const { t } = useLanguage();
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t("aide_back_to")} {category.title}
      </button>
      <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border mb-5 ${category.color} ${category.bgColor}`}>
        {category.icon} <span>{category.title}</span>
      </div>
      <h1 className="text-3xl font-display font-bold text-white mb-3">{article.title}</h1>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-8">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {article.readTime} {t("aide_read_time")}</span>
        <span>·</span>
        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> {t("aide_up_to_date")}</span>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 space-y-5 text-muted-foreground leading-relaxed">
        <p>{t("aide_article_intro")} <strong className="text-white">{article.title.toLowerCase()}</strong>. {t("aide_follow_steps")}</p>
        <div>
          <h3 className="text-white font-bold text-lg mb-3">{t("aide_step1_title")}</h3>
          <ul className="space-y-2 list-none">
            {[t("aide_step1_i1"), t("aide_step1_i2"), t("aide_step1_i3")].map((item) => (
              <li key={item} className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /><span>{item}</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-white font-bold text-lg mb-3">{t("aide_step2_title")}</h3>
          <p>{article.desc} {t("aide_step2_cta")}</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-primary font-semibold mb-1">{t("aide_tip_title")}</p>
          <p className="text-sm">{t("aide_tip_desc")}</p>
        </div>
      </div>
      <div className="mt-8 p-5 rounded-2xl border border-white/10 bg-white/[0.02]">
        {feedback === null ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white font-semibold mb-1">{t("aide_helpful")}</p>
              <p className="text-sm text-muted-foreground">{t("aide_feedback")}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeedback("yes")}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/60 transition-all"
              >
                👍 {t("aide_yes")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeedback("no")}
                className="border-white/20 text-muted-foreground hover:bg-white/5 hover:text-white hover:border-white/40 transition-all"
              >
                👎 {t("aide_no")}
              </Button>
            </div>
          </div>
        ) : feedback === "yes" ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-semibold">Merci pour votre retour !</p>
              <p className="text-sm text-muted-foreground">Nous sommes ravis que cet article vous ait aidé.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-white font-semibold">Nous allons améliorer cet article</p>
                <p className="text-sm text-muted-foreground">Merci de nous aider à mieux vous aider.</p>
              </div>
            </div>
            <Link href="/contact">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold mt-1">
                Contacter le support
              </Button>
            </Link>
          </div>
        )}
      </div>
      <div className="mt-6 p-5 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <MessageSquare className="w-10 h-10 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-white font-semibold">{t("aide_more_help")}</p>
          <p className="text-sm text-muted-foreground">{t("aide_more_help_desc")}</p>
        </div>
        <Link href="/contact">
          <Button className="bg-primary hover:bg-primary/90 text-white font-semibold shrink-0">{t("aide_contact_btn")}</Button>
        </Link>
      </div>
    </motion.div>
  );
}

function CategoryView({ category, onBack, onArticle }: { category: Category; onBack: () => void; onArticle: (a: Article) => void }) {
  const { t } = useLanguage();
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t("aide_back_help")}
      </button>
      <div className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border mb-6 ${category.color} ${category.bgColor}`}>
        {category.icon} <span>{category.title}</span>
      </div>
      <h1 className="text-3xl font-display font-bold text-white mb-2">{category.title}</h1>
      <p className="text-muted-foreground mb-8">{category.desc}</p>
      <div className="space-y-2">
        {category.articles.map((article, i) => (
          <motion.button key={article.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} onClick={() => onArticle(article)} className="w-full flex items-center justify-between gap-4 p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 text-left transition-all group">
            <div>
              <p className="font-semibold text-white mb-1 group-hover:text-primary transition-colors">{article.title}</p>
              <p className="text-sm text-muted-foreground">{article.desc}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default function HelpCenter() {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const CATEGORIES = CATEGORIES_DATA[lang] ?? CATEGORIES_DATA.fr;
  const POPULAR = POPULAR_DATA[lang] ?? POPULAR_DATA.fr;

  const searchResults = search
    ? CATEGORIES.flatMap((cat) =>
        cat.articles.filter((a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.desc.toLowerCase().includes(search.toLowerCase())
        ).map((a) => ({ ...a, category: cat }))
      )
    : [];

  if (selectedArticle && selectedCategory) {
    return (
      <div className="w-full py-10">
        <div className="container max-w-4xl mx-auto px-4">
          <ArticleView article={selectedArticle} category={selectedCategory} onBack={() => setSelectedArticle(null)} />
        </div>
      </div>
    );
  }

  if (selectedCategory) {
    return (
      <div className="w-full py-10">
        <div className="container max-w-4xl mx-auto px-4">
          <CategoryView category={selectedCategory} onBack={() => setSelectedCategory(null)} onArticle={(a) => setSelectedArticle(a)} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-[100px] rounded-full" />
          <div className="absolute inset-0 grid-overlay-50" />
        </div>
        <div className="container max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-4">{t("aide_badge")}</p>
            <h1 className="text-4xl md:text-5xl font-display font-extrabold text-white mb-5">{t("aide_title")}</h1>
            <p className="text-muted-foreground mb-10">{t("aide_sub")}</p>
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("aide_search_placeholder")} className="h-14 pl-12 pr-5 text-base rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 focus:ring-primary/20" />
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container max-w-6xl mx-auto px-4 pb-24">
        {search && searchResults.length > 0 && (
          <div className="mb-12">
            <p className="text-sm text-muted-foreground mb-4">{searchResults.length} {t("aide_results")} "{search}"</p>
            <div className="space-y-2">
              {searchResults.map((r) => (
                <button key={r.id} onClick={() => { setSelectedCategory(r.category); setSelectedArticle(r); }} className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-left transition-all group">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{r.category.title}</p>
                    <p className="font-semibold text-white group-hover:text-primary transition-colors">{r.title}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {search && searchResults.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-2">{t("aide_no_results")} "{search}"</p>
            <Link href="/contact"><Button variant="outline" className="border-white/20 text-white hover:bg-white/10 mt-4">{t("aide_contact_btn")}</Button></Link>
          </div>
        )}

        {!search && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
              {CATEGORIES.map((cat, i) => (
                <motion.button key={cat.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} onClick={() => setSelectedCategory(cat)} className="flex flex-col items-start p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 text-left transition-all group">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${cat.bgColor} ${cat.color} group-hover:scale-110 transition-transform`}>{cat.icon}</div>
                  <h3 className="font-bold text-white text-lg mb-1.5 group-hover:text-primary transition-colors">{cat.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{cat.desc}</p>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
                    <CheckCircle className="w-3 h-3" /> {cat.count} {t("aide_articles")}
                    <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
              ))}
            </div>

            <div className="mb-16">
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" /> {t("aide_popular_title")}
              </h2>
              <div className="space-y-2">
                {POPULAR.map((art, i) => {
                  const cat = CATEGORIES.find((c) => c.title === art.cat) ?? CATEGORIES[0];
                  const article = cat.articles.find((a) => a.title === art.title) ?? cat.articles[0];
                  return (
                    <button key={i} onClick={() => { setSelectedCategory(cat); setSelectedArticle(article); }} className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-left transition-all group">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${cat.bgColor} ${cat.color}`}>{cat.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">{art.cat}</p>
                        <p className="font-medium text-white truncate group-hover:text-primary transition-colors">{art.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />{art.readTime}
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d1a35] to-[#060d1f] p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
              <div className="relative z-10">
                <MessageSquare className="w-12 h-12 text-primary mx-auto mb-5" />
                <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">{t("aide_contact_cta_title")}</h2>
                <p className="text-muted-foreground mb-8 max-w-lg mx-auto">{t("aide_contact_cta_desc")}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <Link href="/contact">
                    <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-xl shadow-primary/25">
                      <MessageSquare className="w-4 h-4 mr-2" /> {t("aide_contact_btn")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
