import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google"
import { AppProviders } from "@/components/providers/app-providers"
import "./globals.css"

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

/** Titres : grotesque condensée à approches serrées, utilisée comme matériau graphique. */
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "wdth"],
  display: "swap",
})

export const metadata: Metadata = {
  title: { default: "Wóolu — Transactions sécurisées", template: "%s · Wóolu" },
  description:
    "Wóolu sécurise les transactions entre clients, vendeurs et prestataires : conditions acceptées par les deux parties, paiement vérifié, fonds libérés après confirmation.",
  applicationName: "Wóolu",
}

export const viewport: Viewport = {
  themeColor: "#0e3b2e",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#contenu"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Aller au contenu
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
