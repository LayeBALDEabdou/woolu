"""
Client minimal pour l'API Bitnob (signature HMAC-SHA256).

Doc : https://bitnob.dev/api-reference/authentication
Chaîne signée : CLIENT_ID:TIMESTAMP:NONCE:PAYLOAD
- TIMESTAMP : secondes Unix
- NONCE     : 16 octets aléatoires en hexadécimal, unique par requête
- PAYLOAD   : le JSON exact envoyé (sans espaces), ou "" s'il n'y a pas de corps
"""

import base64
import hashlib
import hmac
import json
import secrets
import time

import requests
from django.conf import settings

BASE_URL = "https://api.bitnob.com"  # même URL en sandbox et en production


class BitnobError(Exception):
    def __init__(self, status, data):
        super().__init__(f"Bitnob a répondu {status} : {data}")
        self.status = status
        self.data = data


def _signed_headers(payload: str) -> dict:
    client_id = settings.BITNOB_CLIENT_ID
    secret = settings.BITNOB_CLIENT_SECRET

    timestamp = str(int(time.time()))  # secondes, pas millisecondes
    nonce = secrets.token_hex(16)  # 16 octets -> 32 caractères hex

    message = f"{client_id}:{timestamp}:{nonce}:{payload}"
    signature = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()

    return {
        "Content-Type": "application/json",
        "X-Auth-Client": client_id,
        "X-Auth-Timestamp": timestamp,
        "X-Auth-Nonce": nonce,
        "X-Auth-Signature": signature,
    }


def bitnob(method: str, path: str, body: dict | None = None) -> dict:
    """Appelle l'API Bitnob. Exemple : bitnob("GET", "/api/whoami")"""
    # JSON compact : on signe et on envoie EXACTEMENT la même chaîne
    payload = json.dumps(body, separators=(",", ":")) if body is not None else ""

    try:
        response = requests.request(
            method,
            BASE_URL + path,
            headers=_signed_headers(payload),
            data=payload.encode() if body is not None else None,
            timeout=30,
        )
    except requests.RequestException as e:
        raise BitnobError(502, {"message": f"Bitnob injoignable : {e}"}) from e

    try:
        data = response.json()
    except ValueError:
        data = {"raw": response.text}

    if not response.ok:
        raise BitnobError(response.status_code, data)
    return data


# --- Raccourcis pratiques -------------------------------------------------


def whoami():
    return bitnob("GET", "/api/whoami")


def balances():
    return bitnob("GET", "/api/balances")


def create_lightning_invoice(amount_sats: int, description: str, reference: str):
    return bitnob(
        "POST",
        "/api/lightning/invoices",
        {
            "amount": amount_sats,
            "description": description,
            "reference": reference,
        },
    )


def decode_invoice(payment_request: str):
    return bitnob("POST", "/api/lightning/decode", {"request": payment_request})


def pay_invoice(payment_request: str, reference: str):
    """Paie une facture BOLT11 avec le solde du compte Bitnob (l'argent sort !)."""
    return bitnob(
        "POST",
        "/api/lightning/pay",
        {"request": payment_request, "reference": reference},
    )


def create_address(chain: str, reference: str, label: str = ""):
    return bitnob(
        "POST",
        "/api/addresses",
        {
            "chain": chain,  # ex : "solana", "polygon"
            "reference": reference,
            "label": label or reference,
        },
    )


def withdraw(
    to_address: str,
    amount_smallest_unit: str,
    currency: str,
    chain: str,
    reference: str,
):
    """amount en plus petite unité : 5 USDC = "5000000" (6 décimales)."""
    return bitnob(
        "POST",
        "/api/withdrawals",
        {
            "to_address": to_address,
            "amount": amount_smallest_unit,
            "currency": currency,  # "USDC", "USDT" ou "BTC"
            "chain": chain,
            "reference": reference,
        },
    )


# --- Webhooks -------------------------------------------------------------


def webhook_signature_is_valid(raw_body: bytes, received_signature: str | None) -> bool:
    """
    D'après la doc, Bitnob signe le webhook en HMAC-SHA512 avec ton secret de
    webhook, dans l'en-tête x-bitnob-signature. La doc ne précise pas
    l'encodage : on accepte l'hexadécimal (et le base64 en secours).
    """
    secret = settings.BITNOB_WEBHOOK_SECRET
    # Sans secret, n'importe qui pourrait calculer une signature "valide"
    if not secret or not received_signature:
        return False
    digest = hmac.new(secret.encode(), raw_body, hashlib.sha512)
    candidates = [digest.hexdigest(), base64.b64encode(digest.digest()).decode()]
    return any(hmac.compare_digest(received_signature, c) for c in candidates)
