"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { isApiError } from "@/lib/api/errors"
import { createAppServices } from "@/lib/services"
import { ServicesProvider } from "./services-provider"

/** Les erreurs métier (4xx) ne gagnent rien à être réessayées automatiquement. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && !["NETWORK", "SERVER"].includes(error.code)) return false
  return failureCount < 2
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 15_000, retry: shouldRetry },
      mutations: { retry: false },
    },
  })
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  const [services] = useState(createAppServices)

  return (
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </ServicesProvider>
    </QueryClientProvider>
  )
}
