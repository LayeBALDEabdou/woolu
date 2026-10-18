from datetime import timedelta

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

PASSWORD = 'Mot2passe-Solide!42'


class SessionAuthTests(APITestCase):
    def setUp(self):
        cache.clear()
        # Comme un navigateur : le jeton CSRF est réellement vérifié
        self.client = APIClient(enforce_csrf_checks=True)

    def register(self, email='awa@test.com', role='vendeur', **extra):
        return self.client.post(
            '/api/auth/register',
            {'fullName': 'Awa Diop', 'email': email, 'phone': '+221 77 123 45 67', 'role': role, 'password': PASSWORD, **extra},
            format='json',
        )

    def csrf(self):
        return {'HTTP_X_CSRFTOKEN': self.client.cookies['csrftoken'].value}

    def test_inscription_connecte_et_renvoie_la_session(self):
        r = self.register()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data['isDemo'], False)
        self.assertEqual(r.data['user']['fullName'], 'Awa Diop')
        self.assertEqual(r.data['user']['phone'], '+221771234567')
        self.assertEqual(r.data['user']['role'], 'vendeur')
        self.assertTrue(self.client.cookies['sessionid']['httponly'])
        self.assertEqual(self.client.get('/api/auth/session').data['user']['email'], 'awa@test.com')

    def test_session_absente(self):
        r = self.client.get('/api/auth/session')
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data['code'], 'UNAUTHENTICATED')
        self.assertIn('csrftoken', self.client.cookies)

    def test_connexion_et_deconnexion(self):
        self.register()
        self.client.post('/api/auth/logout', **self.csrf())
        self.assertEqual(self.client.get('/api/auth/session').status_code, 401)

        r = self.client.post('/api/auth/login', {'email': 'AWA@test.com', 'password': PASSWORD}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['user']['email'], 'awa@test.com')

    def test_mauvais_mot_de_passe(self):
        self.register()
        self.client.post('/api/auth/logout', **self.csrf())
        for email in ('awa@test.com', 'inconnu@test.com'):
            r = self.client.post('/api/auth/login', {'email': email, 'password': 'faux'}, format='json')
            self.assertEqual(r.status_code, 401)
            self.assertEqual(r.data['message'], 'Adresse e-mail ou mot de passe incorrect.')

    def test_erreurs_d_inscription_par_champ(self):
        self.register()
        self.client.post('/api/auth/logout', **self.csrf())
        r = self.register()
        self.assertEqual(r.data['code'], 'VALIDATION')
        self.assertIn('email', r.data['fieldErrors'])
        self.assertIn('password', self.register(email='b@test.com', password='123').data['fieldErrors'])
        self.assertIn('phone', self.register(email='c@test.com', phone='12').data['fieldErrors'])
        self.assertIn('role', self.register(email='d@test.com', role='admin').data['fieldErrors'])

    def test_csrf_exige_une_fois_connecte(self):
        self.register()
        r = self.client.patch('/api/auth/me', {'fullName': 'Awa Ndiaye'}, format='json')
        self.assertEqual(r.status_code, 403)
        r = self.client.patch('/api/auth/me', {'fullName': 'Awa Ndiaye', 'phone': None}, format='json', **self.csrf())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['fullName'], 'Awa Ndiaye')
        self.assertIsNone(r.data['phone'])

    def test_session_utilisable_pour_les_transactions(self):
        self.register()
        data = {
            'title': 'Table',
            'kind': 'product',
            'description': 'Table',
            'clientName': 'Moussa',
            'clientContact': 'moussa@test.com',
            'amount': 5000,
            'deadline': (timezone.localdate() + timedelta(days=5)).isoformat(),
            'merchantAcceptsTerms': True,
        }
        self.assertEqual(self.client.post('/api/transactions', data, format='json', **self.csrf()).status_code, 201)

    def test_changement_de_mot_de_passe_garde_la_session(self):
        self.register()
        r = self.client.post(
            '/api/auth/password/change',
            {'currentPassword': 'faux', 'newPassword': 'Nouveau-Solide!77'},
            format='json',
            **self.csrf(),
        )
        self.assertIn('currentPassword', r.data['fieldErrors'])
        r = self.client.post(
            '/api/auth/password/change',
            {'currentPassword': PASSWORD, 'newPassword': 'Nouveau-Solide!77'},
            format='json',
            **self.csrf(),
        )
        self.assertEqual(r.status_code, 204)
        self.assertEqual(self.client.get('/api/auth/session').status_code, 200)

    @override_settings(FRONTEND_URL='https://woolu.test')
    def test_mot_de_passe_oublie(self):
        self.register()
        self.client.post('/api/auth/logout', **self.csrf())
        # Même réponse pour un compte inconnu, sans email envoyé
        self.assertEqual(self.client.post('/api/auth/password/forgot', {'email': 'x@test.com'}, format='json').status_code, 204)
        self.assertEqual(len(mail.outbox), 0)

        self.client.post('/api/auth/password/forgot', {'email': 'awa@test.com'}, format='json')
        lien = next(l for l in mail.outbox[0].body.split() if l.startswith('https://woolu.test/'))
        token = lien.split('token=')[1]

        r = self.client.post('/api/auth/password/reset', {'token': token, 'password': 'Nouveau-Solide!77'}, format='json')
        self.assertEqual(r.status_code, 204)
        # Le lien ne sert qu'une fois
        r = self.client.post('/api/auth/password/reset', {'token': token, 'password': 'Autre-Solide!88'}, format='json')
        self.assertEqual(r.data['code'], 'VALIDATION')
        r = self.client.post('/api/auth/login', {'email': 'awa@test.com', 'password': 'Nouveau-Solide!77'}, format='json')
        self.assertEqual(r.status_code, 200)
