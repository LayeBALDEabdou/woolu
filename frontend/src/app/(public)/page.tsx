import type { Metadata } from "next"
import Link from "next/link"
import {
  BadgeCheck,
  Hammer,
  Laptop,
  MessageCircle,
  ShieldCheck,
  Scale,
  ShoppingBag,
  Store,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { FaqList } from "@/components/marketing/faq-list"
import { GuaranteesGrid } from "@/components/marketing/guarantees-grid"
import { JourneyLanes } from "@/components/marketing/journey-lanes"
import { PacteVisual } from "@/components/marketing/pacte-visual"

export const metadata: Metadata = {
  title: { absolute: "Wóolu — Le paiement qui attend la livraison" },
}

const HEADLINE = ["Le vendeur livre.", "Le client confirme.", "Wóolu libère l'argent."]

const AUDIENCES = [
  { icon: Store, title: "Vous vendez", text: "Livrez en sachant que l'argent est déjà là." },
  { icon: ShoppingBag, title: "Vous achetez", text: "Payez sans risquer de ne jamais recevoir." },
  {
    icon: Wrench,
    title: "Vous êtes prestataire",
    text: "Commencez le travail, soyez payé à la validation.",
  },
]

const SITUATIONS = [
  {
    icon: MessageCircle,
    title: "Vous vendez sur WhatsApp ou Instagram",
    text: "Votre cliente à Saint-Louis hésite à payer une robe qu'elle n'a jamais vue. Elle paie via Wóolu ; vous expédiez en sachant que les fonds sont bloqués.",
  },
  {
    icon: Hammer,
    title: "Vous êtes artisan",
    text: "Un client de Thiès commande un meuble sur mesure. Les dimensions, le délai et le prix sont écrits et acceptés avant que vous achetiez le bois.",
  },
  {
    icon: Laptop,
    title: "Vous travaillez en freelance",
    text: "Logo, site web, traduction : vous démarrez quand le paiement est vérifié, et vous êtes payé dès que le client valide le travail.",
  },
]

const RULES = [
  {
    icon: BadgeCheck,
    title: "Accord écrit des deux parties",
    text: "Aucun paiement tant que le client n'a pas accepté les conditions du vendeur.",
  },
  {
    icon: ShieldCheck,
    title: "Paiement vérifié par nos serveurs",
    text: "Jamais « payé » sur simple déclaration : le serveur confirme auprès du prestataire de paiement.",
  },
  {
    icon: Scale,
    title: "Litiges tranchés par une équipe",
    text: "Les décisions de libération ou de remboursement sont prises par Wóolu, pas par un automatisme.",
  },
]

export default function HomePage() {
  return (
    <>
      <section className="px-3 pt-3 sm:px-5 sm:pt-5">
        <div className="relative mx-auto max-w-[88rem] overflow-hidden rounded-[2rem] bg-brand-800 text-brand-50">
          <div className="max-w-7xl gap-10 px-5 pt-12 pb-24 sm:px-8 md:pt-16 lg:grid-cols-[1.15fr_1fr] lg:pb-28 mx-auto grid items-center">
            <div className="space-y-7">
              <p className="gap-2 px-3 py-1 text-sm inline-flex items-center rounded-full border border-mint/30 text-mint">
                <span aria-hidden className="size-1.5 rounded-full bg-mint" />
                Paiement sous séquestre au Sénégal
              </p>
              <h1 className="type-poster font-bold text-white sm:text-7xl lg:text-[4.4rem] xl:text-[5rem] text-[3.1rem]">
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
              <p className="max-w-lg text-lg text-brand-100/85">
                Entre deux personnes qui ne se connaissent pas, Wóolu garde l&apos;argent du client
                jusqu&apos;à ce que la commande soit reçue et conforme.
              </p>
              <div className="gap-3 sm:flex-row flex flex-col">
                <Button asChild size="lg" className="hover:bg-white bg-mint text-brand-900">
                  <Link href="/inscription">Créer un compte</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
                >
                  <Link href="/fonctionnement">Voir le parcours complet</Link>
                </Button>
              </div>
              <p className="text-sm text-brand-100/70">
                Service en préparation : le paiement en ligne n&apos;est pas encore ouvert au
                public.
              </p>
            </div>
            <PacteVisual />
          </div>
        </div>

        <ul className="-mt-12 max-w-6xl sm:mx-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:mx-auto relative z-10 mx-auto grid divide-y rounded-2xl border bg-card shadow-[0_24px_50px_-30px_rgba(8,37,29,0.45)]">
          {AUDIENCES.map((audience) => (
            <li key={audience.title} className="gap-4 p-5 sm:p-6 flex items-start">
              <span className="size-11 flex shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <audience.icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold">{audience.title}</h2>
                <p className="text-sm text-muted-foreground">{audience.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="parcours" className="max-w-7xl px-4 py-20 sm:px-6 md:py-24 mx-auto">
        <div className="mb-10 gap-4 md:grid-cols-2 md:items-end grid">
          <h2 id="parcours" className="text-4xl font-bold sm:text-5xl text-brand-900">
            Cinq étapes, deux personnes, un seul fil.
          </h2>
          <p className="max-w-md md:justify-self-end text-muted-foreground">
            Chacun voit à tout moment où en est la transaction et ce qu&apos;il lui reste à faire.
            Wóolu intervient deux fois : pour bloquer l&apos;argent, puis pour le libérer.
          </p>
        </div>
        <JourneyLanes />
      </section>

      <section
        aria-labelledby="garanties"
        className="max-w-7xl px-4 pb-20 sm:px-6 md:pb-24 mx-auto"
      >
        <h2 id="garanties" className="mb-8 max-w-2xl text-4xl font-bold sm:text-5xl text-brand-900">
          Ce que Wóolu vous garantit
        </h2>
        <GuaranteesGrid />
      </section>

      <section aria-labelledby="situations" className="border-y bg-card">
        <div className="max-w-7xl px-4 py-20 sm:px-6 mx-auto">
          <div className="mb-10 gap-2 sm:flex-row sm:items-end sm:justify-between flex flex-col">
            <h2 id="situations" className="text-4xl font-bold text-brand-900">
              Pensé pour la vente à distance
            </h2>
            <p className="text-sm text-muted-foreground">
              Exemples d&apos;usage, pas des témoignages.
            </p>
          </div>
          <ul className="gap-10 md:grid-cols-3 md:gap-0 md:divide-x grid">
            {SITUATIONS.map((situation) => (
              <li key={situation.title} className="space-y-3 md:px-8 md:first:pl-0 md:last:pr-0">
                <situation.icon className="size-7 text-brand-600" aria-hidden />
                <h3 className="text-xl font-bold">{situation.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{situation.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="regles" className="bg-brand-900 text-brand-50">
        <div className="max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr] mx-auto grid">
          <div className="space-y-5">
            <h2 id="regles" className="text-4xl font-bold text-white sm:text-5xl">
              Des règles qui ne dépendent pas de la bonne foi.
            </h2>
            <p className="text-brand-100/80">
              L&apos;application vous montre ce que le serveur a confirmé, rien de plus. Pas de «
              paiement envoyé » invérifiable, pas de capture d&apos;écran à croire sur parole.
            </p>
            <Button
              asChild
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
            >
              <Link href="/securite">Lire les règles en détail</Link>
            </Button>
          </div>
          <ul className="space-y-px overflow-hidden rounded-2xl">
            {RULES.map((rule) => (
              <li key={rule.title} className="gap-4 p-5 sm:p-6 flex bg-brand-800">
                <rule.icon className="mt-0.5 size-6 shrink-0 text-mint" aria-hidden />
                <div>
                  <h3 className="text-lg font-bold text-white">{rule.title}</h3>
                  <p className="text-sm text-brand-100/80">{rule.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-titre" className="scroll-mt-20">
        <div className="max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.6fr] mx-auto grid">
          <div className="space-y-3">
            <h2 id="faq-titre" className="text-4xl font-bold text-brand-900">
              Vos questions
            </h2>
            <p className="text-muted-foreground">
              Une question absente de la liste ? Les{" "}
              <Link
                href="/securite"
                className="font-medium text-brand-700 underline underline-offset-4"
              >
                règles de sécurité
              </Link>{" "}
              détaillent chaque cas.
            </p>
          </div>
          <FaqList />
        </div>
      </section>

      <section className="px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="gap-8 px-6 py-14 sm:px-12 md:flex-row md:items-center md:justify-between mx-auto flex max-w-[88rem] flex-col items-start rounded-[2rem] bg-brand-800">
          <h2 className="type-poster max-w-xl text-5xl font-bold text-white sm:text-6xl">
            Votre prochaine vente, sans avance ni inquiétude.
          </h2>
          <div className="gap-3 sm:flex-row flex flex-col">
            <Button asChild size="lg" className="hover:bg-white bg-mint text-brand-900">
              <Link href="/inscription">Créer un compte</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 hover:text-white bg-transparent"
            >
              <Link href="/connexion">Se connecter</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
