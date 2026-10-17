from django.contrib import admin

from .models import Commande, PaiementSortant, WebhookEvent


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ("reference", "montant_sats", "description", "statut", "cree_le")
    list_filter = ("statut",)
    search_fields = ("reference", "description")


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ("event_id", "event", "recu_le")
    search_fields = ("event_id", "event")
    readonly_fields = ("event_id", "event", "payload", "recu_le")


@admin.register(PaiementSortant)
class PaiementSortantAdmin(admin.ModelAdmin):
    list_display = ("reference", "montant_sats", "statut", "cree_le")
    list_filter = ("statut",)
    readonly_fields = ("reference", "facture", "montant_sats", "statut", "reponse", "cree_le")
