from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


class LogoutView(APIView):
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data['refresh'])
        except TokenError:
            return Response(
                {'detail': 'Jeton invalide ou déjà révoqué.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_user_id = token.get(api_settings.USER_ID_CLAIM)
        request_user_id = getattr(request.user, api_settings.USER_ID_FIELD)
        if str(token_user_id) != str(request_user_id):
            return Response(
                {'detail': 'Ce jeton ne correspond pas à votre compte.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        token.blacklist()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        return UserSerializer if self.request.method == 'GET' else ProfileUpdateSerializer

    def partial_update(self, request, *args, **kwargs):
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    @transaction.atomic
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
        return Response({'detail': 'Mot de passe modifié. Reconnectez-vous.'})
