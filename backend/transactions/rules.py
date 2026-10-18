"""Qui peut faire quoi : copie de ACTION_RULES (frontend/src/features/transactions/domain/transitions.ts)."""

import re

from .models import EscrowStatus, Party, Status

# action -> (statut visé, statuts de départ autorisés pour chaque partie)
ACTION_RULES = {
    'send_to_client': (Status.PENDING_ACCEPTANCE, {Party.MERCHANT: (Status.CREATED,)}),
    'accept_terms': (Status.PENDING_PAYMENT, {Party.CLIENT: (Status.PENDING_ACCEPTANCE,)}),
    'refuse_terms': (Status.CANCELLED, {Party.CLIENT: (Status.PENDING_ACCEPTANCE,)}),
    'cancel': (
        Status.CANCELLED,
        {
            Party.MERCHANT: (Status.CREATED, Status.PENDING_ACCEPTANCE, Status.PENDING_PAYMENT),
            Party.CLIENT: (Status.PENDING_PAYMENT,),
        },
    ),
    'pay': (None, {Party.CLIENT: (Status.PENDING_PAYMENT,)}),
    'start_delivery': (Status.IN_PROGRESS, {Party.MERCHANT: (Status.PAYMENT_CONFIRMED,)}),
    'mark_delivered': (Status.AWAITING_CONFIRMATION, {Party.MERCHANT: (Status.IN_PROGRESS,)}),
    'confirm_receipt': (Status.COMPLETED, {Party.CLIENT: (Status.IN_PROGRESS, Status.AWAITING_CONFIRMATION)}),
    'open_dispute': (
        Status.DISPUTED,
        {Party.CLIENT: (Status.PAYMENT_CONFIRMED, Status.IN_PROGRESS, Status.AWAITING_CONFIRMATION)},
    ),
}


class ActionRefused(Exception):
    def __init__(self, message, forbidden=False):
        super().__init__(message)
        self.forbidden = forbidden


def normalize_phone(value):
    digits = re.sub(r'\D', '', value or '')
    return digits[3:] if digits.startswith('221') else digits


def party_of(transaction, user):
    """Rôle de l'utilisateur dans la transaction, ou None."""
    if transaction.merchant_id == user.id:
        return Party.MERCHANT
    if transaction.client_id == user.id:
        return Party.CLIENT
    return None


def check_action(action, transaction, user):
    """Lève ActionRefused avec un message affichable si l'action est interdite."""
    party = party_of(transaction, user)
    if party is None:
        raise ActionRefused("Vous n'êtes pas partie prenante de cette transaction.", forbidden=True)
    _, allowed_from = ACTION_RULES[action]
    if party not in allowed_from:
        raise ActionRefused("Cette action n'est pas disponible pour votre rôle.", forbidden=True)
    if transaction.status not in allowed_from[party]:
        raise ActionRefused("Cette action n'est pas possible dans l'état actuel de la transaction.")
    if action == 'confirm_receipt' and transaction.escrow_status != EscrowStatus.HELD:
        raise ActionRefused("Le séquestre des fonds n'est pas confirmé par le serveur.")
    return party


def needs_attention(transaction, user):
    """Une action autre que l'annulation attend l'utilisateur (tableau de bord)."""
    for action in ACTION_RULES:
        if action == 'cancel':
            continue
        try:
            check_action(action, transaction, user)
        except ActionRefused:
            continue
        return True
    return False
