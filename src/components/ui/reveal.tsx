import * as React from "react"
import { cn } from "@/lib/utils"

export interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "up" | "down" | "left" | "right"
  duration?: number
  delay?: number
}

const Reveal = React.forwardRef<HTMLDivElement, RevealProps>(
  ({ className, direction = "up", duration = 600, delay = 0, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false)
    const elementRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay)
          }
        },
        { threshold: 0.1 }
      )

      const currentElement = elementRef.current
      if (currentElement) {
        observer.observe(currentElement)
      }

      return () => {
        if (currentElement) {
          observer.unobserve(currentElement)
        }
      }
    }, [delay])

    const getTransform = () => {
      if (isVisible) return "translate(0, 0)"
      
      switch (direction) {
        case "up":
          return "translate(0, 30px)"
        case "down":
          return "translate(0, -30px)"
        case "left":
          return "translate(30px, 0)"
        case "right":
          return "translate(-30px, 0)"
        default:
          return "translate(0, 30px)"
      }
    }

    return (
      <div
        ref={(node) => {
          elementRef.current = node
          if (typeof ref === "function") {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
        }}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <div
          style={{
            transform: getTransform(),
            opacity: isVisible ? 1 : 0,
            transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        >
          {children}
        </div>
      </div>
    )
  }
)
Reveal.displayName = "Reveal"

export { Reveal }
