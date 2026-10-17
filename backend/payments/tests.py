import hashlib
import hmac
import json
from unittest.mock import patch

from django.test import TestCase, override_settings

from . import bitnob_client as bn
from .models import Commande, WebhookEvent

SECRET = "secret-de-test"
WEBHOOK_URL = "/payments/webhooks/bitnob/"


def signer(body: bytes) -> str:
    return hmac.new(SECRET.encode(), body, hashlib.sha512).hexdigest()


@override_settings(BITNOB_WEBHOOK_SECRET=SECRET)
class WebhookTests(TestCase):
    def setUp(self):
        self.commande = Commande.objects.create(
            reference="cmd-test", montant_sats=1000, description="Frigo"
        )

    def envoyer(self, payload, signature=None):
        body = json.dumps(payload).encode()
        return self.client.post(
            WEBHOOK_URL,
            body,
            content_type="application/json",
            headers={"x-bitnob-signature": signature or signer(body)},
        )

    def test_paiement_marque_la_commande_payee(self):
        r = self.envoyer({"event": "deposit.success", "event_id": "evt-1", "data": {"reference": "cmd-test"}})
        self.assertEqual(r.status_code, 200)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, Commande.Statut.PAYEE)
        self.assertEqual(len(self.commande.code_livraison), 6)

    def test_signature_invalide_refusee(self):
        r = self.envoyer({"event": "deposit.success", "data": {"reference": "cmd-test"}}, signature="faux")
        self.assertEqual(r.status_code, 401)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, Commande.Statut.EN_ATTENTE)

    @override_settings(BITNOB_WEBHOOK_SECRET="")
    def test_refuse_tout_si_secret_absent(self):
        body = b'{"event":"deposit.success","data":{"reference":"cmd-test"}}'
        forge = hmac.new(b"", body, hashlib.sha512).hexdigest()
        self.assertFalse(bn.webhook_signature_is_valid(body, forge))

    def test_doublon_ignore(self):
        payload = {"event": "deposit.success", "event_id": "evt-1", "data": {"reference": "cmd-test"}}
        self.envoyer(payload)
        code = Commande.objects.get().code_livraison
        self.envoyer(payload)
        self.assertEqual(WebhookEvent.objects.count(), 1)
        self.assertEqual(Commande.objects.get().code_livraison, code)

    def test_sans_identifiant_ne_plante_pas(self):
        r = self.envoyer({"event": "deposit.success", "data": {}})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(WebhookEvent.objects.count(), 0)


class CommandeTests(TestCase):
    @patch.object(bn, "create_lightning_invoice", return_value={"request": "lnbc..."})
    def test_creation(self, mock_facture):
        r = self.client.post(
            "/payments/commandes/",
            {"montant_sats": 1000, "description": "Frigo"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Commande.objects.get().montant_sats, 1000)
        mock_facture.assert_called_once()

    def test_montant_invalide(self):
        r = self.client.post(
            "/payments/commandes/", {"montant_sats": "abc"}, content_type="application/json"
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Commande.objects.count(), 0)

    @patch.object(bn, "create_lightning_invoice", side_effect=bn.BitnobError(400, {"message": "non"}))
    def test_erreur_bitnob(self, _):
        r = self.client.post(
            "/payments/commandes/", {"montant_sats": 1000}, content_type="application/json"
        )
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Commande.objects.get().statut, Commande.Statut.ERREUR)

    @override_settings(DEBUG=False)
    def test_whoami_reserve_aux_admins(self):
        self.assertEqual(self.client.get("/payments/whoami/").status_code, 403)
