"""Documentation de l'API : schéma OpenAPI écrit à la main et page Swagger UI."""

from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET

from transactions.models import DeliveryMethod, EscrowStatus, EventType, Status

from .views import FRAIS_ENVOI_USDC, RESEAUX_USDC

SWAGGER_UI = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14"


def erreur(description):
    return {
        "description": description,
        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erreur"}}},
    }


def reponse(description, schema):
    return {"description": description, "content": {"application/json": {"schema": schema}}}


def corps(schema):
    return {"required": True, "content": {"application/json": {"schema": schema}}}


ERREUR_API = reponse("Erreur", {"$ref": "#/components/schemas/ErreurApi"})



SCHEMA = {
    "openapi": "3.1.0",
    "info": {
        "title": "API Wóolu",
        "version": "1.0.0",
        "description": (
            "Comptes, transactions sous séquestre et réception / envoi d'USDC via Bitnob. "
            "Pour les routes protégées : se connecter avec `/api/auth/login` sur cette page, "
            "le cookie de session et le jeton CSRF sont ensuite envoyés automatiquement."
        ),
    },
    "servers": [{"url": "/"}],
    "tags": [
        {
            "name": "Authentification",
            "description": (
                "Connexion par cookie de session httpOnly. Les requêtes POST / PATCH d'un "
                "utilisateur connecté doivent porter l'en-tête `X-CSRFToken` (valeur du cookie `csrftoken`)."
            ),
        },
        {
            "name": "Transactions",
            "description": (
                "Paiements sous séquestre, au format du frontend (camelCase, sans slash final). Parcours : "
                "created → pending_acceptance → pending_payment → payment_confirmed (fonds bloqués) → "
                "in_progress → awaiting_confirmation → completed (le client confirme la réception). "
                "Une action impossible dans l'état actuel renvoie 409 `INVALID_TRANSITION`."
            ),
        },
        {"name": "Dépôts", "description": "Adresses de réception USDC"},
        {"name": "Envois", "description": "USDC envoyés depuis le solde Bitnob"},
        {"name": "Webhooks", "description": "Appelé par Bitnob, pas par le frontend"},
        {"name": "Admin", "description": "Réservé aux administrateurs en production"},
    ],
    "paths": {
        "/payments/adresses/": {
            "post": {
                "tags": ["Dépôts"],
                "summary": "Générer une adresse de dépôt USDC",
                "security": [],
                "description": "Pas de montant : l'adresse accepte n'importe quel dépôt.",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["reseau"],
                                "properties": {"reseau": {"$ref": "#/components/schemas/Reseau"}},
                            }
                        }
                    },
                },
                "responses": {
                    "201": {
                        "description": "Adresse créée",
                        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AdresseDepot"}}},
                    },
                    "400": erreur("JSON invalide ou réseau non pris en charge"),
                    "502": erreur("Bitnob n'a pas renvoyé d'adresse"),
                },
            }
        },
        "/payments/adresses/{reference}/": {
            "get": {
                "tags": ["Dépôts"],
                "summary": "Statut d'une adresse de dépôt",
                "security": [],
                "parameters": [
                    {
                        "name": "reference",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string", "example": "adr-1a2b3c4d5e6f"},
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Adresse trouvée",
                        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/AdresseDepot"}}},
                    },
                    "404": erreur("Adresse introuvable"),
                },
            }
        },
        "/payments/envois/": {
            "post": {
                "tags": ["Envois"],
                "summary": "Envoyer des USDC",
                "security": [],
                "description": (
                    f"Frais Bitnob de {FRAIS_ENVOI_USDC} USDC par envoi. La référence vient du frontend : "
                    "renvoyer la même référence n'envoie qu'une fois. Désactivé en production, "
                    "sauf avec `BITNOB_PAIEMENTS_PUBLICS=1` et une clé sandbox."
                ),
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["adresse", "reseau", "montant", "reference"],
                                "properties": {
                                    "adresse": {
                                        "type": "string",
                                        "pattern": "^[A-Za-z0-9]{20,128}$",
                                        "example": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                                    },
                                    "reseau": {"$ref": "#/components/schemas/Reseau"},
                                    "montant": {
                                        "type": "string",
                                        "description": "En USDC, 6 décimales au plus",
                                        "example": "1.5",
                                    },
                                    "reference": {
                                        "type": "string",
                                        "pattern": "^pay-[0-9a-f-]{8,40}$",
                                        "example": "pay-3f2b8c1e-4d5a-4e6f-9a7b-1c2d3e4f5a6b",
                                    },
                                },
                            }
                        }
                    },
                },
                "responses": {
                    "201": {
                        "description": "Envoi transmis à Bitnob",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "reference": {"type": "string"},
                                        "statut": {"type": "string", "example": "pending"},
                                        "montant": {"type": "string", "example": "1.5"},
                                        "frais": {"type": "string", "example": FRAIS_ENVOI_USDC},
                                        "reseau": {"$ref": "#/components/schemas/Reseau"},
                                    },
                                }
                            }
                        },
                    },
                    "400": erreur("Champ invalide ou refus de Bitnob (ex : solde insuffisant)"),
                    "403": erreur("Envois désactivés en production"),
                },
            }
        },
        "/payments/webhooks/bitnob/": {
            "post": {
                "tags": ["Webhooks"],
                "summary": "Webhooks Bitnob",
                "security": [],
                "description": (
                    "Signature HMAC-SHA512 du corps brut dans `x-bitnob-signature`. "
                    "Gère les dépôts reçus et `transfer.success`. Répond 200 même pour un doublon."
                ),
                "parameters": [
                    {"name": "x-bitnob-signature", "in": "header", "required": True, "schema": {"type": "string"}}
                ],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "event": {"type": "string", "example": "transfer.success"},
                                    "event_id": {"type": "string"},
                                    "data": {"type": "object"},
                                },
                            }
                        }
                    },
                },
                "responses": {
                    "200": {"description": "Reçu"},
                    "400": {"description": "JSON invalide"},
                    "401": {"description": "Signature invalide"},
                },
            }
        },
        "/payments/whoami/": {
            "get": {
                "tags": ["Admin"],
                "summary": "Vérifier les clés API Bitnob",
                "security": [],
                "description": "Ouvert en debug, réservé aux comptes staff (session admin Django) en production.",
                "responses": {
                    "200": {"description": "Compte Bitnob", "content": {"application/json": {"schema": {"type": "object"}}}},
                    "403": erreur("Accès refusé"),
                },
            }
        },
    },
    "security": [{"session": []}],
    "components": {
        "securitySchemes": {
            "session": {
                "type": "apiKey",
                "in": "cookie",
                "name": "sessionid",
                "description": "Cookie posé par /api/auth/login (rien à saisir : le navigateur l'envoie)",
            }
        },
        "schemas": {
            "Transaction": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid"},
                    "reference": {"type": "string", "example": "WL-3F2B8C1E"},
                    "title": {"type": "string"},
                    "kind": {"type": "string", "enum": ["product", "service"]},
                    "amount": {"$ref": "#/components/schemas/Montant"},
                    "status": {"type": "string", "enum": [s.value for s in Status]},
                    "merchant": {"$ref": "#/components/schemas/Partie"},
                    "client": {"$ref": "#/components/schemas/Partie"},
                    "deadline": {"type": "string", "format": "date"},
                    "createdAt": {"type": "string", "format": "date-time"},
                    "updatedAt": {"type": "string", "format": "date-time"},
                    "escrow": {
                        "type": "object",
                        "description": "« held » = fonds bloqués, confirmé par le serveur",
                        "properties": {
                            "status": {"type": "string", "enum": [s.value for s in EscrowStatus]},
                            "updatedAt": {"type": ["string", "null"], "format": "date-time"},
                        },
                    },
                    "activeDisputeId": {"type": ["string", "null"]},
                    "description": {"type": "string"},
                    "specialConditions": {"type": ["string", "null"]},
                    "claimWindowDays": {"type": "integer", "enum": [3, 7, 14]},
                    "merchantAcceptedAt": {"type": ["string", "null"], "format": "date-time"},
                    "clientAcceptedAt": {"type": ["string", "null"], "format": "date-time"},
                    "delivery": {
                        "type": ["object", "null"],
                        "properties": {
                            "method": {"type": "string", "enum": [m.value for m in DeliveryMethod]},
                            "carrier": {"type": ["string", "null"]},
                            "trackingNumber": {"type": ["string", "null"]},
                            "note": {"type": ["string", "null"]},
                            "startedAt": {"type": "string", "format": "date-time"},
                            "completedAt": {"type": ["string", "null"], "format": "date-time"},
                            "completionNote": {"type": ["string", "null"]},
                        },
                    },
                    "disputeIds": {"type": "array", "items": {"type": "string"}},
                    "events": {"type": "array", "items": {"$ref": "#/components/schemas/Evenement"}},
                },
            },
            "Partie": {
                "type": "object",
                "properties": {
                    "userId": {"type": ["string", "null"], "description": "null : pas encore de compte Wóolu"},
                    "fullName": {"type": "string"},
                    "email": {"type": ["string", "null"]},
                    "phone": {"type": ["string", "null"]},
                    "role": {"type": "string", "enum": ["client", "vendeur", "prestataire"]},
                },
            },
            "Montant": {
                "type": "object",
                "properties": {"amount": {"type": "integer", "example": 50000}, "currency": {"type": "string", "example": "XOF"}},
            },
            "Evenement": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "type": {"type": "string", "enum": [e.value for e in EventType]},
                    "at": {"type": "string", "format": "date-time"},
                    "actor": {"type": "string", "enum": ["merchant", "client", "system"]},
                    "actorName": {"type": ["string", "null"]},
                    "note": {"type": ["string", "null"]},
                },
            },
            "ErreurApi": {
                "type": "object",
                "description": "Format d'erreur des routes de session, /api/transactions et /api/dashboard",
                "properties": {
                    "code": {
                        "type": "string",
                        "enum": [
                            "UNAUTHENTICATED",
                            "FORBIDDEN",
                            "EMAIL_NOT_VERIFIED",
                            "NOT_FOUND",
                            "VALIDATION",
                            "INVALID_TRANSITION",
                            "RATE_LIMITED",
                            "SERVER",
                        ],
                    },
                    "message": {"type": "string"},
                    "fieldErrors": {"type": "object", "additionalProperties": {"type": "string"}},
                },
            },
            "Reseau": {"type": "string", "enum": list(RESEAUX_USDC), "example": "solana"},
            "AdresseDepot": {
                "type": "object",
                "properties": {
                    "reference": {"type": "string", "example": "adr-1a2b3c4d5e6f"},
                    "reseau": {"$ref": "#/components/schemas/Reseau"},
                    "adresse": {"type": "string"},
                    "statut": {"type": "string", "enum": ["EN_ATTENTE", "RECU"]},
                    "montant": {"type": ["string", "null"], "description": "Absent à la création"},
                    "devise": {"type": ["string", "null"], "description": "Absent à la création"},
                },
            },
            "Erreur": {
                "type": "object",
                "properties": {"erreur": {"description": "Message, ou détail renvoyé par Bitnob"}},
            },
        }
    },
}


