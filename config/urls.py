from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.views import dashboard
from articles.views import article_list, article_detail, article_delete, add_comment

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', dashboard, name='dashboard'),
    path('ideas/', article_list, name='article_list'),
    path('article/<int:pk>/', article_detail, name='article_detail'),
    path('article/<int:pk>/delete/', article_delete, name='article_delete'),
    path('article/<int:pk>/comment/', add_comment, name='add_comment'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
