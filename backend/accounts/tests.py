from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from .models import Role
from .permissions import IsAdmin, IsClient, IsPrestataire

User = get_user_model()
PASSWORD = 'Mot2passe-Solide!42'


class RoleTests(TestCase):
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
