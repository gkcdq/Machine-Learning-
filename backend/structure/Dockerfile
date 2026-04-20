FROM python:3.11-slim

# Dépendances système pour PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation de Django et du driver PostgreSQL
RUN pip install --no-cache-dir django psycopg2-binary gunicorn django-cors-headers

# CORRECTION ICI : un seul point pour copier le dossier local (backend/)
COPY . .

# Commande pour lancer le serveur de dev
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]