import { API_ERROR_CODES, ApiError, type ApiErrorCode, codeFromStatus } from "./errors"

type QueryValue = string | number | boolean | undefined | null

export interface RequestOptions {
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
}

/** Format d'erreur attendu du backend (voir docs/API_ENDPOINTS.md). */
interface ApiErrorBody {
  code?: string
  message?: string
  fieldErrors?: Record<string, string>
}

const CSRF_COOKIE = "csrftoken"
const CSRF_HEADER = "X-CSRFToken"
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

function isKnownCode(code: string | undefined): code is ApiErrorCode {
  return code !== undefined && (API_ERROR_CODES as readonly string[]).includes(code)
}

/**
 * Client HTTP minimal vers le backend Wóolu.
 * - L'authentification repose sur un cookie de session httpOnly posé par le backend :
 *   aucun jeton n'est lu ni stocké par le JavaScript du navigateur.
 * - Les requêtes mutantes portent l'en-tête CSRF attendu par Django.
 * - Aucune clé Bitnob ne transite par ce client : le backend appelle Bitnob lui-même.
 */
export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`, typeof window === "undefined" ? undefined : window.location.origin)
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value))
    }

    const headers: Record<string, string> = { Accept: "application/json" }
    if (options.body !== undefined) headers["Content-Type"] = "application/json"
    if (UNSAFE_METHODS.has(method)) {
      const csrf = readCookie(CSRF_COOKIE)
      if (csrf) headers[CSRF_HEADER] = csrf
    }

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        credentials: "include",
        signal: options.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error
      throw new ApiError("NETWORK")
    }

    if (response.status === 204) return undefined as T

    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const body = (payload ?? {}) as ApiErrorBody
      const code = isKnownCode(body.code) ? body.code : codeFromStatus(response.status)
      throw new ApiError(code, body.message, { status: response.status, fieldErrors: body.fieldErrors })
    }
    return payload as T
  }

  get<T>(path: string, options?: Omit<RequestOptions, "body">) {
    return this.request<T>("GET", path, options)
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
    return this.request<T>("POST", path, { ...options, body })
  }

  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
    return this.request<T>("PATCH", path, { ...options, body })
  }
}
