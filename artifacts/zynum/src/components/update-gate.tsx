import { useEffect, useState } from "react";
import { APP_VERSION } from "@/config";

interface VersionConfig {
  currentVersion: string;
  mode: "disabled" | "optional" | "forced";
  updateUrl: string;
  title: string;
  message: string;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function UpdateIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="#EEF2FF" />
      <path d="M32 18v4M32 42v4M18 32h4M42 32h4" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M24 24l3 3M37 37l3 3M24 40l3-3M37 27l3-3" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="32" cy="32" r="8" fill="#6366F1" />
      <path d="M29 32l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BlockingPage({ config }: { config: VersionConfig }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#ffffff",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px",
      textAlign: "center",
    }}>
      <div style={{ maxWidth: 360, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <UpdateIcon />

        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 8px", lineHeight: 1.3 }}>
            {config.title || "Mise à jour disponible"}
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
            {config.message || "Une nouvelle version de l'application est disponible. Veuillez mettre à jour pour continuer à utiliser ZyNum."}
          </p>
        </div>

        <div style={{
          background: "#F3F4F6", borderRadius: 12, padding: "10px 20px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase" }}>Votre version</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#EF4444", margin: 0 }}>v{APP_VERSION}</p>
          </div>
          <div style={{ width: 1, height: 32, background: "#E5E7EB" }} />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase" }}>Requise</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#16A34A", margin: 0 }}>v{config.currentVersion}</p>
          </div>
        </div>

        {config.updateUrl && (
          <a
            href={config.updateUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "16px 24px",
              background: "linear-gradient(135deg, #4F46E5, #6366F1)",
              color: "#ffffff", fontWeight: 800, fontSize: 16,
              borderRadius: 16, textDecoration: "none",
              boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Mettre à jour maintenant
          </a>
        )}

      </div>
    </div>
  );
}

function OptionalModal({ config, onDismiss }: { config: VersionConfig; onDismiss: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      padding: "0 0 24px",
    }}
    onClick={e => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div style={{
        background: "#ffffff", borderRadius: "24px 24px 20px 20px",
        padding: "28px 24px 24px",
        width: "100%", maxWidth: 420,
        display: "flex", flexDirection: "column", gap: 16,
        textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onDismiss}
            style={{ background: "#F3F4F6", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <UpdateIcon />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>
              {config.title || "Mise à jour disponible"}
            </h2>
            <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
              {config.message || "Une nouvelle version est disponible. Mettez à jour pour profiter des dernières améliorations."}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {config.updateUrl && (
            <a
              href={config.updateUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 24px",
                background: "linear-gradient(135deg, #4F46E5, #6366F1)",
                color: "#ffffff", fontWeight: 700, fontSize: 15,
                borderRadius: 14, textDecoration: "none",
              }}
            >
              Mettre à jour
            </a>
          )}
          <button
            onClick={onDismiss}
            style={{
              padding: "12px 24px", background: "transparent",
              border: "1.5px solid #E5E7EB", borderRadius: 14,
              color: "#6B7280", fontWeight: 600, fontSize: 14,
              cursor: "pointer",
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

export function UpdateGate({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<VersionConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/v1/app/version")
      .then(r => r.ok ? r.json() : null)
      .then((d) => {
        if (d) setConfig(d);
      })
      .catch(() => {});
  }, []);

  const isOutdated = config
    ? compareSemver(APP_VERSION, config.currentVersion) < 0
    : false;

  const showForced   = isOutdated && config?.mode === "forced";
  const showOptional = isOutdated && config?.mode === "optional" && !dismissed;

  return (
    <>
      {children}
      {showForced   && <BlockingPage config={config!} />}
      {showOptional && <OptionalModal config={config!} onDismiss={() => setDismissed(true)} />}
    </>
  );
}
