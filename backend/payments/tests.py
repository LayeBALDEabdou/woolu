import hashlib
import hmac
import json
from unittest.mock import patch

from django.test import TestCase, override_settings

from . import bitnob_client as bn
from .models import AdresseDepot, EnvoiUsdc, WebhookEvent

SECRET = "secret-de-test"
WEBHOOK_URL = "/payments/webhooks/bitnob/"
ADRESSE_SOL = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"


def signer(body: bytes) -> str:
    return hmac.new(SECRET.encode(), body, hashlib.sha512).hexdigest()


class AdresseDepotTests(TestCase):
    def creer(self, reseau="solana"):
        return self.client.post("/payments/adresses/", {"reseau": reseau}, content_type="application/json")

    @patch.object(bn, "create_address", return_value={"id": "uuid-1", "address": ADRESSE_SOL, "chain": "solana"})
    def test_creation(self, mock_adresse):
        r = self.creer("Solana")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["adresse"], ADRESSE_SOL)
        self.assertEqual(mock_adresse.call_args.args[0], "solana")
        self.assertEqual(AdresseDepot.objects.get().bitnob_id, "uuid-1")

    def test_reseau_inconnu(self):
        self.assertEqual(self.creer("tron").status_code, 400)

    @patch.object(bn, "create_address", return_value={"id": "uuid-1"})
    def test_reponse_sans_adresse(self, _):
        self.assertEqual(self.creer().status_code, 502)
        self.assertEqual(AdresseDepot.objects.count(), 0)

    @patch.object(bn, "create_address", side_effect=bn.BitnobError(400, {"detail": "chain not supported"}))
    def test_erreur_bitnob(self, _):
        r = self.creer()
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["erreur"]["detail"], "chain not supported")

    def test_statut(self):
        AdresseDepot.objects.create(reference="adr-1", reseau="solana", adresse=ADRESSE_SOL)
        r = self.client.get("/payments/adresses/adr-1/")
        self.assertEqual(r.json()["statut"], AdresseDepot.Statut.EN_ATTENTE)
        self.assertEqual(self.client.get("/payments/adresses/inconnue/").status_code, 404)


@override_settings(DEBUG=True)
class EnvoiUsdcTests(TestCase):
    def envoyer(self, **champs):
        payload = {"adresse": ADRESSE_SOL, "reseau": "solana", "montant": "1.5", "reference": "pay-0b8f6c2e-1a2b", **champs}
        return self.client.post("/payments/envois/", payload, content_type="application/json")

    @patch.object(bn, "withdraw", return_value={"success": True, "data": {"status": "pending"}})
    def test_envoi(self, mock_withdraw):
        r = self.envoyer(montant="1,5")
        self.assertEqual(r.status_code, 201)
        mock_withdraw.assert_called_once_with(ADRESSE_SOL, "1500000", "USDC", "solana", "pay-0b8f6c2e-1a2b")
        envoi = EnvoiUsdc.objects.get()
        self.assertEqual((envoi.reseau, envoi.montant, envoi.statut), ("solana", "1.5", "pending"))

    @patch.object(bn, "withdraw")
    def test_montants_invalides(self, mock_withdraw):
        for montant in ("0", "-1", "abc", "0.0000001", "NaN"):
            self.assertEqual(self.envoyer(montant=montant).status_code, 400, montant)
        mock_withdraw.assert_not_called()

    @patch.object(bn, "withdraw")
    def test_champs_invalides(self, mock_withdraw):
        self.assertEqual(self.envoyer(adresse="pas une adresse").status_code, 400)
        self.assertEqual(self.envoyer(reseau="tron").status_code, 400)
        self.assertEqual(self.envoyer(reference="").status_code, 400)
        mock_withdraw.assert_not_called()

    @patch.object(bn, "withdraw", side_effect=bn.BitnobError(422, {"code": "INSUFFICIENT_FUNDS"}))
    def test_solde_insuffisant(self, _):
        self.assertEqual(self.envoyer().status_code, 422)
        self.assertEqual(EnvoiUsdc.objects.get().statut, "failed")

    @override_settings(DEBUG=False, BITNOB_PAIEMENTS_PUBLICS=False)
    @patch.object(bn, "withdraw")
    def test_desactive_en_production(self, mock_withdraw):
        self.assertEqual(self.envoyer().status_code, 403)
        mock_withdraw.assert_not_called()

    @override_settings(DEBUG=False, BITNOB_PAIEMENTS_PUBLICS=True, BITNOB_CLIENT_SECRET="prd:sandbox_abc")
    @patch.object(bn, "withdraw", return_value={"data": {"status": "pending"}})
    def test_active_en_production_avec_cle_sandbox(self, _):
        self.assertEqual(self.envoyer().status_code, 201)

    @override_settings(DEBUG=False, BITNOB_PAIEMENTS_PUBLICS=True, BITNOB_CLIENT_SECRET="prd:live_abc")
    @patch.object(bn, "withdraw")
    def test_refuse_avec_vraie_cle(self, mock_withdraw):
        self.assertEqual(self.envoyer().status_code, 403)
        mock_withdraw.assert_not_called()


