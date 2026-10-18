from django.db import models


class AdresseDepot(models.Model):
    """Adresse USDC générée par Bitnob pour recevoir un dépôt."""

    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente du dépôt"
        RECU = "RECU", "Dépôt reçu"

    reference = models.CharField(max_length=64, unique=True)
    reseau = models.CharField(max_length=20)  # chain Bitnob : solana, polygon...
    adresse = models.CharField(max_length=128, db_index=True)
    bitnob_id = models.CharField(max_length=64, blank=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    montant = models.CharField(max_length=40, blank=True)  # tel que renvoyé par Bitnob
    devise = models.CharField(max_length=10, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reseau} {self.adresse} ({self.statut})"


class EnvoiUsdc(models.Model):
    """USDC envoyés depuis le solde Bitnob : garde une trace de l'argent sorti."""

    reference = models.CharField(max_length=64, unique=True)  # aussi la clé d'idempotence Bitnob
    adresse = models.CharField(max_length=128)
    reseau = models.CharField(max_length=20)
    montant = models.CharField(max_length=40)  # en USDC, ex : "1.5"
    statut = models.CharField(max_length=20, default="pending")  # pending / completed / failed
    reponse = models.JSONField(default=dict, blank=True)
    cree_le = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "envoi USDC"
        verbose_name_plural = "envois USDC"

    def __str__(self):
        return f"{self.montant} USDC vers {self.adresse} ({self.statut})"


class WebhookEvent(models.Model):
    """Garde la trace des webhooks déjà traités, pour ne jamais les traiter deux fois."""

    event_id = models.CharField(max_length=128, unique=True)
    event = models.CharField(max_length=64, blank=True)
    payload = models.JSONField()
    recu_le = models.DateTimeField(auto_now_add=True)
