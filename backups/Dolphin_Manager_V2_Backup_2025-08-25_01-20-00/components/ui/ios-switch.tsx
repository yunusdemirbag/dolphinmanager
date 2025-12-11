"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface IOSSwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

const IOSSwitch = React.forwardRef<HTMLButtonElement, IOSSwitchProps>(
  ({ checked, onCheckedChange, disabled = false, className, id, ...props }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={cn(
          // Base styles
          "relative inline-flex items-center shrink-0 cursor-pointer transition-all duration-300 ease-in-out",
          "w-14 h-8 rounded-full border-2 border-transparent focus:outline-none focus:ring-4 focus:ring-blue-200/50",
          // Background colors with smooth transition
          checked 
            ? "bg-gradient-to-r from-green-400 to-green-500 shadow-lg shadow-green-200/50" 
            : "bg-gray-300 shadow-inner",
          // Disabled state
          disabled && "opacity-50 cursor-not-allowed",
          // Hover effects
          !disabled && (checked 
            ? "hover:from-green-500 hover:to-green-600 hover:shadow-xl hover:shadow-green-200/60" 
            : "hover:bg-gray-400"
          ),
          className
        )}
        {...props}
      >
        {/* Toggle circle with iOS-style animation */}
        <span
          className={cn(
            "inline-block w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ease-in-out",
            "border border-gray-200/50",
            // Position animation
            checked ? "translate-x-6" : "translate-x-1",
            // Scale animation for press effect
            "active:scale-95",
            // Enhanced shadow for depth
            checked 
              ? "shadow-xl shadow-black/20" 
              : "shadow-lg shadow-black/15"
          )}
        />
        
        {/* Optional glow effect when on */}
        {checked && (
          <div className="absolute inset-0 rounded-full bg-green-400/20 animate-pulse" />
        )}
      </button>
    )
  }
)

IOSSwitch.displayName = "IOSSwitch"

export { IOSSwitch }