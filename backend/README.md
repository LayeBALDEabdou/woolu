# Backend Wòolu

## Installation

Depuis le dossier `backend` :

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Copier `.env.example` vers `.env`, puis renseigner les variables requises.

## Démarrage

```bash
python manage.py migrate
python manage.py runserver
```

## Tests

```bash
python manage.py test
```
