from django.contrib import admin

from .models import AdresseDepot, EnvoiUsdc, WebhookEvent


@admin.register(AdresseDepot)
class AdresseDepotAdmin(admin.ModelAdmin):
    list_display = ("reference", "reseau", "adresse", "statut", "montant", "devise", "cree_le")
    list_filter = ("statut", "reseau")
    search_fields = ("reference", "adresse")


@admin.register(EnvoiUsdc)
class EnvoiUsdcAdmin(admin.ModelAdmin):
    list_display = ("reference", "reseau", "adresse", "montant", "statut", "cree_le")
    list_filter = ("statut", "reseau")
    search_fields = ("reference", "adresse")
    readonly_fields = ("reference", "adresse", "reseau", "montant", "statut", "reponse", "cree_le")


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ("event_id", "event", "recu_le")
    search_fields = ("event_id", "event")
    readonly_fields = ("event_id", "event", "payload", "recu_le")
