from .models import Notification, NotificationPreferences, default_categories


def create_transaction_proposed_notification(transaction):
    if not transaction.client_id:
        return
    preferences = NotificationPreferences.objects.filter(user_id=transaction.client_id).first()
    categories = preferences.categories if preferences else default_categories()
    if not categories.get('transactions', True):
        return
    merchant = transaction.merchant
    Notification.objects.create(
        user_id=transaction.client_id,
        type=Notification.Type.TRANSACTION_PROPOSED,
        transaction=transaction,
        params={
            'reference': transaction.reference,
            'title': transaction.title,
            'counterpartName': merchant.get_full_name() or merchant.email,
            'amount': f'{transaction.amount:,}'.replace(',', ' ') + ' F CFA'
            if transaction.currency == 'XOF'
            else f'{transaction.amount:,} {transaction.currency}'.replace(',', ' '),
        },
    )
