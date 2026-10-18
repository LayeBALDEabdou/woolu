"""Documentation de l'API : schéma OpenAPI écrit à la main et page Swagger UI."""

from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_GET

from .views import FRAIS_ENVOI_USDC, RESEAUX_USDC

SWAGGER_UI = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14"


def erreur(description):
    return {
        "description": description,
        "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Erreur"}}},
    }


SCHEMA = {
    "openapi": "3.1.0",
    "info": {
        "title": "API Wóolu",
        "version": "1.0.0",
        "description": "Réception et envoi d'USDC via Bitnob. Les erreurs renvoient toujours `{\"erreur\": ...}`.",
    },
    "servers": [{"url": "/"}],
    "tags": [
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
                "description": "Ouvert en debug, réservé aux comptes staff (session admin Django) en production.",
                "responses": {
                    "200": {"description": "Compte Bitnob", "content": {"application/json": {"schema": {"type": "object"}}}},
                    "403": erreur("Accès refusé"),
                },
            }
        },
    },
    "components": {
        "schemas": {
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
