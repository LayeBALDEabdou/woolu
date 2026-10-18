from datetime import timedelta

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

PASSWORD = 'Mot2passe-Solide!42'


def lien(message, chemin):
    return next(mot for mot in message.body.split() if f'/{chemin}?token=' in mot)


def token_de(message, chemin):
    return lien(message, chemin).split('token=')[1]


@override_settings(FRONTEND_URL='https://woolu.test')
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

    def verify(self, token):
        return self.client.post('/api/auth/email/verify', {'token': token}, format='json')

    def connecte(self, **extra):
        """Inscription puis clic sur le lien reçu par email."""
        self.register(**extra)
        return self.verify(token_de(mail.outbox[-1], 'verification-email'))

    def login(self, email='awa@test.com', password=PASSWORD):
        return self.client.post('/api/auth/login', {'email': email, 'password': password}, format='json')

    def csrf(self):
        return {'HTTP_X_CSRFTOKEN': self.client.cookies['csrftoken'].value}

    def logout(self):
        self.client.post('/api/auth/logout', **self.csrf())

    def test_inscription_envoie_l_email_sans_connecter(self):
        r = self.register()
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data['verificationRequired'])
        self.assertEqual(r.data['user']['fullName'], 'Awa Diop')
        self.assertEqual(r.data['user']['phone'], '+221771234567')
        self.assertEqual(r.data['user']['role'], 'vendeur')
        self.assertNotIn('sessionid', self.client.cookies)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['awa@test.com'])
        self.assertTrue(lien(mail.outbox[0], 'verification-email').startswith('https://woolu.test/'))

    def test_connexion_refusee_avant_confirmation(self):
        self.register()
        r = self.login()
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data['code'], 'EMAIL_NOT_VERIFIED')
        self.assertNotIn('sessionid', self.client.cookies)
        # Un mauvais mot de passe ne révèle pas que le compte attend sa confirmation
        self.assertEqual(self.login(password='faux').data['code'], 'UNAUTHENTICATED')

    def test_confirmation_connecte_et_ne_sert_qu_une_fois(self):
        self.register()
        token = token_de(mail.outbox[0], 'verification-email')
        r = self.verify(token)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['user']['email'], 'awa@test.com')
        self.assertTrue(self.client.cookies['sessionid']['httponly'])
        self.assertEqual(self.client.get('/api/auth/session').status_code, 200)
        self.assertEqual(self.verify(token).data['code'], 'VALIDATION')

    def test_lien_invalide(self):
        self.register()
        token = token_de(mail.outbox[0], 'verification-email')
        self.assertEqual(self.verify(token[:-2] + 'xx').status_code, 400)
        self.assertEqual(self.verify('nimportequoi').status_code, 400)

    def test_renvoi_de_l_email(self):
        self.register()
        self.client.post('/api/auth/email/resend', {'email': 'AWA@test.com'}, format='json')
        self.assertEqual(len(mail.outbox), 2)
        # Le nouveau lien fonctionne
        self.assertEqual(self.verify(token_de(mail.outbox[1], 'verification-email')).status_code, 200)
        # Même réponse pour un compte inconnu ou déjà confirmé, sans email
        for email in ('inconnu@test.com', 'awa@test.com'):
            r = self.client.post('/api/auth/email/resend', {'email': email}, format='json')
            self.assertEqual(r.status_code, 204)
        self.assertEqual(len(mail.outbox), 2)

    def test_session_absente(self):
        r = self.client.get('/api/auth/session')
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data['code'], 'UNAUTHENTICATED')
        self.assertIn('csrftoken', self.client.cookies)

    def test_connexion_et_deconnexion(self):
        self.connecte()
        self.logout()
        self.assertEqual(self.client.get('/api/auth/session').status_code, 401)
        r = self.login(email='AWA@test.com')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['user']['email'], 'awa@test.com')

    def test_mauvais_mot_de_passe(self):
        self.connecte()
        self.logout()
        for email in ('awa@test.com', 'inconnu@test.com'):
            r = self.login(email=email, password='faux')
            self.assertEqual(r.status_code, 401)
            self.assertEqual(r.data['message'], 'Adresse e-mail ou mot de passe incorrect.')

    def test_erreurs_d_inscription_par_champ(self):
        self.register()
        r = self.register()
        self.assertEqual(r.data['code'], 'VALIDATION')
        self.assertIn('email', r.data['fieldErrors'])
        self.assertIn('password', self.register(email='b@test.com', password='123').data['fieldErrors'])
        self.assertIn('phone', self.register(email='c@test.com', phone='12').data['fieldErrors'])
        self.assertIn('role', self.register(email='d@test.com', role='admin').data['fieldErrors'])

    def test_csrf_exige_une_fois_connecte(self):
        self.connecte()
        r = self.client.patch('/api/auth/me', {'fullName': 'Awa Ndiaye'}, format='json')
        self.assertEqual(r.status_code, 403)
        r = self.client.patch('/api/auth/me', {'fullName': 'Awa Ndiaye', 'phone': None}, format='json', **self.csrf())
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['fullName'], 'Awa Ndiaye')
        self.assertIsNone(r.data['phone'])

    def test_session_utilisable_pour_les_transactions(self):
        self.connecte()
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
        self.connecte()
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

    def test_mot_de_passe_oublie(self):
        self.connecte()
        self.logout()
        envoyes = len(mail.outbox)
        # Même réponse pour un compte inconnu, sans email envoyé
        self.assertEqual(self.client.post('/api/auth/password/forgot', {'email': 'x@test.com'}, format='json').status_code, 204)
        self.assertEqual(len(mail.outbox), envoyes)

        self.client.post('/api/auth/password/forgot', {'email': 'awa@test.com'}, format='json')
        token = token_de(mail.outbox[-1], 'reinitialisation-mot-de-passe')

        r = self.client.post('/api/auth/password/reset', {'token': token, 'password': 'Nouveau-Solide!77'}, format='json')
        self.assertEqual(r.status_code, 204)
        # Le lien ne sert qu'une fois
        r = self.client.post('/api/auth/password/reset', {'token': token, 'password': 'Autre-Solide!88'}, format='json')
        self.assertEqual(r.data['code'], 'VALIDATION')
        self.assertEqual(self.login(password='Nouveau-Solide!77').status_code, 200)

    def test_smtp_en_panne_ne_casse_pas_l_inscription(self):
        with override_settings(MAILERS={'default': {'BACKEND': 'accounts.tests_session.MailerEnPanne'}}):
            r = self.register()
        self.assertEqual(r.status_code, 201)


class MailerEnPanne:
    def __init__(self, *args, **kwargs):
        pass

    def send_messages(self, messages):
        raise ConnectionRefusedError('SMTP injoignable')
