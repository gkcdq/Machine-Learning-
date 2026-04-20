# backend/src/IA.py

import os
import sys
import django

# ── Setup Django (nécessaire si IA.py est appelé hors du serveur Django) ──────
# Pointe vers le dossier backend/ qui contient core/settings.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

# ── Imports après django.setup() ──────────────────────────────────────────────
from components.models import IASession, Collectible


def save_map_data(collectibles: list[tuple[int, int]], rows: int, cols: int) -> IASession:
    """
    Enregistre une nouvelle session IA avec ses collectibles en base.

    Args:
        collectibles : liste de tuples (x, y) — x = col, y = row
        rows         : nombre de lignes de la grille
        cols         : nombre de colonnes de la grille

    Returns:
        L'objet IASession créé
    """
    session = IASession.objects.create(map_rows=rows, map_cols=cols)

    Collectible.objects.bulk_create([
        Collectible(session=session, x=x, y=y)
        for (x, y) in collectibles
    ])

    print(f"[IA] Session #{session.id} créée — {len(collectibles)} collectible(s) enregistré(s)")
    return session


def load_last_session() -> tuple[IASession | None, list[tuple[int, int]]]:
    """
    Charge la dernière session IA depuis la base.

    Returns:
        (session, [(x, y), ...]) ou (None, []) si aucune session
    """
    session = IASession.objects.order_by("-created_at").first()
    if not session:
        print("[IA] Aucune session trouvée en base.")
        return None, []

    collectibles = list(
        session.collectibles.values_list("x", "y")
    )
    print(f"[IA] Session #{session.id} chargée — {len(collectibles)} collectible(s)")
    return session, collectibles


# ── Point d'entrée pour test rapide ───────────────────────────────────────────
if __name__ == "__main__":
    # Exemple : sauvegarde une map de test
    test_collectibles = [(3, 2), (7, 5), (12, 9)]
    save_map_data(test_collectibles, rows=15, cols=20)

    # Recharge la dernière session
    session, items = load_last_session()
    print("Collectibles récupérés :", items)