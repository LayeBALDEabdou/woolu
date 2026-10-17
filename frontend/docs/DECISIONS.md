# Décisions et hypothèses

Les points ci-dessous n'étaient pas tranchés par le cahier des charges. Chacun a reçu une
hypothèse explicite, appliquée dans l'interface et dans le backend simulé. **Ils doivent être
validés par l'équipe produit** avant la mise en production.

## Hypothèses métier à valider

| # | Sujet | Hypothèse retenue | Où elle est codée |
| --- | --- | --- | --- |
| 1 | Acceptation du vendeur | La création, avec case « j'accepte ces conditions », vaut acceptation par le vendeur ou prestataire. | `create-transaction-schema.ts`, `demo-backend.ts` |
| 2 | Négociation | Le client accepte ou refuse : pas de contre-proposition. Un refus annule la transaction. | `domain/transitions.ts` |
| 3 | Brouillon | Une transaction créée reste un brouillon invisible pour le client tant que le vendeur ne l'a pas envoyée. | `demo-backend.ts` (`isVisibleTo`) |
| 4 | Qui crée | Seuls les rôles `vendeur` et `prestataire` créent des transactions, de produit ou de service (type présélectionné selon le rôle). | `auth/roles.ts` |
| 5 | Client sans compte | Le vendeur peut viser un e-mail ou un téléphone inconnu ; le backend devra inviter la personne. Rien n'est envoyé en démo. | `demo-backend.ts` |
| 6 | Annulation | Possible avant tout paiement confirmé (vendeur : jusqu'à `pending_payment` ; client : en `pending_payment`), et refusée tant qu'une facture est en attente. Aucune annulation après paiement : il faut passer par une réclamation. | `transitions.ts`, `demo-backend.ts` |
| 7 | Monnaie | Seul le XOF est proposé ; montants entiers. Limites : 1 000 à 10 000 000 FCFA. | `lib/config/business-rules.ts` |
| 8 | Délais | Date limite comprise entre demain et +180 jours. Délai de réclamation au choix : 3, 7 ou 14 jours après livraison. | `business-rules.ts` |
| 9 | Libération automatique | Ce qui se passe à l'expiration du délai de réclamation sans action du client n'est **pas défini**. L'interface n'affiche rien d'automatique. | — |
| 10 | Réclamations | Seul le client ouvre une réclamation (statuts `payment_confirmed`, `in_progress`, `awaiting_confirmation`), une seule active à la fois. | `transitions.ts` |
| 11 | Cycle d'un litige | Une réponse du vendeur sur un dossier `open`, ou d'une partie sur un dossier `awaiting_response`, le fait passer `under_review`. Le retrait d'une réclamation par le client n'est pas prévu. | `demo-backend.ts` |
| 12 | Issue d'un litige | Deux issues : libération totale au vendeur, ou remboursement total au client. Les remboursements partiels ne sont pas modélisés. | `disputes/types.ts` |
| 13 | Paiement | Seule méthode : Bitcoin Lightning via Bitnob. Facture valable 15 min en démo (la durée réelle est fixée par le backend). | `payments/types.ts` |
| 14 | Frais | Non définis ; l'interface l'indique (« Frais de service : non définis »). | `payment-view.tsx` |
| 15 | Confirmation de réception | Possible dès `in_progress` (le client a reçu avant que le vendeur ne déclare la fin) ; exige un séquestre `held`. | `transitions.ts` |
| 16 | Mot de passe | 10 caractères minimum avec lettre et chiffre (règle d'interface ; le backend applique la sienne). | `lib/validations/common.ts` |

## Décisions techniques

- **Next.js 16 avec App Router et `cacheComponents`** (configuration par défaut de `create-next-app` 16.4).
  Les pages publiques sont des Server Components statiques. L'espace connecté est rendu côté client
  (données propres à l'utilisateur, polling du paiement), avec TanStack Query.
- **Accès aux données par interfaces** (`AppServices`), injectées par contexte React. Deux implémentations :
  HTTP (`src/features/*/services`) et démo (`src/mocks`). Le choix se fait **au build**
  (`NEXT_PUBLIC_APP_MODE`), dans un seul fichier (`src/lib/services/index.ts`). Une règle ESLint interdit
  d'importer `@/mocks` ailleurs.
- **Machine d'états unique** (`domain/transitions.ts`), utilisée à la fois pour décider des boutons
  affichés et dans le backend simulé. Elle ne remplace pas la validation serveur.
- **Séquestre** : l'état des fonds est un champ distinct (`escrow`) renvoyé par le backend. Un paiement
  confirmé ne suffit pas pour afficher « Fonds bloqués ».
- **Auth** : cookie de session httpOnly + CSRF (pratique standard avec Django). Aucun jeton dans
  `localStorage`. La garde de route (`AuthGuard`) est un confort d'interface, pas une protection.
- **Simulateur backend** (mode démo) : les événements serveur (webhook Bitnob, décision de litige)
  sont déclenchés depuis un panneau distinct et explicitement étiqueté, jamais depuis le bouton de
  paiement de l'utilisateur.
- **i18n / voix** : les notifications sont des données structurées rendues par un catalogue
  (`messages.ts`) ; `toSpeechText()` prépare la restitution vocale. Une bibliothèque i18n complète
  n'a pas été ajoutée tant qu'une seule langue est disponible.
- **Pas de mode sombre** : non demandé ; les jetons de couleur sont centralisés dans `globals.css`
  pour l'ajouter plus tard.

## Identité visuelle

- **Concept : le pacte.** « Wóolu » signifie confiance en wolof. L'élément central de l'accueil montre
  deux téléphones (cliente, vendeur) reliés par un fil avec, au milieu, le sceau Wóolu qui se verrouille.
  C'est le seul moment animé du site, joué une fois au chargement, et désactivé si l'utilisateur préfère
  réduire les animations (`prefers-reduced-motion`).
- **Palette** : Nuit `#08251D`, Forêt `#0E3B2E`, Émeraude `#12A36B`, Menthe `#A8E6C6`, Papier `#F4F6F1`,
  Encre `#142420`. L'orange (`--warning`) et le rouge (`--destructive`) sont réservés aux alertes.
- **Typographie** : Bricolage Grotesque (titres, en largeur condensée via l'axe `wdth` ; classe
  `.type-poster` pour les titres d'affiche) et Plus Jakarta Sans pour le texte courant.
- **Aplats** : couleurs pleines, sans motif ni texture décorative (choix validé avec le client).
- **Formes** : boutons en pilule (ce qui se clique) et champs à angles doux (ce qui se remplit) ; panneaux
  principaux arrondis à 28 px, cartes à 16 px.
- **À éviter** : intitulés en majuscules au-dessus des titres, police monospace pour les références,
  séries de cartes identiques, faux témoignages. Les situations d'usage de l'accueil sont présentées
  explicitement comme des exemples.
