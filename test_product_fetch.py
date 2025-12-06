"""
Test the product auto-fetch functionality

Usage:
    python3 test_product_fetch.py

This will test fetching product info from an Amazon URL
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from articles.utils import fetch_product_info

# Test with a site that has Open Graph tags (GitHub repository)
test_url = "https://github.com/django/django"

print(f"Testing product info fetch from: {test_url}")
print("-" * 80)

result = fetch_product_info(test_url)

if result:
    print("✅ Success!")
    print(f"\nTitle: {result.get('title')}")
    print(f"\nDescription: {result.get('description')[:100]}..." if result.get('description') else "No description")
    print(f"\nImage URL: {result.get('image_url')}")
else:
    print("❌ Failed to fetch product info")

print("-" * 80)
print("\nYou can now use this in Django admin!")
print("Just paste a product URL and check 'URLから商品情報を自動取得する'")
