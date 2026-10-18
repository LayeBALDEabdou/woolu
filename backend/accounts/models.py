from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from django.db import models


class Role(models.TextChoices):
    CLIENT = 'client', 'Client'
    VENDEUR = 'vendeur', 'Vendeur'
    PRESTATAIRE = 'prestataire', 'Prestataire'
    ADMIN = 'admin', 'Administrateur'


class UserProfile(models.Model):
    user = models.OneToOneField(
        get_user_model(),
        on_delete=models.CASCADE,
        related_name='account_profile',
    )
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CLIENT)
    phone_number = models.CharField(
        max_length=16,
        blank=True,
        validators=[RegexValidator(r'^\+?[0-9]{8,15}$', 'Numéro de téléphone invalide.')],
    )

    def __str__(self):
        return f'{self.user.email or self.user.username} ({self.role})'
