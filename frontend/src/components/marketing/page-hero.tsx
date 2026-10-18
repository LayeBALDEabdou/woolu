interface PageHeroProps {
  title: string
  intro: string
  children?: React.ReactNode
}

/** En-tête des pages publiques secondaires : panneau Forêt tissé, titre d'affiche. */
export function PageHero({ title, intro, children }: PageHeroProps) {
  return (
    <section className="px-3 pt-3 sm:px-5 sm:pt-5">
      <div className="mx-auto max-w-[88rem] rounded-[2rem] bg-brand-800">
        <div className="max-w-4xl space-y-5 px-5 py-14 sm:px-8 md:py-20 mx-auto">
          <h1 className="type-poster text-5xl font-bold text-white sm:text-6xl">{title}</h1>
          <p className="max-w-2xl text-lg text-brand-100/85">{intro}</p>
          {children}
        </div>
      </div>
    </section>
  )
}
