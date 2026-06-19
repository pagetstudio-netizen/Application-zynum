import React, { useState, useEffect } from "react";
import { Copy, Check, RefreshCcw, Package } from "lucide-react";
import { useGetOrderHistory, useGetCurrentUser, useCancelOrder } from "@workspace/api-client-react";

const DURATION = 360;

function useTimeLeft(createdAt: string, isActive: boolean): number {
  const [left, setLeft] = useState(() => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    return Math.max(0, DURATION - elapsed);
  });
  useEffect(() => {
    if (!isActive || left === 0) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      setLeft(Math.max(0, DURATION - elapsed));
    }, 1000);
    return () => clearInterval(id);
  }, [createdAt, isActive, left]);
  return left;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="ml-1 inline-flex items-center active:scale-90 transition-transform">
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-500" />
        : <Copy className="w-3.5 h-3.5 text-gray-400" />
      }
    </button>
  );
}

function ServiceIcon({ icon, color, name }: { icon?: string; color?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const bg = color ?? "#6B7280";
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      {!failed && icon
        ? <img src={icon} alt={name} className="w-7 h-7 object-contain" onError={() => setFailed(true)} />
        : <Package className="w-6 h-6 text-white/90" />
      }
    </div>
  );
}

function OrderRow({ order, isLast }: { order: any; isLast: boolean }) {
  const isActive = order.status === "PENDING" || (order.status === "RECEIVED" && !order.smsCode);
  const timeLeft = useTimeLeft(order.createdAt, isActive);

  const country = order.countryName ?? "";
  const dialCode = order.phone ? order.phone.match(/^\+\d+/)?.[0] ?? "" : "";
  const countryLabel = dialCode ? `${country} (${dialCode})` : country;

  return (
    <div className={`flex items-center gap-3 px-4 py-4 ${!isLast ? "border-b border-gray-100" : ""}`}>
      <ServiceIcon icon={order.serviceIcon} color={order.serviceColor} name={order.serviceName} />

      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm">{countryLabel}</p>
        <div className="flex items-center mt-0.5">
          <span className="text-xs text-gray-500 font-mono">{order.phone}</span>
          {order.phone && <CopyBtn text={order.phone} />}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm text-gray-600">{order.serviceName}</p>
        {order.smsCode ? (
          <div className="flex items-center justify-end mt-0.5">
            <span className="text-xs font-mono text-gray-500">{order.smsCode}</span>
            <CopyBtn text={order.smsCode} />
          </div>
        ) : isActive ? (
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <RefreshCcw className="w-3 h-3 text-yellow-500 animate-spin" />
            <span className="text-[11px] text-yellow-500 font-semibold">
              {timeLeft > 0
                ? `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`
                : "Expiré"}
            </span>
          </div>
        ) : (
          <div className="mt-0.5 h-4" />
        )}
      </div>
    </div>
  );
}

export default function OrderHistory() {
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data: user } = useGetCurrentUser({ query: { retry: false } });
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

  const orders = historyData?.orders ?? [];
  const totalPages = historyData ? Math.ceil(historyData.total / limit) : 1;

  return (
    <div className="flex flex-col min-h-full bg-white">
      <div className="flex justify-end px-4 pt-3 pb-1">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 active:scale-90 transition-transform disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 text-gray-400 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="h-px bg-gray-100" />

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCcw className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-gray-300" />
          </div>
          <p className="font-bold text-gray-700 mb-1">Aucun achat</p>
          <p className="text-sm text-gray-400">Vos numéros achetés apparaîtront ici.</p>
        </div>
      )}

      {!isLoading && orders.length > 0 && (
        <div className="flex flex-col">
          {orders.map((order, i) => (
            <OrderRow key={order.id} order={order} isLast={i === orders.length - 1} />
          ))}
        </div>
      )}

      {historyData && historyData.total > limit && (
        <div className="flex items-center justify-center gap-4 py-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm font-semibold text-gray-400 disabled:opacity-30 active:scale-95 transition-transform"
          >
            Précédent
          </button>
          <span className="text-sm font-bold text-gray-900">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm font-semibold text-gray-500 disabled:opacity-30 active:scale-95 transition-transform"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