@override_settings(BITNOB_WEBHOOK_SECRET=SECRET)
class WebhookTests(TestCase):
    def setUp(self):
        self.depot = AdresseDepot.objects.create(reference="adr-1", reseau="solana", adresse=ADRESSE_SOL)

    def envoyer(self, payload, signature=None):
        body = json.dumps(payload).encode()
        return self.client.post(
            WEBHOOK_URL,
            body,
            content_type="application/json",
            headers={"x-bitnob-signature": signature or signer(body)},
        )

    def test_depot_reconnu_par_adresse(self):
        self.envoyer({"event": "stablecoin.deposit.success", "event_id": "evt-1",
                      "data": {"address": ADRESSE_SOL, "amount": "5.5", "currency": "USDC", "reference": "tx-1"}})
        self.depot.refresh_from_db()
        self.assertEqual((self.depot.statut, self.depot.montant, self.depot.devise), ("RECU", "5.5", "USDC"))

    def test_depot_reconnu_par_reference(self):
        self.envoyer({"event": "deposit.success", "event_id": "evt-2", "data": {"reference": "adr-1", "amount": 2}})
        self.depot.refresh_from_db()
        self.assertEqual(self.depot.statut, AdresseDepot.Statut.RECU)

    def test_autre_adresse_ignoree(self):
        self.envoyer({"event": "deposit.success", "event_id": "evt-3", "data": {"address": "Autre", "reference": "tx-9"}})
        self.depot.refresh_from_db()
        self.assertEqual(self.depot.statut, AdresseDepot.Statut.EN_ATTENTE)

    def test_envoi_confirme(self):
        EnvoiUsdc.objects.create(reference="pay-abc", adresse=ADRESSE_SOL, reseau="solana", montant="1")
        self.envoyer({"event": "transfer.success", "event_id": "evt-4", "data": {"reference": "pay-abc", "hash": "0x1"}})
        self.assertEqual(EnvoiUsdc.objects.get().statut, "completed")

    def test_signature_invalide_refusee(self):
        r = self.envoyer({"event": "deposit.success", "data": {"address": ADRESSE_SOL}}, signature="faux")
        self.assertEqual(r.status_code, 401)
        self.depot.refresh_from_db()
        self.assertEqual(self.depot.statut, AdresseDepot.Statut.EN_ATTENTE)

    @override_settings(BITNOB_WEBHOOK_SECRET="")
    def test_refuse_tout_si_secret_absent(self):
        body = b'{"event":"deposit.success"}'
        forge = hmac.new(b"", body, hashlib.sha512).hexdigest()
        self.assertFalse(bn.webhook_signature_is_valid(body, forge))

    def test_doublon_ignore(self):
        payload = {"event": "deposit.success", "event_id": "evt-5", "data": {"address": ADRESSE_SOL}}
        self.envoyer(payload)
        self.envoyer(payload)
        self.assertEqual(WebhookEvent.objects.count(), 1)

    def test_sans_identifiant_ne_plante_pas(self):
        r = self.envoyer({"event": "deposit.success", "data": {}})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(WebhookEvent.objects.count(), 0)


class WhoamiTests(TestCase):
    @override_settings(DEBUG=False)
    def test_reserve_aux_admins(self):
        self.assertEqual(self.client.get("/payments/whoami/").status_code, 403)


class DocumentationTests(TestCase):
    def test_schema_couvre_toutes_les_routes(self):
        from .urls import urlpatterns

        r = self.client.get("/api/schema/")
        self.assertEqual(r.status_code, 200)
        chemins = set(r.json()["paths"])
        for route in urlpatterns:
            chemin = "/payments/" + str(route.pattern).replace("<str:reference>", "{reference}")
            self.assertIn(chemin, chemins)

    @override_settings(DEBUG=False)
    def test_swagger_ui_accessible_en_production(self):
        r = self.client.get("/api/docs/")
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "/api/schema/")
