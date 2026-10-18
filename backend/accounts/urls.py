from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import session_views, views

urlpatterns = [
    # Frontend : session par cookie, chemins sans slash final (frontend/docs/API_ENDPOINTS.md)
    path('auth/session', session_views.SessionView.as_view()),
    path('auth/login', session_views.LoginView.as_view()),
    path('auth/register', session_views.RegisterView.as_view()),
    path('auth/logout', session_views.LogoutView.as_view()),
    path('auth/password/forgot', session_views.PasswordForgotView.as_view()),
    path('auth/password/reset', session_views.PasswordResetView.as_view()),
    path('auth/password/change', session_views.PasswordChangeView.as_view()),
    path('auth/me', session_views.MeView.as_view()),
    # Jetons JWT (Swagger, autres clients)
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/me/', views.MeView.as_view(), name='me'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change-password'),
]
