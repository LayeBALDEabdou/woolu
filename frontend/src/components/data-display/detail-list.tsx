import { cn } from "@/lib/utils"

export interface DetailItem {
  label: string
  value: React.ReactNode
  /** Occupe toute la largeur (textes longs). */
  wide?: boolean
}

export function DetailList({ items, className }: { items: DetailItem[]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.label} className={cn("min-w-0 space-y-1", item.wide && "sm:col-span-2")}>
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="text-sm break-words text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
