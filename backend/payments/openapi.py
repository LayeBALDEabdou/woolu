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


def erreur_drf(description):
    return reponse(description, {"$ref": "#/components/schemas/ErreurDrf"})


def reponse(description, schema):
    return {"description": description, "content": {"application/json": {"schema": schema}}}


def corps(schema):
    return {"required": True, "content": {"application/json": {"schema": schema}}}


ERREUR_API = reponse("Erreur", {"$ref": "#/components/schemas/ErreurApi"})

JETON_REFRESH = {"type": "object", "required": ["refresh"], "properties": {"refresh": {"type": "string"}}}


SCHEMA = {
    "openapi": "3.1.0",
    "info": {
        "title": "API Wóolu",
        "version": "1.0.0",
        "description": (
            "Comptes utilisateurs (JWT) et réception / envoi d'USDC via Bitnob. "
            "Pour les routes protégées : se connecter avec `/api/auth/login/`, puis coller le jeton "
            "`access` dans « Authorize »."
        ),
    },
    "servers": [{"url": "/"}],
    "tags": [
        {
            "name": "Session",
            "description": (
                "Connexion du frontend par cookie de session httpOnly. Les requêtes POST / PATCH d'un "
                "utilisateur connecté doivent porter l'en-tête `X-CSRFToken` (valeur du cookie `csrftoken`)."
            ),
        },
        {"name": "Authentification", "description": "Comptes et jetons JWT (access 15 min, refresh 7 jours)"},
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
        "/api/auth/register/": {
            "post": {
                "tags": ["Authentification"],
                "summary": "Créer un compte",
                "description": "Limité à 10 inscriptions par heure. Le rôle `admin` ne peut pas être choisi.",
                "security": [],
                "requestBody": corps(
                    {
                        "type": "object",
                        "required": ["email", "password", "role"],
                        "properties": {
                            "email": {"type": "string", "format": "email"},
                            "password": {"type": "string", "format": "password"},
                            "first_name": {"type": "string", "maxLength": 150},
                            "last_name": {"type": "string", "maxLength": 150},
                            "phone_number": {"type": "string", "pattern": "^\\+?[0-9]{8,15}$", "example": "+221771234567"},
                            "role": {"type": "string", "enum": ["client", "vendeur", "prestataire"]},
                        },
                    }
                ),
                "responses": {
                    "201": reponse("Compte créé", {"$ref": "#/components/schemas/Utilisateur"}),
                    "400": erreur_drf("Email déjà utilisé, mot de passe trop faible ou champ invalide"),
                    "429": erreur_drf("Trop de tentatives"),
                },
            }
        },
        "/api/auth/login/": {
            "post": {
                "tags": ["Authentification"],
                "summary": "Se connecter",
                "description": "Limité à 20 tentatives par minute. Le jeton `access` contient aussi le rôle.",
                "security": [],
                "requestBody": corps(
                    {
                        "type": "object",
                        "required": ["email", "password"],
                        "properties": {
                            "email": {"type": "string", "format": "email"},
                            "password": {"type": "string", "format": "password"},
                        },
                    }
                ),
                "responses": {
                    "200": reponse(
                        "Connecté",
                        {
                            "type": "object",
                            "properties": {
                                "access": {"type": "string"},
                                "refresh": {"type": "string"},
                                "user": {"$ref": "#/components/schemas/Utilisateur"},
                            },
                        },
                    ),
                    "401": erreur_drf("Email ou mot de passe incorrect"),
                    "429": erreur_drf("Trop de tentatives"),
                },
            }
        },
        "/api/auth/refresh/": {
            "post": {
                "tags": ["Authentification"],
                "summary": "Renouveler le jeton access",
                "description": "Renvoie aussi un nouveau `refresh` : l'ancien est révoqué.",
                "security": [],
                "requestBody": corps(JETON_REFRESH),
                "responses": {
                    "200": reponse(
                        "Jetons renouvelés",
                        {"type": "object", "properties": {"access": {"type": "string"}, "refresh": {"type": "string"}}},
                    ),
                    "401": erreur_drf("Jeton invalide, expiré ou révoqué"),
                },
            }
        },
        "/api/auth/logout/": {
            "post": {
                "tags": ["Authentification"],
                "summary": "Se déconnecter",
                "description": "Révoque le jeton `refresh`, qui doit appartenir au compte connecté.",
                "requestBody": corps(JETON_REFRESH),
                "responses": {
                    "204": {"description": "Déconnecté"},
                    "400": erreur_drf("Jeton invalide ou déjà révoqué"),
                    "401": erreur_drf("Non connecté"),
                    "403": erreur_drf("Ce jeton ne correspond pas à votre compte"),
                },
            }
        },
        "/api/auth/me/": {
            "get": {
                "tags": ["Authentification"],
                "summary": "Mon profil",
                "responses": {
                    "200": reponse("Profil", {"$ref": "#/components/schemas/Utilisateur"}),
                    "401": erreur_drf("Non connecté"),
                },
            },
            "patch": {
                "tags": ["Authentification"],
                "summary": "Modifier mon profil",
                "description": "L'email et le rôle ne sont pas modifiables.",
                "requestBody": corps(
                    {
                        "type": "object",
                        "properties": {
                            "first_name": {"type": "string", "maxLength": 150},
                            "last_name": {"type": "string", "maxLength": 150},
                            "phone_number": {"type": "string", "pattern": "^\\+?[0-9]{8,15}$"},
                        },
                    }
                ),
                "responses": {
                    "200": reponse("Profil modifié", {"$ref": "#/components/schemas/Utilisateur"}),
                    "400": erreur_drf("Champ invalide"),
                    "401": erreur_drf("Non connecté"),
                },
            },
        },
        "/api/auth/change-password/": {
            "post": {
                "tags": ["Authentification"],
                "summary": "Changer de mot de passe",
                "description": "Révoque tous les jetons refresh du compte : il faut se reconnecter.",
                "requestBody": corps(
                    {
                        "type": "object",
                        "required": ["old_password", "new_password"],
                        "properties": {
                            "old_password": {"type": "string", "format": "password"},
                            "new_password": {"type": "string", "format": "password"},
                        },
                    }
                ),
                "responses": {
                    "200": reponse("Mot de passe modifié", {"$ref": "#/components/schemas/ErreurDrf"}),
                    "400": erreur_drf("Ancien mot de passe incorrect ou nouveau trop faible"),
                    "401": erreur_drf("Non connecté"),
                },
            }
        },
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
    "security": [{"jwt": []}],
    "components": {
        "securitySchemes": {
            "jwt": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT", "description": "Jeton `access` de /api/auth/login/"}
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
            "Utilisateur": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "email": {"type": "string", "format": "email"},
                    "first_name": {"type": "string"},
                    "last_name": {"type": "string"},
                    "phone_number": {"type": "string"},
                    "role": {"type": "string", "enum": ["client", "vendeur", "prestataire", "admin"]},
                    "date_joined": {"type": "string", "format": "date-time"},
                },
            },
            "ErreurDrf": {
                "type": "object",
                "description": "`detail` pour une erreur générale, sinon une liste de messages par champ",
                "properties": {"detail": {"type": "string"}},
                "additionalProperties": {"type": "array", "items": {"type": "string"}},
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
UTILISATEUR_FRONT = {"$ref": "#/components/schemas/UtilisateurFrontend"}
PUBLIC = {"security": [], "tags": ["Session"]}
MOT_DE_PASSE = {"type": "string", "format": "password"}

SCHEMA["security"] = [{"jwt": []}, {"session": []}]
SCHEMA["components"]["securitySchemes"]["session"] = {
    "type": "apiKey",
    "in": "cookie",
    "name": "sessionid",
    "description": "Cookie posé par /api/auth/login",
}
SCHEMA["components"]["schemas"].update(
    {
        "UtilisateurFrontend": {
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
                "tags": ["Session"],
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
                "tags": ["Session"],
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
                "tags": ["Session"],
                "summary": "Changer de mot de passe",
                "description": "La session courante reste ouverte ; les autres sessions et les jetons JWT sont révoqués.",
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
                "tags": ["Session"],
                "summary": "Modifier mon profil",
                "requestBody": corps(
                    {"type": "object", "properties": {"fullName": {"type": "string"}, "phone": {"type": ["string", "null"]}}}
                ),
                "responses": {"200": reponse("Profil", UTILISATEUR_FRONT), "400": ERREUR_API, "401": ERREUR_API},
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
  <script>SwaggerUIBundle({{ url: "/api/schema/", dom_id: "#swagger-ui" }})</script>
</body>
</html>""")
