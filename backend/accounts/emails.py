"""Emails envoyés aux utilisateurs et liens signés qu'ils contiennent."""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

log = logging.getLogger(__name__)


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    key_salt = 'accounts.emails.EmailVerificationTokenGenerator'

    def _make_hash_value(self, user, timestamp):
        # Le lien ne sert plus une fois l'email confirmé
        return f'{user.pk}{user.email}{user.account_profile.email_verified}{timestamp}'


email_verification_token = EmailVerificationTokenGenerator()


def make_token(user, generator):
    return f'{urlsafe_base64_encode(force_bytes(user.pk))}.{generator.make_token(user)}'


def read_token(value, generator):
    """L'utilisateur désigné par le jeton, ou None s'il est invalide ou expiré."""
    uid, _, token = value.partition('.')
    User = get_user_model()
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
    except (ValueError, User.DoesNotExist):
        return None
    return user if generator.check_token(user, token) else None


def send(user, subject, body):
    try:
        send_mail(subject, body, None, [user.email])
    except OSError:
        # SMTP injoignable ou refusé : on le note sans faire échouer la requête
        log.exception("Email « %s » non envoyé à l'utilisateur %s", subject, user.pk)


def send_verification_email(user):
    link = f'{settings.FRONTEND_URL}/verification-email?token={make_token(user, email_verification_token)}'
    send(
        user,
        'Confirmez votre adresse e-mail Wóolu',
        f'Bienvenue sur Wóolu ! Pour activer votre compte, ouvrez ce lien :\n\n{link}\n\n'
        "Si vous n'avez pas créé de compte, ignorez ce message.",
    )


def send_password_reset_email(user):
    link = f'{settings.FRONTEND_URL}/reinitialisation-mot-de-passe?token={make_token(user, default_token_generator)}'
    send(
        user,
        'Réinitialisation de votre mot de passe Wóolu',
        f'Pour choisir un nouveau mot de passe, ouvrez ce lien :\n\n{link}\n\n'
        "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    )
