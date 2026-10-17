import Link from "next/link"
import { cn } from "@/lib/utils"

/** Monogramme : un W tracé d'un seul fil, surmonté du point d'accord entre deux parties. */
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="10" className={inverted ? "fill-mint" : "fill-brand-800"} />
      <path
        d="M8 11.5 11.6 22l4.4-8 4.4 8L24 11.5"
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={inverted ? "stroke-brand-900" : "stroke-brand-100"}
      />
      <circle cx="16" cy="8.6" r="1.9" className={inverted ? "fill-brand-700" : "fill-brand-500"} />
    </svg>
  )
}

interface LogoProps {
  href?: string
  className?: string
  /** « light » pour les fonds sombres. */
  tone?: "dark" | "light"
}

export function Logo({ href = "/", className, tone = "dark" }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-md font-heading text-xl font-bold tracking-tight focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        tone === "light" ? "text-white" : "text-brand-900",
        className,
      )}
      aria-label="Wóolu — accueil"
    >
      <LogoMark inverted={tone === "light"} />
      <span>Wóolu</span>
    </Link>
  )
}
