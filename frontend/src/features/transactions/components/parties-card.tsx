import { Mail, Phone, UserRound } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROLE_LABELS } from "@/features/auth/roles"
import { formatDateTime } from "@/lib/formatters/date"
import type { PartySummary, Transaction } from "../types"

function Party({
  title,
  party,
  acceptedAt,
  isViewer,
}: {
  title: string
  party: PartySummary
  acceptedAt: string | null
  isViewer: boolean
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="flex items-center gap-2 font-medium text-foreground">
        <UserRound className="size-4 text-muted-foreground" aria-hidden />
        {party.fullName}
        {isViewer ? <span className="text-xs font-normal text-muted-foreground">(vous)</span> : null}
      </p>
      <p className="text-xs text-muted-foreground">{ROLE_LABELS[party.role]}</p>
      {party.email ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="size-3.5" aria-hidden />
          <span className="truncate">{party.email}</span>
        </p>
      ) : null}
      {party.phone ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="size-3.5" aria-hidden />
          {party.phone}
        </p>
      ) : null}
      <p className="text-xs">
        {acceptedAt ? (
          <span className="text-brand-700">Conditions acceptées le {formatDateTime(acceptedAt)}</span>
        ) : (
          <span className="text-warning-foreground">Conditions pas encore acceptées</span>
        )}
      </p>
      {party.userId === null ? (
        <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
          Cette personne n&apos;a pas encore de compte Wóolu. Elle devra en créer un pour accepter la proposition.
        </p>
      ) : null}
    </div>
  )
}

export function PartiesCard({ transaction, viewerId }: { transaction: Transaction; viewerId: string }) {
  const isService = transaction.kind === "service"
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Party
          title={isService ? "Prestataire" : "Vendeur"}
          party={transaction.merchant}
          acceptedAt={transaction.merchantAcceptedAt}
          isViewer={transaction.merchant.userId === viewerId}
        />
        <div className="border-t" />
        <Party
          title="Client"
          party={transaction.client}
          acceptedAt={transaction.clientAcceptedAt}
          isViewer={transaction.client.userId === viewerId}
        />
      </CardContent>
    </Card>
  )
}
