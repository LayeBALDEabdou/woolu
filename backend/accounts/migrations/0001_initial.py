import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def create_existing_profiles(apps, schema_editor):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split('.'))
    UserProfile = apps.get_model('accounts', 'UserProfile')
    database = schema_editor.connection.alias
    profiles = (
        UserProfile(
            user_id=user.pk,
            role='admin' if user.is_superuser else 'client',
        )
        for user in User.objects.using(database).all().iterator()
    )
    UserProfile.objects.using(database).bulk_create(profiles, batch_size=500)


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('client', 'Client'), ('prestataire', 'Prestataire'), ('admin', 'Administrateur')], default='client', max_length=20)),
                ('phone_number', models.CharField(blank=True, max_length=16, validators=[django.core.validators.RegexValidator('^\\+?[0-9]{8,15}$', 'Numéro de téléphone invalide.')])),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='account_profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.RunPython(create_existing_profiles, migrations.RunPython.noop),
    ]
