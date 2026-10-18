from django.urls import path

from . import views

urlpatterns = [
    path("whoami/", views.whoami),
    path("adresses/", views.creer_adresse),
    path("adresses/<str:reference>/", views.statut_adresse),
    path("envois/", views.envoyer_usdc),
    path("webhooks/bitnob/", views.webhook_bitnob),
]
