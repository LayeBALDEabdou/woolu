export const API_ERROR_CODES = [
  "UNAUTHENTICATED",
  "EMAIL_NOT_VERIFIED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION",
  "INVALID_TRANSITION",
  "CONFLICT",
  "RATE_LIMITED",
  "NETWORK",
  "SERVER",
] as const
export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

const DEFAULT_MESSAGES: Record<ApiErrorCode, string> = {
  UNAUTHENTICATED: "Votre session a expiré. Veuillez vous reconnecter.",
  EMAIL_NOT_VERIFIED: "Confirmez votre adresse e-mail avec le lien reçu avant de vous connecter.",
  FORBIDDEN: "Vous n'êtes pas autorisé à effectuer cette action.",
  NOT_FOUND: "L'élément demandé est introuvable.",
  VALIDATION: "Certaines informations sont invalides.",
  INVALID_TRANSITION: "Cette action n'est plus possible dans l'état actuel de la transaction.",
  CONFLICT: "Cette opération entre en conflit avec une opération en cours.",
  RATE_LIMITED: "Trop de tentatives. Patientez quelques instants avant de réessayer.",
  NETWORK: "Impossible de joindre le serveur. Vérifiez votre connexion.",
  SERVER: "Une erreur inattendue est survenue. Réessayez plus tard.",
}

/** Erreur normalisée renvoyée par toutes les implémentations de services (HTTP ou démo). */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  readonly fieldErrors: Record<string, string>

  constructor(
    code: ApiErrorCode,
    message?: string,
    options: { status?: number; fieldErrors?: Record<string, string> } = {},
  ) {
    super(message ?? DEFAULT_MESSAGES[code])
    this.name = "ApiError"
    this.code = code
    this.status = options.status ?? null
    this.fieldErrors = options.fieldErrors ?? {}
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Message affichable à l'utilisateur, quelle que soit l'erreur. */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message
  return DEFAULT_MESSAGES.SERVER
}

export function codeFromStatus(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHENTICATED"
  if (status === 403) return "FORBIDDEN"
  if (status === 404) return "NOT_FOUND"
  if (status === 409) return "CONFLICT"
  if (status === 422 || status === 400) return "VALIDATION"
  if (status === 429) return "RATE_LIMITED"
  return "SERVER"
}
