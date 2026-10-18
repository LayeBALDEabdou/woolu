# Wóolu — Frontend

Interface web de **Wóolu**, une plateforme qui sécurise les transactions entre clients, vendeurs et
prestataires au Sénégal. Le vendeur propose des conditions, le client les accepte, le paiement est vérifié
par le serveur, puis les fonds ne sont libérés qu'après confirmation de la livraison ou décision en cas de litige.

> **État actuel** : le frontend est complet en **mode démonstration** (données et paiements simulés dans
> le navigateur). En mode `api`, l'**authentification** fonctionne avec le backend Django du dépôt
> (inscription, confirmation de l'adresse e-mail, connexion, profil, mots de passe), les **transactions**
> (création, envoi, acceptation, refus, annulation, liste, tableau de bord) et la **livraison** fonctionnent
> avec le backend Django du dépôt. Les paiements, réclamations et notifications sont en cours de branchement. Le contrat attendu est décrit dans [`docs/API_ENDPOINTS.md`](docs/API_ENDPOINTS.md).

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Prérequis et installation](#prérequis-et-installation)
- [Variables d'environnement](#variables-denvironnement)
- [Commandes](#commandes)
- [Architecture](#architecture)
- [Mode démonstration](#mode-démonstration)
- [Tests](#tests)
- [Build de production](#build-de-production)
- [Intégration Bitnob : état actuel](#intégration-bitnob--état-actuel)
- [Limites connues](#limites-connues)

## Fonctionnalités

| Domaine | Pages | État |
| --- | --- | --- |
| Site public | `/`, `/fonctionnement`, `/securite` | ✅ Fonctionnel |
| Authentification | `/connexion`, `/inscription`, `/verification-email`, `/mot-de-passe-oublie`, `/reinitialisation-mot-de-passe` | ✅ Branchée sur le backend ; 🔶 simulée en démo |
| Tableau de bord | `/dashboard` (selon le rôle) | ✅ |
| Transactions | `/transactions`, `/transactions/nouvelle`, `/transactions/[id]` | ✅ Liste (recherche, filtres, tri, pagination), création avec récapitulatif, détail, actions selon rôle et état |
| Paiement | `/transactions/[id]/paiement`, `/paiements` | ✅ Interface ; 🔶 factures fictives en démo ; ⏳ Bitnob à brancher côté backend |
| Livraison | Dialogues sur le détail de transaction | ✅ Expédition, fin de livraison, confirmation de réception |
| Réclamations | `/transactions/[id]/reclamation`, `/reclamations`, `/reclamations/[id]` | ✅ Ouverture, échanges, historique, décision |
| Notifications et paramètres | `/notifications`, `/parametres` | ✅ ; canal vocal et wolof affichés « bientôt » |

## Prérequis et installation

- Node.js **20.9 ou plus récent** (développé avec Node 22) et npm 10.

```bash
cd frontend
npm install
cp .env.example .env.local   # facultatif : le mode démo est utilisé par défaut
npm run dev                  # http://localhost:3000
```

## Variables d'environnement

| Variable | Valeurs | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_MODE` | `demo` (défaut) ou `api` | Sélectionne les services simulés ou les appels HTTP. **Fixé au build.** |
| `NEXT_PUBLIC_API_BASE_URL` | ex. `http://localhost:8000` | URL de l'API Django, obligatoire en mode `api`. |

Toute variable `NEXT_PUBLIC_*` est visible dans le navigateur. **Aucune clé Bitnob ne doit être définie
côté frontend.**

### Lancer le frontend avec le backend en local

```bash
# Terminal 1 : backend (voir backend/README.md), avec CORS_ALLOWED_ORIGINS=http://localhost:3000
cd backend && python manage.py migrate && python manage.py runserver localhost:8000

# Terminal 2 : frontend
cd frontend
NEXT_PUBLIC_APP_MODE=api NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

- Utilisez **le même nom d'hôte** des deux côtés (`localhost`, pas `127.0.0.1` d'un côté) : sinon le
  frontend ne peut pas lire le cookie `csrftoken` et les requêtes `POST` sont refusées.
- Sans serveur SMTP, les e-mails (confirmation d'adresse, mot de passe oublié) s'affichent dans la console
  du backend : copiez-y le lien.
- En production, si le frontend et l'API sont sur deux sous-domaines, le backend doit définir
  `CSRF_COOKIE_DOMAIN` sur le domaine parent (voir `backend/.env.example`).

## Commandes

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run lint` | ESLint (règles Next.js, TypeScript, isolation des mocks) |
| `npm run typecheck` | Génère les types de routes (`next typegen`) puis `tsc --noEmit` |
| `npm run test` | Tests unitaires et de composants (Vitest + Testing Library) |
| `npm run test:e2e` | Parcours Playwright (nécessite `npm run build` au préalable) |
| `npm run build` / `npm run start` | Build et serveur de production |
| `npm run format` | Prettier (avec tri des classes Tailwind) |

## Architecture

```
src/
  app/                     Routes (App Router)
    (public)/              Accueil, Fonctionnement, Sécurité : Server Components statiques
    (auth)/                Connexion, inscription, mots de passe
    (dashboard)/           Espace connecté (coquille + AuthGuard)
  components/
    ui/                    Composants shadcn/ui (Radix), légèrement adaptés (tailles tactiles, libellés FR)
    layout/ navigation/    En-têtes, pied de page, coquille du tableau de bord
    feedback/              États vide / erreur / chargement, dialogue de confirmation
    data-display/          Badges de statut, montants, listes de détails, indicateurs
    forms/                 Champs accessibles (label, description, erreur reliés)
    demo/                  Bandeau, sélecteur de compte et simulateur du mode démo
    providers/             TanStack Query, injection des services, toasts
  features/
    auth/ transactions/ payments/ deliveries/ disputes/ notifications/ account/
      components/          Vues et composants de la fonctionnalité
      schemas/             Schémas Zod des formulaires
      services/            Interface du service + implémentation HTTP
      domain/              (transactions) machine d'états, présentation, historique
      hooks.ts             Hooks TanStack Query
      types.ts             Types métier
  lib/
    api/                   Client HTTP (cookie de session + CSRF), erreurs normalisées, clés de cache
    services/              Contrat AppServices et sélection démo / API
    config/                Mode d'exécution, paramètres métier
    formatters/            Montants XOF (entiers), dates (Africa/Dakar)
    validations/ i18n/     Règles communes, langues
  mocks/                   Backend simulé (mode démo uniquement)
  tests/                   Configuration et utilitaires de test
e2e/                       Parcours Playwright
docs/                      Contrat d'API, décisions et hypothèses
```

Principes :

- **Les composants ne font jamais d'appel réseau.** Ils utilisent des hooks (`features/*/hooks.ts`)
  qui passent par `useServices()`. Pour remplacer les mocks par la vraie API, il suffit de changer
  `NEXT_PUBLIC_APP_MODE`, sans toucher aux composants.
- **Statuts et transitions centralisés** dans `features/transactions/domain/transitions.ts`
  (graphe de transitions, actions autorisées par rôle et par état) et
  `features/transactions/domain/presentation.ts` (libellés, couleurs, étapes).
- **Le frontend n'est pas une frontière de sécurité** : il masque les actions impossibles, mais le
  backend doit tout revalider (rôles, transitions, délais, montants).
- **Montants** : entiers en unités mineures (`{ amount: 25000, currency: "XOF" }`), jamais de flottants.

Les hypothèses métier et les choix techniques sont détaillés dans [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Mode démonstration

Actif par défaut (`NEXT_PUBLIC_APP_MODE=demo`). Il permet de présenter tous les parcours sans backend.

- **Données fictives** : 4 utilisateurs (adresses `@example.com`) et 11 transactions couvrant tous les
  statuts, avec paiements, livraisons, litiges et notifications. Elles sont stockées dans le
  `localStorage` du navigateur et réinitialisables dans **Paramètres → Réinitialiser les données de démo**.
- **Connexion** : boutons « Comptes de démonstration » sur `/connexion`. Le mot de passe n'est ni vérifié
  ni enregistré. Le bouton « Démo » de l'en-tête permet de **changer de compte** pour jouer successivement le vendeur
  et le client.
- **Signalisation** : le bouton « Démo » de l'espace connecté (changement de compte) rappelle le mode, les factures
  portent la mention « Facture fictive — ne pas payer » et leur chaîne est volontairement invalide.
- **Simulateur backend** : sur le détail d'une transaction, la page de paiement et le dossier de
  réclamation, un panneau en pointillés orange déclenche les **événements serveur** : webhook Bitnob
  (paiement reçu, échec, expiration) et décisions de l'équipe Wóolu. Cliquer sur « Générer la facture »
  ne marque **jamais** un paiement comme réussi.
- Le code de démonstration vit uniquement dans `src/mocks/`. Seul `src/lib/services/index.ts` y fait
  référence, et ESLint bloque tout autre import.

Scénario conseillé : se connecter en **Moussa** (vendeur), créer une transaction pour
`aissatou.diop@example.com` puis l'envoyer. Passer en **Aïssatou** pour accepter et générer la facture,
déclencher « Paiement reçu et vérifié » dans le simulateur, puis revenir en Moussa pour expédier.

## Tests

```bash
npm run test         # 60 tests unitaires et de composants
npm run build && npm run test:e2e   # 6 parcours × 2 profils (ordinateur, mobile Pixel 7)
```

Couverture fonctionnelle :

- Validation des formulaires : création de transaction, inscription, connexion, réclamation.
- Statuts : graphe de transitions, libellés, indicateur de séquestre.
- Permissions selon le rôle et blocage des actions incompatibles avec l'état (y compris pendant un litige).
- Parcours complet par les services : création → envoi → acceptation → paiement en attente →
  confirmation serveur → livraison → réception ; litige → décision.
- Composants : acceptation avec confirmation explicite, paiement en attente (aucune confirmation par
  clic), confirmation de réception avec case obligatoire, ouverture d'une réclamation.
- Playwright : site public, garde d'authentification avec redirection, inscription, parcours vendeur /
  client jusqu'au paiement confirmé, ouverture d'une réclamation.

Playwright nécessite Chromium : `npx playwright install chromium`.

## Build de production

```bash
NEXT_PUBLIC_APP_MODE=api NEXT_PUBLIC_API_BASE_URL=https://api.example.sn npm run build
npm run start
```

Le mode est figé à la compilation : un build `demo` ne peut pas appeler l'API, et inversement.
Des en-têtes de sécurité de base (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`)
sont définis dans `next.config.ts`.

## Intégration Bitnob : état actuel

| Élément | État |
| --- | --- |
| Interface de paiement (récapitulatif, méthode, facture, QR code, compte à rebours, échec, expiration, nouvel essai, historique) | ✅ Prête |
| `paymentService` HTTP (`src/features/payments/services/payment-service.ts`) | ✅ Prêt, endpoints non implémentés côté backend |
| Relecture du statut auprès du serveur (polling toutes les 5 s) | ✅ |
| Création de facture via l'API Bitnob, webhook signé, conversion XOF → sats, séquestre | ⏳ **À réaliser dans le backend** |
| Clés Bitnob | ❌ Jamais dans le frontend, par conception |

## Limites connues

- **API partielle** : en mode `api`, l'authentification, les transactions et la livraison sont branchées
  et vérifiées. Les paiements (`/api/transactions/{id}/payments`), les réclamations et les notifications
  appellent des endpoints que le backend n'expose pas encore : la page de paiement affiche donc une erreur
  de chargement. En attendant le webhook Bitnob, l'action « Confirmer le paiement » de l'admin Django
  (Transactions) fait passer une transaction en « fonds bloqués » pour tester la suite du parcours.
- **Données de démo locales** : elles sont propres à chaque navigateur et non partagées entre appareils.
- **Pièces justificatives** (photos de livraison, preuves de litige) : non implémentées, et signalées
  comme indisponibles dans l'interface.
- **Mobile Money**, **notifications vocales**, **wolof**, **double authentification**, **changement
  d'e-mail** : non disponibles, affichés comme tels.
- **Temps réel** : statut de paiement relu par polling ; les notifications sont rafraîchies toutes les 30 s.
- **Protection des routes** côté client uniquement (`AuthGuard`) ; la sécurité repose sur le backend.
- Plusieurs règles métier sont des **hypothèses à valider** (voir `docs/DECISIONS.md`), notamment la
  libération automatique à l'expiration du délai de réclamation et les remboursements partiels.
- Interface en clair uniquement (pas de mode sombre).
