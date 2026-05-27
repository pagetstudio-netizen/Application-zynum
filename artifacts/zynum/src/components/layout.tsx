import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  Menu, X, Phone, LogOut, Wallet,
  MessageSquare, Globe2, Shield, HelpCircle,
} from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { useGetCurrentUser, useLogoutUser, getGetCurrentUserQueryKey, useGetBalance } from "@workspace/api-client-react";
import { SocialBar } from "@/components/social-bar";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const { lang, setLang, t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: user, isLoading: isLoadingUser } = useGetCurrentUser({
    query: { retry: false, staleTime: 5 * 60 * 1000 },
  });

  const { data: balanceData } = useGetBalance({
    query: { enabled: !!user, refetchInterval: 30000 },
  });

  const logoutMutation = useLogoutUser({
    mutation: {
      onSettled: () => {
        localStorage.removeItem("zynum_token");
        queryClient.clear();
        setLocation("/login");
      },
    },
  });

  const navLinks = [
    { href: "/login",   label: t("nav_services"), icon: <Phone         className="w-4 h-4 mr-2" /> },
    { href: "/login",   label: t("nav_pricing"),  icon: <Wallet        className="w-4 h-4 mr-2" /> },
    { href: "/aide",    label: t("nav_help"),     icon: <HelpCircle    className="w-4 h-4 mr-2" /> },
    { href: "/about",   label: t("nav_about"),    icon: <MessageSquare className="w-4 h-4 mr-2" /> },
  ];

  const footerLinks = {
    [t("footer_product")]: [
      { label: t("footer_buy_number"), href: "/buy" },
      { label: t("footer_history"), href: "/history" },
      { label: "Dashboard", href: "/dashboard" },
      { label: t("footer_help"), href: "/aide" },
    ],
    [t("footer_services")]: [
      { label: "Telegram", href: "/buy" },
      { label: "WhatsApp", href: "/buy" },
      { label: "Gmail / Google", href: "/buy" },
      { label: "TikTok & Instagram", href: "/buy" },
    ],
    [t("footer_company")]: [
      { label: t("footer_about"), href: "/about" },
      { label: t("footer_faq"), href: "/faq" },
      { label: t("nav_contact"), href: "/contact" },
      { label: t("footer_api"), href: "/api-docs" },
    ],
    [t("footer_legal")]: [
      { label: t("footer_terms"), href: "/terms" },
      { label: t("footer_privacy"), href: "/privacy" },
      { label: t("footer_faq"), href: "/faq" },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-background">
      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 py-4">

            {/* Logo */}
            {location === "/" ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-primary/20">
                  <img src="/logo.jpg" alt="ZyNum" className="w-full h-full object-cover" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight text-gray-900">ZyNum</span>
              </div>
            ) : (
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-all">
                  <img src="/logo.jpg" alt="ZyNum" className="w-full h-full object-cover" />
                </div>
                <span className="font-display font-bold text-xl tracking-tight text-gray-900 group-hover:text-primary transition-colors">ZyNum</span>
              </Link>
            )}

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center space-x-0.5">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    location === link.href
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-3">
              {/* Currency toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                {(["USD", "FCFA"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      currency === c ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Language toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                {(["fr", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all uppercase ${
                      lang === l ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {isLoadingUser ? (
                <div className="w-24 h-9 animate-pulse bg-gray-100 rounded-lg" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  {balanceData && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg">
                      <Wallet className="w-3.5 h-3.5 text-primary" />
                      <span className="text-gray-900">${balanceData.balance.toFixed(2)}</span>
                    </div>
                  )}
                  <Link href="/dashboard" className="flex items-center gap-2 bg-gray-100 border border-gray-200 pl-2 pr-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-blue-400 flex items-center justify-center text-white text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900 max-w-[90px] truncate">{user.name}</span>
                  </Link>
                  <button
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 font-medium">
                      {t("nav_login")}
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-md shadow-primary/20 rounded-lg">
                      {t("nav_register")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu btn */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu — dark sidebar overlay ─────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Dark sidebar */}
          <div
            className="fixed top-0 right-0 bottom-0 z-50 w-72 flex flex-col overflow-hidden"
            style={{ background: "#2b2d32", color: "#ffffff" }}
          >
            {/* Close button */}
            <div className="flex items-center justify-end px-5 py-4">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ color: "rgba(255,255,255,0.7)" }}
                className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto">
              {[
                { href: "/", label: t("nav_home") },
                ...navLinks,
                ...(!user ? [
                  { href: "/login", label: t("nav_login") },
                  { href: "/register", label: t("nav_start_free") },
                ] : [
                  { href: "/dashboard", label: t("nav_dashboard") },
                ]),
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "16px 28px",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    textDecoration: "none",
                  }}
                >
                  {link.label}
                </Link>
              ))}

              {/* Language & Currency */}
              <div style={{ padding: "32px 28px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <button
                  onClick={() => setLang(lang === "fr" ? "en" : "fr")}
                  style={{ display: "flex", alignItems: "center", gap: "12px", color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer" }}
                >
                  <span style={{ fontSize: "20px" }}>{lang === "fr" ? "🇫🇷" : "🇬🇧"}</span>
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>{lang === "fr" ? "Français" : "English"}</span>
                </button>
                <button
                  onClick={() => setCurrency(currency === "USD" ? "FCFA" : "USD")}
                  style={{ display: "flex", alignItems: "center", gap: "12px", color: "rgba(255,255,255,0.7)", background: "none", border: "none", cursor: "pointer" }}
                >
                  <span style={{ fontSize: "20px" }}>🇺🇸</span>
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>{currency}</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 relative z-10 flex flex-col">
        {children}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-gray-200 bg-gray-50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Main footer grid */}
          <div className="pt-10 pb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

            {/* Brand column */}
            <div className="lg:col-span-2 space-y-5">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-primary/20 group-hover:shadow-primary/40 transition-all">
                  <img src="/logo.jpg" alt="ZyNum" className="w-full h-full object-cover" />
                </div>
                <span className="font-display font-bold text-xl text-gray-900 group-hover:text-primary transition-colors">ZyNum</span>
              </Link>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                {t("footer_desc")}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 border border-gray-200 bg-white px-3 py-1.5 rounded-lg">
                  <Shield className="w-3.5 h-3.5 text-green-500" /> {t("footer_ssl")}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 border border-gray-200 bg-white px-3 py-1.5 rounded-lg">
                  <Globe2 className="w-3.5 h-3.5 text-blue-500" /> {t("footer_countries")}
                </div>
              </div>
              <SocialBar label="Suivez-nous" className="pt-1" size="sm" />
            </div>

            {/* Nav columns */}
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section}>
                <p className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">{section}</p>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-200 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <p>© {new Date().getFullYear()} ZyNum. {t("footer_rights")}</p>
            <div className="flex items-center gap-5">
              <Link href="/terms" className="hover:text-gray-700 transition-colors">{t("footer_cgu")}</Link>
              <Link href="/privacy" className="hover:text-gray-700 transition-colors">{t("footer_confidentiality")}</Link>
              <Link href="/faq" className="hover:text-gray-700 transition-colors">
                <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> FAQ</span>
              </Link>
              <Link href="/contact" className="hover:text-gray-700 transition-colors">{t("nav_contact")}</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating help button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <Link href="/contact">
          <button className="flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95">
            <MessageSquare className="w-4 h-4" />
            {t("nav_contact")}
          </button>
        </Link>
        <Link href="/aide">
          <button className="w-12 h-12 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center" title={t("footer_help")}>
            <HelpCircle className="w-5 h-5" />
          </button>
        </Link>
      </div>
    </div>
  );
}
