from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import RequestFactory
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from .models import Role
from .permissions import IsAdmin, IsClient, IsPrestataire

User = get_user_model()
PASSWORD = 'Mot2passe-Solide!42'


class AccountTests(APITestCase):
    def setUp(self):
        cache.clear()

    def register(self, email='a@test.com', role='client', password=PASSWORD, **extra):
        return self.client.post(
            '/api/auth/register/',
            {'email': email, 'password': password, 'role': role, **extra},
            format='json',
        )

    def login(self, email='a@test.com', password=PASSWORD):
        return self.client.post(
            '/api/auth/login/',
            {'email': email, 'password': password},
            format='json',
        )

    def authenticate(self, email='a@test.com', role='client'):
        self.register(email=email, role=role)
        tokens = self.login(email=email).data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        return tokens

    def test_registers_client_and_provider_without_exposing_password(self):
        client = self.register('client@test.com', 'client')
        provider = self.register('provider@test.com', 'prestataire', phone_number='+221771234567')

        self.assertEqual(client.status_code, 201)
        self.assertEqual(client.data['role'], Role.CLIENT)
        self.assertNotIn('password', client.data)
        self.assertEqual(provider.status_code, 201)
        self.assertEqual(provider.data['role'], Role.PRESTATAIRE)
        self.assertEqual(provider.data['phone_number'], '+221771234567')

    def test_registration_rejects_admin_role(self):
        response = self.register(role='admin')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email='a@test.com').exists())

    def test_email_is_normalized_and_case_insensitive_for_duplicates(self):
        self.assertEqual(self.register('Moi@test.com').status_code, 201)

        duplicate = self.register('moi@TEST.com')
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(User.objects.filter(email__iexact='moi@test.com').count(), 1)

    def test_weak_password_is_rejected(self):
        self.assertEqual(self.register(password='12345678').status_code, 400)

    def test_login_returns_tokens_and_role_claim(self):
        self.register(role='prestataire')

        response = self.login(email='A@TEST.COM')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['role'], Role.PRESTATAIRE)
        self.assertEqual(AccessToken(response.data['access'])['role'], Role.PRESTATAIRE)

    def test_login_rejects_wrong_password(self):
        self.register()
        self.assertEqual(self.login(password='incorrect-password').status_code, 401)

    def test_profile_requires_authentication_and_role_is_read_only(self):
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.authenticate()

        response = self.client.patch(
            '/api/auth/me/',
            {'first_name': 'Awa', 'phone_number': '+221771234567', 'role': 'admin'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['role'], Role.CLIENT)
        self.assertEqual(response.data['first_name'], 'Awa')
        self.assertEqual(response.data['phone_number'], '+221771234567')

    def test_logout_blacklists_refresh_token(self):
        tokens = self.authenticate()

        response = self.client.post(
            '/api/auth/logout/',
            {'refresh': tokens['refresh']},
            format='json',
        )

        self.assertEqual(response.status_code, 204)
        self.client.credentials()
        self.assertEqual(
            self.client.post(
                '/api/auth/refresh/',
                {'refresh': tokens['refresh']},
                format='json',
            ).status_code,
            401,
        )

    def test_logout_rejects_another_users_refresh_token(self):
        self.authenticate(email='owner@test.com')
        other_user = self.register(email='other@test.com')
        self.assertEqual(other_user.status_code, 201)
        other_tokens = self.login(email='other@test.com').data

        response = self.client.post(
            '/api/auth/logout/',
            {'refresh': other_tokens['refresh']},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        self.client.credentials()
        self.assertEqual(
            self.client.post(
                '/api/auth/refresh/',
                {'refresh': other_tokens['refresh']},
                format='json',
            ).status_code,
            200,
        )

    def test_password_change_revokes_refresh_tokens(self):
        tokens = self.authenticate()

        response = self.client.post(
            '/api/auth/change-password/',
            {'old_password': PASSWORD, 'new_password': 'Nouveau-Mdp-2026!'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.client.credentials()
        self.assertEqual(
            self.client.post(
                '/api/auth/refresh/',
                {'refresh': tokens['refresh']},
                format='json',
            ).status_code,
            401,
        )
        self.assertEqual(self.login(password='Nouveau-Mdp-2026!').status_code, 200)

    def test_superuser_receives_admin_role(self):
        user = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password=PASSWORD,
        )
        self.assertEqual(user.account_profile.role, Role.ADMIN)

    def test_role_permissions(self):
        client = User.objects.create_user(username='client', password=PASSWORD)
        provider = User.objects.create_user(username='provider', password=PASSWORD)
        provider.account_profile.role = Role.PRESTATAIRE
        provider.account_profile.save()
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password=PASSWORD,
        )
        request = RequestFactory().get('/')

        for user, permission, expected in (
            (client, IsClient(), True),
            (client, IsPrestataire(), False),
            (provider, IsPrestataire(), True),
            (admin, IsAdmin(), True),
        ):
            request.user = user
            self.assertEqual(permission.has_permission(request, None), expected)
