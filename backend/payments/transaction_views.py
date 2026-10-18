import logging
import uuid
from decimal import Decimal, InvalidOperation, ROUND_CEILING

from django.conf import settings
from django.db import transaction as db_transaction
from django.db.models import Q
from django.http import Http404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from config.api_errors import error, exception_handler
from transactions.models import EventType, Party, Transaction
from transactions.rules import ActionRefused, check_action

from . import bitnob_client as bn
from .models import TransactionPaymentAttempt

log = logging.getLogger(__name__)
RESEAU_USDC = "solana"
PRECISION_USDC = Decimal("0.000001")


class PaymentInitiationSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=("usdc",))


def payment_json(attempt):
    transaction = attempt.transaction
    return {
        "id": str(attempt.id),
        "transactionId": str(transaction.id),
        "transactionReference": transaction.reference,
        "transactionTitle": transaction.title,
        "method": "usdc",
        "status": attempt.statut,
        "amount": {"amount": transaction.amount, "currency": transaction.currency},
        "deposit": {
            "address": attempt.adresse,
            "network": attempt.reseau,
            "amountUsdc": format(attempt.montant_usdc, "f"),
            "receivedUsdc": format(attempt.montant_recu_usdc, "f"),
            "reference": attempt.reference,
        },
        "createdAt": attempt.cree_le.isoformat(),
        "updatedAt": attempt.modifie_le.isoformat(),
        "confirmedAt": attempt.confirme_le.isoformat() if attempt.confirme_le else None,
        "failureReason": None,
        "isSimulated": attempt.sandbox,
    }


def visible_transactions(user):
    return Transaction.objects.filter(
        Q(merchant=user) | Q(client=user, sent_at__isnull=False)
    ).select_related("merchant", "client")


def get_visible_transaction(user, transaction_id):
    transaction = visible_transactions(user).filter(pk=transaction_id).first()
    if not transaction:
        raise Http404
    return transaction


def required_usdc_amount(amount_xof):
    rate_value = settings.BITNOB_XOF_PER_USDC
    try:
        rate = Decimal(str(rate_value))
    except (InvalidOperation, ValueError):
        return None
    if not rate.is_finite() or rate <= 0:
        return None
    try:
        amount = (Decimal(amount_xof) / rate).quantize(PRECISION_USDC, rounding=ROUND_CEILING)
    except InvalidOperation:
        return None
    if amount <= 0 or amount > Decimal("999999999999999999.999999"):
        return None
    return amount


class TransactionPaymentApiView(APIView):
    def get_exception_handler(self):
        return exception_handler


class TransactionPaymentsView(TransactionPaymentApiView):
    def get(self, request, pk):
        transaction = get_visible_transaction(request.user, pk)
        attempts = transaction.payment_attempts.all()
        return Response([payment_json(attempt) for attempt in attempts])

    def post(self, request, pk):
        serializer = PaymentInitiationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transaction = get_visible_transaction(request.user, pk)

        try:
            check_action("pay", transaction, request.user)
        except ActionRefused as exc:
            code = "FORBIDDEN" if exc.forbidden else "INVALID_TRANSITION"
            code_status = status.HTTP_403_FORBIDDEN if exc.forbidden else status.HTTP_409_CONFLICT
            return error(code, str(exc), code_status)

        amount_usdc = required_usdc_amount(transaction.amount)
        if amount_usdc is None:
            return error(
                "SERVER",
                "Le taux BITNOB_XOF_PER_USDC est absent ou invalide ; le paiement est indisponible.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if not settings.BITNOB_CLIENT_ID or not settings.BITNOB_CLIENT_SECRET:
            return error(
                "SERVER",
                "Les identifiants API Bitnob ne sont pas configurés.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            with db_transaction.atomic():
                transaction = visible_transactions(request.user).select_for_update().filter(
                    pk=pk
                ).first()
                if not transaction:
                    raise Http404
                try:
                    check_action("pay", transaction, request.user)
                except ActionRefused as exc:
                    code = "FORBIDDEN" if exc.forbidden else "INVALID_TRANSITION"
                    code_status = status.HTTP_403_FORBIDDEN if exc.forbidden else status.HTTP_409_CONFLICT
                    return error(code, str(exc), code_status)

                pending = transaction.payment_attempts.filter(
                    statut=TransactionPaymentAttempt.Statut.EN_ATTENTE
                ).exists()
                if pending:
                    return error(
                        "CONFLICT",
                        "Une adresse de paiement est déjà active pour cette transaction.",
                        status.HTTP_409_CONFLICT,
                    )

                reference = f"pay-{uuid.uuid4().hex}"
                try:
                    response = bn.create_address(
                        RESEAU_USDC, reference, label=f"Woolu {transaction.reference}"
                    )
                except bn.BitnobError as exc:
                    log.warning(
                        "Bitnob refuse la création du dépôt (HTTP %s, code=%s)",
                        exc.status,
                        bn.provider_error_code(exc.data),
                    )
                    return error(
                        "SERVER",
                        "Bitnob n’a pas pu créer l’adresse de paiement.",
                        status.HTTP_502_BAD_GATEWAY,
                    )

                details = response.get("data", response)
                address = details.get("address") if isinstance(details, dict) else None
                if not address:
                    return error(
                        "SERVER",
                        "Bitnob n’a pas renvoyé d’adresse de paiement.",
                        status.HTTP_502_BAD_GATEWAY,
                    )

                attempt = TransactionPaymentAttempt.objects.create(
                    id=uuid.uuid4(),
                    transaction=transaction,
                    reference=reference,
                    reseau=RESEAU_USDC,
                    adresse=str(address),
                    bitnob_id=str(details.get("id", ""))[:64],
                    montant_usdc=amount_usdc,
                    sandbox="sandbox" in settings.BITNOB_CLIENT_SECRET.lower(),
                )
                transaction.log(EventType.PAYMENT_INITIATED, Party.CLIENT, request.user)
        except Http404:
            raise

        return Response(payment_json(attempt), status=status.HTTP_201_CREATED)


class PaymentHistoryView(TransactionPaymentApiView):
    def get(self, request):
        attempts = TransactionPaymentAttempt.objects.filter(
            transaction__in=visible_transactions(request.user)
        ).select_related("transaction")
        return Response([payment_json(attempt) for attempt in attempts])


class PaymentAttemptView(TransactionPaymentApiView):
    def get(self, request, attempt_id):
        attempt = (
            TransactionPaymentAttempt.objects.filter(
                transaction__in=visible_transactions(request.user)
            )
            .select_related("transaction")
            .filter(pk=attempt_id)
            .first()
        )
        if not attempt:
            raise Http404
        return Response(payment_json(attempt))
