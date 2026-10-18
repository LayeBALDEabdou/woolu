import type { AuthService } from "@/features/auth/services/auth-service"
import type { Session, UserRole } from "@/features/auth/types"
import type { DeliveryService } from "@/features/deliveries/services/delivery-service"
import type { DisputeService } from "@/features/disputes/services/dispute-service"
import type { DisputeOutcome } from "@/features/disputes/types"
import type { NotificationService } from "@/features/notifications/services/notification-service"
import type { PaymentService } from "@/features/payments/services/payment-service"
import type { TransactionService } from "@/features/transactions/services/transaction-service"

export interface DemoAccount {
  userId: string
  fullName: string
  email: string
  role: UserRole
  description: string
}

/**
 * Commandes du « simulateur backend », disponibles UNIQUEMENT en mode démo.
 * Elles représentent des événements qui, en production, proviennent du serveur
 * (webhook Bitnob, décision de l'équipe Wóolu) et jamais d'un clic de l'utilisateur.
 */
export interface DemoSimulator {
  listAccounts(): DemoAccount[]
  switchAccount(userId: string): Promise<Session>
  confirmPayment(attemptId: string): Promise<void>
  failPayment(attemptId: string): Promise<void>
  expirePayment(attemptId: string): Promise<void>
  requestDisputeInformation(disputeId: string): Promise<void>
  startDisputeReview(disputeId: string): Promise<void>
  decideDispute(disputeId: string, outcome: DisputeOutcome): Promise<void>
  reset(): Promise<void>
}

export interface AppServices {
  auth: AuthService
  transactions: TransactionService
  payments: PaymentService
  deliveries: DeliveryService
  disputes: DisputeService
  notifications: NotificationService
  /** Présent uniquement en mode démonstration. */
  demo: DemoSimulator | null
}
