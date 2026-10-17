"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface ConfirmDialogProps {
  trigger: React.ReactElement
  title: string
  description: React.ReactNode
  confirmLabel: string
  /** Contenu supplémentaire (récapitulatif, champ de motif…). */
  children?: React.ReactNode
  /** Case à cocher obligatoire avant confirmation, pour les actions définitives. */
  acknowledgement?: string
  variant?: "default" | "destructive"
  pending?: boolean
  /** Doit renvoyer une promesse résolue en cas de succès pour fermer la fenêtre. */
  onConfirm: () => Promise<unknown>
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  children,
  acknowledgement,
  variant = "default",
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const onOpenChange = (next: boolean) => {
    if (pending) return
    setOpen(next)
    if (!next) setAcknowledged(false)
  }

  const confirm = async () => {
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // L'erreur est signalée par l'appelant ; la fenêtre reste ouverte pour réessayer.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        {acknowledgement ? (
          <div className="flex items-start gap-3 rounded-lg bg-muted/60 p-3">
            <Checkbox
              id="confirm-acknowledgement"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <Label htmlFor="confirm-acknowledgement" className="text-sm leading-snug font-normal">
              {acknowledgement}
            </Label>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Retour
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={confirm}
            disabled={pending || (acknowledgement !== undefined && !acknowledged)}
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
