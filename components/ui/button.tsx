import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

const buttonVariants = (variant = "default", size = "default") => {
  let variantClasses = "";
  let sizeClasses = "";
  
  switch (variant) {
    case "default":
      variantClasses = "bg-black text-white hover:bg-gray-800 active:bg-gray-900";
      break;
    case "outline":
      variantClasses = "border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100";
      break;
    case "secondary":
      variantClasses = "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300";
      break;
    case "ghost":
      variantClasses = "hover:bg-gray-100 active:bg-gray-200";
      break;
    case "destructive":
      variantClasses = "bg-red-600 text-white hover:bg-red-700 active:bg-red-800";
      break;
  }
  
  switch (size) {
    case "default":
      sizeClasses = "h-10 px-4 py-2";
      break;
    case "sm":
      sizeClasses = "h-9 rounded-md px-3";
      break;
    case "lg":
      sizeClasses = "h-11 rounded-md px-8";
      break;
    case "icon":
      sizeClasses = "h-10 w-10";
      break;
  }
  
  return `inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantClasses} ${sizeClasses}`;
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-black text-white hover:bg-gray-800 active:bg-gray-900": variant === "default",
            "border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100": variant === "outline", 
            "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300": variant === "secondary",
            "hover:bg-gray-100 active:bg-gray-200": variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700 active:bg-red-800": variant === "destructive",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm", 
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }