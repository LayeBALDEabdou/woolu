from datetime import timedelta

from django.db import transaction as db_transaction
from django.db.models import Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role
from config.api_errors import error
from config.api_errors import exception_handler as api_exception_handler

from .models import EscrowStatus, EventType, Party, Status, Transaction, TransitionError
from .rules import ACTION_RULES, ActionRefused, check_action, needs_attention, normalize_phone
from .serializers import (
    CompleteDeliverySerializer,
    CreateTransactionSerializer,
    ReasonSerializer,
    StartDeliverySerializer,
    event_json,
    summary_json,
    transaction_json,
)

MERCHANT_ROLES = (Role.VENDEUR, Role.PRESTATAIRE)
PERIOD_DAYS = {'7d': 7, '30d': 30, '90d': 90}
SORTS = {
    'created_desc': ('-created_at',),
    'created_asc': ('created_at',),
    'amount_desc': ('-amount', '-created_at'),
    'amount_asc': ('amount', '-created_at'),
    'deadline_asc': ('deadline', '-created_at'),
}


def exception_handler(exc, context):
    if isinstance(exc, ActionRefused):
        if exc.forbidden:
            return error('FORBIDDEN', str(exc), status.HTTP_403_FORBIDDEN)
        return error('INVALID_TRANSITION', str(exc), status.HTTP_409_CONFLICT)
    if isinstance(exc, TransitionError):
        return error('INVALID_TRANSITION', str(exc), status.HTTP_409_CONFLICT)
    if isinstance(exc, Http404):
        return error('NOT_FOUND', 'Transaction introuvable.', status.HTTP_404_NOT_FOUND)
    return api_exception_handler(exc, context)


def claim_invitations(user):
    """Rattache au compte les demandes adressées à son email ou son téléphone avant son inscription."""
    match = Q(client_email__iexact=user.email) if user.email else Q(pk__in=[])
    phone = normalize_phone(getattr(getattr(user, 'account_profile', None), 'phone_number', ''))
    if phone:
        match |= Q(client_phone_key=phone)
    Transaction.objects.filter(match, client__isnull=True).exclude(merchant=user).update(client=user)


def visible_to(user):
    # Le client ne voit pas un brouillon que le vendeur ne lui a pas encore envoyé
    return (
        Transaction.objects.filter(Q(merchant=user) | Q(client=user, sent_at__isnull=False))
        .select_related('merchant__account_profile', 'client__account_profile')
    )


class TransactionApiView(APIView):
    def get_exception_handler(self):
        return exception_handler

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        claim_invitations(request.user)

    def get_transaction(self, pk, lock=False):
        queryset = visible_to(self.request.user)
        if lock:
            # Verrouillée en base pour que deux actions ne se croisent pas
            queryset = queryset.select_for_update(of=('self',))
        return get_object_or_404(queryset, pk=pk)

    def detail(self, transaction):
        return Response(transaction_json(transaction))


class TransactionListView(TransactionApiView):
    def get(self, request):
        params = request.query_params
        queryset = visible_to(request.user)
        if params.get('status') and params['status'] != 'all':
            queryset = queryset.filter(status=params['status'])
        if params.get('period') in PERIOD_DAYS:
            queryset = queryset.filter(created_at__gte=timezone.now() - timedelta(days=PERIOD_DAYS[params['period']]))
        search = params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search)
                | Q(title__icontains=search)
                | Q(client_name__icontains=search)
                | Q(merchant__first_name__icontains=search)
                | Q(merchant__last_name__icontains=search)
                | Q(merchant__email__icontains=search)
            )
        queryset = queryset.order_by(*SORTS.get(params.get('sort'), SORTS['created_desc']))

        page = max(1, to_int(params.get('page'), 1))
        page_size = min(50, max(1, to_int(params.get('pageSize'), 10)))
        start = (page - 1) * page_size
        return Response(
            {
                'items': [summary_json(t) for t in queryset[start : start + page_size]],
                'page': page,
                'pageSize': page_size,
                'total': queryset.count(),
            }
        )

    def post(self, request):
        profile = getattr(request.user, 'account_profile', None)
        if not profile or profile.role not in MERCHANT_ROLES:
            raise exceptions.PermissionDenied('Seuls les vendeurs et prestataires peuvent proposer une transaction.')
        serializer = CreateTransactionSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        transaction = serializer.save()
        transaction.log(EventType.CREATED, Party.MERCHANT, request.user)
        return Response(transaction_json(transaction), status=status.HTTP_201_CREATED)


def to_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class TransactionDetailView(TransactionApiView):
    def get(self, request, pk):
        return self.detail(self.get_transaction(pk))


