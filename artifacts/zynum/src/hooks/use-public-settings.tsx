import { useQuery } from "@tanstack/react-query";

export interface PublicSettings {
  platform_name?: string;
  support_email?: string;
  support_telegram?: string;
  support_whatsapp?: string;
  maintenance_mode?: string;
  maintenance_buy?: string;
  commission_type?: string;
  commission_value?: string;
  currency_rate?: string;
}

export function usePublicSettings() {
  const { data, isLoading } = useQuery<PublicSettings>({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const res = await fetch("/api/v1/settings");
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  return { settings: data ?? {}, isLoading };
}

export function openTelegramSupport(telegramHandle: string) {
  const url = telegramHandle.startsWith("http")
    ? telegramHandle
    : `https://t.me/${telegramHandle.replace(/^@/, "")}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
