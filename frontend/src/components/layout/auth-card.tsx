import { cn } from "@/lib/utils"

interface AuthCardProps {
  title: string
  description?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function AuthCard({ title, description, footer, className, children }: AuthCardProps) {
  return (
    <div className={cn("w-full max-w-md", className)}>
      <div className="mb-7 space-y-2">
        <h1 className="text-4xl font-bold text-brand-900">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {children}
      {footer ? <div className="mt-8 border-t pt-5 text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  )
}