TRANSACTION = {"$ref": "#/components/schemas/Transaction"}
ID_TRANSACTION = {"name": "id", "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}}
TEXTE = {"type": ["string", "null"]}

# chemin -> (résumé, qui peut le faire et depuis quel statut, corps de la requête)
ACTIONS_TRANSACTION = {
    "send": ("Envoyer la demande au client", "Vendeur, depuis `created`.", None),
    "accept": ("Accepter les conditions", "Client, depuis `pending_acceptance`.", None),
    "refuse": ("Refuser les conditions", "Client, depuis `pending_acceptance`.", {"reason": TEXTE}),
    "cancel": (
        "Annuler",
        "Vendeur depuis `created`, `pending_acceptance` ou `pending_payment` ; client depuis `pending_payment`.",
        {"reason": TEXTE},
    ),
    "delivery/start": (
        "Commencer la livraison ou la prestation",
        "Vendeur, depuis `payment_confirmed`. Passe à `in_progress`.",
        {
            "method": {"type": "string", "enum": [m.value for m in DeliveryMethod]},
            "carrier": TEXTE,
            "trackingNumber": TEXTE,
            "note": TEXTE,
        },
    ),
    "delivery/complete": (
        "Marquer comme livrée",
        "Vendeur, depuis `in_progress`. Passe à `awaiting_confirmation`.",
        {"note": TEXTE},
    ),
    "confirm-receipt": (
        "Confirmer la réception",
        "Client, depuis `in_progress` ou `awaiting_confirmation`, fonds bloqués. "
        "Passe à `completed` et libère les fonds au vendeur.",
        None,
    ),
}

SESSION = {"$ref": "#/components/schemas/Session"}
UTILISATEUR_FRONT = {"$ref": "#/components/schemas/Utilisateur"}
PUBLIC = {"security": [], "tags": ["Authentification"]}
MOT_DE_PASSE = {"type": "string", "format": "password"}

SCHEMA["components"]["schemas"].update(
    {
        "Utilisateur": {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "fullName": {"type": "string"},
                "email": {"type": "string", "format": "email"},
                "phone": {"type": ["string", "null"]},
                "role": {"type": "string", "enum": ["client", "vendeur", "prestataire", "admin"]},
                "createdAt": {"type": "string", "format": "date-time"},
            },
        },
        "Session": {
            "type": "object",
            "properties": {"user": UTILISATEUR_FRONT, "isDemo": {"type": "boolean", "const": False}},
        },
    }
)

