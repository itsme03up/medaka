import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from articles.models import Article, Tag

# Create tags
tech_tag, _ = Tag.objects.get_or_create(name="技術")
db_tag, _ = Tag.objects.get_or_create(name="データベース")
performance_tag, _ = Tag.objects.get_or_create(name="パフォーマンス")
infra_tag, _ = Tag.objects.get_or_create(name="インフラ")

# Get the existing article and add tags
article = Article.objects.first()

if article:
    article.tags.add(tech_tag, db_tag, performance_tag)
    print(f"Tags added to article: {article.title}")
else:
    print("No articles found.")
