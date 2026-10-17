import type { FieldValues, Path, UseFormSetError } from "react-hook-form"
import { toast } from "sonner"
import { getErrorMessage, isApiError } from "@/lib/api/errors"

/**
 * Reporte une erreur serveur sur le formulaire : erreurs par champ si le backend
 * les fournit, sinon message global en toast.
 */
export function handleFormError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: ReadonlyArray<Path<T>>,
): void {
  if (isApiError(error)) {
    const entries = Object.entries(error.fieldErrors).filter(([field]) =>
      (knownFields as readonly string[]).includes(field),
    )
    for (const [field, message] of entries) {
      setError(field as Path<T>, { type: "server", message })
    }
    if (entries.length > 0) return
  }
  toast.error(getErrorMessage(error))
}

/** N'accepte que des chemins internes pour éviter les redirections ouvertes. */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback
  return value
}
