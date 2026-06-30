import React, { createContext, useContext, useState, useCallback } from "react";
import { translations, type Lang, type TranslationKey } from "@/lib/i18n";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "fr",
  setLang: () => {},
  t: (key) => key,
});

const FRANCOPHONE_ZONES = new Set([
  "Africa/Abidjan", "Africa/Dakar", "Africa/Lome", "Africa/Cotonou",
  "Africa/Ouagadougou", "Africa/Bamako", "Africa/Conakry", "Africa/Niamey",
  "Africa/Ndjamena", "Africa/Bangui", "Africa/Douala", "Africa/Libreville",
  "Africa/Brazzaville", "Africa/Kinshasa", "Africa/Lubumbashi",
  "Africa/Bujumbura", "Africa/Djibouti", "Indian/Antananarivo",
  "Indian/Comoro", "Indian/Mauritius", "Indian/Reunion", "Africa/Kigali",
  "Africa/Casablanca", "Africa/Tunis", "Africa/Algiers",
  "Europe/Paris", "Europe/Brussels", "Europe/Luxembourg", "Europe/Monaco",
  "America/Port-au-Prince", "America/Martinique", "America/Guadeloupe",
  "America/Cayenne",
]);

function detectLang(): Lang {
  const stored = localStorage.getItem("zynum_lang");
  if (stored === "en" || stored === "fr") return stored;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (FRANCOPHONE_ZONES.has(tz)) return "fr";
    if (tz.startsWith("Africa/")) {
      return navigator.language.startsWith("fr") ? "fr" : "en";
    }
  } catch {}

  return navigator.language.startsWith("fr") ? "fr" : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("zynum_lang", l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return (translations[lang] as Record<string, string>)[key] ?? (translations.fr as Record<string, string>)[key] ?? key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
