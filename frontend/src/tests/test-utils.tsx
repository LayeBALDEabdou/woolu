import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, type RenderOptions } from "@testing-library/react"
import { ServicesProvider } from "@/components/providers/services-provider"
import type { Session } from "@/features/auth/types"
import { queryKeys } from "@/lib/api/query-keys"
import type { AppServices } from "@/lib/services/types"
import { createDemoServices } from "@/mocks/demo-services"
import { DEMO_USERS } from "@/mocks/seed"
import { resetState } from "@/mocks/store"

export { DEMO_USERS }

/** Services de test : le backend simulé, réinitialisé, avec un utilisateur connecté. */
export async function createTestServices(userId?: string): Promise<{ services: AppServices; session: Session | null }> {
  resetState()
  const services = createDemoServices()
  const session = userId ? await services.demo!.switchAccount(userId) : null
  return { services, session }
}

export function createTestQueryClient(session: Session | null = null): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })
  client.setQueryData(queryKeys.session, session)
  return client
}

interface ProviderOptions extends Omit<RenderOptions, "wrapper"> {
  services: AppServices
  session?: Session | null
  queryClient?: QueryClient
}

export function renderWithProviders(ui: React.ReactElement, { services, session = null, queryClient, ...options }: ProviderOptions) {
  const client = queryClient ?? createTestQueryClient(session)
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <ServicesProvider services={services}>{children}</ServicesProvider>
    </QueryClientProvider>
  )
  return { queryClient: client, ...render(ui, { wrapper: Wrapper, ...options }) }
}
