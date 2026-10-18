import uuid

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Role

User = get_user_model()
SELF_REGISTER_ROLES = (Role.CLIENT, Role.VENDEUR, Role.PRESTATAIRE)


class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='account_profile.role', read_only=True)
    phone_number = serializers.CharField(
        source='account_profile.phone_number',
        read_only=True,
    )

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'phone_number',
            'role',
            'date_joined',
        )
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone_number = serializers.RegexField(
        r'^\+?[0-9]{8,15}$',
        required=False,
        allow_blank=True,
        max_length=16,
    )
    role = serializers.ChoiceField(
        choices=[(role.value, role.label) for role in SELF_REGISTER_ROLES],
    )

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists() or User.objects.filter(
            username__iexact=value
        ).exists():
            raise serializers.ValidationError('Un compte existe déjà avec cet email.')
        return value

    def validate(self, attrs):
        probe = User(email=attrs['email'])
        validate_password(attrs['password'], probe)
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user_data = dict(validated_data)
        role = user_data.pop('role')
        phone_number = user_data.pop('phone_number', '')
        email = user_data['email']
        user_data['username'] = uuid.uuid4().hex

        try:
            with transaction.atomic():
                user = User.objects.create_user(**user_data)
        except IntegrityError as error:
            if User.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError(
                    {'email': 'Un compte existe déjà avec cet email.'}
                ) from error
            raise

        profile = user.account_profile
        profile.role = role
        profile.phone_number = phone_number
        profile.save(update_fields=['role', 'phone_number'])
        return user


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.account_profile.role
        return token

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field, None)
        self.fields['email'] = serializers.EmailField()

    def validate(self, attrs):
        email = attrs.pop('email').strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            raise AuthenticationFailed('Email ou mot de passe incorrect.')
        attrs[self.username_field] = user.get_username()
        try:
            data = super().validate(attrs)
        except AuthenticationFailed as error:
            raise AuthenticationFailed('Email ou mot de passe incorrect.') from error
        if not self.user.account_profile.email_verified:
            raise PermissionDenied("Confirmez votre adresse e-mail avant de vous connecter.")
        data['user'] = UserSerializer(self.user).data
        return data


class ProfileUpdateSerializer(serializers.ModelSerializer):
    phone_number = serializers.RegexField(
        r'^\+?[0-9]{8,15}$',
        source='account_profile.phone_number',
        required=False,
        allow_blank=True,
        max_length=16,
    )

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone_number')

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('account_profile', {})
        instance = super().update(instance, validated_data)
        if 'phone_number' in profile_data:
            instance.account_profile.phone_number = profile_data['phone_number']
            instance.account_profile.save(update_fields=['phone_number'])
        return instance


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Ancien mot de passe incorrect.')
        return value

    def validate_new_password(self, value):
        validate_password(value, self.context['request'].user)
        return value
