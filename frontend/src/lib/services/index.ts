import { createHttpAuthService } from "@/features/auth/services/auth-service"
import { createHttpDeliveryService } from "@/features/deliveries/services/delivery-service"
import { createHttpDisputeService } from "@/features/disputes/services/dispute-service"
import { createHttpNotificationService } from "@/features/notifications/services/notification-service"
import { createHttpPaymentService } from "@/features/payments/services/payment-service"
import { createHttpTransactionService } from "@/features/transactions/services/transaction-service"
import { HttpClient } from "@/lib/api/http-client"
import { appConfig } from "@/lib/config/env"
import { createDemoServices } from "@/mocks/demo-services"
import type { AppServices } from "./types"

export type { AppServices, DemoAccount, DemoSimulator } from "./types"

export function createHttpServices(baseUrl: string): AppServices {
  const http = new HttpClient(baseUrl)
  return {
    auth: createHttpAuthService(http),
    transactions: createHttpTransactionService(http),
    payments: createHttpPaymentService(http),
    deliveries: createHttpDeliveryService(http),
    disputes: createHttpDisputeService(http),
    notifications: createHttpNotificationService(http),
    demo: null,
  }
}

/**
 * Point unique de sélection de l'implémentation.
 * Le mode est figé au build (NEXT_PUBLIC_APP_MODE) : les deux mondes ne se mélangent jamais.
 */
export function createAppServices(): AppServices {
  if (appConfig.mode === "demo") return createDemoServices()
  if (!appConfig.apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL est requis lorsque NEXT_PUBLIC_APP_MODE=api.")
  }
  return createHttpServices(appConfig.apiBaseUrl)
}
