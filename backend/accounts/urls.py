from django.urls import path

from . import views

urlpatterns = [
    # Chemins sans slash final : contrat d'API du frontend (frontend/docs/API_ENDPOINTS.md)
    path('auth/session', views.SessionView.as_view()),
    path('auth/login', views.LoginView.as_view()),
    path('auth/register', views.RegisterView.as_view()),
    path('auth/logout', views.LogoutView.as_view()),
    path('auth/email/verify', views.VerifyEmailView.as_view()),
    path('auth/email/resend', views.ResendVerificationView.as_view()),
    path('auth/password/forgot', views.PasswordForgotView.as_view()),
    path('auth/password/reset', views.PasswordResetView.as_view()),
    path('auth/password/change', views.PasswordChangeView.as_view()),
    path('auth/me', views.MeView.as_view()),
]
