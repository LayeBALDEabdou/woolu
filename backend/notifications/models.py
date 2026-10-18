from django.conf import settings
from django.db import models


def default_channels():
    return {'in_app': True, 'email': True, 'sms': False, 'voice': False}


def default_categories():
    return {'transactions': True, 'payments': True, 'disputes': True}


class Notification(models.Model):
    class Type(models.TextChoices):
        TRANSACTION_PROPOSED = 'transaction_proposed', 'Nouvelle proposition'
        TERMS_ACCEPTED = 'terms_accepted', 'Conditions acceptées'
        TERMS_REFUSED = 'terms_refused', 'Conditions refusées'
        TRANSACTION_CANCELLED = 'transaction_cancelled', 'Transaction annulée'
        PAYMENT_CONFIRMED = 'payment_confirmed', 'Paiement confirmé'
        PAYMENT_FAILED = 'payment_failed', 'Échec du paiement'
        PAYMENT_EXPIRED = 'payment_expired', 'Paiement expiré'
        DELIVERY_STARTED = 'delivery_started', 'Livraison démarrée'
        DELIVERY_COMPLETED = 'delivery_completed', 'Livraison terminée'
        RECEIPT_CONFIRMED = 'receipt_confirmed', 'Réception confirmée'
        DISPUTE_OPENED = 'dispute_opened', 'Réclamation ouverte'
        DISPUTE_MESSAGE = 'dispute_message', 'Message de réclamation'
        DISPUTE_STATUS_CHANGED = 'dispute_status_changed', 'Réclamation mise à jour'
        DISPUTE_RESOLVED = 'dispute_resolved', 'Réclamation résolue'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    type = models.CharField(max_length=32, choices=Type.choices)
    params = models.JSONField(default=dict, blank=True)
    transaction = models.ForeignKey(
        'transactions.Transaction',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
    )
    dispute_id = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at', '-id']


class NotificationPreferences(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notification_preferences'
    )
    channels = models.JSONField(default=default_channels)
    categories = models.JSONField(default=default_categories)
    locale = models.CharField(max_length=2, default='fr', choices=[('fr', 'Français'), ('wo', 'Wolof')])


def notification_json(notification):
    return {
        'id': str(notification.id),
        'type': notification.type,
        'params': notification.params,
        'transactionId': str(notification.transaction_id) if notification.transaction_id else None,
        'disputeId': str(notification.dispute_id) if notification.dispute_id else None,
        'createdAt': notification.created_at.isoformat().replace('+00:00', 'Z'),
        'readAt': notification.read_at.isoformat().replace('+00:00', 'Z') if notification.read_at else None,
    }
