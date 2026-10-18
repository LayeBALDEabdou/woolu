/**
 * Langues de l'interface. Seul le français est disponible ; le wolof est prévu
 * (interface et notifications vocales). Ajouter une langue = ajouter un catalogue.
 */
export const LOCALES = [
  { code: "fr", label: "Français", available: true },
  { code: "wo", label: "Wolof", available: false },
] as const

export type Locale = (typeof LOCALES)[number]["code"]

export const DEFAULT_LOCALE: Locale = "fr"
