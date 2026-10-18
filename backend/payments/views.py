import json
import logging
import re
import uuid
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import bitnob_client as bn
from .models import AdresseDepot, EnvoiUsdc, WebhookEvent

log = logging.getLogger(__name__)

# Réseaux Bitnob acceptant l'USDC (la sandbox n'en propose qu'une partie)
RESEAUX_USDC = ("solana", "polygon", "base", "ethereum", "avalanche", "optimism")
FRAIS_ENVOI_USDC = "1"  # frais Bitnob par envoi, ajoutés au montant
REFERENCE_ENVOI = re.compile(r"^pay-[0-9a-f-]{8,40}$")
ADRESSE = re.compile(r"^[A-Za-z0-9]{20,128}$")


def erreur(message, status=400):
    return JsonResponse({"erreur": message}, status=status)


def lire_json(request) -> dict | None:
    try:
        data = json.loads(request.body or "{}")
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def envois_autorises():
    # Envoyer sort de l'argent du compte Bitnob : tant que l'app n'a pas de comptes
    # utilisateurs, c'est limité au mode debug, ou à BITNOB_PAIEMENTS_PUBLICS avec
    # une clé sandbox (se désactive tout seul avec une vraie clé)
    if settings.DEBUG:
        return True
    return settings.BITNOB_PAIEMENTS_PUBLICS and "sandbox" in settings.BITNOB_CLIENT_SECRET


@require_GET
def whoami(request):
    """Vérifie que les clés API marchent. GET /payments/whoami/"""
    # En production, réservé aux admins : la réponse décrit le compte Bitnob
    if not (settings.DEBUG or request.user.is_staff):
        return erreur("Accès refusé", 403)
    try:
        return JsonResponse(bn.whoami())
    except bn.BitnobError as e:
        return erreur(e.data, e.status)


@csrf_exempt
@require_POST
def creer_adresse(request):
    """
    Génère une adresse de dépôt USDC. POST /payments/adresses/ {"reseau": "solana"}
    Pas de montant : l'adresse accepte n'importe quel dépôt.
    """
    data = lire_json(request)
    if data is None:
        return erreur("JSON invalide")
    reseau = str(data.get("reseau", "")).lower()
    if reseau not in RESEAUX_USDC:
        return erreur(f"Réseau non pris en charge : {', '.join(RESEAUX_USDC)}")

    reference = f"adr-{uuid.uuid4().hex[:12]}"
    try:
        reponse = bn.create_address(reseau, reference, label=f"Woolu {reference}")
    except bn.BitnobError as e:
        return erreur(e.data, e.status)

    infos = reponse.get("data", reponse)
    if not infos.get("address"):
        return erreur("Bitnob n'a pas renvoyé d'adresse", 502)
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
        return erreur("Adresse introuvable", 404)
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


@csrf_exempt
@require_POST
def envoyer_usdc(request):
    """
    Envoie des USDC depuis le solde Bitnob.
    POST /payments/envois/ {"adresse": "...", "reseau": "solana", "montant": "1.5", "reference": "pay-<uuid>"}
    La référence vient du frontend : un double clic n'envoie qu'une fois.
    """
    if not envois_autorises():
        return erreur("Envois désactivés en production.", 403)
    data = lire_json(request)
    if data is None:
        return erreur("JSON invalide")
    adresse = str(data.get("adresse", "")).strip()
    reseau = str(data.get("reseau", "")).lower()
    reference = str(data.get("reference", ""))
    try:
        montant = Decimal(str(data.get("montant", "")).replace(",", "."))
    except InvalidOperation:
        return erreur("Montant invalide")

    if reseau not in RESEAUX_USDC:
        return erreur(f"Réseau non pris en charge : {', '.join(RESEAUX_USDC)}")
    if not ADRESSE.match(adresse):
        return erreur("Adresse invalide")
    if not montant.is_finite() or montant <= 0 or montant.as_tuple().exponent < -6:
        return erreur("Montant invalide (6 décimales au plus)")
    if not REFERENCE_ENVOI.match(reference):
        return erreur("Référence d'envoi invalide")

    envoi, _ = EnvoiUsdc.objects.get_or_create(
        reference=reference,
        defaults={"adresse": adresse, "reseau": reseau, "montant": format(montant.normalize(), "f")},
    )
    try:
        # Plus petite unité : l'USDC a 6 décimales (1,5 USDC = "1500000")
        reponse = bn.withdraw(adresse, str(int(montant * 1_000_000)), "USDC", reseau, reference)
    except bn.BitnobError as e:
        envoi.statut = "failed"
        envoi.reponse = {"erreur": e.data}
        envoi.save()
        return erreur(e.data, e.status)

    envoi.statut = reponse.get("data", reponse).get("status", "pending")
    envoi.reponse = reponse
    envoi.save()
    log.info("Envoi USDC %s : %s USDC sur %s, %s", reference, envoi.montant, reseau, envoi.statut)
    return JsonResponse(
        {
            "reference": reference,
            "statut": envoi.statut,
            "montant": envoi.montant,
            "frais": FRAIS_ENVOI_USDC,
            "reseau": reseau,
        },
        status=201,
    )


@csrf_exempt  # Bitnob ne peut pas envoyer de jeton CSRF
@require_POST
def webhook_bitnob(request):
    """Reçoit les webhooks Bitnob. URL à donner à Bitnob : https://<domaine-api>/payments/webhooks/bitnob/"""
    # 1. Vérifier la signature sur le corps BRUT (request.body = octets reçus)
    if not bn.webhook_signature_is_valid(request.body, request.headers.get("x-bitnob-signature")):
        log.warning("Webhook Bitnob : signature invalide")
        return HttpResponse(status=401)

    payload = lire_json(request)
    if payload is None:
        return HttpResponse(status=400)
    event = payload.get("event") or ""
    data = payload.get("data", payload)  # certains événements mettent tout à la racine
    event_id = payload.get("event_id") or data.get("reference")
    if not event_id:
        log.warning("Webhook Bitnob sans event_id ni reference : %s", payload)
        return HttpResponse(status=200)  # inutile que Bitnob réessaie

    # 2. Ignorer les doublons (Bitnob peut renvoyer le même événement)
    _, cree = WebhookEvent.objects.get_or_create(event_id=event_id, defaults={"event": event, "payload": payload})
    if not cree:
        return HttpResponse(status=200)

    # 3. Dépôt reçu : la doc ne fixe ni le nom de l'événement ni les champs, on
    # reconnaît l'adresse ou notre référence (voir WebhookEvent dans l'admin)
    if "deposit" in event and event.endswith("success"):
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

    # 4. Envoi confirmé sur la blockchain
    if event == "transfer.success":
        EnvoiUsdc.objects.filter(reference=data.get("reference") or "").update(statut="completed")

    # 5. Toujours répondre 200, sinon Bitnob réessaie
    return HttpResponse(status=200)
