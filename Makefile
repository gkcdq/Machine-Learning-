# Nom de ton projet (Modifie-le ici)
NAME = ML

# Couleurs
CYAN  = \033[0;36m
GREEN = \033[0;32m
RED   = \033[0;31m
RESET = \033[0m

# --- COMMANDES DOCKER ---

all: up

# Build et lancement
up:
	@echo "$(CYAN)Lancement de $(NAME)...$(RESET)"
	docker compose up --build -d

# Arrêt
stop:
	@echo "$(RED)Arrêt des containers...$(RESET)"
	docker compose stop

# Down
down:
	@echo "$(RED)Suppression des containers...$(RESET)"
	docker compose down

# ... (et ainsi de suite pour toutes les occurrences)

# --- DJANGO & DATABASE ---

# Appliquer les migrations Django sans entrer dans le container
migrate:
	@echo "$(GREEN)Application des migrations Django...$(RESET)"
	docker exec -it backend python manage.py makemigrations
	docker exec -it backend python manage.py migrate

# Créer un superuser Django (admin)
superuser:
	docker exec -it backend python manage.py createsuperuser

# --- NETTOYAGE ---

# Nettoyage complet (Supprime TOUT : images, volumes db, containers)
fclean:
	@echo "$(RED)Nettoyage total en cours...$(RESET)"
	docker compose down -v
	rm -rf frontend/node_modules
	rm -rf backend/__pycache__

re: fclean all

# --- DEBUG ---

logs:
	docker-compose logs -f

ps:
	docker-compose ps

.PHONY: all up stop down migrate superuser fclean re logs ps