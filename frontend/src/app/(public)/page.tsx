import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { JourneyLanes } from "@/components/marketing/journey-lanes"
import { PacteVisual } from "@/components/marketing/pacte-visual"

export const metadata: Metadata = {
  title: { absolute: "Wóolu — Le paiement qui attend la livraison" },
}

const HEADLINE = ["Le vendeur livre.", "Le client confirme.", "Wóolu libère l'argent."]

export default function HomePage() {
  return (
    <>
      <section className="px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="relative mx-auto max-w-[88rem] overflow-hidden rounded-[2rem] bg-brand-800 text-brand-50">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 pt-12 pb-16 sm:px-8 md:pt-16 lg:grid-cols-[1.15fr_1fr] lg:pb-20">
            <div className="space-y-7">
              <h1 className="type-poster text-[3.1rem] font-bold text-white sm:text-7xl lg:text-[4.4rem] xl:text-[5rem]">
                {HEADLINE.map((line, index) => (
                  <span
                    key={line}
                    className={`pacte-rise block ${index === 2 ? "text-mint" : ""}`}
                    style={{ "--d": `${0.1 + index * 0.15}s` } as React.CSSProperties}
                  >
                    {line}
                  </span>
                ))}
              </h1>
              <p className="max-w-md text-lg text-brand-100/85">
                Wóolu garde l&apos;argent du client jusqu&apos;à la livraison.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-mint text-brand-900 hover:bg-white">
                  <Link href="/inscription">Créer un compte</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="#parcours">Comment ça marche</Link>
                </Button>
              </div>
            </div>
            <PacteVisual />
          </div>
        </div>
      </section>

      <section
        id="parcours"
        aria-labelledby="parcours-titre"
        className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 md:py-24"
      >
        <div className="mb-10 grid gap-4 md:grid-cols-2 md:items-end">
          <h2 id="parcours-titre" className="text-4xl font-bold text-brand-900 sm:text-5xl">
            Comment ça marche
          </h2>
          <p className="max-w-md text-muted-foreground md:justify-self-end">
            Wóolu intervient deux fois : pour bloquer l&apos;argent, puis pour le libérer.
          </p>
        </div>
        <JourneyLanes />
      </section>
    </>
  )
}
