"use client"

import { createContext, useContext } from "react"
import type { AppServices } from "@/lib/services/types"

const ServicesContext = createContext<AppServices | null>(null)

/** Injecte les services : implémentation HTTP ou démo en production, doublures dans les tests. */
export function ServicesProvider({
  services,
  children,
}: {
  services: AppServices
  children: React.ReactNode
}) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext)
  if (!services) throw new Error("useServices doit être utilisé sous <ServicesProvider>.")
  return services
}
