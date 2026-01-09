import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const surfaceVariants = cva(
  "relative overflow-hidden rounded-lg backdrop-blur-xl border transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card/80 border-white/10 shadow-elevation",
        elevated: "bg-card/90 border-white/20 shadow-elevation hover:shadow-neon",
        interactive: "bg-card/80 border-white/10 shadow-elevation hover:border-primary/50 hover:shadow-gold cursor-pointer",
        glass: "bg-white/5 border-white/10 shadow-lg backdrop-blur-2xl",
        glow: "bg-card/80 border-primary/30 shadow-neon",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        none: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface SurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surfaceVariants> {
  glow?: boolean
  animate?: boolean
}

const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, variant, size, glow, animate, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          surfaceVariants({ variant, size }),
          glow && "animate-pulse-glow",
          animate && "animate-fade-in",
          className
        )}
        {...props}
      >
        {children}
        {glow ? (
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-50" />
        ) : null}
      </div>
    )
  }
)
Surface.displayName = "Surface"

export { Surface, surfaceVariants }
