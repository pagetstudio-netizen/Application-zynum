import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Copy, Check, X, Clock, ChevronRight,
  Smartphone, Loader2,
  TrendingUp, Zap, Globe2, ShoppingBag, ArrowRight,
} from "lucide-react";
import { NoData } from "@/components/ui/no-data";
import {
  useGetOrderHistory,
  useGetCurrentUser,
  useCancelOrder,
} from "@workspace/api-client-react";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

const DURATION = 360;

type FilterKey = "all" | "received" | "pending" | "canceled";

function matchesFilter(status: string, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "received") return status === "RECEIVED" || status === "FINISHED";
  if (filter === "pending") return status === "PENDING";
  if (filter === "canceled") return ["CANCELED", "TIMEOUT", "BANNED"].includes(status);
  return true;
}

function useCountdown(createdAt: string, active: boolean) {
  const [left, setLeft] = useState(() => {
    const el = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, DURATION - el);
  });
  useEffect(() => {
    if (!active || left === 0) return;
    const id = setInterval(() => {
      const el = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      setLeft(Math.max(0, DURATION - el));
    }, 1000);
    return () => clearInterval(id);
  }, [createdAt, active, left]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return { left, mm, ss };
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: label ? `${label} ${t("hist_copied")}` : t("hist_copied"), duration: 2000 });
  };
  return (
    <button
      onClick={handle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
      style={{ backgroundColor: "#F0F4FF", color: "#2563EB" }}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {label ?? (copied ? t("hist_copied") : t("hist_copy_code_btn"))}
    </button>
  );
}