SCHEMA["paths"].update(
    {
        "/api/auth/session": {
            "get": {
                "tags": ["Authentification"],
                "summary": "Session courante",
                "description": "Pose aussi le cookie `csrftoken`.",
                "security": [],
                "responses": {"200": reponse("Connecté", SESSION), "401": ERREUR_API},
            }
        },
        "/api/auth/login": {
            "post": {
                **PUBLIC,
                "summary": "Se connecter",
                "description": (
                    "Limité à 20 tentatives par minute. Pose le cookie de session. "
                    "Refusé avec le code `EMAIL_NOT_VERIFIED` tant que l'email n'est pas confirmé."
                ),
                "requestBody": corps(
                    {
                        "type": "object",
                        "required": ["email", "password"],
                        "properties": {"email": {"type": "string", "format": "email"}, "password": MOT_DE_PASSE},
                    }
                ),
                "responses": {
                    "200": reponse("Connecté", SESSION),
                    "401": ERREUR_API,
                    "403": reponse("Email non confirmé (`EMAIL_NOT_VERIFIED`)", {"$ref": "#/components/schemas/ErreurApi"}),
                    "429": ERREUR_API,
                },
            }
        },
        "/api/auth/register": {
            "post": {
                **PUBLIC,
                "summary": "Créer un compte",
                "description": (
                    "Limité à 10 inscriptions par heure. Ne connecte pas : un lien de confirmation est envoyé "
                    "par email vers `/verification-email?token=…` du frontend."
                ),
                "requestBody": corps(
                    {
                        "type": "object",
                        "required": ["fullName", "email", "role", "password"],
                        "properties": {
                            "fullName": {"type": "string"},
                            "email": {"type": "string", "format": "email"},
                            "phone": {"type": ["string", "null"], "example": "+221 77 123 45 67"},
                            "role": {"type": "string", "enum": ["client", "vendeur", "prestataire"]},
                            "password": MOT_DE_PASSE,
                        },
                    }
                ),
                "responses": {
                    "201": reponse(
                        "Compte créé, en attente de confirmation",
                        {"type": "object", "properties": {"user": UTILISATEUR_FRONT, "verificationRequired": {"type": "boolean", "const": True}}},
                    ),
                    "400": ERREUR_API,
                    "429": ERREUR_API,
                },
            }
        },
        "/api/auth/logout": {
            "post": {
                "tags": ["Authentification"],
                "summary": "Se déconnecter",
                "security": [],
                "responses": {"204": {"description": "Déconnecté"}},
            }
        },
        "/api/auth/email/verify": {
            "post": {
                **PUBLIC,
                "summary": "Confirmer l'adresse e-mail",
                "description": "Active le compte et connecte directement. Le lien ne sert qu'une fois.",
                "requestBody": corps(
                    {"type": "object", "required": ["token"], "properties": {"token": {"type": "string", "description": "Paramètre du lien reçu"}}}
                ),
                "responses": {"200": reponse("Compte confirmé et connecté", SESSION), "400": ERREUR_API, "429": ERREUR_API},
            }
        },
        "/api/auth/email/resend": {
            "post": {
                **PUBLIC,
                "summary": "Renvoyer l'email de confirmation",
                "description": "Répond 204 même si le compte n'existe pas ou est déjà confirmé.",
                "requestBody": corps(
                    {"type": "object", "required": ["email"], "properties": {"email": {"type": "string", "format": "email"}}}
                ),
                "responses": {"204": {"description": "Demande prise en compte"}, "429": ERREUR_API},
            }
        },
        "/api/auth/password/forgot": {
            "post": {
                **PUBLIC,
                "summary": "Mot de passe oublié",
                "description": "Envoie un lien par email. Répond 204 même si le compte n'existe pas.",
                "requestBody": corps(
                    {"type": "object", "required": ["email"], "properties": {"email": {"type": "string", "format": "email"}}}
                ),
                "responses": {"204": {"description": "Demande prise en compte"}, "429": ERREUR_API},
            }
        },
        "/api/auth/password/reset": {
            "post": {
                **PUBLIC,
                "summary": "Choisir un nouveau mot de passe",
                "requestBody": corps(
                    {
                        "type": "object",
                        "required": ["token", "password"],
                        "properties": {"token": {"type": "string", "description": "Paramètre du lien reçu"}, "password": MOT_DE_PASSE},
                    }
                ),
                "responses": {"204": {"description": "Mot de passe changé"}, "400": ERREUR_API},
            }
        },
        "/api/auth/password/change": {
            "post": {
                "tags": ["Authentification"],
                "summary": "Changer de mot de passe",
                "description": "La session courante reste ouverte ; les autres sessions sont fermées.",
                "requestBody": corps(
                    {
                        "type": "object",
                        "required": ["currentPassword", "newPassword"],
                        "properties": {"currentPassword": MOT_DE_PASSE, "newPassword": MOT_DE_PASSE},
                    }
                ),
                "responses": {"204": {"description": "Mot de passe changé"}, "400": ERREUR_API, "401": ERREUR_API},
            }
        },
        "/api/auth/me": {
            "patch": {
                "tags": ["Authentification"],
                "summary": "Modifier mon profil",
                "requestBody": corps(
                    {"type": "object", "properties": {"fullName": {"type": "string"}, "phone": {"type": ["string", "null"]}}}
                ),
                "responses": {"200": reponse("Profil", UTILISATEUR_FRONT), "400": ERREUR_API, "401": ERREUR_API},
            }
        },
    }
)

