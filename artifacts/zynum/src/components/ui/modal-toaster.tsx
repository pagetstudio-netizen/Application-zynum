import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export function ModalToaster() {
  const { toasts, dismiss } = useToast()
  const current = toasts[0]

  const isOpen = !!current && current.open !== false
  const isDestructive = current?.variant === "destructive"

  function handleClose() {
    if (current) dismiss(current.id)
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
