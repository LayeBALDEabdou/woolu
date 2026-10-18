from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Role

from .models import Transaction

User = get_user_model()


def creer_utilisateur(email, role, phone=''):
    user = User.objects.create_user(username=email, email=email, password='x', first_name=email.split('@')[0])
    user.account_profile.role = role
    user.account_profile.phone_number = phone
    user.account_profile.email_verified = True
    user.account_profile.save()
    return user


class TransactionTests(APITestCase):
    def setUp(self):
        self.vendeur = creer_utilisateur('vendeur@test.com', Role.VENDEUR)
        self.acheteur = creer_utilisateur('client@test.com', Role.CLIENT, phone='+221771234567')
        self.inconnu = creer_utilisateur('autre@test.com', Role.CLIENT)

    def en_tant_que(self, user):
        self.client.force_authenticate(user)

    def creer(self, **extra):
        self.en_tant_que(self.vendeur)
        data = {
            'title': 'Table en bois',
            'kind': 'product',
            'description': 'Table 6 places',
            'clientName': 'Awa',
            'clientContact': 'Client@test.com',
            'amount': 50000,
            'currency': 'XOF',
            'deadline': (timezone.localdate() + timedelta(days=10)).isoformat(),
            'specialConditions': None,
            'claimWindowDays': 7,
            'merchantAcceptsTerms': True,
            **extra,
        }
        return self.client.post('/api/transactions', data, format='json')

    def agir(self, user, tid, action, data=None):
        self.en_tant_que(user)
        return self.client.post(f'/api/transactions/{tid}/{action}', data, format='json')

    def payee(self):
        """Transaction acceptée par le client puis payée : fonds bloqués."""
        tid = self.creer().data['id']
        self.agir(self.vendeur, tid, 'send')
        self.agir(self.acheteur, tid, 'accept')
        Transaction.objects.get(pk=tid).confirm_payment()
        return tid

    def test_parcours_complet_jusqu_a_la_liberation_des_fonds(self):
        tid = self.payee()
        r = self.agir(
            self.vendeur, tid, 'delivery/start', {'method': 'courier', 'carrier': 'Yango', 'trackingNumber': None, 'note': None}
        )
        self.assertEqual(r.data['status'], 'in_progress')
        self.assertEqual(r.data['delivery']['carrier'], 'Yango')
        r = self.agir(self.vendeur, tid, 'delivery/complete', {'note': 'Livré au portail'})
        self.assertEqual(r.data['status'], 'awaiting_confirmation')
        self.assertEqual(r.data['delivery']['completionNote'], 'Livré au portail')

        r = self.agir(self.acheteur, tid, 'confirm-receipt')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['status'], 'completed')
        self.assertEqual(r.data['escrow']['status'], 'released')
        self.assertEqual(
            [e['type'] for e in r.data['events']],
            [
                'created',
                'sent_to_client',
                'terms_accepted',
                'payment_confirmed',
                'escrow_held',
                'delivery_started',
                'delivery_completed',
                'receipt_confirmed',
                'funds_released',
            ],
        )

    def test_format_du_frontend(self):
        r = self.creer()
        self.assertEqual(r.status_code, 201)
        data = r.data
        self.assertRegex(data['reference'], r'^WL-[0-9A-F]{8}$')
        self.assertEqual(data['amount'], {'amount': 50000, 'currency': 'XOF'})
        self.assertEqual(data['escrow'], {'status': 'not_started', 'updatedAt': None})
        self.assertEqual(data['merchant']['role'], 'vendeur')
        # Le client a déjà un compte : il est rattaché dès la création
        self.assertEqual(data['client']['userId'], str(self.acheteur.id))
        self.assertIsNone(data['specialConditions'])
        self.assertIsNone(data['delivery'])
        self.assertEqual(data['events'][0]['actorName'], 'vendeur')

    def test_client_sans_compte_rattache_a_son_inscription(self):
        tid = self.creer(clientContact='+221 77 000 11 22').data['id']
        self.agir(self.vendeur, tid, 'send')
        nouveau = creer_utilisateur('nouveau@test.com', Role.CLIENT, phone='770001122')
        self.en_tant_que(nouveau)
        r = self.client.get(f'/api/transactions/{tid}')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['client']['userId'], str(nouveau.id))

    def test_le_client_ne_voit_pas_un_brouillon(self):
        tid = self.creer().data['id']
        self.en_tant_que(self.acheteur)
        self.assertEqual(self.client.get(f'/api/transactions/{tid}').status_code, 404)
        self.agir(self.vendeur, tid, 'send')
        self.en_tant_que(self.acheteur)
        self.assertEqual(self.client.get(f'/api/transactions/{tid}').status_code, 200)

    def test_un_tiers_recoit_404(self):
        tid = self.creer().data['id']
        self.agir(self.vendeur, tid, 'send')
        self.en_tant_que(self.inconnu)
        r = self.client.get(f'/api/transactions/{tid}')
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r.data['code'], 'NOT_FOUND')

    def test_seul_le_client_confirme_la_reception(self):
        tid = self.payee()
        self.agir(self.vendeur, tid, 'delivery/start', {'method': 'remote'})
        r = self.agir(self.vendeur, tid, 'confirm-receipt')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data['code'], 'FORBIDDEN')

    def test_pas_de_confirmation_sans_fonds_bloques(self):
        tid = self.creer().data['id']
        self.agir(self.vendeur, tid, 'send')
        self.agir(self.acheteur, tid, 'accept')
        r = self.agir(self.acheteur, tid, 'confirm-receipt')
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data['code'], 'INVALID_TRANSITION')

    def test_transitions_interdites(self):
        tid = self.creer().data['id']
        self.agir(self.vendeur, tid, 'send')
        # Le vendeur ne peut pas accepter à la place du client
        self.assertEqual(self.agir(self.vendeur, tid, 'accept').data['code'], 'FORBIDDEN')
        self.agir(self.acheteur, tid, 'accept')
        # Pas de livraison avant le paiement
        r = self.agir(self.vendeur, tid, 'delivery/start', {'method': 'courier'})
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data['code'], 'INVALID_TRANSITION')

    def test_refus_du_client_avec_motif(self):
        tid = self.creer().data['id']
        self.agir(self.vendeur, tid, 'send')
        r = self.agir(self.acheteur, tid, 'refuse', {'reason': 'Trop cher'})
        self.assertEqual(r.data['status'], 'cancelled')
        self.assertEqual(r.data['events'][-1]['note'], 'Trop cher')

    def test_seuls_vendeurs_et_prestataires_creent(self):
        self.en_tant_que(self.acheteur)
        r = self.client.post('/api/transactions', {}, format='json')
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data['code'], 'FORBIDDEN')

    def test_erreurs_de_validation_par_champ(self):
        r = self.creer(amount=500)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data['code'], 'VALIDATION')
        self.assertIn('amount', r.data['fieldErrors'])
        self.assertIn('clientContact', self.creer(clientContact='vendeur@test.com').data['fieldErrors'])
        self.assertIn('merchantAcceptsTerms', self.creer(merchantAcceptsTerms=False).data['fieldErrors'])
        self.assertIn('deadline', self.creer(deadline='2000-01-01').data['fieldErrors'])

    def test_non_connecte(self):
        r = self.client.get('/api/transactions')
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data['code'], 'UNAUTHENTICATED')

    def test_liste_paginee_filtree_et_triee(self):
        for montant in (3000, 1000, 2000):
            self.creer(amount=montant, title=f'Commande {montant}')
        r = self.client.get('/api/transactions', {'sort': 'amount_asc', 'pageSize': 2})
        self.assertEqual(r.data['total'], 3)
        self.assertEqual([t['amount']['amount'] for t in r.data['items']], [1000, 2000])
        self.assertNotIn('events', r.data['items'][0])
        r = self.client.get('/api/transactions', {'search': 'commande 3000'})
        self.assertEqual(r.data['total'], 1)

    def test_tableau_de_bord(self):
        self.payee()
        brouillon = self.creer(amount=2000).data['id']
        self.en_tant_que(self.vendeur)
        r = self.client.get('/api/dashboard/summary')
        self.assertEqual(r.data['totalCount'], 2)
        self.assertEqual(r.data['pendingCount'], 1)
        self.assertEqual(r.data['inProgressCount'], 1)
        self.assertEqual(r.data['fundsHeld'], {'amount': 50000, 'currency': 'XOF'})
        # Le vendeur doit envoyer le brouillon et commencer la livraison de la transaction payée
        self.assertEqual(len(r.data['needsAttention']), 2)
        activite = r.data['recentActivity'][0]
        self.assertEqual((activite['transactionId'], activite['event']['type']), (brouillon, 'created'))