SCHEMA["components"]["schemas"]["TentativePaiement"] = {
    "type": "object",
    "properties": {
        "id": {"type": "string", "format": "uuid"},
        "transactionId": {"type": "string", "format": "uuid"},
        "transactionReference": {"type": "string"},
        "transactionTitle": {"type": "string"},
        "method": {"type": "string", "const": "usdc"},
        "status": {"type": "string", "enum": ["pending", "confirmed", "failed"]},
        "amount": {"$ref": "#/components/schemas/Montant"},
        "deposit": {
            "type": "object",
            "properties": {
                "address": {"type": "string"},
                "network": {"type": "string", "const": "solana"},
                "amountUsdc": {"type": "string", "example": "5.000000"},
                "receivedUsdc": {"type": "string", "example": "0.000000"},
                "reference": {"type": "string"},
            },
        },
        "createdAt": {"type": "string", "format": "date-time"},
        "updatedAt": {"type": "string", "format": "date-time"},
        "confirmedAt": {"type": ["string", "null"], "format": "date-time"},
        "failureReason": {"type": ["string", "null"]},
        "isSimulated": {"type": "boolean"},
    },
}

SCHEMA["paths"].update(
    {
        "/api/transactions/{id}/payments": {
            "get": {
                "tags": ["Transactions"],
                "summary": "Lister les paiements d’une transaction",
                "parameters": [ID_TRANSACTION],
                "responses": {
                    "200": reponse(
                        "Tentatives, de la plus récente à la plus ancienne",
                        {"type": "array", "items": {"$ref": "#/components/schemas/TentativePaiement"}},
                    ),
                    "404": ERREUR_API,
                },
            },
            "post": {
                "tags": ["Transactions"],
                "summary": "Créer une adresse de paiement USDC",
                "description": (
                    "Réservé au client d’une transaction en attente de paiement. "
                    "Le montant USDC est calculé côté serveur avec BITNOB_XOF_PER_USDC. "
                    "Le paiement et le séquestre ne sont confirmés qu’après le webhook Bitnob signé."
                ),
                "parameters": [ID_TRANSACTION],
                "requestBody": corps(
                    {
                        "type": "object",
                        "required": ["method"],
                        "properties": {"method": {"type": "string", "const": "usdc"}},
                    }
                ),
                "responses": {
                    "201": reponse("Adresse et montant USDC à régler", {"$ref": "#/components/schemas/TentativePaiement"}),
                    "400": ERREUR_API,
                    "401": ERREUR_API,
                    "403": ERREUR_API,
                    "409": ERREUR_API,
                    "503": ERREUR_API,
                },
            },
        },
        "/api/payments": {
            "get": {
                "tags": ["Transactions"],
                "summary": "Historique des paiements",
                "responses": {
                    "200": reponse(
                        "Tentatives des transactions visibles par l’utilisateur",
                        {"type": "array", "items": {"$ref": "#/components/schemas/TentativePaiement"}},
                    ),
                    "401": ERREUR_API,
                },
            }
        },
        "/api/payments/{attempt_id}": {
            "get": {
                "tags": ["Transactions"],
                "summary": "Lire une tentative de paiement",
                "parameters": [
                    {
                        "name": "attempt_id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string", "format": "uuid"},
                    }
                ],
                "responses": {
                    "200": reponse("Tentative", {"$ref": "#/components/schemas/TentativePaiement"}),
                    "404": ERREUR_API,
                },
            }
        },
    }
)

