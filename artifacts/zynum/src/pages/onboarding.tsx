import React, { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

const slides = [
  {
    id: 0,
    image: "/onboarding1.png",
    title: "Bienvenue sur ZyNum",
    subtitle: "Votre numéro virtuel dans 180+ pays, livré en quelques secondes.",
    cta: "Démarrer",
    secondary: null,
  },
  {
    id: 1,
    image: "/onboarding2.png",
    title: "Recevez vos SMS instantanément",
    subtitle: "Telegram, WhatsApp, Google, TikTok et 200+ services disponibles.",
    cta: "Suivant",
    secondary: null,
  },
  {
    id: 2,
    image: "/onboarding3.png",
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
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-emerald-500 to-teal-600",
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
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden">
            <img src="/logo.jpg" alt="ZyNum" className="w-full h-full object-cover" />
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
      <div className="flex-1 flex items-center justify-center px-6 py-4">
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
              className="w-full h-full flex items-center justify-center"
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-contain"
              />
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
            className={`w-full h-14 rounded-2xl bg-gradient-to-r ${BTN_COLORS[current]} text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95`}
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
