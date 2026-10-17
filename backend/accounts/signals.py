from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Role, UserProfile


@receiver(post_save, sender=get_user_model())
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        role = Role.ADMIN if instance.is_superuser else Role.CLIENT
        UserProfile.objects.get_or_create(user=instance, defaults={'role': role})
