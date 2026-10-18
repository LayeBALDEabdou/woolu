"""Entrées et sorties au format du frontend (camelCase, voir frontend/src/features/transactions/types.ts)."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import DeliveryMethod, Kind, Party, Transaction
from .rules import normalize_phone

MIN_AMOUNT = 1_000
MAX_AMOUNT = 10_000_000
MAX_DEADLINE_DAYS = 180
CLAIM_WINDOW_DAYS = (3, 7, 14)

User = get_user_model()


def iso(value):
    return value.isoformat().replace('+00:00', 'Z') if value else None


def full_name(user):
    return user.get_full_name() or user.email


def user_party(user):
    profile = getattr(user, 'account_profile', None)
    return {
        'userId': str(user.id),
        'fullName': full_name(user),
        'email': user.email or None,
        'phone': (profile.phone_number if profile else '') or None,
        'role': profile.role if profile else 'client',
    }


def client_party(transaction):
    if transaction.client_id:
        return user_party(transaction.client)
    # Pas encore de compte Wóolu : invitation en attente
    return {
        'userId': None,
        'fullName': transaction.client_name,
        'email': transaction.client_email or None,
        'phone': transaction.client_phone or None,
        'role': 'client',
    }


def event_json(transaction, event):
    names = {Party.MERCHANT: full_name(transaction.merchant), Party.CLIENT: client_party(transaction)['fullName']}
    return {
        'id': str(event.id),
        'type': event.type,
        'at': iso(event.at),
        'actor': event.actor,
        'actorName': names.get(event.actor),
        'note': event.note or None,
    }


def summary_json(transaction):
    return {
        'id': str(transaction.id),
        'reference': transaction.reference,
        'title': transaction.title,
        'kind': transaction.kind,
        'amount': {'amount': transaction.amount, 'currency': transaction.currency},
        'status': transaction.status,
        'merchant': user_party(transaction.merchant),
        'client': client_party(transaction),
        'deadline': transaction.deadline.isoformat(),
        'createdAt': iso(transaction.created_at),
        'updatedAt': iso(transaction.updated_at),
        'escrow': {'status': transaction.escrow_status, 'updatedAt': iso(transaction.escrow_updated_at)},
        # Les réclamations ne sont pas encore gérées par le backend
        'activeDisputeId': None,
    }


def transaction_json(transaction):
    delivery = None
    if transaction.delivery_started_at:
        delivery = {
            'method': transaction.delivery_method,
            'carrier': transaction.delivery_carrier or None,
            'trackingNumber': transaction.delivery_tracking_number or None,
            'note': transaction.delivery_note or None,
            'startedAt': iso(transaction.delivery_started_at),
            'completedAt': iso(transaction.delivery_completed_at),
            'completionNote': transaction.delivery_completion_note or None,
        }
    return {
        **summary_json(transaction),
        'description': transaction.description,
        'specialConditions': transaction.special_conditions or None,
        'claimWindowDays': transaction.claim_window_days,
        'merchantAcceptedAt': iso(transaction.merchant_accepted_at),
        'clientAcceptedAt': iso(transaction.client_accepted_at),
        'delivery': delivery,
        'disputeIds': [],
        'events': [event_json(transaction, event) for event in transaction.events.all()],
    }


class CreateTransactionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=120)
    kind = serializers.ChoiceField(choices=Kind.choices)
    description = serializers.CharField()
    clientName = serializers.CharField(max_length=150)
    clientContact = serializers.CharField(max_length=254)
    amount = serializers.IntegerField(min_value=MIN_AMOUNT, max_value=MAX_AMOUNT)
    currency = serializers.ChoiceField(choices=['XOF'], default='XOF')
    deadline = serializers.DateField()
    specialConditions = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    claimWindowDays = serializers.ChoiceField(choices=CLAIM_WINDOW_DAYS, default=7)
    merchantAcceptsTerms = serializers.BooleanField()

    def validate_deadline(self, value):
        today = timezone.localdate()
        if not today <= value <= today + timedelta(days=MAX_DEADLINE_DAYS):
            raise serializers.ValidationError(
                f"La date limite doit être comprise entre aujourd'hui et {MAX_DEADLINE_DAYS} jours."
            )
        return value

    def validate_merchantAcceptsTerms(self, value):
        if value is not True:
            raise serializers.ValidationError('Vous devez accepter les conditions que vous proposez.')
        return value

    def validate(self, attrs):
        contact = attrs['clientContact'].strip()
        attrs['client'] = self.find_client(contact)
        if attrs['client'] == self.context['request'].user:
            raise serializers.ValidationError({'clientContact': "Indiquez les coordonnées d'une autre personne."})
        return attrs

    def find_client(self, contact):
        if '@' in contact:
            return User.objects.filter(email__iexact=contact).first()
        phone = normalize_phone(contact)
        if not phone:
            return None
        candidates = User.objects.filter(account_profile__phone_number__endswith=phone)
        return next((u for u in candidates if normalize_phone(u.account_profile.phone_number) == phone), None)

    def create(self, data):
        contact = data['clientContact'].strip()
        is_email = '@' in contact
        return Transaction.objects.create(
            merchant=self.context['request'].user,
            client=data['client'],
            client_name=data['clientName'].strip(),
            client_email=contact.lower() if is_email else '',
            client_phone='' if is_email else contact,
            client_phone_key='' if is_email else normalize_phone(contact),
            title=data['title'].strip(),
            kind=data['kind'],
            description=data['description'].strip(),
            special_conditions=(data.get('specialConditions') or '').strip(),
            amount=data['amount'],
            currency=data['currency'],
            deadline=data['deadline'],
            claim_window_days=data['claimWindowDays'],
            merchant_accepted_at=timezone.now(),
        )


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=500)


class StartDeliverySerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=DeliveryMethod.choices)
    carrier = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=120)
    trackingNumber = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=120)
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=1000)


class CompleteDeliverySerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=1000)
