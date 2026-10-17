export type AppMode = "demo" | "api"

function readMode(): AppMode {
  // NEXT_PUBLIC_* est inliné au build : la valeur doit être lue de manière statique.
  const raw = process.env.NEXT_PUBLIC_APP_MODE
  return raw === "api" ? "api" : "demo"
}

export const appConfig = {
  mode: readMode(),
  apiBaseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, ""),
} as const

export const isDemoMode = appConfig.mode === "demo"
