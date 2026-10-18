"use client"

import Link from "next/link"
import { CheckCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, ErrorState, LoadingRows } from "@/components/feedback/states"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/api/errors"
import { formatRelative } from "@/lib/formatters/date"
import { DEFAULT_LOCALE } from "@/lib/i18n/locales"
import { cn } from "@/lib/utils"
import { useMarkNotificationRead, useNotificationPreferences, useNotifications } from "../hooks"
import { renderNotification } from "../messages"
import type { AppNotification } from "../types"

function targetHref(notification: AppNotification): string | null {
  if (notification.disputeId) return `/reclamations/${notification.disputeId}`
  if (notification.transactionId) return `/transactions/${notification.transactionId}`
  return null
}

export function NotificationsView() {
  const query = useNotifications()
  const preferences = useNotificationPreferences()
  const markRead = useMarkNotificationRead()
  const locale = preferences.data?.locale ?? DEFAULT_LOCALE
  const unreadCount = query.data?.filter((n) => !n.readAt).length ?? 0

  const markAll = () =>
    markRead.mutate(undefined, {
      onSuccess: () => toast.success("Toutes les notifications sont marquées comme lues."),
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  return (
    <>
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}.` : "Vous êtes à jour."}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={markAll} disabled={markRead.isPending}>
              {markRead.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCheck aria-hidden />}
              Tout marquer comme lu
            </Button>
          ) : null
        }
      />
      {query.isPending ? (
        <LoadingRows rows={5} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState title="Aucune notification" description="Vous serez prévenu ici de chaque étape importante de vos transactions." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {query.data.map((notification) => {
            const { title, body } = renderNotification(notification, locale)
            const href = targetHref(notification)
            const unread = !notification.readAt
            const content = (
              <div className="flex gap-3">
                <span
                  aria-hidden
                  className={cn("mt-2 size-2 shrink-0 rounded-full", unread ? "bg-brand-600" : "bg-transparent")}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className={cn("text-sm", unread ? "font-semibold text-foreground" : "font-medium text-foreground/90")}>
                    {title}
                    {unread ? <span className="sr-only"> (non lue)</span> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">{body}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(notification.createdAt)}</p>
                </div>
              </div>
            )
            return (
              <li key={notification.id} className={unread ? "bg-brand-50/50" : undefined}>
                {href ? (
                  <Link
                    href={href}
                    onClick={() => unread && markRead.mutate(notification.id)}
                    className="block px-4 py-4 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="px-4 py-4">{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
