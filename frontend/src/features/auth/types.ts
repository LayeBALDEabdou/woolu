import type { ISODateString } from "@/types/common"

export const USER_ROLES = ["client", "vendeur", "prestataire"] as const
export type UserRole = (typeof USER_ROLES)[number]

export interface User {
  id: string
  fullName: string
  email: string
  phone: string | null
  role: UserRole
  createdAt: ISODateString
}

export interface Session {
  user: User
  /** true lorsque la session provient du mode démonstration. */
  isDemo: boolean
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  fullName: string
  email: string
  phone: string | null
  role: UserRole
  password: string
}

export interface ResetPasswordInput {
  token: string
  password: string
}

export interface UpdateProfileInput {
  fullName: string
  phone: string | null
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}
