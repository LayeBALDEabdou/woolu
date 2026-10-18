"""Authentification par cookie de session httpOnly (frontend/docs/API_ENDPOINTS.md)."""

import re

from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import exceptions, serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from config.api_errors import error

from .emails import email_verification_token, read_token, send_password_reset_email, send_verification_email
from .serializers import SELF_REGISTER_ROLES, RegisterSerializer

User = get_user_model()
PHONE = re.compile(r'^\+?[0-9]{8,15}$')


def user_json(user):
    profile = getattr(user, 'account_profile', None)
    return {
        'id': str(user.id),
        'fullName': user.get_full_name() or user.email,
        'email': user.email,
        'phone': (profile.phone_number if profile else '') or None,
        'role': profile.role if profile else 'client',
        'createdAt': user.date_joined.isoformat().replace('+00:00', 'Z'),
    }


def session_json(user):
    return {'user': user_json(user), 'isDemo': False}


def split_name(full_name):
    first, _, last = full_name.strip().partition(' ')
    return first[:150], last.strip()[:150]


def clean_phone(value):
    return re.sub(r'[\s.\-()]', '', value or '')


class PhoneField(serializers.CharField):
    def to_internal_value(self, data):
        phone = clean_phone(super().to_internal_value(data))
        if phone and not PHONE.match(phone):
            raise serializers.ValidationError('Numéro de téléphone invalide.')
        return phone


class PublicAuthView(APIView):
    # Pas encore connecté : pas de jeton CSRF à vérifier, mais un nombre d'essais limité
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]


@method_decorator(ensure_csrf_cookie, name='dispatch')
class SessionView(APIView):
    """Session courante. Pose aussi le cookie csrftoken lu par le frontend."""

    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            raise exceptions.NotAuthenticated()
        return Response(session_json(request.user))


class LoginInput(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class LoginView(PublicAuthView):
    throttle_scope = 'login'

    def post(self, request):
        data = LoginInput(data=request.data)
        data.is_valid(raise_exception=True)
        account = User.objects.filter(email__iexact=data.validated_data['email'].strip()).first()
        user = account and authenticate(
            request, username=account.get_username(), password=data.validated_data['password']
        )
        if not user:
            # Message identique que le compte existe ou non
            raise exceptions.AuthenticationFailed('Adresse e-mail ou mot de passe incorrect.')
        # Vérifié après le mot de passe : on ne révèle rien sur un compte qu'on ne possède pas
        if not user.account_profile.email_verified:
            return error(
                'EMAIL_NOT_VERIFIED',
                'Confirmez votre adresse e-mail avec le lien reçu à l\'inscription avant de vous connecter.',
                status.HTTP_403_FORBIDDEN,
            )
        login(request, user)
        return Response(session_json(user))


class RegisterInput(serializers.Serializer):
    fullName = serializers.CharField(max_length=300)
    email = serializers.EmailField()
    phone = PhoneField(required=False, allow_blank=True, allow_null=True)
    role = serializers.ChoiceField(choices=[role.value for role in SELF_REGISTER_ROLES])
    password = serializers.CharField()


# Champs de RegisterSerializer -> champs du frontend, pour les messages d'erreur
REGISTER_FIELDS = {'first_name': 'fullName', 'last_name': 'fullName', 'phone_number': 'phone'}


class RegisterView(PublicAuthView):
    throttle_scope = 'register'

    def post(self, request):
        data = RegisterInput(data=request.data)
        data.is_valid(raise_exception=True)
        data = data.validated_data
        first_name, last_name = split_name(data['fullName'])
        # Règles communes : email unique, mot de passe solide
        register = RegisterSerializer(
            data={
                'email': data['email'],
                'password': data['password'],
                'first_name': first_name,
                'last_name': last_name,
                'phone_number': data.get('phone') or '',
                'role': data['role'],
            }
        )
        if not register.is_valid():
            errors = register.errors
            # validate_password signale le mot de passe dans les erreurs générales
            if 'non_field_errors' in errors:
                errors = {**errors, 'password': errors.pop('non_field_errors')}
            raise serializers.ValidationError({REGISTER_FIELDS.get(k, k): v for k, v in errors.items()})
        user = register.save()
        send_verification_email(user)
        # Pas de session : le compte s'active avec le lien reçu par email
        return Response({'user': user_json(user), 'verificationRequired': True}, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ForgotInput(serializers.Serializer):
    email = serializers.EmailField()


class PasswordForgotView(PublicAuthView):
    throttle_scope = 'password'

    def post(self, request):
        data = ForgotInput(data=request.data)
        data.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=data.validated_data['email'].strip(), is_active=True).first()
        if user:
            send_password_reset_email(user)
        # Même réponse si le compte n'existe pas : on ne révèle rien
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResetInput(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField()


class PasswordResetView(PublicAuthView):
    throttle_scope = 'password'

    def post(self, request):
        data = ResetInput(data=request.data)
        data.is_valid(raise_exception=True)
        user = read_token(data.validated_data['token'], default_token_generator)
        if not user:
            raise serializers.ValidationError('Ce lien de réinitialisation est invalide ou a expiré.')
        try:
            validate_password(data.validated_data['password'], user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': error.messages})
        user.set_password(data.validated_data['password'])
        user.save(update_fields=['password'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class TokenInput(serializers.Serializer):
    token = serializers.CharField()


class VerifyEmailView(PublicAuthView):
    throttle_scope = 'email'

    def post(self, request):
        data = TokenInput(data=request.data)
        data.is_valid(raise_exception=True)
        user = read_token(data.validated_data['token'], email_verification_token)
        if not user:
            raise serializers.ValidationError('Ce lien de confirmation est invalide ou a expiré.')
        user.account_profile.email_verified = True
        user.account_profile.save(update_fields=['email_verified'])
        # Le lien prouve l'accès à la boîte mail : on connecte directement
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        return Response(session_json(user))


class ResendVerificationView(PublicAuthView):
    throttle_scope = 'email'

    def post(self, request):
        data = ForgotInput(data=request.data)
        data.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=data.validated_data['email'].strip(),
            is_active=True,
            account_profile__email_verified=False,
        ).first()
        if user:
            send_verification_email(user)
        # Même réponse si le compte n'existe pas ou est déjà confirmé
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileInput(serializers.Serializer):
    fullName = serializers.CharField(max_length=300)
    phone = PhoneField(required=False, allow_blank=True, allow_null=True)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        data = ProfileInput(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        user = request.user
        if 'fullName' in data.validated_data:
            user.first_name, user.last_name = split_name(data.validated_data['fullName'])
            user.save(update_fields=['first_name', 'last_name'])
        if 'phone' in data.validated_data:
            user.account_profile.phone_number = data.validated_data['phone'] or ''
            user.account_profile.save(update_fields=['phone_number'])
        return Response(user_json(user))


class ChangeInput(serializers.Serializer):
    currentPassword = serializers.CharField()
    newPassword = serializers.CharField()


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = ChangeInput(data=request.data)
        data.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(data.validated_data['currentPassword']):
            raise serializers.ValidationError({'currentPassword': 'Mot de passe actuel incorrect.'})
        try:
            validate_password(data.validated_data['newPassword'], user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'newPassword': error.messages})
        user.set_password(data.validated_data['newPassword'])
        user.save(update_fields=['password'])
        # Garde cette session ouverte ; les autres sessions sont fermées
        update_session_auth_hash(request, user)
        return Response(status=status.HTTP_204_NO_CONTENT)
