"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { Loader2, Truck } from "lucide-react"
import { toast } from "sonner"
import { TextField, TextareaField } from "@/components/forms/form-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DELIVERY_METHODS_BY_KIND, DELIVERY_METHOD_LABELS, getActionLabel } from "@/features/transactions/domain/presentation"
import type { Transaction } from "@/features/transactions/types"
import { handleFormError } from "@/lib/forms"
import { useStartDelivery } from "../hooks"
import { type StartDeliveryValues, startDeliverySchema } from "../schemas/delivery-schemas"

type Parsed = ReturnType<typeof startDeliverySchema.parse>

export function StartDeliveryDialog({ transaction }: { transaction: Transaction }) {
  const [open, setOpen] = useState(false)
  const startDelivery = useStartDelivery(transaction.id)
  const methods = DELIVERY_METHODS_BY_KIND[transaction.kind]
  const isService = transaction.kind === "service"

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<StartDeliveryValues, unknown, Parsed>({
    resolver: zodResolver(startDeliverySchema),
    defaultValues: { method: methods[0], carrier: "", trackingNumber: "", note: "" },
  })
  const method = useWatch({ control, name: "method" })

  const onSubmit = handleSubmit((values) =>
    startDelivery.mutate(values, {
      onSuccess: () => {
        toast.success(isService ? "Démarrage de la prestation enregistré." : "Expédition enregistrée. Le client est notifié.")
        setOpen(false)
        reset()
      },
      onError: (error) => handleFormError(error, setError, ["method", "carrier", "trackingNumber", "note"]),
    }),
  )

  const label = getActionLabel("start_delivery", transaction.kind)

  return (
    <Dialog open={open} onOpenChange={(next) => !startDelivery.isPending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Truck aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg">{label}</DialogTitle>
            <DialogDescription>
              {isService
                ? "Indiquez comment la prestation sera réalisée. Le client sera notifié."
                : "Renseignez les informations de livraison. Elles seront visibles par le client."}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <Field data-invalid={errors.method ? true : undefined}>
                  <FieldLabel htmlFor="delivery-method">{isService ? "Mode de réalisation" : "Mode de livraison"}</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="delivery-method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {methods.map((m) => (
                        <SelectItem key={m} value={m}>
                          {DELIVERY_METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.method ? <FieldError>{errors.method.message}</FieldError> : null}
                </Field>
              )}
            />
            {method === "carrier" || method === "courier" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label={method === "carrier" ? "Transporteur" : "Livreur"}
                  optional={method !== "carrier"}
                  error={errors.carrier?.message}
                  {...register("carrier")}
                />
                <TextField label="Numéro de suivi" optional error={errors.trackingNumber?.message} {...register("trackingNumber")} />
              </div>
            ) : null}
            <TextareaField
              label="Informations pour le client"
              optional
              rows={3}
              placeholder={isService ? "Ex. : maquettes envoyées par e-mail d'ici lundi" : "Ex. : livraison prévue demain entre 10 h et 13 h"}
              error={errors.note?.message}
              {...register("note")}
            />
            <p className="text-xs text-muted-foreground">
              L&apos;ajout de photos ou de justificatifs n&apos;est pas encore disponible.
            </p>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={startDelivery.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={startDelivery.isPending}>
              {startDelivery.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
