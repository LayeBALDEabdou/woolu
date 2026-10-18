# Backend Wòolu

## Installation

Depuis le dossier `backend` :

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Sous Windows PowerShell, activer l'environnement avec `.venv\Scripts\Activate.ps1`. Renseigner
ensuite les variables du fichier `.env`. Pour les paiements
de transaction, configurer les identifiants API Bitnob, le secret webhook et
`BITNOB_XOF_PER_USDC` (nombre de XOF pour 1 USDC, à mettre à jour depuis une source de change
validée). Sans taux positif et identifiants Bitnob, la création d'une adresse de paiement est
refusée. Dans la console Bitnob, déclarer `https://<domaine-api>/payments/webhooks/bitnob/` comme
URL de webhook et activer les notifications de dépôts USDC.

## Démarrage

```bash
python manage.py migrate
python manage.py runserver
```

## Tests

```bash
python manage.py test
```