class PartyActionView(TransactionApiView):
    """Envoi, acceptation, refus, annulation : un simple changement de statut."""

    action = None
    event = None

    def post(self, request, pk):
        reason = ReasonSerializer(data=request.data or {})
        reason.is_valid(raise_exception=True)
        with db_transaction.atomic():
            transaction = self.get_transaction(pk, lock=True)
            party = check_action(self.action, transaction, request.user)
            now = timezone.now()
            if self.action == 'send_to_client':
                transaction.sent_at = now
            if self.action == 'accept_terms':
                transaction.client_accepted_at = now
            to, _ = ACTION_RULES[self.action]
            transaction.move_to(to, self.event, party, request.user, reason.validated_data.get('reason'))
        return self.detail(transaction)


class SendView(PartyActionView):
    action, event = 'send_to_client', EventType.SENT_TO_CLIENT


class AcceptView(PartyActionView):
    action, event = 'accept_terms', EventType.TERMS_ACCEPTED


class RefuseView(PartyActionView):
    action, event = 'refuse_terms', EventType.TERMS_REFUSED


class CancelView(PartyActionView):
    action, event = 'cancel', EventType.CANCELLED


class StartDeliveryView(TransactionApiView):
    def post(self, request, pk):
        data = StartDeliverySerializer(data=request.data)
        data.is_valid(raise_exception=True)
        data = data.validated_data
        with db_transaction.atomic():
            transaction = self.get_transaction(pk, lock=True)
            check_action('start_delivery', transaction, request.user)
            transaction.delivery_method = data['method']
            transaction.delivery_carrier = data.get('carrier') or ''
            transaction.delivery_tracking_number = data.get('trackingNumber') or ''
            transaction.delivery_note = data.get('note') or ''
            transaction.delivery_started_at = timezone.now()
            transaction.move_to(
                Status.IN_PROGRESS, EventType.DELIVERY_STARTED, Party.MERCHANT, request.user, data.get('note')
            )
        return self.detail(transaction)


class CompleteDeliveryView(TransactionApiView):
    def post(self, request, pk):
        data = CompleteDeliverySerializer(data=request.data or {})
        data.is_valid(raise_exception=True)
        note = data.validated_data.get('note')
        with db_transaction.atomic():
            transaction = self.get_transaction(pk, lock=True)
            check_action('mark_delivered', transaction, request.user)
            if not transaction.delivery_started_at:
                raise TransitionError("Aucune livraison n'a été démarrée.")
            transaction.delivery_completed_at = timezone.now()
            transaction.delivery_completion_note = note or ''
            transaction.move_to(
                Status.AWAITING_CONFIRMATION, EventType.DELIVERY_COMPLETED, Party.MERCHANT, request.user, note
            )
        return self.detail(transaction)


class ConfirmReceiptView(TransactionApiView):
    def post(self, request, pk):
        with db_transaction.atomic():
            transaction = self.get_transaction(pk, lock=True)
            check_action('confirm_receipt', transaction, request.user)
            transaction.confirm_receipt(request.user)
        return self.detail(transaction)


class DashboardSummaryView(TransactionApiView):
    def get(self, request):
        mine = list(visible_to(request.user).prefetch_related('events'))

        def count(*statuses):
            return sum(1 for t in mine if t.status in statuses)

        held = [t for t in mine if t.escrow_status == EscrowStatus.HELD]
        attention = sorted((t for t in mine if needs_attention(t, request.user)), key=lambda t: t.deadline)
        activity = sorted(
            (
                {
                    'id': f'{t.id}:{event.id}',
                    'transactionId': str(t.id),
                    'transactionReference': t.reference,
                    'transactionTitle': t.title,
                    'event': event_json(t, event),
                }
                for t in mine
                for event in t.events.all()
            ),
            key=lambda item: item['event']['at'],
            reverse=True,
        )
        return Response(
            {
                'totalCount': len(mine),
                'pendingCount': count(Status.CREATED, Status.PENDING_ACCEPTANCE, Status.PENDING_PAYMENT),
                'inProgressCount': count(Status.PAYMENT_CONFIRMED, Status.IN_PROGRESS, Status.AWAITING_CONFIRMATION),
                'completedCount': count(Status.COMPLETED),
                'openDisputesCount': count(Status.DISPUTED),
                'fundsHeld': {'amount': sum(t.amount for t in held), 'currency': 'XOF'},
                'fundsHeldCount': len(held),
                'needsAttention': [summary_json(t) for t in attention[:5]],
                'recentActivity': activity[:8],
            }
        )
