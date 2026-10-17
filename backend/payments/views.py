import json
import logging
import re
import uuid

from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import bitnob_client as bn
from .models import AdresseDepot, Commande, PaiementSortant, WebhookEvent

log = logging.getLogger(__name__)


@require_GET
def whoami(request):
    """Test : vérifie que tes clés API marchent. GET /payments/whoami/"""
    # En production, réservé aux admins : la réponse décrit le compte Bitnob
    if not (settings.DEBUG or request.user.is_staff):
        return JsonResponse({"erreur": "Accès refusé"}, status=403)
    try:
        return JsonResponse(bn.whoami())
    except bn.BitnobError as e:
        return JsonResponse({"erreur": e.data}, status=e.status)


@csrf_exempt
@require_POST
def creer_commande(request):
    """
    Crée une commande + une facture Lightning Bitnob.
    POST /payments/commandes/  {"montant_sats": 1000, "description": "Frigo"}
    """
    try:
        data = json.loads(request.body or "{}")
        montant_sats = int(data.get("montant_sats", 1000))
    except (ValueError, TypeError, AttributeError):
        return JsonResponse({"erreur": "JSON ou montant_sats invalide"}, status=400)
    if montant_sats <= 0:
        return JsonResponse({"erreur": "montant_sats doit être positif"}, status=400)

    reference = f"cmd-{uuid.uuid4().hex[:12]}"
    commande = Commande.objects.create(
        reference=reference,
        montant_sats=montant_sats,
        description=str(data.get("description", "Commande test"))[:255],
    )
    try:
        facture = bn.create_lightning_invoice(
            commande.montant_sats, commande.description, reference
        )
    except bn.BitnobError as e:
        commande.statut = Commande.Statut.ERREUR
        commande.save()
        return JsonResponse({"erreur": e.data}, status=e.status)

    # Selon les endpoints, Bitnob renvoie la facture à la racine ou sous "data"
    infos = facture.get("data", facture) if isinstance(facture, dict) else {}
    return JsonResponse(
        {
            "reference": reference,
            "statut": commande.statut,
            "request": infos.get("request"),  # facture BOLT11 à payer
            "expires_at": infos.get("expires_at"),
            "facture": facture,
        },
        status=201,
    )


@require_GET
def statut_commande(request, reference):
    """Statut d'une commande, interrogé par le frontend. GET /payments/commandes/<reference>/"""
    commande = Commande.objects.filter(reference=reference).first()
    if not commande:
        return JsonResponse({"erreur": "Commande introuvable"}, status=404)
    return JsonResponse(
        {
            "reference": commande.reference,
            "statut": commande.statut,
            "montant_sats": commande.montant_sats,
            "description": commande.description,
            "code_livraison": commande.code_livraison or None,
        }
    )


# Réseaux Bitnob acceptant l'USDC (la sandbox n'en propose qu'une partie)
RESEAUX_USDC = ("solana", "polygon", "base", "ethereum", "avalanche", "optimism")


@csrf_exempt
@require_POST
def creer_adresse(request):
    """
    Génère une adresse de dépôt USDC. POST /payments/adresses/ {"reseau": "solana"}
    Pas de montant : l'adresse accepte n'importe quel dépôt.
    """
    try:
        reseau = str(json.loads(request.body or "{}").get("reseau", "")).lower()
    except (ValueError, AttributeError):
        return JsonResponse({"erreur": "JSON invalide"}, status=400)
    if reseau not in RESEAUX_USDC:
        return JsonResponse({"erreur": f"Réseau non pris en charge : {', '.join(RESEAUX_USDC)}"}, status=400)

    reference = f"adr-{uuid.uuid4().hex[:12]}"
    try:
        reponse = bn.create_address(reseau, reference, label=f"Woolu {reference}")
    except bn.BitnobError as e:
        return JsonResponse({"erreur": e.data}, status=e.status)

    infos = reponse.get("data", reponse)
    if not infos.get("address"):
        return JsonResponse({"erreur": "Bitnob n'a pas renvoyé d'adresse"}, status=502)
    depot = AdresseDepot.objects.create(
        reference=reference,
        reseau=reseau,
        adresse=infos["address"],
        bitnob_id=str(infos.get("id", "")),
    )
    return JsonResponse(
        {"reference": depot.reference, "reseau": depot.reseau, "adresse": depot.adresse, "statut": depot.statut},
        status=201,
    )


@require_GET
def statut_adresse(request, reference):
    """Statut d'une adresse de dépôt, interrogé par le frontend. GET /payments/adresses/<reference>/"""
    depot = AdresseDepot.objects.filter(reference=reference).first()
    if not depot:
        return JsonResponse({"erreur": "Adresse introuvable"}, status=404)
    return JsonResponse(
        {
            "reference": depot.reference,
            "reseau": depot.reseau,
            "adresse": depot.adresse,
            "statut": depot.statut,
            "montant": depot.montant or None,
            "devise": depot.devise or None,
        }
    )


REFERENCE_PAIEMENT = re.compile(r"^pay-[0-9a-f-]{8,40}$")


def _lire_facture(request):
    """Renvoie (facture, données JSON, None) ou (None, None, réponse d'erreur)."""
    try:
        data = json.loads(request.body or "{}")
        brut = str(data.get("request", "")).strip()
    except (ValueError, AttributeError):
        return None, None, JsonResponse({"erreur": "JSON invalide"}, status=400)
    facture = brut.lower().removeprefix("lightning:")
    if "@" in facture:
        return None, None, JsonResponse(
            {"erreur": "Les adresses Lightning ne sont pas prises en charge : collez une facture (lntb… / lnbc…)."},
            status=400,
        )
    if not facture.startswith("ln"):
        return None, None, JsonResponse({"erreur": "Ce n'est pas une facture Lightning."}, status=400)
    return facture, data, None


