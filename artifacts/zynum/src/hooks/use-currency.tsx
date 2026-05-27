import React, { createContext, useContext, useState, useEffect } from "react";

type Currency = "USD" | "FCFA";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  formatPrice: (usd: number, fcfa: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem("zynum_currency");
    return (saved as Currency) || "USD";
  });

  useEffect(() => {
    localStorage.setItem("zynum_currency", currency);
  }, [currency]);

  const formatPrice = (usd: number, fcfa: number) => {
    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(usd);
    } else {
      return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "XAF",
        minimumFractionDigits: 0,
      }).format(fcfa);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
