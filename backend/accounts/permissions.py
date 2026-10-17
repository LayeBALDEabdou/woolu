from rest_framework.permissions import BasePermission

from .models import Role


class _HasRole(BasePermission):
    role = None
    message = "Votre rôle ne permet pas d'accéder à cette ressource."

    def has_permission(self, request, view):
        user = request.user
        profile = getattr(user, 'account_profile', None)
        return bool(user and user.is_authenticated and profile and profile.role == self.role)


class IsClient(_HasRole):
    role = Role.CLIENT


class IsPrestataire(_HasRole):
    role = Role.PRESTATAIRE


class IsAdmin(_HasRole):
    role = Role.ADMIN