SCHEMA["paths"].update(
    {
        "/api/transactions": {
            "get": {
                "tags": ["Transactions"],
                "summary": "Mes transactions",
                "description": "Celles où je suis vendeur ou client (le client ne voit pas un brouillon non envoyé).",
                "parameters": [
                    {"name": "search", "in": "query", "schema": {"type": "string"}},
                    {
                        "name": "status",
                        "in": "query",
                        "schema": {"type": "string", "enum": ["all", *[s.value for s in Status]]},
                    },
                    {"name": "period", "in": "query", "schema": {"type": "string", "enum": ["7d", "30d", "90d", "all"]}},
                    {
                        "name": "sort",
                        "in": "query",
                        "schema": {
                            "type": "string",
                            "enum": ["created_desc", "created_asc", "amount_desc", "amount_asc", "deadline_asc"],
                        },
                    },
                    {"name": "page", "in": "query", "schema": {"type": "integer", "minimum": 1, "default": 1}},
                    {
                        "name": "pageSize",
                        "in": "query",
                        "schema": {"type": "integer", "minimum": 1, "maximum": 50, "default": 10},
                    },
                ],
                "responses": {
                    "200": reponse(
                        "Page de résultats (le détail sans description, livraison ni événements)",
                        {
                            "type": "object",
                            "properties": {
                                "items": {"type": "array", "items": TRANSACTION},
                                "page": {"type": "integer"},
                                "pageSize": {"type": "integer"},
                                "total": {"type": "integer"},
                            },
                        },
                    ),
                    "401": ERREUR_API,
                },
            },
            "post": {
                "tags": ["Transactions"],
                "summary": "Créer une demande de paiement",
                "description": "Réservé aux vendeurs et prestataires. Le client est retrouvé par son email ou son téléphone.",
                "requestBody": corps(
                    {
                        "type": "object",
                        "required": [
                            "title",
                            "kind",
                            "description",
                            "clientName",
                            "clientContact",
                            "amount",
                            "deadline",
                            "merchantAcceptsTerms",
                        ],
                        "properties": {
                            "title": {"type": "string", "maxLength": 120},
                            "kind": {"type": "string", "enum": ["product", "service"]},
                            "description": {"type": "string"},
                            "clientName": {"type": "string"},
                            "clientContact": {"type": "string", "description": "Email ou téléphone du client"},
                            "amount": {"type": "integer", "minimum": 1000, "maximum": 10000000},
                            "currency": {"type": "string", "enum": ["XOF"]},
                            "deadline": {"type": "string", "format": "date", "description": "Au plus 180 jours"},
                            "specialConditions": TEXTE,
                            "claimWindowDays": {"type": "integer", "enum": [3, 7, 14]},
                            "merchantAcceptsTerms": {"type": "boolean", "const": True},
                        },
                    }
                ),
                "responses": {"201": reponse("Demande créée", TRANSACTION), "400": ERREUR_API, "403": ERREUR_API},
            },
        },
        "/api/transactions/{id}": {
            "get": {
                "tags": ["Transactions"],
                "summary": "Détail et suivi",
                "parameters": [ID_TRANSACTION],
                "responses": {"200": reponse("Transaction", TRANSACTION), "404": ERREUR_API},
            }
        },
        **{
            f"/api/transactions/{{id}}/{chemin}": {
                "post": {
                    "tags": ["Transactions"],
                    "summary": resume,
                    "description": qui,
                    "parameters": [ID_TRANSACTION],
                    **(
                        {"requestBody": {"content": {"application/json": {"schema": {"type": "object", "properties": champs}}}}}
                        if champs
                        else {}
                    ),
                    "responses": {
                        "200": reponse("Transaction mise à jour", TRANSACTION),
                        "403": ERREUR_API,
                        "404": ERREUR_API,
                        "409": ERREUR_API,
                    },
                }
            }
            for chemin, (resume, qui, champs) in ACTIONS_TRANSACTION.items()
        },
        "/api/dashboard/summary": {
            "get": {
                "tags": ["Transactions"],
                "summary": "Tableau de bord",
                "responses": {
                    "200": reponse(
                        "Compteurs, fonds bloqués, transactions à traiter et activité récente",
                        {
                            "type": "object",
                            "properties": {
                                "totalCount": {"type": "integer"},
                                "pendingCount": {"type": "integer"},
                                "inProgressCount": {"type": "integer"},
                                "completedCount": {"type": "integer"},
                                "openDisputesCount": {"type": "integer"},
                                "fundsHeld": {"$ref": "#/components/schemas/Montant"},
                                "fundsHeldCount": {"type": "integer"},
                                "needsAttention": {"type": "array", "items": TRANSACTION},
                                "recentActivity": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "id": {"type": "string"},
                                            "transactionId": {"type": "string"},
                                            "transactionReference": {"type": "string"},
                                            "transactionTitle": {"type": "string"},
                                            "event": {"$ref": "#/components/schemas/Evenement"},
                                        },
                                    },
                                },
                            },
                        },
                    ),
                    "401": ERREUR_API,
                },
            }
        },
    }
)


@require_GET
def schema(request):
    """Schéma OpenAPI. GET /api/schema/"""
    return JsonResponse(SCHEMA, json_dumps_params={"ensure_ascii": False})


@require_GET
def docs(request):
    """Swagger UI. GET /api/docs/"""
    return HttpResponse(f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>API Wóolu</title>
  <link rel="stylesheet" href="{SWAGGER_UI}/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="{SWAGGER_UI}/swagger-ui-bundle.js"></script>
  <script>
    // Ajoute le jeton CSRF aux requêtes, comme le frontend
    const csrf = () => (document.cookie.match(/(?:^|; )csrftoken=([^;]*)/) || [])[1]
    SwaggerUIBundle({{
      url: "/api/schema/",
      dom_id: "#swagger-ui",
      requestInterceptor: (req) => {{
        if (csrf()) req.headers["X-CSRFToken"] = decodeURIComponent(csrf())
        return req
      }},
    }})
  </script>
</body>
</html>""")
