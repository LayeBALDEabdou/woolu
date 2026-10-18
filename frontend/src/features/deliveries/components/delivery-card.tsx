import { Truck } from "lucide-react"
import { DetailList } from "@/components/data-display/detail-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DELIVERY_METHOD_LABELS } from "@/features/transactions/domain/presentation"
import type { Transaction } from "@/features/transactions/types"
import { formatDateTime } from "@/lib/formatters/date"

export function DeliveryCard({ transaction }: { transaction: Transaction }) {
  const { delivery, kind } = transaction
  const isService = kind === "service"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="size-4 text-brand-700" aria-hidden />
          {isService ? "Réalisation du service" : "Livraison"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {delivery ? (
          <DetailList
            items={[
              { label: isService ? "Mode de réalisation" : "Mode de livraison", value: DELIVERY_METHOD_LABELS[delivery.method] },
              { label: isService ? "Démarrée le" : "Expédiée le", value: formatDateTime(delivery.startedAt) },
              ...(delivery.carrier ? [{ label: "Transporteur / livreur", value: delivery.carrier }] : []),
              ...(delivery.trackingNumber
                ? [{ label: "Numéro de suivi", value: <span className="font-mono">{delivery.trackingNumber}</span> }]
                : []),
              ...(delivery.note ? [{ label: "Informations", value: delivery.note, wide: true }] : []),
              {
                label: "Déclarée terminée le",
                value: delivery.completedAt ? formatDateTime(delivery.completedAt) : "Pas encore",
              },
              ...(delivery.completionNote ? [{ label: "Message de fin", value: delivery.completionNote, wide: true }] : []),
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {isService
              ? "La prestation n'a pas encore démarré. Elle ne peut commencer qu'après confirmation du paiement par le serveur."
              : "Le produit n'a pas encore été expédié. L'expédition n'est possible qu'après confirmation du paiement par le serveur."}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
