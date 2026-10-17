from django.urls import path

from . import views

urlpatterns = [
    path("whoami/", views.whoami),
    path("commandes/", views.creer_commande),
    path("webhooks/bitnob/", views.webhook_bitnob),
]
