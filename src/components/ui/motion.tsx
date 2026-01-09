import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const motionVariants = cva(
  "transition-all duration-500",
  {
    variants: {
      preset: {
        fadeIn: "animate-fade-in",
        slideIn: "animate-slide-in",
        scaleIn: "animate-scale-in",
        shimmer: "animate-shimmer",
      },
      delay: {
        none: "",
        sm: "delay-100",
        md: "delay-200",
        lg: "delay-300",
      },
    },
    defaultVariants: {
      preset: "fadeIn",
      delay: "none",
    },
  }
)

export interface MotionProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof motionVariants> {}

const Motion = React.forwardRef<HTMLDivElement, MotionProps>(
  ({ className, preset, delay, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(motionVariants({ preset, delay }), className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Motion.displayName = "Motion"

// MotionGroup for staggered animations
export interface MotionGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  stagger?: number
}

const MotionGroup = React.forwardRef<HTMLDivElement, MotionGroupProps>(
  ({ className, stagger = 100, children, ...props }, ref) => {
    const childArray = React.Children.toArray(children)
    
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {childArray.map((child, index) => (
          <div
            key={index}
            className="animate-fade-in"
            style={{ animationDelay: `${index * stagger}ms` }}
          >
            {child}
          </div>
        ))}
      </div>
    )
  }
)
MotionGroup.displayName = "MotionGroup"

export { Motion, MotionGroup, motionVariants }
