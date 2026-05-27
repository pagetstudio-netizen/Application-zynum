import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Bell } from "lucide-react";

const API = "/api";
const DISMISS_KEY  = "zynum_dismissed_popups";
const LOGIN_AT_KEY = "zynum_login_at";

type Popup = {
  id: number;
  subject: string | null;
  content: string;
  color: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  imageUrl: string | null;
};

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-200",   icon: "text-blue-500",   badge: "bg-blue-500/10 text-blue-600 border-blue-200" },
  red:    { bg: "bg-red-50",    border: "border-red-200",    icon: "text-red-500",    badge: "bg-red-500/10 text-red-600 border-red-200" },
  green:  { bg: "bg-green-50",  border: "border-green-200",  icon: "text-green-600",  badge: "bg-green-500/10 text-green-700 border-green-200" },
  yellow: { bg: "bg-yellow-50", border: "border-yellow-200", icon: "text-yellow-600", badge: "bg-yellow-400/10 text-yellow-700 border-yellow-200" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-600", badge: "bg-purple-500/10 text-purple-700 border-purple-200" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-500", badge: "bg-orange-500/10 text-orange-700 border-orange-200" },
};

function getDismissed(): number[] {
  try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
}
function dismiss(id: number) {
  const dismissed = getDismissed();
  if (!dismissed.includes(id)) dismissed.push(id);
  sessionStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
}

export function NotificationBanner() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);
  // Tie fetch to login session: each login sets a new zynum_login_at timestamp
  const loginAt = sessionStorage.getItem(LOGIN_AT_KEY) ?? "0";

  useEffect(() => {
    // Read dismissed list fresh (cleared on login)
    setDismissed(getDismissed());
    fetch(`${API}/v1/popup-notifications`)
      .then((r) => r.json())
      .then((d) => { if (d.notifications) setPopups(d.notifications); })
      .catch(() => {});
  }, [loginAt]);

  const visible = popups.filter((p) => !dismissed.includes(p.id));

  const handleDismiss = (id: number) => {
    dismiss(id);
    setDismissed((prev) => [...prev, id]);
  };

  // Don't render anything when there are no visible notifications
  if (visible.length === 0 && popups.length === 0) return null;

  return (
    <div className="w-full space-y-2 px-4 pt-3">
      <AnimatePresence>
        {visible.map((popup) => {
          const theme = COLOR_MAP[popup.color ?? "blue"] ?? COLOR_MAP.blue;
          return (
            <motion.div
              key={popup.id}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`relative rounded-xl border ${theme.bg} ${theme.border} px-4 py-3 shadow-sm flex items-start gap-3`}
            >
              {/* Icon */}
              <div className={`shrink-0 mt-0.5 ${theme.icon}`}>
                <Bell className="w-4 h-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {popup.subject && (
                  <p className="text-sm font-semibold text-gray-900 mb-0.5">{popup.subject}</p>
                )}
                <p className="text-sm text-gray-700 leading-relaxed">{popup.content}</p>

                {popup.imageUrl && (
                  <img
                    src={popup.imageUrl}
                    alt=""
                    className="mt-2 rounded-lg max-h-32 object-contain border border-gray-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}

                {popup.linkUrl && (
                  <a
                    href={popup.linkUrl}
                    target={popup.linkUrl.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 mt-2 text-xs font-semibold px-3 py-1 rounded-full border ${theme.badge} hover:opacity-80 transition-opacity`}
                  >
                    {popup.linkLabel || "En savoir plus"}
                    {popup.linkUrl.startsWith("http") && <ExternalLink className="w-3 h-3" />}
                  </a>
                )}
              </div>

              {/* Dismiss */}
              <button
                onClick={() => handleDismiss(popup.id)}
                className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
