"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CheckCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { TextareaField } from "@/components/forms/form-fields"
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
import { getActionLabel } from "@/features/transactions/domain/presentation"
import type { Transaction } from "@/features/transactions/types"
import { handleFormError } from "@/lib/forms"
import { useCompleteDelivery } from "../hooks"
import { type CompleteDeliveryValues, completeDeliverySchema } from "../schemas/delivery-schemas"

type Parsed = ReturnType<typeof completeDeliverySchema.parse>

export function CompleteDeliveryDialog({ transaction }: { transaction: Transaction }) {
  const [open, setOpen] = useState(false)
  const completeDelivery = useCompleteDelivery(transaction.id)
  const label = getActionLabel("mark_delivered", transaction.kind)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CompleteDeliveryValues, unknown, Parsed>({
    resolver: zodResolver(completeDeliverySchema),
    defaultValues: { note: "" },
  })

  const onSubmit = handleSubmit((values) =>
    completeDelivery.mutate(values, {
      onSuccess: () => {
        toast.success("C'est noté. Le client est invité à confirmer la réception.")
        setOpen(false)
      },
      onError: (error) => handleFormError(error, setError, ["note"]),
    }),
  )

  return (
    <Dialog open={open} onOpenChange={(next) => !completeDelivery.isPending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button size="lg">
          <CheckCheck aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg">{label}</DialogTitle>
            <DialogDescription>
              Le client sera invité à confirmer la réception ou à signaler un problème dans un délai de{" "}
              {transaction.claimWindowDays} jours. Les fonds restent bloqués d&apos;ici là.
            </DialogDescription>
          </DialogHeader>
          <TextareaField
            label="Message au client"
            optional
            rows={3}
            placeholder="Ex. : colis remis au gardien, site mis en ligne…"
            error={errors.note?.message}
            {...register("note")}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={completeDelivery.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={completeDelivery.isPending}>
              {completeDelivery.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