def _paiements_sortants_autorises():
    # Payer sort de l'argent du compte Bitnob : tant que l'app n'a pas de comptes
    # utilisateurs, c'est limité au mode debug, ou à BITNOB_PAIEMENTS_PUBLICS avec
    # une clé sandbox (se désactive tout seul avec une vraie clé)
    if settings.DEBUG:
        return True
    return settings.BITNOB_PAIEMENTS_PUBLICS and "sandbox" in settings.BITNOB_CLIENT_SECRET


@csrf_exempt
@require_POST
def decoder_facture(request):
    """Montant et description d'une facture avant de la payer. POST /payments/factures/decoder/ {"request": "lntb..."}"""
    if not _paiements_sortants_autorises():
        return JsonResponse({"erreur": "Paiements désactivés en production."}, status=403)
    facture, _, erreur = _lire_facture(request)
    if erreur:
        return erreur
    try:
        infos = bn.decode_invoice(facture)
    except bn.BitnobError as e:
        return JsonResponse({"erreur": e.data}, status=e.status)
    infos = infos.get("data", infos)
    return JsonResponse(
        {
            "request": facture,
            "montant_sats": infos.get("amount_sat"),
            "description": infos.get("description", ""),
            "expires_at": infos.get("expires_at"),
            "expiree": bool(infos.get("is_expired")),
        }
    )


@csrf_exempt
@require_POST
def payer_facture(request):
    """
    Paie une facture avec le solde Bitnob.
    POST /payments/factures/payer/ {"request": "lntb...", "reference": "pay-<uuid>"}
    La référence vient du frontend : un double clic ne paie qu'une fois.
    """
    if not _paiements_sortants_autorises():
        return JsonResponse({"erreur": "Paiements désactivés en production."}, status=403)
    facture, data, erreur = _lire_facture(request)
    if erreur:
        return erreur
    reference = str(data.get("reference", ""))
    if not REFERENCE_PAIEMENT.match(reference):
        return JsonResponse({"erreur": "Référence de paiement invalide"}, status=400)

    paiement, _ = PaiementSortant.objects.get_or_create(
        reference=reference, defaults={"facture": facture}
    )
    try:
        reponse = bn.pay_invoice(facture, reference)
    except bn.BitnobError as e:
        paiement.statut = "failed"
        paiement.reponse = {"erreur": e.data}
        paiement.save()
        return JsonResponse({"erreur": e.data}, status=e.status)

    infos = reponse.get("data", reponse)
    paiement.statut = infos.get("status", "pending")
    paiement.montant_sats = int(infos["amount_sat"]) if str(infos.get("amount_sat", "")).isdigit() else None
    paiement.reponse = reponse
    paiement.save()
    log.info("Paiement sortant %s : %s sats, %s", reference, paiement.montant_sats, paiement.statut)
    return JsonResponse(
        {
            "reference": reference,
            "statut": paiement.statut,
            "montant_sats": paiement.montant_sats,
            "frais_sats": infos.get("fee_sat"),
        },
        status=201,
    )


@csrf_exempt  # Bitnob ne peut pas envoyer de jeton CSRF
@require_POST
def webhook_bitnob(request):
    """Reçoit les webhooks Bitnob. URL à donner à Bitnob : https://<domaine-api>/payments/webhooks/bitnob/"""
    # 1. Vérifier la signature sur le corps BRUT (request.body = octets reçus)
    if not bn.webhook_signature_is_valid(
        request.body, request.headers.get("x-bitnob-signature")
    ):
        log.warning("Webhook Bitnob : signature invalide")
        return HttpResponse(status=401)

    try:
        payload = json.loads(request.body)
    except ValueError:
        return HttpResponse(status=400)
    event = payload.get("event")
    data = payload.get("data", payload)  # certains événements mettent tout à la racine
    event_id = payload.get("event_id") or data.get("reference")
    if not event_id:
        log.warning("Webhook Bitnob sans event_id ni reference : %s", payload)
        return HttpResponse(status=200)  # inutile que Bitnob réessaie

    # 2. Ignorer les doublons (Bitnob peut renvoyer le même événement)
    _, cree = WebhookEvent.objects.get_or_create(
        event_id=event_id, defaults={"event": event or "", "payload": payload}
    )
    if not cree:
        return HttpResponse(status=200)

    # 3. Mettre à jour la commande
    commande = Commande.objects.filter(reference=data.get("reference")).first()
    if commande:
        if event in ("transfer.success", "deposit.success"):
            commande.statut = Commande.Statut.PAYEE
            commande.generer_code()
            log.info(
                "Commande %s payée, code livraison %s",
                commande.reference,
                commande.code_livraison,
            )
        elif event == "payouts.withdrawal.success":
            commande.statut = Commande.Statut.TERMINEE
        commande.save()

    # 4. Dépôt sur une adresse USDC : la doc ne fixe pas le nom de l'événement ni des
    # champs, on reconnaît l'adresse ou notre référence (voir WebhookEvent dans l'admin)
    if event and "deposit" in event and event.endswith("success"):
        adresse = data.get("address") or data.get("to_address")
        depot = AdresseDepot.objects.filter(
            Q(reference=data.get("reference") or "") | Q(adresse=adresse or "-")
        ).first()
        if depot and depot.statut != AdresseDepot.Statut.RECU:
            depot.statut = AdresseDepot.Statut.RECU
            depot.montant = str(data.get("amount", ""))
            depot.devise = str(data.get("currency", ""))[:10]
            depot.save()
            log.info("Dépôt reçu sur %s : %s %s", depot.adresse, depot.montant, depot.devise)

    # 5. Toujours répondre 200, sinon Bitnob réessaie
    return HttpResponse(status=200)
