# backend/components/models.py

from django.db import models


class IASession(models.Model):
    """Une session = une exécution de l'IA sur une map."""
    created_at = models.DateTimeField(auto_now_add=True)
    map_rows   = models.IntegerField()
    map_cols   = models.IntegerField()

    def __str__(self):
        return f"Session #{self.id} ({self.created_at:%Y-%m-%d %H:%M})"


class Collectible(models.Model):
    """Position d'un collectible sur la map pour une session donnée."""
    session = models.ForeignKey(IASession, on_delete=models.CASCADE, related_name="collectibles")
    x       = models.IntegerField()  # colonne
    y       = models.IntegerField()  # ligne

    def __str__(self):
        return f"Collectible ({self.x}, {self.y}) — session #{self.session_id}"