"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/feedback/confirm-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { useServices } from "@/components/providers/services-provider"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationPreferencesForm } from "@/features/notifications/components/notification-preferences-form"
import { ProfileForm } from "./profile-form"
import { SecuritySettings } from "./security-settings"

function DemoResetSection() {
  const router = useRouter()
  const { demo } = useServices()
  const queryClient = useQueryClient()
  const reset = useMutation({
    mutationFn: async () => {
      if (!demo) throw new Error("Mode démonstration inactif.")
      await demo.reset()
    },
    onSuccess: () => {
      queryClient.clear()
      toast.success("Données de démonstration réinitialisées.")
      router.replace("/connexion")
    },
  })
  if (!demo) return null
  return (
    <section className="mt-10 max-w-xl space-y-3 rounded-xl border border-dashed border-warning/40 bg-warning-surface/50 p-4">
      <h2 className="font-medium text-warning-foreground">Mode démonstration</h2>
      <p className="text-sm text-warning-foreground/90">
        Restaure les transactions, paiements et réclamations fictifs d&apos;origine. Vous serez déconnecté.
      </p>
      <ConfirmDialog
        trigger={
          <Button variant="outline">
            {reset.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
            Réinitialiser les données de démo
          </Button>
        }
        title="Réinitialiser la démonstration ?"
        description="Toutes les modifications faites pendant la démonstration seront perdues."
        confirmLabel="Réinitialiser"
        variant="destructive"
        pending={reset.isPending}
        onConfirm={() => reset.mutateAsync()}
      />
    </section>
  )
}

export function SettingsView() {
  return (
    <>
      <PageHeader title="Paramètres" description="Gérez votre profil, vos notifications et la sécurité de votre compte." />
      <Tabs defaultValue="profil" className="gap-6">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="profil">Profil et coordonnées</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
        </TabsList>
        <TabsContent value="profil" className="rounded-xl border bg-card p-5">
          <ProfileForm />
        </TabsContent>
        <TabsContent value="notifications" className="rounded-xl border bg-card p-5">
          <NotificationPreferencesForm />
        </TabsContent>
        <TabsContent value="securite" className="rounded-xl border bg-card p-5">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
      <DemoResetSection />
    </>
  )
}
