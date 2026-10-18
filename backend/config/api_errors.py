"""Erreurs au format attendu par le frontend : {code, message, fieldErrors} (frontend/src/lib/api/errors.ts)."""

from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response


def error(code, message, http_status, field_errors=None):
    return Response({'code': code, 'message': message, 'fieldErrors': field_errors or {}}, status=http_status)


def first_message(value):
    while isinstance(value, (list, dict)):
        value = next(iter(value.values() if isinstance(value, dict) else value), '')
    return str(value)


def exception_handler(exc, context):
    if isinstance(exc, Http404):
        return error('NOT_FOUND', "L'élément demandé est introuvable.", status.HTTP_404_NOT_FOUND)
    if isinstance(exc, exceptions.ValidationError):
        detail = exc.detail if isinstance(exc.detail, dict) else {'non_field_errors': exc.detail}
        general = detail.pop('non_field_errors', None)
        fields = {name: first_message(messages) for name, messages in detail.items()}
        message = first_message(general) if general else 'Certaines informations sont invalides.'
        return error('VALIDATION', message, status.HTTP_400_BAD_REQUEST, fields)
    if isinstance(exc, exceptions.NotAuthenticated):
        return error('UNAUTHENTICATED', 'Votre session a expiré. Veuillez vous reconnecter.', status.HTTP_401_UNAUTHORIZED)
    if isinstance(exc, exceptions.AuthenticationFailed):
        return error('UNAUTHENTICATED', str(exc.detail), status.HTTP_401_UNAUTHORIZED)
    if isinstance(exc, exceptions.PermissionDenied):
        message = str(exc.detail)
        if message.startswith('CSRF Failed'):
            message = 'Votre session a expiré. Rechargez la page puis réessayez.'
        return error('FORBIDDEN', message, status.HTTP_403_FORBIDDEN)
    if isinstance(exc, exceptions.Throttled):
        return error('RATE_LIMITED', 'Trop de tentatives. Patientez quelques instants avant de réessayer.', status.HTTP_429_TOO_MANY_REQUESTS)
    if isinstance(exc, exceptions.APIException):
        return error('SERVER', str(exc.detail), exc.status_code)
    return None


class ApiErrorsMixin:
    """À mettre sur une APIView pour qu'elle réponde dans ce format."""

    def get_exception_handler(self):
        return exception_handler
