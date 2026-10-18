from django.urls import path

from . import views

# Sans slash final : chemins du contrat d'API du frontend (frontend/docs/API_ENDPOINTS.md)
urlpatterns = [
    path('transactions', views.TransactionListView.as_view()),
    path('transactions/<uuid:pk>', views.TransactionDetailView.as_view()),
    path('transactions/<uuid:pk>/send', views.SendView.as_view()),
    path('transactions/<uuid:pk>/accept', views.AcceptView.as_view()),
    path('transactions/<uuid:pk>/refuse', views.RefuseView.as_view()),
    path('transactions/<uuid:pk>/cancel', views.CancelView.as_view()),
    path('transactions/<uuid:pk>/delivery/start', views.StartDeliveryView.as_view()),
    path('transactions/<uuid:pk>/delivery/complete', views.CompleteDeliveryView.as_view()),
    path('transactions/<uuid:pk>/confirm-receipt', views.ConfirmReceiptView.as_view()),
    path('dashboard/summary', views.DashboardSummaryView.as_view()),
]
