import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  RefreshCcw, Lock, ChevronLeft, ChevronRight,
  Package, CheckCircle2, Clock, XCircle, Copy, Check,
  X, Loader2, MessageSquare,
} from "lucide-react";

import iconEmpty from "@assets/no_1774828481941.png";
import { useCurrency } from "@/hooks/use-currency";
import { useLanguage } from "@/hooks/use-language";
import { useGetOrderHistory, useGetCurrentUser, useCancelOrder } from "@workspace/api-client-react";

function ServiceLogo({ icon, color, name, size = 36 }: { icon?: string; color?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const bg = color ?? "#6B7280";
  const showFallback = failed || !icon;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
      {showFallback
        ? <Package style={{ width: size * 0.5, height: size * 0.5, color: "#fff", opacity: 0.9 }} />
        : <img src={icon} alt={name} style={{ width: size * 0.62, height: size * 0.62, objectFit: "contain" }} onError={() => setFailed(true)} />
      }
    </div>
  );
}

const DURATION = 360;
function useTimeLeft(createdAt: string): number {
  const [left, setLeft] = useState(() => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, DURATION - elapsed);
  });
  useEffect(() => {
    if (left === 0) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      setLeft(Math.max(0, DURATION - elapsed));
    }, 1000);
    return () => clearInterval(id);
  }, [createdAt, left]);
  return left;
}

function StatusDot({ status, smsCode }: { status: string; smsCode?: string | null }) {
  const effective = (status === "RECEIVED" && !smsCode) ? "WAITING" : status;
  const MAP: Record<string, { label: string; cls: string }> = {
    PENDING:  { label: "En attente",  cls: "bg-yellow-400" },
    WAITING:  { label: "En attente",  cls: "bg-yellow-400 animate-pulse" },
    RECEIVED: { label: "Reçu",        cls: "bg-green-500" },
    FINISHED: { label: "Terminé",     cls: "bg-green-500" },
    TIMEOUT:  { label: "Expiré",      cls: "bg-gray-400" },
    CANCELED: { label: "Annulé",      cls: "bg-gray-400" },
    BANNED:   { label: "Banni",       cls: "bg-red-500" },
  };
  const s = MAP[effective] ?? { label: status, cls: "bg-gray-400" };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.cls}`} />
      {s.label}
    </span>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-lg active:scale-95 transition-transform">
      {code}
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-green-400" />}
    </button>
  );
}

function CancelBtn({ orderId, refetch }: { orderId: string; refetch: () => void }) {
  const cancel = useCancelOrder({ mutation: { onSuccess: () => refetch() } });
  return (
    <button
      onClick={(e) => { e.stopPropagation(); cancel.mutate(orderId); }}
      disabled={cancel.isPending}
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50"
    >
      {cancel.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3" />Annuler</>}
    </button>
  );
}

function OrderRow({ order, formatPrice, refetch, isLast }: { order: any; formatPrice: (usd: number, fcfa?: number) => string; refetch: () => void; isLast: boolean }) {
  const { lang } = useLanguage();
  const locale = lang === "fr" ? fr : enUS;
  const isActive = order.status === "PENDING" || (order.status === "RECEIVED" && !order.smsCode);
  const timeLeft = useTimeLeft(order.createdAt);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!isLast ? "border-b border-gray-50" : ""} ${isActive ? "bg-yellow-50/40" : "bg-white"}`}>
      <ServiceLogo icon={order.serviceIcon} color={order.serviceColor} name={order.serviceName} size={40} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-gray-900 truncate">{order.serviceName}</p>
          <StatusDot status={order.status} smsCode={order.smsCode} />
        </div>
        <p className="text-xs font-mono text-gray-500 truncate mt-0.5">{order.phone}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {order.smsCode ? (
            <CopyCode code={order.smsCode} />
          ) : isActive ? (
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-[10px] text-yellow-600 font-semibold">
                <RefreshCcw className="w-2.5 h-2.5 animate-spin" />
                {timeLeft > 0 ? `${String(Math.floor(timeLeft / 60)).padStart(2,"0")}:${String(timeLeft % 60).padStart(2,"0")}` : "Expiré"}
              </span>
              <CancelBtn orderId={order.id} refetch={refetch} />
            </div>
          ) : (
            <span className="text-[10px] text-gray-400">{order.countryName}</span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs font-bold text-gray-900">{formatPrice(order.priceUsd, order.priceFcfa)}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{format(new Date(order.createdAt), "dd MMM · HH:mm", { locale })}</p>
      </div>
    </div>
  );
}

export default function OrderHistory() {
  const { t, lang } = useLanguage();
  const { formatPrice } = useCurrency();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: user, isLoading: isUserLoading } = useGetCurrentUser({ query: { retry: false } });
  const { data: historyData, isLoading, isFetching, refetch } = useGetOrderHistory(
    { page, limit },
    {
      query: {
        enabled: !!user,
        refetchInterval: (query) => {
          const hasActive = query.state.data?.orders.some(
            (o: any) => o.status === "PENDING" || (o.status === "RECEIVED" && !o.smsCode)
          );
          return hasActive ? 5000 : false;
        },
      },
    }
  );

  if (isUserLoading) {
    return <div className="flex items-center justify-center py-20"><RefreshCcw className="w-6 h-6 animate-spin text-blue-500" /></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-gray-400" />
        </div>
        <p className="font-bold text-gray-900 mb-1">{t("history_login_required")}</p>
        <p className="text-sm text-gray-400 mb-5">{t("history_login_desc")}</p>
        <Link href="/login">
          <button className="bg-blue-600 text-white text-sm font-bold px-6 py-2.5 rounded-2xl">{t("history_login_btn")}</button>
        </Link>
      </div>
    );
  }

  const totalPages = historyData ? Math.ceil(historyData.total / limit) : 1;
  const orders = historyData?.orders ?? [];

  return (
    <div className="flex flex-col gap-3">
      {/* Header compact */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-xs text-gray-400">
            {historyData && historyData.total > 0 ? `${historyData.total} commande${historyData.total > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCcw className="w-6 h-6 animate-spin text-blue-500 opacity-50" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <img src={iconEmpty} alt="Aucune commande" className="w-20 h-20 mb-3 object-contain opacity-50" />
          <p className="font-bold text-gray-900 mb-1">{t("history_no_orders")}</p>
          <p className="text-sm text-gray-400 mb-5">{t("history_no_orders_desc")}</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("zynum:tab", { detail: "numeros" }))}
            className="bg-blue-600 text-white text-sm font-bold px-6 py-2.5 rounded-2xl active:scale-95 transition-transform"
          >
            {t("history_buy_btn")}
          </button>
        </div>
      )}

      {/* List */}
      {!isLoading && orders.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          {orders.map((order, i) => (
            <OrderRow
              key={order.id}
              order={order}
              formatPrice={formatPrice}
              refetch={refetch}
              isLast={i === orders.length - 1}
            />
          ))}
        </div>
      )}

      {/* Pagination compacte */}
      {historyData && historyData.total > limit && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 disabled:opacity-40 active:scale-90 transition-transform shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-gray-900">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 disabled:opacity-40 active:scale-90 transition-transform shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
