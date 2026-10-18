import secrets
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Kind(models.TextChoices):
    PRODUCT = 'product', 'Produit'
    SERVICE = 'service', 'Service'


class Status(models.TextChoices):
    CREATED = 'created', 'Créée'
    PENDING_ACCEPTANCE = 'pending_acceptance', "En attente d'acceptation du client"
    PENDING_PAYMENT = 'pending_payment', 'En attente de paiement'
    PAYMENT_CONFIRMED = 'payment_confirmed', 'Paiement confirmé, fonds bloqués'
    IN_PROGRESS = 'in_progress', 'Livraison ou prestation en cours'
    AWAITING_CONFIRMATION = 'awaiting_confirmation', 'Livrée, en attente de confirmation du client'
    DISPUTED = 'disputed', 'En litige'
    COMPLETED = 'completed', 'Terminée, fonds libérés'
    CANCELLED = 'cancelled', 'Annulée'
    REFUNDED = 'refunded', 'Remboursée'


# Même graphe que le frontend (features/transactions/domain/transitions.ts)
TRANSITIONS = {
    Status.CREATED: (Status.PENDING_ACCEPTANCE, Status.CANCELLED),
    Status.PENDING_ACCEPTANCE: (Status.PENDING_PAYMENT, Status.CANCELLED),
    Status.PENDING_PAYMENT: (Status.PAYMENT_CONFIRMED, Status.CANCELLED),
    Status.PAYMENT_CONFIRMED: (Status.IN_PROGRESS, Status.DISPUTED),
    Status.IN_PROGRESS: (Status.AWAITING_CONFIRMATION, Status.COMPLETED, Status.DISPUTED),
    Status.AWAITING_CONFIRMATION: (Status.COMPLETED, Status.DISPUTED),
    Status.DISPUTED: (Status.COMPLETED, Status.REFUNDED),
    Status.COMPLETED: (),
    Status.CANCELLED: (),
    Status.REFUNDED: (),
}


class EscrowStatus(models.TextChoices):
    NOT_STARTED = 'not_started', 'Pas encore payé'
    HELD = 'held', 'Fonds bloqués'
    RELEASED = 'released', 'Fonds libérés au vendeur'
    REFUNDED = 'refunded', 'Fonds rendus au client'


class Party(models.TextChoices):
    MERCHANT = 'merchant', 'Vendeur / prestataire'
    CLIENT = 'client', 'Client'
    SYSTEM = 'system', 'Système'


class DeliveryMethod(models.TextChoices):
    HAND_DELIVERY = 'hand_delivery', 'Remise en main propre'
    COURIER = 'courier', 'Coursier'
    CARRIER = 'carrier', 'Transporteur'
    ON_SITE = 'on_site', 'Sur place'
    REMOTE = 'remote', 'À distance'


class EventType(models.TextChoices):
    CREATED = 'created', 'Créée'
    SENT_TO_CLIENT = 'sent_to_client', 'Envoyée au client'
    TERMS_ACCEPTED = 'terms_accepted', 'Conditions acceptées'
    TERMS_REFUSED = 'terms_refused', 'Conditions refusées'
    CANCELLED = 'cancelled', 'Annulée'
    PAYMENT_INITIATED = 'payment_initiated', 'Paiement lancé'
    PAYMENT_FAILED = 'payment_failed', 'Paiement échoué'
    PAYMENT_EXPIRED = 'payment_expired', 'Paiement expiré'
    PAYMENT_CONFIRMED = 'payment_confirmed', 'Paiement confirmé'
    ESCROW_HELD = 'escrow_held', 'Fonds bloqués'
    DELIVERY_STARTED = 'delivery_started', 'Livraison commencée'
    DELIVERY_COMPLETED = 'delivery_completed', 'Livraison terminée'
    RECEIPT_CONFIRMED = 'receipt_confirmed', 'Réception confirmée'
    DISPUTE_OPENED = 'dispute_opened', 'Litige ouvert'
    DISPUTE_RESOLVED = 'dispute_resolved', 'Litige résolu'
    FUNDS_RELEASED = 'funds_released', 'Fonds libérés'
    REFUNDED = 'refunded', 'Remboursée'


