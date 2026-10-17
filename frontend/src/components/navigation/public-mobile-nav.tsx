"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

interface PublicMobileNavProps {
  links: ReadonlyArray<{ href: string; label: string }>
}

export function PublicMobileNav({ links }: PublicMobileNavProps) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm">
        <SheetHeader>
          <SheetTitle asChild>
            <div>
              <Logo />
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Menu mobile" className="flex flex-col gap-1 px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="rounded-lg px-3 py-3 font-medium text-foreground hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <Button asChild variant="outline" size="lg">
            <Link href="/connexion" onClick={close}>
              Se connecter
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/inscription" onClick={close}>
              Créer un compte
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
