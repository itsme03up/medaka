import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from articles.models import Article, Comment

# Get the existing article
article = Article.objects.first()

if article:
    # Add some sample comments
    Comment.objects.create(
        article=article,
        author_name="田中",
        content="データベースの最適化、素晴らしいアイデアですね！うちのプロジェクトでも試してみようと思います。"
    )

    Comment.objects.create(
        article=article,
        author_name="佐藤",
        content="インデックスを追加するだけで40%も改善するなんて驚きです。参考になりました！"
    )

    print("Sample comments added successfully.")
else:
    print("No articles found. Please create an article first.")
