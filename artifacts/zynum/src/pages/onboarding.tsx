import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Globe2, MessageSquare, ShieldCheck, Zap, Smartphone } from "lucide-react";

const slides = [
  {
    id: 0,
    icon: (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="absolute w-56 h-56 rounded-full bg-blue-100/80" />
        <div className="absolute w-40 h-40 rounded-full bg-blue-200/60" />
        <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
          <Smartphone className="w-16 h-16 text-white" strokeWidth={1.5} />
        </div>
        <div className="absolute top-8 right-12 w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center">
          <Globe2 className="w-7 h-7 text-blue-500" />
        </div>
        <div className="absolute bottom-10 left-10 w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center">
          <MessageSquare className="w-7 h-7 text-indigo-500" />
        </div>
        <div className="absolute top-16 left-8 w-10 h-10 rounded-xl bg-green-400 shadow-md flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
      </div>
    ),
    title: "Bienvenue sur ZyNum",
    subtitle: "Votre numéro virtuel dans 180+ pays, livré en quelques secondes.",
    cta: "Démarrer",
    secondary: null,
  },
  {
    id: 1,
    icon: (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="absolute w-56 h-56 rounded-full bg-purple-100/80" />
        <div className="absolute w-40 h-40 rounded-full bg-purple-200/60" />
        <div className="relative flex flex-col gap-3">
          {[
            { label: "Telegram", color: "from-blue-400 to-blue-600", letter: "TG" },
            { label: "WhatsApp", color: "from-green-400 to-green-600", letter: "WA" },
            { label: "Google", color: "from-red-400 to-orange-500", letter: "G" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.5, ease: "easeOut" }}
              className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-lg"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                <span className="text-white text-xs font-bold">{s.letter}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{s.label}</p>
                <p className="text-xs text-green-600 font-medium">Code reçu ✓</p>
              </div>
              <Zap className="w-4 h-4 text-yellow-400 ml-auto" />
            </motion.div>
          ))}
        </div>
      </div>
    ),
    title: "Recevez vos SMS instantanément",
    subtitle: "Telegram, WhatsApp, Google, TikTok et 200+ services disponibles.",
    cta: "Suivant",
    secondary: null,
  },
  {
    id: 2,
    icon: (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="absolute w-56 h-56 rounded-full bg-emerald-100/80" />
        <div className="absolute w-40 h-40 rounded-full bg-emerald-200/60" />
        <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
          <span className="text-4xl font-black text-white">Z</span>
        </div>
        <div className="absolute top-8 right-10 bg-white rounded-2xl px-3 py-2 shadow-lg">
          <p className="text-xs text-gray-500 font-medium">Solde</p>
          <p className="text-sm font-bold text-gray-800">25 500 FCFA</p>
        </div>
        <div className="absolute bottom-8 left-6 bg-white rounded-2xl px-3 py-2 shadow-lg">
          <p className="text-xs text-gray-500 font-medium">Paiement</p>
          <p className="text-sm font-bold text-emerald-600">TMoney ✓</p>
        </div>
      </div>
    ),
    title: "Payez facilement en FCFA",
    subtitle: "Rechargez via TMoney, Moov Money, Orange Money ou USDT.",
    cta: "Créer un compte",
    secondary: "J'ai déjà un compte",
  },
];

const DOT_COLORS = ["bg-blue-500", "bg-purple-500", "bg-emerald-500"];
const BG_GRADIENTS = [
  "from-blue-50 via-white to-indigo-50",
  "from-purple-50 via-white to-pink-50",
  "from-emerald-50 via-white to-teal-50",
];
const BTN_COLORS = [
  "from-blue-500 to-indigo-600 shadow-blue-500/30",
  "from-purple-500 to-pink-600 shadow-purple-500/30",
  "from-emerald-500 to-teal-600 shadow-emerald-500/30",
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [, setLocation] = useLocation();

  const slide = slides[current];

  const next = () => {
    if (current < slides.length - 1) {
      setDirection(1);
      setCurrent((c) => c + 1);
    } else {
      setLocation("/register");
    }
  };

  const skip = () => setLocation("/login");

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col bg-gradient-to-br ${BG_GRADIENTS[current]} transition-all duration-700`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-10 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">Z</span>
          </div>
          <span className="font-bold text-gray-800 text-lg tracking-tight">ZyNum</span>
        </div>
        {current < slides.length - 1 && (
          <button onClick={() => setLocation("/login")} className="text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors">
            Passer
          </button>
        )}
      </div>

      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-8 py-6">
        <div className="w-full max-w-sm h-72">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full h-full"
            >
              {slide.icon}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Text + CTA */}
      <div className="px-6 pb-12 space-y-6">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? `w-8 ${DOT_COLORS[current]}` : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center space-y-3"
          >
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
              {slide.title}
            </h1>
            <p className="text-base text-gray-500 leading-relaxed max-w-xs mx-auto">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Buttons */}
        <div className="space-y-3 max-w-sm mx-auto w-full">
          <button
            onClick={next}
            className={`w-full h-14 rounded-2xl bg-gradient-to-r ${BTN_COLORS[current]} text-white font-bold text-base flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95`}
          >
            {slide.cta}
            <ArrowRight className="w-5 h-5" />
          </button>
          {slide.secondary && (
            <button
              onClick={skip}
              className="w-full h-12 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all active:scale-95"
            >
              {slide.secondary}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
