"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ErrorState, LoadingRows } from "@/components/feedback/states"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api/errors"
import { LOCALES, type Locale } from "@/lib/i18n/locales"
import { useNotificationPreferences, useUpdateNotificationPreferences } from "../hooks"
import type { NotificationCategory, NotificationChannel, NotificationPreferences } from "../types"

const CHANNELS: Array<{ id: NotificationChannel; label: string; description: string; available: boolean }> = [
  { id: "in_app", label: "Dans l'application", description: "Toujours actif pour les événements importants.", available: false },
  { id: "email", label: "E-mail", description: "Un e-mail à chaque étape clé.", available: true },
  { id: "sms", label: "SMS", description: "Pour les alertes urgentes (paiement, litige).", available: true },
  { id: "voice", label: "Message vocal", description: "Bientôt disponible, y compris en wolof.", available: false },
]

const CATEGORIES: Array<{ id: NotificationCategory; label: string }> = [
  { id: "transactions", label: "Transactions (propositions, livraisons, confirmations)" },
  { id: "payments", label: "Paiements (confirmations, échecs, expirations)" },
  { id: "disputes", label: "Réclamations et décisions" },
]

function PreferencesEditor({ initial }: { initial: NotificationPreferences }) {
  const [draft, setDraft] = useState(initial)
  const update = useUpdateNotificationPreferences()

  const setChannel = (id: NotificationChannel, value: boolean) =>
    setDraft((d) => ({ ...d, channels: { ...d.channels, [id]: value } }))
  const setCategory = (id: NotificationCategory, value: boolean) =>
    setDraft((d) => ({ ...d, categories: { ...d.categories, [id]: value } }))

  const save = () =>
    update.mutate(draft, {
      onSuccess: () => toast.success("Préférences enregistrées."),
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="mb-1 font-medium">Canaux</legend>
        {CHANNELS.map((channel) => (
          <div key={channel.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div>
              <Label htmlFor={`channel-${channel.id}`} className="font-medium">
                {channel.label}
              </Label>
              <p className="text-xs text-muted-foreground">{channel.description}</p>
            </div>
            <Switch
              id={`channel-${channel.id}`}
              checked={channel.id === "in_app" ? true : draft.channels[channel.id]}
              disabled={!channel.available}
              onCheckedChange={(checked) => setChannel(channel.id, checked)}
            />
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 font-medium">Sujets</legend>
        {CATEGORIES.map((category) => (
          <div key={category.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <Label htmlFor={`category-${category.id}`} className="font-normal">
              {category.label}
            </Label>
            <Switch
              id={`category-${category.id}`}
              checked={draft.categories[category.id]}
              onCheckedChange={(checked) => setCategory(category.id, checked)}
            />
          </div>
        ))}
      </fieldset>

      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="locale">Langue des notifications</Label>
        <Select value={draft.locale} onValueChange={(value) => setDraft((d) => ({ ...d, locale: value as Locale }))}>
          <SelectTrigger id="locale" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCALES.map((locale) => (
              <SelectItem key={locale.code} value={locale.code} disabled={!locale.available}>
                {locale.label}
                {locale.available ? "" : " (bientôt)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={save} disabled={update.isPending}>
        {update.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Enregistrer les préférences
      </Button>
    </div>
  )
}

export function NotificationPreferencesForm() {
  const query = useNotificationPreferences()
  if (query.isPending) return <LoadingRows rows={3} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return <PreferencesEditor initial={query.data} />
}