class TransitionError(Exception):
    """Changement de statut refusé dans l'état actuel de la transaction."""


def generate_reference():
    return f'WL-{secrets.token_hex(4).upper()}'


class Transaction(models.Model):
    """Paiement sous séquestre entre un vendeur / prestataire et son client."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True, default=generate_reference, editable=False)
    merchant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='sales'
    )
    # Retrouvé par email ou téléphone à la création, ou dès qu'il se connecte avec un compte correspondant
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='purchases',
        null=True,
        blank=True,
    )
    client_name = models.CharField(max_length=150)
    client_email = models.EmailField(blank=True)
    client_phone = models.CharField(max_length=20, blank=True)
    client_phone_key = models.CharField(max_length=20, blank=True, db_index=True)  # chiffres sans indicatif

    title = models.CharField(max_length=120)
    kind = models.CharField(max_length=10, choices=Kind.choices)
    description = models.TextField()
    special_conditions = models.TextField(blank=True)
    amount = models.PositiveBigIntegerField()  # en unités entières de la devise (XOF n'a pas de centimes)
    currency = models.CharField(max_length=3, default='XOF')
    deadline = models.DateField()
    claim_window_days = models.PositiveSmallIntegerField(default=7)

    status = models.CharField(max_length=30, choices=Status.choices, default=Status.CREATED)
    escrow_status = models.CharField(
        max_length=20, choices=EscrowStatus.choices, default=EscrowStatus.NOT_STARTED
    )
    escrow_updated_at = models.DateTimeField(null=True, blank=True)

    delivery_method = models.CharField(max_length=20, choices=DeliveryMethod.choices, blank=True)
    delivery_carrier = models.CharField(max_length=120, blank=True)
    delivery_tracking_number = models.CharField(max_length=120, blank=True)
    delivery_note = models.TextField(blank=True)
    delivery_started_at = models.DateTimeField(null=True, blank=True)
    delivery_completed_at = models.DateTimeField(null=True, blank=True)
    delivery_completion_note = models.TextField(blank=True)

    merchant_accepted_at = models.DateTimeField(null=True, blank=True)
    # Le client ne voit pas un brouillon que le vendeur ne lui a pas encore envoyé
    sent_at = models.DateTimeField(null=True, blank=True)
    client_accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reference} {self.title} ({self.status})'

    def log(self, type, actor, user=None, note=''):
        self.events.create(type=type, actor=actor, actor_user=user, note=note or '')

    def move_to(self, status, event, actor, user=None, note=''):
        if status not in TRANSITIONS[self.status]:
            raise TransitionError(f'Transition refusée : {self.status} → {status}.')
        self.status = status
        self.save()
        self.log(event, actor, user, note)

    def set_escrow(self, escrow_status):
        self.escrow_status = escrow_status
        self.escrow_updated_at = timezone.now()
        self.save()

    def confirm_payment(self):
        """Fonds reçus par Bitnob : à appeler depuis le webhook de paiement."""
        self.move_to(Status.PAYMENT_CONFIRMED, EventType.PAYMENT_CONFIRMED, Party.SYSTEM)
        self.set_escrow(EscrowStatus.HELD)
        self.log(EventType.ESCROW_HELD, Party.SYSTEM)

    def confirm_receipt(self, user):
        """Le client confirme la réception : les fonds sont libérés au vendeur."""
        if self.escrow_status != EscrowStatus.HELD:
            raise TransitionError("Le séquestre des fonds n'est pas confirmé par le serveur.")
        self.move_to(Status.COMPLETED, EventType.RECEIPT_CONFIRMED, Party.CLIENT, user)
        self.set_escrow(EscrowStatus.RELEASED)
        # Le payout Bitnob vers le Wave ou le compte bancaire du vendeur viendra ici
        self.log(EventType.FUNDS_RELEASED, Party.SYSTEM)


class TransactionEvent(models.Model):
    """Journal des étapes d'une transaction, affiché dans le suivi."""

    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='events')
    type = models.CharField(max_length=30, choices=EventType.choices)
    actor = models.CharField(max_length=10, choices=Party.choices)
    actor_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    note = models.TextField(blank=True)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['at', 'id']

    def __str__(self):
        return f'{self.transaction.reference} {self.type}'
