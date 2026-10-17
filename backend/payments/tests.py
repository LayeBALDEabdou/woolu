import hashlib
import hmac
import json
from unittest.mock import patch

from django.test import TestCase, override_settings

from . import bitnob_client as bn
from .models import Commande, PaiementSortant, WebhookEvent

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
        self.assertEqual(r.json()["request"], "lnbc...")
        mock_facture.assert_called_once()

    @patch.object(bn, "create_lightning_invoice", return_value={"data": {"request": "lnbc...", "expires_at": "2026-10-18T00:00:00Z"}})
    def test_creation_facture_sous_data(self, _):
        r = self.client.post(
            "/payments/commandes/", {"montant_sats": 1000}, content_type="application/json"
        )
        self.assertEqual(r.json()["request"], "lnbc...")
        self.assertEqual(r.json()["expires_at"], "2026-10-18T00:00:00Z")

    def test_statut(self):
        Commande.objects.create(reference="cmd-abc", montant_sats=500, description="Frigo")
        r = self.client.get("/payments/commandes/cmd-abc/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["statut"], Commande.Statut.EN_ATTENTE)
        self.assertIsNone(r.json()["code_livraison"])

    def test_statut_introuvable(self):
        self.assertEqual(self.client.get("/payments/commandes/inconnue/").status_code, 404)

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


FACTURE = "lntb10u1ptest"


@override_settings(DEBUG=True)
class PayerFactureTests(TestCase):
    def poster(self, url, payload):
        return self.client.post(url, payload, content_type="application/json")

    @patch.object(bn, "decode_invoice", return_value={"amount_sat": 1000, "description": "Frigo", "is_expired": False})
    def test_decoder(self, mock_decode):
        r = self.poster("/payments/factures/decoder/", {"request": "lightning:LNTB10U1PTEST"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["montant_sats"], 1000)
        mock_decode.assert_called_once_with(FACTURE)  # préfixe retiré, minuscules

    def test_adresse_lightning_refusee(self):
        r = self.poster("/payments/factures/decoder/", {"request": "alice@exemple.com"})
        self.assertEqual(r.status_code, 400)

    def test_texte_quelconque_refuse(self):
        r = self.poster("/payments/factures/decoder/", {"request": "bonjour"})
        self.assertEqual(r.status_code, 400)

    @patch.object(bn, "pay_invoice", return_value={"success": True, "data": {"status": "paid", "amount_sat": "1000", "fee_sat": "1"}})
    def test_payer(self, mock_pay):
        r = self.poster("/payments/factures/payer/", {"request": FACTURE, "reference": "pay-0b8f6c2e-1a2b-4c3d-9e8f-123456789abc"})
        self.assertEqual(r.status_code, 201)
        paiement = PaiementSortant.objects.get()
        self.assertEqual((paiement.statut, paiement.montant_sats), ("paid", 1000))
        mock_pay.assert_called_once()

    def test_reference_obligatoire(self):
        r = self.poster("/payments/factures/payer/", {"request": FACTURE})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(PaiementSortant.objects.count(), 0)

    @patch.object(bn, "pay_invoice", side_effect=bn.BitnobError(400, {"detail": "insufficient balance"}))
    def test_echec_enregistre(self, _):
        r = self.poster("/payments/factures/payer/", {"request": FACTURE, "reference": "pay-0b8f6c2e-1a2b"})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(PaiementSortant.objects.get().statut, "failed")

    @override_settings(DEBUG=False)
    @patch.object(bn, "pay_invoice")
    def test_desactive_en_production(self, mock_pay):
        r = self.poster("/payments/factures/payer/", {"request": FACTURE, "reference": "pay-0b8f6c2e-1a2b"})
        self.assertEqual(r.status_code, 403)
        mock_pay.assert_not_called()

    @override_settings(DEBUG=False, BITNOB_PAIEMENTS_PUBLICS=True, BITNOB_CLIENT_SECRET="prd:sandbox_abc")
    @patch.object(bn, "pay_invoice", return_value={"data": {"status": "paid", "amount_sat": "10"}})
    def test_active_en_production_avec_cle_sandbox(self, mock_pay):
        r = self.poster("/payments/factures/payer/", {"request": FACTURE, "reference": "pay-0b8f6c2e-1a2b"})
        self.assertEqual(r.status_code, 201)

    @override_settings(DEBUG=False, BITNOB_PAIEMENTS_PUBLICS=True, BITNOB_CLIENT_SECRET="prd:live_abc")
    @patch.object(bn, "pay_invoice")
    def test_refuse_avec_vraie_cle(self, mock_pay):
        r = self.poster("/payments/factures/payer/", {"request": FACTURE, "reference": "pay-0b8f6c2e-1a2b"})
        self.assertEqual(r.status_code, 403)
        mock_pay.assert_not_called()
