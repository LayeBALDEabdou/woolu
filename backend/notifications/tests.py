from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Role

from .models import Notification, NotificationPreferences

User = get_user_model()


def create_user(email, role):
    user = User.objects.create_user(
        username=email,
        email=email,
        password='Mot2passe-Solide!42',
        first_name=email.split('@')[0],
    )
    user.account_profile.role = role
    user.account_profile.email_verified = True
    user.account_profile.save()
    return user


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.merchant = create_user('merchant@test.com', Role.VENDEUR)
        self.client_user = create_user('client@test.com', Role.CLIENT)

    def transaction_data(self):
        return {
            'title': 'Table en bois',
            'kind': 'product',
            'description': 'Table 6 places',
            'clientName': 'Client',
            'clientContact': self.client_user.email,
            'amount': 50000,
            'currency': 'XOF',
            'deadline': (timezone.localdate() + timedelta(days=10)).isoformat(),
            'merchantAcceptsTerms': True,
        }

    def test_envoi_transaction_cree_notification_pour_le_client(self):
        self.client.force_authenticate(self.merchant)
        created = self.client.post('/api/transactions', self.transaction_data(), format='json')
        self.assertEqual(created.status_code, 201)
        transaction_id = created.data['id']
        sent = self.client.post(f'/api/transactions/{transaction_id}/send', {}, format='json')
        self.assertEqual(sent.status_code, 200)

        self.client.force_authenticate(self.client_user)
        response = self.client.get('/api/notifications')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        notification = response.data[0]
        self.assertEqual(notification['type'], 'transaction_proposed')
        self.assertEqual(notification['transactionId'], transaction_id)
        self.assertEqual(notification['params']['reference'], created.data['reference'])
        self.assertEqual(notification['params']['title'], 'Table en bois')
        self.assertEqual(notification['params']['counterpartName'], 'merchant')
        self.assertEqual(notification['params']['amount'], '50 000 F CFA')
        self.assertIsNone(notification['readAt'])

    def test_notifications_personnelles_marquer_lu_et_preferences(self):
        notification = Notification.objects.create(
            user=self.client_user,
            type=Notification.Type.TRANSACTION_PROPOSED,
            params={'title': 'Table'},
        )
        self.client.force_authenticate(self.client_user)

        preferences = self.client.get('/api/notifications/preferences')
        self.assertEqual(preferences.status_code, 200)
        self.assertEqual(preferences.data['channels'], {
            'in_app': True, 'email': True, 'sms': False, 'voice': False,
        })
        updated = self.client.put(
            '/api/notifications/preferences',
            {
                'channels': {'in_app': True, 'email': False, 'sms': True, 'voice': False},
                'categories': {'transactions': True, 'payments': False, 'disputes': True},
                'locale': 'fr',
            },
            format='json',
        )
        self.assertEqual(updated.status_code, 200)
        self.assertFalse(updated.data['channels']['email'])
        self.assertFalse(updated.data['categories']['payments'])

        read = self.client.post(f'/api/notifications/{notification.id}/read', {}, format='json')
        self.assertEqual(read.status_code, 204)
        notification.refresh_from_db()
        self.assertIsNotNone(notification.read_at)
        self.assertEqual(
            self.client.post('/api/notifications/read-all', {}, format='json').status_code,
            204,
        )

    def test_notification_non_accessible_aux_autres_comptes(self):
        notification = Notification.objects.create(
            user=self.client_user,
            type=Notification.Type.TRANSACTION_PROPOSED,
        )
        self.client.force_authenticate(self.merchant)
        response = self.client.post(f'/api/notifications/{notification.id}/read', {}, format='json')
        self.assertEqual(response.status_code, 404)
        notification.refresh_from_db()
        self.assertIsNone(notification.read_at)

    def test_preferences_refusent_de_desactiver_les_notifications_in_app(self):
        self.client.force_authenticate(self.client_user)
        response = self.client.put(
            '/api/notifications/preferences',
            {
                'channels': {'in_app': False, 'email': True, 'sms': False, 'voice': False},
                'categories': {'transactions': True, 'payments': True, 'disputes': True},
                'locale': 'fr',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(NotificationPreferences.objects.filter(user=self.client_user).exists())