function ServiceIcon({ icon, color, name, size = 44 }: { icon?: string; color?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const bg = color ?? "#6B7280";
  const lightBg = ["#FFFC00","#F0B90B","#FAE100","#FFC629"].some(c => bg.toUpperCase() === c);
  return (
    <div style={{
      width: size, height: size, background: bg,
      borderRadius: size * 0.24,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, overflow: "hidden",
    }}>
      {icon && !failed
        ? <img src={icon} alt={name} style={{ width: size * 0.58, height: size * 0.58, objectFit: "contain" }} onError={() => setFailed(true)} />
        : <span style={{ fontWeight: 700, fontSize: size * 0.36, color: lightBg ? "#000" : "#fff", lineHeight: 1 }}>{name.slice(0,2).toUpperCase()}</span>
      }
    </div>
  );
}

function OrderCard({ order, onCancel, canceling, currency }: {
  order: any;
  onCancel: (id: string) => void;
  canceling: boolean;
  currency: string;
}) {
  const { t } = useLanguage();

  const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    RECEIVED: { label: t("history_status_received"), color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
    FINISHED: { label: t("history_status_received"), color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", dot: "#10B981" },
    PENDING:  { label: t("history_status_pending"),  color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    CANCELED: { label: t("history_status_canceled"), color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", dot: "#9CA3AF" },
    TIMEOUT:  { label: t("history_status_timeout"),  color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", dot: "#9CA3AF" },
    BANNED:   { label: t("history_status_canceled"), color: "#6B7280", bg: "#F9FAFB", border: "#E5E7EB", dot: "#9CA3AF" },
  };

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.CANCELED;
  const isActive = order.status === "PENDING";
  const isReceived = order.status === "RECEIVED" || order.status === "FINISHED";
  const isCanceled = ["CANCELED", "TIMEOUT", "BANNED"].includes(order.status);
  const { mm, ss } = useCountdown(order.createdAt, isActive);

  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const priceDisplay = currency === "FCFA"
    ? `${(order.priceFcfa ?? Math.round((order.priceUsd ?? 0) * 620)).toLocaleString("fr-FR")} FCFA`
    : `$${(order.priceUsd ?? 0).toFixed(2)}`;

  const refundDisplay = currency === "FCFA"
    ? `+${(order.priceFcfa ?? Math.round((order.priceUsd ?? 0) * 620)).toLocaleString("fr-FR")} FCFA`
    : `+$${(order.priceUsd ?? 0).toFixed(2)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden mx-4"
      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #F1F5F9" }}
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <ServiceIcon icon={order.serviceIcon} color={order.serviceColor} name={order.serviceName} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">{order.serviceName}</span>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
              style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: cfg.dot }} />
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{order.countryName}</p>
        </div>
        <div className="shrink-0 text-right">
          {isReceived && order.smsCode ? (
            <div
              className="px-3 py-1.5 rounded-xl text-center"
              style={{ backgroundColor: "#ECFDF5", border: "1.5px solid #6EE7B7" }}
            >
              <p className="text-[10px] font-semibold text-green-600 mb-0.5">{t("hist_otp_label")}</p>
              <p className="text-base font-black text-green-700 font-mono tracking-wider">{order.smsCode}</p>
            </div>
          ) : isActive ? (
            <div
              className="px-3 py-1.5 rounded-xl text-center"
              style={{ backgroundColor: "#FFFBEB", border: "1.5px solid #FDE68A" }}
            >
              <p className="text-[10px] font-semibold text-amber-600 mb-0.5">{t("hist_time_remaining")}</p>
              <p className="text-base font-black text-amber-700 font-mono">{mm}:{ss}</p>
            </div>
          ) : isCanceled ? (
            <div
              className="px-3 py-1.5 rounded-xl text-center"
              style={{ backgroundColor: "#F0FFF4", border: "1.5px solid #C3FAD5" }}
            >
              <p className="text-[10px] font-semibold text-emerald-600 mb-0.5">{t("hist_refund_label")}</p>
              <p className="text-sm font-black text-emerald-700">{refundDisplay}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 pb-2">
        <p className="text-base font-black text-gray-900 font-mono tracking-wide">{order.phone}</p>
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{dateStr} · {timeStr}</span>
        </div>
        <span className="text-xs font-bold text-gray-700">{priceDisplay}</span>
      </div>

      {(isReceived || isActive) && (
        <div className="flex gap-2 px-4 pb-4">
          {isReceived && order.phone && (
            <CopyButton text={order.phone} label={t("hist_copy_number")} />
          )}
          {isReceived && order.smsCode && (
            <CopyButton text={order.smsCode} label={t("hist_copy_code_btn")} />
          )}
          {isActive && (
            <button
              onClick={() => onCancel(order.id)}
              disabled={canceling}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
            >
              {canceling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              {t("hist_cancel_btn")}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function SummaryCard({ orders, currency }: { orders: any[]; currency: string }) {
  const { t } = useLanguage();
  const total    = orders.length;
  const received = orders.filter(o => o.status === "RECEIVED" || o.status === "FINISHED").length;
  const canceled = orders.filter(o => ["CANCELED","TIMEOUT","BANNED"].includes(o.status)).length;
  const spent    = orders.reduce((acc, o) => acc + (o.priceUsd ?? 0), 0);
  const spentDisplay = currency === "FCFA"
    ? `${Math.round(spent * 620).toLocaleString("fr-FR")} F`
    : `$${spent.toFixed(2)}`;

  const stats = [
    { label: t("hist_stat_total"),    value: String(total),    color: "#2563EB", bg: "#EFF6FF" },
    { label: t("hist_stat_received"), value: String(received), color: "#059669", bg: "#ECFDF5" },
    { label: t("hist_stat_canceled"), value: String(canceled), color: "#DC2626", bg: "#FEF2F2" },
    { label: t("hist_stat_spent"),    value: spentDisplay,     color: "#7C3AED", bg: "#F5F3FF" },
  ];

  return (
    <div
      className="mx-4 rounded-2xl p-4"
      style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", border: "1px solid #F1F5F9" }}
    >
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-0.5" style={{ backgroundColor: s.bg }}>
              {i === 0 && <ShoppingBag className="w-4 h-4" style={{ color: s.color }} />}
              {i === 1 && <Check className="w-4 h-4" style={{ color: s.color }} />}
              {i === 2 && <X className="w-4 h-4" style={{ color: s.color }} />}
              {i === 3 && <Smartphone className="w-4 h-4" style={{ color: s.color }} />}
            </div>
            <p className="text-sm font-black text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-400 text-center leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsBar({ orders }: { orders: any[] }) {
  const { t } = useLanguage();
  const received = orders.filter(o => o.status === "RECEIVED" || o.status === "FINISHED");
  const rate = orders.length ? Math.round((received.length / orders.length) * 1000) / 10 : 0;
  const countries = new Set(orders.map(o => o.country).filter(Boolean)).size;

  return (
    <div
      className="mx-4 rounded-2xl p-4 mb-4"
      style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid #F1F5F9" }}
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-black text-gray-900">{rate}%</p>
          <p className="text-[10px] text-gray-400 leading-tight">{t("hist_stat_rate")}</p>
        </div>
        <div>
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-1">
            <Zap className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-sm font-black text-gray-900">~30 sec</p>
          <p className="text-[10px] text-gray-400 leading-tight">{t("hist_stat_avg_time")}</p>
        </div>
        <div>
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-1">
            <Globe2 className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-sm font-black text-gray-900">{countries}</p>
          <p className="text-[10px] text-gray-400 leading-tight">{t("hist_stat_countries")}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filter }: { filter: FilterKey }) {
  const { t } = useLanguage();

  const msg =
    filter === "all"      ? t("hist_empty_all") :
    filter === "received" ? t("hist_empty_received") :
    filter === "pending"  ? t("hist_empty_pending") :
                            t("hist_empty_canceled");

  return (
    <NoData
      title={t("hist_empty_title")}
      description={msg}
      action={filter === "all" ? (
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("zynum:goto-tab", { detail: "numeros" }))}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)" }}
        >
          {t("hist_buy_btn")} <ArrowRight className="w-4 h-4" />
        </button>
      ) : undefined}
    />
  );
}

export default function OrderHistory({
  filter: externalFilter,
  setFilter: externalSetFilter,
}: {
  filter?: FilterKey;
  setFilter?: (f: FilterKey) => void;
} = {}) {
  const { currency } = useCurrency();
  const { toast } = useToast();
  const { t } = useLanguage();

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all",      label: t("hist_filter_btn_all") },
    { key: "received", label: t("hist_filter_btn_received") },
    { key: "pending",  label: t("hist_filter_btn_pending") },
    { key: "canceled", label: t("hist_filter_btn_canceled") },
  ];

  const [internalFilter, setInternalFilter] = useState<FilterKey>("all");
  const filter    = externalFilter    ?? internalFilter;
  const setFilter = externalSetFilter ?? setInternalFilter;

  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const limit = 50;

  const { data: user } = useGetCurrentUser({ query: { retry: false } as any });

  const { data: historyData, isLoading, isFetching } = useGetOrderHistory(
    { page, limit },
    {
      query: {
        enabled: !!user,
        refetchInterval: (q: any) => {
          const hasPending = q.state.data?.orders.some((o: any) => o.status === "PENDING");
          return hasPending ? 5000 : false;
        },
      } as any,
    }
  );

  useEffect(() => {
    if (!historyData?.orders) return;
    if (page === 1) {
      setAllOrders(historyData.orders);
    } else {
      setAllOrders(prev => {
        const ids = new Set(prev.map((o: any) => o.id));
        const fresh = historyData.orders.filter((o: any) => !ids.has(o.id));
        return [...prev, ...fresh];
      });
    }
  }, [historyData, page]);

  const cancelMutation = useCancelOrder({
    mutation: {
      onSuccess: (data) => {
        setAllOrders(prev => prev.map(o => o.id === data.order.id ? data.order : o));
        toast({ title: t("hist_cancel_success"), description: t("hist_cancel_refund_desc") });
      },
      onError: () => toast({ variant: "destructive", title: t("history_cancel"), description: t("hist_cancel_error") }),
    },
  });

  const filtered = allOrders.filter(o => {
    if (!matchesFilter(o.status, filter)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (o.phone ?? "").toLowerCase().includes(q) ||
      (o.serviceName ?? "").toLowerCase().includes(q) ||
      (o.countryName ?? "").toLowerCase().includes(q) ||
      (o.smsCode ?? "").toLowerCase().includes(q)
    );
  });

  const totalFromApi  = historyData?.total ?? 0;
  const hasMore       = allOrders.length < totalFromApi;
  const cancelingId   = (cancelMutation as any).variables;

  return (
    <div className="flex flex-col" style={{ background: "#F8FAFC", minHeight: "100%" }}>

      {/* ── Search bar ── */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-2 bg-white border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("hist_search_ph")}
            className="w-full pl-10 pr-4 h-12 rounded-2xl text-sm bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div className="sticky top-[72px] z-10 bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all"
              style={filter === f.key
                ? { background: "#2563EB", color: "white", boxShadow: "0 2px 8px rgba(37,99,235,0.3)" }
                : { background: "white", color: "#6B7280", border: "1.5px solid #E5E7EB" }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading && page === 1 ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
            <p className="text-xs text-gray-400">{t("hist_loading")}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-4">

          {allOrders.length > 0 && filter === "all" && !search && (
            <SummaryCard orders={allOrders} currency={currency} />
          )}

          {filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <AnimatePresence>
              <div className="flex flex-col gap-3">
                {filtered.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    currency={currency}
                    onCancel={(id) => cancelMutation.mutate(id)}
                    canceling={cancelMutation.isPending && cancelingId === order.id}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}

          {allOrders.length > 0 && !search && filter === "all" && (
            <div className="mt-1">
              <StatsBar orders={allOrders} />
            </div>
          )}

          {hasMore && !search && (
            <div className="flex justify-center pb-4 pt-2">
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={isFetching}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {t("hist_load_more")}
              </button>
            </div>
          )}

          <div className="h-4" />
        </div>
      )}
    </div>
  );
}
