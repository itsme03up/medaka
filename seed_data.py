import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from articles.models import Article, Product

# Clear existing data
Article.objects.all().delete()

# Create Article
article = Article.objects.create(
    title="Optimizing Database Queries",
    content="We noticed a significant latency spike in our primary DB. By adding indexes to the 'created_at' column and optimizing the join queries, we reduced load by 40%. This is a critical lesson for our infrastructure scaling."
)

# Create Product
Product.objects.create(
    article=article,
    name="Database Internals Book",
    url="https://amazon.com/dp/example",
    price=45.99,
    description="A deep dive into how databases work internally."
)

print("Seed data created successfully.")
