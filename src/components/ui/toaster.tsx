"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { CheckCircle, AlertCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast 
            key={id} 
            {...props}
            className={cn(
              "group flex w-full items-center justify-between space-x-2 p-4 pr-8 shadow-lg rounded-lg border",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full",
              variant === "destructive" ? "bg-red-50 border-red-200 text-red-800" : 
              variant === "success" ? "bg-green-50 border-green-200 text-green-800" : 
              "bg-white border-gray-100"
            )}
          >
            <div className="flex items-start gap-3">
              {variant === "destructive" && (
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              {variant === "success" && (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              )}
              {(!variant || variant === "default") && (
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              )}
              <div className="grid gap-1">
                {title && <ToastTitle className="font-semibold text-sm">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-xs opacity-90">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose className="absolute top-2 right-2 opacity-70 transition-opacity hover:opacity-100" />
          </Toast>
        )
      })}
      <ToastViewport className="fixed top-4 right-4 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-2 sm:flex-col md:max-w-[380px]" />
    </ToastProvider>
  )
}
