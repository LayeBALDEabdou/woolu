import secrets

from django.db import models


class Commande(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente de paiement"
        PAYEE = "PAYEE", "Payée, en attente de livraison"
        TERMINEE = "TERMINEE", "Livrée et commerçant payé"
        ERREUR = "ERREUR", "Erreur"

    reference = models.CharField(
        max_length=64, unique=True
    )  # la même référence que chez Bitnob
    montant_sats = models.PositiveIntegerField()
    description = models.CharField(max_length=255)
    statut = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE
    )
    code_livraison = models.CharField(max_length=6, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    def generer_code(self):
        self.code_livraison = f"{secrets.randbelow(900000) + 100000}"

    def __str__(self):
        return f"{self.reference} ({self.statut})"


class WebhookEvent(models.Model):
    """Garde la trace des webhooks déjà traités, pour ne jamais les traiter deux fois."""

    event_id = models.CharField(max_length=128, unique=True)
    event = models.CharField(max_length=64, blank=True)
    payload = models.JSONField()
    recu_le = models.DateTimeField(auto_now_add=True)


class PaiementSortant(models.Model):
    """Facture Lightning payée avec le solde Bitnob : garde une trace de l'argent sorti."""

    reference = models.CharField(max_length=64, unique=True)
    facture = models.TextField()
    montant_sats = models.PositiveIntegerField(null=True, blank=True)
    statut = models.CharField(max_length=20, default="pending")  # paid / pending / failed
    reponse = models.JSONField(default=dict, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reference} ({self.statut})"
