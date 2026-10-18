from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification, NotificationPreferences, notification_json


def preferences_json(preferences):
    return {
        'channels': preferences.channels,
        'categories': preferences.categories,
        'locale': preferences.locale,
    }


def get_preferences(user):
    preferences, _ = NotificationPreferences.objects.get_or_create(user=user)
    return preferences


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).select_related('transaction')
        return Response([notification_json(item) for item in notifications])


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = Notification.objects.filter(user=request.user, pk=notification_id).first()
        if not notification:
            return Response(
                {'code': 'NOT_FOUND', 'message': 'Notification introuvable.', 'fieldErrors': {}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=['read_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, read_at__isnull=True).update(read_at=timezone.now())
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationPreferencesInput(serializers.Serializer):
    channels = serializers.DictField(
        child=serializers.BooleanField(),
        allow_empty=False,
    )
    categories = serializers.DictField(
        child=serializers.BooleanField(),
        allow_empty=False,
    )
    locale = serializers.ChoiceField(choices=['fr', 'wo'])

    def validate_channels(self, value):
        expected = {'in_app', 'email', 'sms', 'voice'}
        if set(value) != expected:
            raise serializers.ValidationError('Les canaux fournis sont incomplets ou invalides.')
        if not value['in_app']:
            raise serializers.ValidationError("Les notifications dans l'application restent activées.")
        return value

    def validate_categories(self, value):
        expected = {'transactions', 'payments', 'disputes'}
        if set(value) != expected:
            raise serializers.ValidationError('Les catégories fournies sont incomplètes ou invalides.')
        return value


class NotificationPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(preferences_json(get_preferences(request.user)))

    def put(self, request):
        serializer = NotificationPreferencesInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        preferences = get_preferences(request.user)
        preferences.channels = serializer.validated_data['channels']
        preferences.categories = serializer.validated_data['categories']
        preferences.locale = serializer.validated_data['locale']
        preferences.save(update_fields=['channels', 'categories', 'locale'])
        return Response(preferences_json(preferences))
