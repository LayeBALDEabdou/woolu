from django.urls import path

from . import views

urlpatterns = [
    path("whoami/", views.whoami),
    path("commandes/", views.creer_commande),
    path("commandes/<str:reference>/", views.statut_commande),
    path("factures/decoder/", views.decoder_facture),
    path("factures/payer/", views.payer_facture),
    path("webhooks/bitnob/", views.webhook_bitnob),
]
