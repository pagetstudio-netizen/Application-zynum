import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

function Snackbar({
  current,
  isOpen,
  onClose,
}: {
  current: ReturnType<typeof useToast>["toasts"][0]
  isOpen: boolean
  onClose: () => void
}) {
  const isDestructive = current?.variant === "destructive"

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: isOpen ? 56 : -120,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 300,
        transition: "top 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s",
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingLeft: 12,
          paddingRight: 18,
          paddingTop: 10,
          paddingBottom: 10,
          borderRadius: 50,
          background: isDestructive ? "#EF4444" : "#111827",
          color: "#ffffff",
          boxShadow: "0 4px 24px rgba(0,0,0,0.28)",
          whiteSpace: "nowrap",
          maxWidth: "calc(100vw - 48px)",
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isDestructive ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div>
          {current?.title && (
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: "#ffffff" }}>
              {current.title}
            </div>
          )}
          {current?.description && (
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 1, color: "#ffffff" }}>
              {current.description}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ModalToaster() {
  const { toasts, dismiss } = useToast()
  const current = toasts[0]

  const isOpen = !!current && current.open !== false
  const isDestructive = current?.variant === "destructive"

  function handleClose() {
    if (current) dismiss(current.id)
  }

  if (current?.duration) {
    return (
      <Snackbar
        current={current}
        isOpen={isOpen}
        onClose={handleClose}
      />
    )
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[200] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[201] w-[calc(100%-48px)] max-w-sm -translate-x-1/2 -translate-y-1/2",
            "bg-white rounded-3xl shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "duration-200 outline-none"
          )}
        >
          <div className="px-6 pt-6 pb-2">
            {current?.title && (
              <DialogPrimitive.Title className="text-[17px] font-bold text-gray-900 leading-snug mb-2">
                {current.title}
              </DialogPrimitive.Title>
            )}
            {current?.description && (
              <DialogPrimitive.Description className="text-[14px] text-gray-500 leading-relaxed">
                {current.description}
              </DialogPrimitive.Description>
            )}
          </div>

          <div className="mt-4 border-t border-gray-100" />

          <div className="flex">
            {current?.action ? (
              <>
                <button
                  onClick={handleClose}
                  className="flex-1 py-4 text-[15px] font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-bl-3xl transition-colors"
                >
                  Annuler
                </button>
                <div className="w-px bg-gray-100" />
                <div
                  className="flex-1 flex items-center justify-center"
                  onClick={handleClose}
                >
                  {current.action}
                </div>
              </>
            ) : (
              <button
                onClick={handleClose}
                className={cn(
                  "flex-1 py-4 text-[15px] font-semibold rounded-b-3xl transition-colors",
                  isDestructive
                    ? "text-red-600 hover:bg-red-50 active:bg-red-100"
                    : "text-blue-600 hover:bg-blue-50 active:bg-blue-100"
                )}
              >
                OK
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
