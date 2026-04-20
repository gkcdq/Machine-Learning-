# backend/components/views.py

import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import IASession, Collectible


@csrf_exempt
@require_http_methods(["POST"])
def save_session(request):
    """
    Reçoit la map du frontend au moment du START.
    Body JSON attendu :
    {
        "rows": 15,
        "cols": 20,
        "collectibles": [[x, y], [x, y], ...]
    }
    """
    try:
        data = json.loads(request.body)
        rows         = data["rows"]
        cols         = data["cols"]
        collectibles = data["collectibles"]  # [[x, y], ...]

        session = IASession.objects.create(map_rows=rows, map_cols=cols)
        Collectible.objects.bulk_create([
            Collectible(session=session, x=item[0], y=item[1])
            for item in collectibles
        ])

        return JsonResponse({
            "status": "ok",
            "session_id": session.id,
            "collectibles_saved": len(collectibles),
        })

    except (KeyError, json.JSONDecodeError) as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)


@require_http_methods(["GET"])
def get_last_session(request):
    """
    Retourne la dernière session enregistrée avec ses collectibles.
    """
    session = IASession.objects.order_by("-created_at").first()
    if not session:
        return JsonResponse({"status": "empty"}, status=404)

    collectibles = list(session.collectibles.values("x", "y"))

    return JsonResponse({
        "status": "ok",
        "session_id": session.id,
        "rows": session.map_rows,
        "cols": session.map_cols,
        "collectibles": collectibles,  # [{"x": 3, "y": 2}, ...]
    })