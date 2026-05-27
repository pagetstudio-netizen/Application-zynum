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

function getInitialLang(): Lang {
  const stored = localStorage.getItem("zynum_lang");
  if (stored === "en" || stored === "fr") return stored;
  const browser = navigator.language.startsWith("fr") ? "fr" : "en";
  return browser;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

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
