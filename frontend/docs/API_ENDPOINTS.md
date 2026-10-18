# Contrat d'API attendu par le frontend

Ce document liste les endpoints que le frontend appelle en mode `api`
(`NEXT_PUBLIC_APP_MODE=api`). Sont implémentés et branchés : l'**authentification**
(`backend/accounts`), les **transactions**, la **livraison** et le **tableau de bord**
(`backend/transactions`). Les paiements, les réclamations et les notifications restent le contrat à
implémenter ou à négocier avec l'équipe backend.

Les implémentations HTTP correspondantes se trouvent dans `src/features/*/services/*-service.ts`.
Les types TypeScript des requêtes et réponses sont dans `src/features/*/types.ts` et font foi.

## Conventions

| Sujet | Attendu |
| --- | --- |
| Format | JSON, clés en `camelCase` |
| Dates | ISO 8601 UTC (`2026-10-17T10:00:00.000Z`) ; dates calendaires `YYYY-MM-DD` |
| Montants | `{ "amount": 25000, "currency": "XOF" }` : **entier** en unités mineures (le XOF n'en a pas) |
| Authentification | Cookie de session **httpOnly** posé par le backend ; le frontend envoie `credentials: "include"` |
| CSRF | Cookie `csrftoken` lisible ; en-tête `X-CSRFToken` sur `POST`/`PUT`/`PATCH`/`DELETE` (convention Django) |
| CORS | Si le frontend et l'API ont des origines différentes : `Access-Control-Allow-Credentials: true` et origine explicite |
| Erreurs | Corps `{ "code": "...", "message": "...", "fieldErrors": { "champ": "message" } }` |

Codes d'erreur reconnus (`src/lib/api/errors.ts`) : `UNAUTHENTICATED` (401), `EMAIL_NOT_VERIFIED` (403),
`FORBIDDEN` (403),
`NOT_FOUND` (404), `VALIDATION` (400/422), `INVALID_TRANSITION`, `CONFLICT` (409),
`RATE_LIMITED` (429), `SERVER` (5xx). Le champ `message` doit être en français et affichable tel quel.

## Authentification

| Méthode | Chemin | Corps | Réponse |
| --- | --- | --- | --- |
| GET | `/api/auth/session` | — | `Session` ou 401 si non connecté |
| POST | `/api/auth/login` | `{ email, password }` | `Session` |
| POST | `/api/auth/register` | `{ fullName, email, phone, role, password }` | 201 `{ user: User, verificationRequired: true }` (aucune session) |
| POST | `/api/auth/email/verify` | `{ token }` | `Session` : l'adresse est confirmée et la session ouverte |
| POST | `/api/auth/email/resend` | `{ email }` | 204, **même si le compte n'existe pas** |
| POST | `/api/auth/logout` | — | 204 |
| POST | `/api/auth/password/forgot` | `{ email }` | 204, **même si le compte n'existe pas** |
| POST | `/api/auth/password/reset` | `{ token, password }` | 204 |
| PATCH | `/api/auth/me` | `{ fullName, phone }` | `User` |
| POST | `/api/auth/password/change` | `{ currentPassword, newPassword }` | 204 |

`role` ∈ `client`, `vendeur`, `prestataire`. `Session` = `{ user: User, isDemo: false }`.

Confirmation de l'adresse e-mail :

- L'inscription n'ouvre pas de session. Le backend envoie un lien
  `{FRONTEND_URL}/verification-email?token=…`, traité par la page `/verification-email`.
- Tant que l'adresse n'est pas confirmée, `POST /api/auth/login` répond 403 avec le code
  `EMAIL_NOT_VERIFIED` (après vérification du mot de passe) ; l'interface propose alors de renvoyer le lien.
- Le lien de réinitialisation du mot de passe pointe vers `{FRONTEND_URL}/reinitialisation-mot-de-passe?token=…`.
- `GET /api/auth/session` pose le cookie `csrftoken` lu par le frontend pour les requêtes suivantes.

## Transactions

| Méthode | Chemin | Corps / paramètres | Réponse |
| --- | --- | --- | --- |
| GET | `/api/transactions` | `search`, `status`, `period` (`7d`/`30d`/`90d`/`all`), `sort`, `page`, `pageSize` | `Paginated<TransactionSummary>` |
| POST | `/api/transactions` | `CreateTransactionInput` | `Transaction` (statut `created`) |
| GET | `/api/transactions/{id}` | — | `Transaction` |
| POST | `/api/transactions/{id}/send` | — | `Transaction` (`pending_acceptance`) |
| POST | `/api/transactions/{id}/accept` | — | `Transaction` (`pending_payment`) |
| POST | `/api/transactions/{id}/refuse` | `{ reason }` | `Transaction` (`cancelled`) |
| POST | `/api/transactions/{id}/cancel` | `{ reason }` | `Transaction` (`cancelled`) |
| GET | `/api/dashboard/summary` | — | `DashboardSummary` (dont `fundsHeld` : somme des transactions dont le séquestre est confirmé) |

`sort` ∈ `created_desc`, `created_asc`, `amount_desc`, `amount_asc`, `deadline_asc`.

Le backend doit :

- n'exposer une transaction qu'à ses deux parties (404 pour un tiers) ;
- ne pas montrer au client un brouillon (`created`) jamais envoyé ;
- valider **toutes** les transitions selon le graphe de `src/features/transactions/domain/transitions.ts`
  et répondre `INVALID_TRANSITION` sinon ;
- enregistrer chaque étape dans `events` (historique affiché tel quel).

## Paiements (Bitnob)

| Méthode | Chemin | Corps | Réponse |
| --- | --- | --- | --- |
| GET | `/api/transactions/{id}/payments` | — | `PaymentAttempt[]` (plus récente d'abord) |
| POST | `/api/transactions/{id}/payments` | `{ method: "lightning" }` | `PaymentAttempt` (statut `pending`, avec `invoice`) |
| GET | `/api/payments/{attemptId}` | — | `PaymentAttempt` |
| GET | `/api/payments` | — | `PaymentAttempt[]` de l'utilisateur |

Responsabilités **exclusivement backend** (rien de tout cela n'est fait dans le navigateur) :

1. Appeler l'API Bitnob avec les clés secrètes pour créer la facture Lightning, puis renseigner
   `invoice.paymentRequest`, `invoice.amountSats` (conversion XOF → sats) et `invoice.expiresAt`.
2. Recevoir le webhook Bitnob (ex. `POST /api/webhooks/bitnob`), **vérifier sa signature**,
   puis passer la tentative en `confirmed` ou `failed`.
3. Après confirmation : passer la transaction en `payment_confirmed` et, une fois les fonds
   effectivement sécurisés, `escrow = { status: "held", updatedAt }`. Le frontend n'affiche
   « Fonds bloqués » **que** dans ce cas.
4. Marquer `expired` les factures échues, et refuser une nouvelle facture tant qu'une autre est `pending` (409).
5. Libérer ou rembourser les fonds (`escrow.status` = `released` / `refunded`).

`isSimulated` doit valoir `true` pour toute facture de bac à sable, afin que l'interface l'indique.

Le frontend relit `GET /api/transactions/{id}/payments` toutes les 5 s tant qu'une tentative
est `pending`. Un flux temps réel (SSE/WebSocket) pourra remplacer ce polling plus tard.

## Livraison

| Méthode | Chemin | Corps | Réponse |
| --- | --- | --- | --- |
| POST | `/api/transactions/{id}/delivery/start` | `{ method, carrier, trackingNumber, note }` | `Transaction` (`in_progress`) |
| POST | `/api/transactions/{id}/delivery/complete` | `{ note }` | `Transaction` (`awaiting_confirmation`) |
| POST | `/api/transactions/{id}/confirm-receipt` | — | `Transaction` (`completed`, `escrow.released`) |

`method` ∈ `hand_delivery`, `courier`, `carrier`, `on_site`, `remote`.
L'envoi de pièces justificatives n'est pas encore prévu côté frontend (voir limites).

## Réclamations

| Méthode | Chemin | Corps | Réponse |
| --- | --- | --- | --- |
| GET | `/api/disputes` | — | `Dispute[]` |
| POST | `/api/disputes` | `{ transactionId, reason, description }` | `Dispute` (`open`) ; transaction → `disputed` |
| GET | `/api/disputes/{id}` | — | `Dispute` |
| POST | `/api/disputes/{id}/messages` | `{ body }` | `Dispute` |

`reason` ∈ `not_received`, `not_as_described`, `service_not_performed`, `significant_delay`, `other`.
Statuts : `open`, `awaiting_response`, `under_review`, `resolved`, `closed`.

La décision (`decision.outcome` ∈ `release_to_merchant`, `refund_client`) est prise par l'équipe
Wóolu via un outil d'administration **hors de ce frontend**. Aucun endpoint de décision n'est appelé
par l'interface utilisateur.

## Notifications

| Méthode | Chemin | Corps | Réponse |
| --- | --- | --- | --- |
| GET | `/api/notifications` | — | `AppNotification[]` |
| POST | `/api/notifications/{id}/read` | — | 204 |
| POST | `/api/notifications/read-all` | — | 204 |
| GET | `/api/notifications/preferences` | — | `NotificationPreferences` |
| PUT | `/api/notifications/preferences` | `NotificationPreferences` | `NotificationPreferences` |

Une notification transporte un `type` et des `params` structurés (référence, titre, nom de
l'autre partie, montant formaté, statut) plutôt qu'un texte figé : le frontend compose le
message dans la langue de l'utilisateur (`src/features/notifications/messages.ts`), ce qui
prépare les langues locales et la restitution vocale.
