import hashlib
import hmac
import json
import re
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import Role
from transactions.models import Status, Transaction
from . import bitnob_client as bn
from .models import AdresseDepot, EnvoiUsdc, TransactionPaymentAttempt, WebhookEvent

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


class BitnobProviderErrorTests(TestCase):
    def test_extrait_seulement_le_code_de_rejet(self):
        self.assertEqual(bn.provider_error_code({"code": "AUTH_INVALID"}), "AUTH_INVALID")
        self.assertEqual(bn.provider_error_code({"error": {"code": "KEY_REVOKED"}}), "KEY_REVOKED")
        self.assertEqual(bn.provider_error_code({"detail": "ne pas journaliser"}), "unknown")

    @override_settings(BITNOB_CLIENT_ID="client-id", BITNOB_CLIENT_SECRET="client-secret")
    @patch.object(bn.secrets, "token_hex", return_value="a" * 32)
    @patch.object(bn.time, "time", return_value=1_700_000_000)
    def test_signature_requete_conforme_au_format_bitnob(self, _, __):
        payload = '{"chain":"solana"}'
        headers = bn._signed_headers(payload)
        expected_message = f"client-id:1700000000:{'a' * 32}:{payload}"
        expected_signature = hmac.new(
            b"client-secret", expected_message.encode(), hashlib.sha256
        ).hexdigest()

        self.assertEqual(headers["X-Auth-Client"], "client-id")
        self.assertEqual(headers["X-Auth-Timestamp"], "1700000000")
        self.assertEqual(headers["X-Auth-Nonce"], "a" * 32)
        self.assertEqual(headers["X-Auth-Signature"], expected_signature)


class TransactionPaymentTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.client_user = user_model.objects.create_user(
            username="acheteur-paiement@test.com",
            email="acheteur-paiement@test.com",
            password="x",
        )
        self.client_user.account_profile.role = Role.CLIENT
        self.client_user.account_profile.email_verified = True
        self.client_user.account_profile.save()
        self.merchant = user_model.objects.create_user(
            username="vendeur-paiement@test.com",
            email="vendeur-paiement@test.com",
            password="x",
        )
        self.merchant.account_profile.role = Role.VENDEUR
        self.merchant.account_profile.email_verified = True
        self.merchant.account_profile.save()
        self.transaction = Transaction.objects.create(
            merchant=self.merchant,
            client=self.client_user,
            client_name="Acheteur",
            title="Commande test",
            kind="product",
            description="Description",
            amount=60000,
            deadline=timezone.localdate(),
            status=Status.PENDING_PAYMENT,
            sent_at=timezone.now(),
        )
        self.client.force_authenticate(self.client_user)

    @override_settings(BITNOB_XOF_PER_USDC="600", BITNOB_CLIENT_ID="client", BITNOB_CLIENT_SECRET="sandbox_key")
    @patch.object(bn, "create_address", return_value={"data": {"id": "bitnob-1", "address": ADRESSE_SOL}})
    def test_creation_et_lecture_des_endpoints(self, mock_address):
        response = self.client.post(
            f"/api/transactions/{self.transaction.id}/payments",
            {"method": "usdc"},
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["method"], "usdc")
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(response.data["amount"], {"amount": 60000, "currency": "XOF"})
        self.assertEqual(response.data["deposit"]["network"], "solana")
        self.assertEqual(response.data["deposit"]["amountUsdc"], "100.000000")
        self.assertTrue(response.data["isSimulated"])
        mock_address.assert_called_once()
        attempt = TransactionPaymentAttempt.objects.get()
        self.assertEqual(attempt.bitnob_id, "bitnob-1")
        self.transaction.refresh_from_db()
        self.assertEqual(self.transaction.status, Status.PENDING_PAYMENT)
        self.assertEqual(self.transaction.escrow_status, "not_started")
        cancel = self.client.post(f"/api/transactions/{self.transaction.id}/cancel", {}, format="json")
        self.assertEqual(cancel.status_code, 409)
        self.assertEqual(cancel.data["code"], "CONFLICT")

        listing = self.client.get(f"/api/transactions/{self.transaction.id}/payments")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual([item["id"] for item in listing.data], [str(attempt.id)])
        history = self.client.get("/api/payments")
        self.assertEqual(history.status_code, 200)
        detail = self.client.get(f"/api/payments/{attempt.id}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["deposit"]["address"], ADRESSE_SOL)

    @override_settings(BITNOB_XOF_PER_USDC="", BITNOB_CLIENT_ID="client", BITNOB_CLIENT_SECRET="secret")
    @patch.object(bn, "create_address")
    def test_taux_absent_refuse_sans_appeler_bitnob(self, mock_address):
        response = self.client.post(
            f"/api/transactions/{self.transaction.id}/payments", {"method": "usdc"}, format="json"
        )
        self.assertEqual(response.status_code, 503)
        mock_address.assert_not_called()

    @override_settings(BITNOB_XOF_PER_USDC="0", BITNOB_CLIENT_ID="client", BITNOB_CLIENT_SECRET="secret")
    @patch.object(bn, "create_address")
    def test_taux_invalide_refuse(self, mock_address):
        response = self.client.post(
            f"/api/transactions/{self.transaction.id}/payments", {"method": "usdc"}, format="json"
        )
        self.assertEqual(response.status_code, 503)
        mock_address.assert_not_called()

    @override_settings(BITNOB_XOF_PER_USDC="600", BITNOB_CLIENT_ID="client", BITNOB_CLIENT_SECRET="secret")
    @patch.object(
        bn,
        "create_address",
        side_effect=bn.BitnobError(
            401, {"code": "AUTH_INVALID", "detail": "do not log sensitive response details"}
        ),
    )
    def test_rejet_bitnob_journalise_le_code_sans_la_reponse_complete(self, _):
        path = f"/api/transactions/{self.transaction.id}/payments"
        with self.assertLogs("payments", level="WARNING") as captured:
            response = self.client.post(path, {"method": "usdc"}, format="json")

        self.assertEqual(response.status_code, 502)
        self.assertIn("AUTH_INVALID", captured.output[0])
        self.assertNotIn("do not log sensitive response details", captured.output[0])

    @override_settings(BITNOB_XOF_PER_USDC="700", BITNOB_CLIENT_ID="client", BITNOB_CLIENT_SECRET="secret")
    @patch.object(bn, "create_address", return_value={"address": ADRESSE_SOL})
    def test_conversion_arrondie_vers_le_haut_a_six_decimales(self, _):
        response = self.client.post(
            f"/api/transactions/{self.transaction.id}/payments", {"method": "usdc"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["deposit"]["amountUsdc"], "85.714286")

    @override_settings(BITNOB_XOF_PER_USDC="600", BITNOB_CLIENT_ID="client", BITNOB_CLIENT_SECRET="secret")
    @patch.object(bn, "create_address", return_value={"address": ADRESSE_SOL})
    def test_une_seule_adresse_active(self, mock_address):
        payload = {"method": "usdc"}
        path = f"/api/transactions/{self.transaction.id}/payments"
        self.assertEqual(self.client.post(path, payload, format="json").status_code, 201)
        self.assertEqual(self.client.post(path, payload, format="json").status_code, 409)
        mock_address.assert_called_once()

    @override_settings(BITNOB_XOF_PER_USDC="600", BITNOB_CLIENT_ID="client", BITNOB_CLIENT_SECRET="secret")
    @patch.object(bn, "create_address")
    def test_seul_le_client_peut_payer_et_les_tiers_ne_voient_pas_les_tentatives(self, mock_address):
        self.client.force_authenticate(self.merchant)
        response = self.client.post(
            f"/api/transactions/{self.transaction.id}/payments", {"method": "usdc"}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        mock_address.assert_not_called()

        stranger = get_user_model().objects.create_user(
            username="tiers-paiement@test.com", email="tiers-paiement@test.com", password="x"
        )
        self.client.force_authenticate(stranger)
        self.assertEqual(self.client.get(f"/api/transactions/{self.transaction.id}/payments").status_code, 404)

    @override_settings(
        BITNOB_XOF_PER_USDC="600",
        BITNOB_CLIENT_ID="client",
        BITNOB_CLIENT_SECRET="secret",
        BITNOB_WEBHOOK_SECRET=SECRET,
    )
    @patch.object(bn, "create_address", return_value={"address": ADRESSE_SOL})
    def test_webhook_confirme_seulement_apres_reception_du_montant_total(self, _):
        response = self.client.post(
            f"/api/transactions/{self.transaction.id}/payments", {"method": "usdc"}, format="json"
        )
        attempt = TransactionPaymentAttempt.objects.get()

        invalid = {
            "event": "deposit.success",
            "event_id": "evt-non-usdc",
            "data": {
                "reference": attempt.reference,
                "address": ADRESSE_SOL,
                "amount": "100",
                "currency": "BTC",
                "chain": "solana",
            },
        }
        body = json.dumps(invalid).encode()
        self.client.post(
            WEBHOOK_URL,
            body,
            content_type="application/json",
            headers={"x-bitnob-signature": signer(body)},
        )
        attempt.refresh_from_db()
        self.assertEqual(attempt.montant_recu_usdc, Decimal("0"))

        first = {
            "event": "deposit.success",
            "event_id": "evt-part-1",
            "data": {
                "reference": attempt.reference,
                "address": ADRESSE_SOL,
                "amount": "30",
                "currency": "USDC",
                "chain": "solana",
            },
        }
        body = json.dumps(first).encode()
        self.assertEqual(
            self.client.post(
                WEBHOOK_URL,
                body,
                content_type="application/json",
                headers={"x-bitnob-signature": signer(body)},
            ).status_code,
            200,
        )
        attempt.refresh_from_db()
        self.transaction.refresh_from_db()
        self.assertEqual(attempt.statut, "pending")
        self.assertEqual(attempt.montant_recu_usdc, Decimal("30"))
        self.assertEqual(self.transaction.status, Status.PENDING_PAYMENT)
        body = json.dumps(first).encode()
        self.client.post(
            WEBHOOK_URL,
            body,
            content_type="application/json",
            headers={"x-bitnob-signature": signer(body)},
        )
        attempt.refresh_from_db()
        self.assertEqual(attempt.montant_recu_usdc, Decimal("30"))

        second = {
            **first,
            "event_id": "evt-part-2",
            "data": {**first["data"], "amount": "70"},
        }
        body = json.dumps(second).encode()
        self.assertEqual(
            self.client.post(
                WEBHOOK_URL,
                body,
                content_type="application/json",
                headers={"x-bitnob-signature": signer(body)},
            ).status_code,
            200,
        )
        attempt.refresh_from_db()
        self.transaction.refresh_from_db()
        self.assertEqual(attempt.statut, "confirmed")
        self.assertEqual(attempt.confirme_le is not None, True)
        self.assertEqual(self.transaction.status, Status.PAYMENT_CONFIRMED)
        self.assertEqual(self.transaction.escrow_status, "held")


class DocumentationTests(TestCase):
    def test_schema_couvre_toutes_les_routes(self):
        from accounts.urls import urlpatterns as routes_comptes
        from transactions.urls import urlpatterns as routes_transactions

        from .urls import urlpatterns as routes_paiements

        r = self.client.get("/api/schema/")
        self.assertEqual(r.status_code, 200)
        chemins = set(r.json()["paths"])
        for prefixe, routes in (
            ("/api/", routes_comptes),
            ("/api/", routes_transactions),
            ("/payments/", routes_paiements),
        ):
            for route in routes:
                motif = re.sub(r"<(?:str|uuid):(\w+)>", r"{\1}", str(route.pattern)).replace("{pk}", "{id}")
                self.assertIn(prefixe + motif, chemins)

    @override_settings(DEBUG=False)
    def test_swagger_ui_accessible_en_production(self):
        r = self.client.get("/api/docs/")
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "/api/schema/")
