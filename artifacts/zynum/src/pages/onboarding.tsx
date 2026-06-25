import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  {
    id: 0,
    image: "/onboarding1.png",
    title: "Bienvenue sur ZyNum",
    subtitle: "Votre numéro virtuel dans 180+ pays, livré en quelques secondes.",
    accent: "#1A3FFF",
    bg: "#EEF2FF",
  },
  {
    id: 1,
    image: "/onboarding2.png",
    title: "Recevez vos SMS instantanément",
    subtitle: "Telegram, WhatsApp, Google, TikTok et 200+ services disponibles.",
    accent: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    id: 2,
    image: "/onboarding3.png",
    title: "Payez facilement en FCFA",
    subtitle: "Rechargez via TMoney, Moov Money, Orange Money ou USDT.",
    accent: "#059669",
    bg: "#ECFDF5",
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState(0);
  const [, setLocation] = useLocation();

  const slide = slides[current];

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.top = "0px";
    body.style.width = "100%";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = "";
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = "";
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
    };
  }, []);

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= slides.length || idx === current) return;
    setAnimDir(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const handleNext = () => {
    if (current < slides.length - 1) {
      goTo(current + 1);
    } else {
      setLocation("/register");
    }
  };

  /* ── Card slide variants ── */
  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.92,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? "-100%" : "100%",
      opacity: 0,
      scale: 0.92,
    }),
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        overscrollBehavior: "none",
        touchAction: "none",
        display: "flex",
        flexDirection: "column",
        background: "#F8F9FF",
        userSelect: "none",
        WebkitUserSelect: "none",
        transition: "background 0.5s",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "52px 20px 0",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              overflow: "hidden",
              border: `2px solid ${slide.accent}22`,
            }}
          >
            <img
              src="/logo.jpg"
              alt="ZyNum"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <span
            style={{
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: "-0.3px",
              color: "#111",
            }}
          >
            ZyNum
          </span>
        </div>

        {/* Skip */}
        {current < slides.length - 1 && (
          <button
            onClick={() => setLocation("/login")}
            style={{
              background: "none",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              color: "#9CA3AF",
              cursor: "pointer",
              padding: "8px 4px",
            }}
          >
            Passer
          </button>
        )}
      </div>

      {/* ── Page title ── */}
      <div style={{ flexShrink: 0, padding: "20px 24px 12px", textAlign: "center" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <h1
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "#111827",
                margin: 0,
                letterSpacing: "-0.4px",
                lineHeight: 1.25,
              }}
            >
              {slide.title}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "#6B7280",
                margin: "8px 0 0",
                lineHeight: 1.6,
              }}
            >
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Cards carousel ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Peek cards (prev & next ghost) */}
        {slides.map((s, i) => {
          if (i === current) return null;
          const offset = (i - current) * 88; /* vw */
          return (
            <div
              key={s.id}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `translateX(${offset}vw)`,
                padding: "8px 28px",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 340,
                  height: "100%",
                  borderRadius: 28,
                  background: s.bg,
                  border: `1.5px solid ${s.accent}22`,
                  opacity: 0.45,
                  overflow: "hidden",
                }}
              >
                <img
                  src={s.image}
                  alt={s.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top",
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Active card */}
        <AnimatePresence mode="wait" custom={animDir}>
          <motion.div
            key={current}
            custom={animDir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.38, ease: [0.32, 0, 0.67, 0] }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 28px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 340,
                height: "100%",
                borderRadius: 28,
                background: slide.bg,
                border: `2px solid ${slide.accent}33`,
                boxShadow: `0 16px 48px ${slide.accent}22, 0 4px 16px rgba(0,0,0,0.08)`,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <img
                src={slide.image}
                alt={slide.title}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top",
                  pointerEvents: "none",
                }}
              />
              {/* Accent badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: slide.accent,
                  borderRadius: 20,
                  padding: "6px 16px",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  boxShadow: `0 4px 16px ${slide.accent}55`,
                }}
              >
                {current === 0 ? "180+ pays" : current === 1 ? "200+ services" : "TMoney · Orange · USDT"}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>

      {/* ── Bottom: dots + buttons ── */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 24px 40px",
        }}
      >
        {/* Dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              style={{
                height: 8,
                width: i === current ? 28 : 8,
                borderRadius: 4,
                background: i === current ? slide.accent : "#E5E7EB",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleNext}
          style={{
            width: "100%",
            height: 54,
            borderRadius: 30,
            background: slide.accent,
            color: "#ffffff",
            fontWeight: 900,
            fontSize: 16,
            border: "none",
            cursor: "pointer",
            boxShadow: `0 6px 24px ${slide.accent}44`,
            transition: "all 0.3s ease",
          }}
        >
          {current < slides.length - 1 ? "Continuer" : "Créer un compte"}
        </button>

        {/* Secondary CTA on last slide */}
        {current === slides.length - 1 && (
          <button
            onClick={() => setLocation("/login")}
            style={{
              width: "100%",
              height: 50,
              borderRadius: 30,
              background: "transparent",
              border: `2px solid ${slide.accent}55`,
              color: slide.accent,
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              marginTop: 10,
              transition: "all 0.3s ease",
            }}
          >
            J'ai déjà un compte
          </button>
        )}
      </div>
    </div>
  );
}
