# --- CONFIGURATION ---
NAME     = ML
# Cette ligne permet d'utiliser 'docker' par défaut, 
# mais de passer sur 'podman' via la commande : make DOCKER=podman
DOCKER   ?= docker

# --- COULEURS ---
CYAN     = \033[0;36m
GREEN    = \033[0;32m
RED      = \033[0;31m
RESET    = \033[0m

# --- COMMANDES DOCKER ---

all: up

# Build et lancement (Utilise 'podman compose' ou 'docker compose')
up:
	@echo "$(CYAN)Lancement de $(NAME)...$(RESET)"
	$(DOCKER) compose up --build -d

# Arrêt
stop:
	@echo "$(RED)Arrêt des containers...$(RESET)"
	$(DOCKER) compose stop

# Down
down:
	@echo "$(RED)Suppression des containers...$(RESET)"
	$(DOCKER) compose down

# --- DJANGO & DATABASE ---

# Appliquer les migrations Django
migrate:
	@echo "$(GREEN)Application des migrations Django...$(RESET)"
	$(DOCKER) exec -it backend python manage.py makemigrations
	$(DOCKER) exec -it backend python manage.py migrate

# Créer un superuser Django (admin)
superuser:
	$(DOCKER) exec -it backend python manage.py createsuperuser

# --- NETTOYAGE ---

# Nettoyage complet (Supprime TOUT : images, volumes db, containers)
fclean:
	@echo "$(RED)Nettoyage total en cours...$(RESET)"
	$(DOCKER) compose down -v
	rm -rf frontend/node_modules
	rm -rf backend/__pycache__

re: fclean all

# --- DEBUG ---

logs:
	$(DOCKER) compose logs -f

ps:
	$(DOCKER) compose ps

.PHONY: all up stop down migrate superuser fclean re logs ps 