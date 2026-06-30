import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Bell, Megaphone, Gift, Info, Star } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const API = "/api";
const DISMISS_KEY = "zynum_dismissed_popups";

export type Notif = {
  id: number;
  type: string;
  subject: string | null;
  content: string | null;
  color: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  imageUrl: string | null;
  sentAt?: string;
};

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; iconBg: string }> = {
  blue:   { bg: "#EFF6FF", border: "#BFDBFE", icon: "#3B82F6", iconBg: "#DBEAFE" },
  red:    { bg: "#FEF2F2", border: "#FECACA", icon: "#EF4444", iconBg: "#FEE2E2" },
  green:  { bg: "#F0FDF4", border: "#BBF7D0", icon: "#16A34A", iconBg: "#DCFCE7" },
  yellow: { bg: "#FEFCE8", border: "#FEF08A", icon: "#CA8A04", iconBg: "#FEF9C3" },
  purple: { bg: "#FAF5FF", border: "#E9D5FF", icon: "#9333EA", iconBg: "#F3E8FF" },
  orange: { bg: "#FFF7ED", border: "#FDBA74", icon: "#EA580C", iconBg: "#FFEDD5" },
};

const ICONS: Record<string, typeof Bell> = {
  blue: Info, green: Gift, red: Megaphone, yellow: Star, purple: Bell, orange: Megaphone,
};

function getDismissed(): number[] {
  try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
}
function addDismissed(id: number) {
  const d = getDismissed();
  if (!d.includes(id)) d.push(id);
  sessionStorage.setItem(DISMISS_KEY, JSON.stringify(d));
}

export function useNotifications() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${API}/v1/popup-notifications`)
      .then(r => r.ok ? r.json() : { notifications: [] })
      .then(d => { setNotifs(d.notifications ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  return { notifs, loading };
}

export function NotificationBanner() {
  const { t } = useLanguage();
  const { notifs } = useNotifications();
  const [dismissed, setDismissed] = useState<number[]>(() => getDismissed());

  const visible = notifs.filter(n => !dismissed.includes(n.id));
  const current = visible[0] ?? null;

  if (!current) return null;

  const handleDismiss = () => {
    addDismissed(current.id);
    setDismissed(getDismissed());
  };

  const handleLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (current.linkUrl) {
      if (current.linkUrl.startsWith("http")) {
        window.open(current.linkUrl, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = current.linkUrl;
      }
    }
    handleDismiss();
  };

  const isImage = current.type === "image";
  const isText  = current.type === "text";
  const theme   = COLOR_MAP[current.color ?? "blue"] ?? COLOR_MAP.blue;
  const IconComp = ICONS[current.color ?? "blue"] ?? Bell;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="notif-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-5"
        style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        onClick={handleDismiss}
      >
        <motion.div
          key={`modal-${current.id}`}
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: "spring", damping: 24, stiffness: 320 }}
          className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
          style={{ backgroundColor: isImage ? "#111" : isText ? "#fff" : theme.bg }}
          onClick={e => e.stopPropagation()}
        >

          {/* ── IMAGE TYPE ───────────────────────────────────────── */}
          {isImage && (
            <div className="relative">
              {current.imageUrl ? (
                <img
                  src={current.imageUrl}
                  alt={current.subject ?? "Notification"}
                  className="w-full object-cover block"
                  style={{ maxHeight: 460 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-48 bg-gray-800 flex items-center justify-center">
                  <Bell className="w-12 h-12 text-gray-600" />
                </div>
              )}

              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {(current.subject || current.content) && (
                <div className="px-5 py-4" style={{ backgroundColor: "#111" }}>
                  {current.subject && <p className="font-extrabold text-white text-base">{current.subject}</p>}
                  {current.content && <p className="text-sm text-gray-300 mt-1 leading-relaxed">{current.content}</p>}
                </div>
              )}

              {current.linkUrl && (
                <div className="px-5 pb-5" style={{ backgroundColor: "#111" }}>
                  <button
                    onClick={handleLink}
                    className="w-full py-3.5 rounded-2xl bg-white font-bold text-gray-900 text-sm flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
                  >
                    {current.linkLabel ?? t("notif_see_more")}
                    {current.linkUrl.startsWith("http") && <ExternalLink className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── ICON + MESSAGE TYPE (popup) ───────────────────────── */}
          {!isImage && !isText && (
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: theme.iconBg }}>
                  <IconComp className="w-7 h-7" style={{ color: theme.icon }} />
                </div>
                <button
                  onClick={handleDismiss}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors shrink-0"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {current.subject && (
                <h3 className="font-extrabold text-gray-900 text-xl mb-2 leading-snug">{current.subject}</h3>
              )}
              {current.content && (
                <p className="text-sm text-gray-700 leading-relaxed">{current.content}</p>
              )}

              {current.imageUrl && (
                <img
                  src={current.imageUrl}
                  alt=""
                  className="mt-3 w-full rounded-2xl object-cover max-h-48"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}

              {current.linkUrl && (
                <button
                  onClick={handleLink}
                  className="mt-4 w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
                  style={{ backgroundColor: theme.icon }}
                >
                  {current.linkLabel ?? "En savoir plus"}
                  {current.linkUrl.startsWith("http") && <ExternalLink className="w-4 h-4" />}
                </button>
              )}

              {visible.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {visible.map((n, i) => (
                    <span
                      key={n.id}
                      className="rounded-full transition-all"
                      style={{
                        width: i === 0 ? 20 : 6, height: 6,
                        backgroundColor: i === 0 ? theme.icon : theme.border,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TEXT TYPE ─────────────────────────────────────────── */}
          {isText && (
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-gray-500" />
                </div>
                <button
                  onClick={handleDismiss}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {current.subject && (
                <h3 className="font-extrabold text-gray-900 text-xl mb-2 leading-snug">{current.subject}</h3>
              )}
              {current.content && (
                <p className="text-sm text-gray-700 leading-relaxed">{current.content}</p>
              )}

              {current.linkUrl && (
                <button
                  onClick={handleLink}
                  className="mt-4 w-full py-3.5 rounded-2xl bg-gray-900 font-bold text-white text-sm flex items-center justify-center gap-2"
                >
                  {current.linkLabel ?? "En savoir plus"}
                  {current.linkUrl.startsWith("http") && <ExternalLink className="w-4 h-4" />}
                </button>
              )}

              {visible.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {visible.map((n, i) => (
                    <span key={n.id} className="h-1.5 rounded-full" style={{ width: i === 0 ? 20 : 6, backgroundColor: i === 0 ? "#111" : "#D1D5DB" }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
