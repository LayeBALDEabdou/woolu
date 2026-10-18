import { ApiError } from "@/lib/api/errors"
import type { HttpClient } from "@/lib/api/http-client"
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  RegisterResult,
  ResetPasswordInput,
  Session,
  UpdateProfileInput,
  User,
} from "../types"

export interface AuthService {
  /** Session courante, ou null si l'utilisateur n'est pas connecté. */
  getSession(): Promise<Session | null>
  /** Rejeté avec le code EMAIL_NOT_VERIFIED tant que l'adresse n'est pas confirmée. */
  login(input: LoginInput): Promise<Session>
  register(input: RegisterInput): Promise<RegisterResult>
  /** Confirme l'adresse avec le jeton du lien reçu par e-mail, puis ouvre la session. */
  verifyEmail(token: string): Promise<Session>
  /** Toujours résolu sans erreur pour ne pas révéler l'existence d'un compte. */
  resendVerification(email: string): Promise<void>
  logout(): Promise<void>
  /** Toujours résolu sans erreur pour ne pas révéler l'existence d'un compte. */
  requestPasswordReset(email: string): Promise<void>
  resetPassword(input: ResetPasswordInput): Promise<void>
  updateProfile(input: UpdateProfileInput): Promise<User>
  changePassword(input: ChangePasswordInput): Promise<void>
}

/** Réponse de POST /api/auth/register : le backend n'ouvre pas de session avant la confirmation. */
type RegisterResponse = Session | { user: User; verificationRequired: true }

export function createHttpAuthService(http: HttpClient): AuthService {
  return {
    async getSession() {
      try {
        return await http.get<Session>("/api/auth/session")
      } catch (error) {
        if (error instanceof ApiError && error.code === "UNAUTHENTICATED") return null
        throw error
      }
    },
    login: (input) => http.post<Session>("/api/auth/login", input),
    async register(input) {
      const response = await http.post<RegisterResponse>("/api/auth/register", input)
      if ("verificationRequired" in response && response.verificationRequired) {
        return { status: "verification_required", email: response.user.email }
      }
      return { status: "authenticated", session: response as Session }
    },
    verifyEmail: (token) => http.post<Session>("/api/auth/email/verify", { token }),
    resendVerification: (email) => http.post<void>("/api/auth/email/resend", { email }),
    logout: () => http.post<void>("/api/auth/logout"),
    requestPasswordReset: (email) => http.post<void>("/api/auth/password/forgot", { email }),
    resetPassword: (input) => http.post<void>("/api/auth/password/reset", input),
    updateProfile: (input) => http.patch<User>("/api/auth/me", input),
    changePassword: (input) => http.post<void>("/api/auth/password/change", input),
  }
}
