import { useSocialLinks } from "@/hooks/use-social-links";

const BRAND: Record<string, { color: string; bg: string; border: string }> = {
  whatsapp:  { color: "25D366", bg: "#f0fdf4", border: "#86efac" },
  facebook:  { color: "1877F2", bg: "#eff6ff", border: "#93c5fd" },
  telegram:  { color: "26A5E4", bg: "#f0f9ff", border: "#7dd3fc" },
  youtube:   { color: "FF0000", bg: "#fff1f2", border: "#fca5a5" },
  discord:   { color: "5865F2", bg: "#f5f3ff", border: "#c4b5fd" },
  instagram: { color: "E4405F", bg: "#fff1f2", border: "#fda4af" },
  tiktok:    { color: "000000", bg: "#f9fafb", border: "#d1d5db" },
  x:         { color: "000000", bg: "#f9fafb", border: "#d1d5db" },
  twitter:   { color: "1DA1F2", bg: "#eff6ff", border: "#93c5fd" },
  snapchat:  { color: "FFFC00", bg: "#fefce8", border: "#fde047" },
  linkedin:  { color: "0A66C2", bg: "#eff6ff", border: "#93c5fd" },
};

const DEFAULT_BRAND = { color: "6b7280", bg: "#f9fafb", border: "#d1d5db" };

interface SocialBarProps {
  className?: string;
  label?: string;
  size?: "sm" | "md";
}

export function SocialBar({ className = "", label, size = "md" }: SocialBarProps) {
  const links = useSocialLinks();

  if (links.length === 0) return null;

  const iconSize = size === "sm" ? 18 : 22;
  const btnSize = size === "sm" ? "w-9 h-9" : "w-11 h-11";

  return (
    <div className={className}>
      {label && (
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const slug = (link.icon ?? link.platform).toLowerCase();
          const brand = BRAND[slug] ?? DEFAULT_BRAND;

          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.platform}
              className={`${btnSize} rounded-xl flex items-center justify-center transition-all hover:scale-110 hover:shadow-md`}
              style={{
                background: brand.bg,
                border: `1.5px solid ${brand.border}`,
              }}
            >
              <img
                src={`https://cdn.simpleicons.org/${slug}/${brand.color}`}
                alt={link.platform}
                width={iconSize}
                height={iconSize}
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.style.display = "none";
                  if (t.nextSibling) return;
                  const span = document.createElement("span");
                  span.textContent = link.platform.charAt(0).toUpperCase();
                  span.className = "text-xs font-bold text-gray-600";
                  t.parentElement?.appendChild(span);
                }}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}
