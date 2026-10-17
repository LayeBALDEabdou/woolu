import json
import logging
import uuid

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import bitnob_client as bn
from .models import Commande, WebhookEvent

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

    return JsonResponse({"reference": reference, "facture": facture}, status=201)


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

    # 4. Toujours répondre 200, sinon Bitnob réessaie
    return HttpResponse(status=200)
