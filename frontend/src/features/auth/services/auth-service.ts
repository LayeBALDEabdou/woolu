import { ApiError } from "@/lib/api/errors"
import type { HttpClient } from "@/lib/api/http-client"
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  Session,
  UpdateProfileInput,
  User,
} from "../types"

export interface AuthService {
  /** Session courante, ou null si l'utilisateur n'est pas connecté. */
  getSession(): Promise<Session | null>
  login(input: LoginInput): Promise<Session>
  register(input: RegisterInput): Promise<Session>
  logout(): Promise<void>
  /** Toujours résolu sans erreur pour ne pas révéler l'existence d'un compte. */
  requestPasswordReset(email: string): Promise<void>
  resetPassword(input: ResetPasswordInput): Promise<void>
  updateProfile(input: UpdateProfileInput): Promise<User>
  changePassword(input: ChangePasswordInput): Promise<void>
}

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
    register: (input) => http.post<Session>("/api/auth/register", input),
    logout: () => http.post<void>("/api/auth/logout"),
    requestPasswordReset: (email) => http.post<void>("/api/auth/password/forgot", { email }),
    resetPassword: (input) => http.post<void>("/api/auth/password/reset", input),
    updateProfile: (input) => http.patch<User>("/api/auth/me", input),
    changePassword: (input) => http.post<void>("/api/auth/password/change", input),
  }
}
