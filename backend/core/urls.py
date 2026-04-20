# backend/core/urls.py

from django.contrib import admin
from django.urls import path
from components.views import save_session, get_last_session

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/ia/session/save/",    save_session,      name="ia-save"),
    path("api/ia/session/last/",    get_last_session,  name="ia-last"),
]
