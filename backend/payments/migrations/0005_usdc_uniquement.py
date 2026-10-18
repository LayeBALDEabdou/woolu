# Retrait du Lightning : seuls les dépôts et envois USDC restent

from django.db import migrations, models


def supprimer_paiements_lightning(apps, schema_editor):
    apps.get_model("payments", "PaiementSortant").objects.exclude(devise="USDC").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0004_paiementsortant_devise_paiementsortant_montant_and_more"),
    ]

    operations = [
        migrations.DeleteModel(name="Commande"),
        migrations.RunPython(supprimer_paiements_lightning, migrations.RunPython.noop),
        migrations.RenameModel(old_name="PaiementSortant", new_name="EnvoiUsdc"),
        migrations.RenameField(model_name="envoiusdc", old_name="facture", new_name="adresse"),
        migrations.RemoveField(model_name="envoiusdc", name="devise"),
        migrations.RemoveField(model_name="envoiusdc", name="montant_sats"),
        migrations.AlterField(model_name="envoiusdc", name="adresse", field=models.CharField(max_length=128)),
        migrations.AlterField(model_name="envoiusdc", name="reseau", field=models.CharField(max_length=20)),
        migrations.AlterField(model_name="envoiusdc", name="montant", field=models.CharField(max_length=40)),
        migrations.AlterField(
            model_name="envoiusdc",
            name="reference",
            field=models.CharField(max_length=64, unique=True),
        ),
        migrations.AlterField(
            model_name="envoiusdc",
            name="statut",
            field=models.CharField(default="pending", max_length=20),
        ),
        migrations.AlterModelOptions(
            name="envoiusdc",
            options={"verbose_name": "envoi USDC", "verbose_name_plural": "envois USDC"},
        ),
    ]
