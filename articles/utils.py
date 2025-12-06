import requests
from bs4 import BeautifulSoup
from django.core.files.base import ContentFile
from urllib.parse import urlparse
import os

def fetch_product_info(url):
    """
    Fetch product information from URL using Open Graph tags
    Returns: dict with title, description, and image_url
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Extract Open Graph meta tags
        title = None
        description = None
        image_url = None

        # Try og:title
        og_title = soup.find('meta', property='og:title')
        if og_title:
            title = og_title.get('content')

        # Fallback to <title> tag
        if not title:
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.string

        # Try og:description
        og_desc = soup.find('meta', property='og:description')
        if og_desc:
            description = og_desc.get('content')

        # Fallback to meta description
        if not description:
            meta_desc = soup.find('meta', {'name': 'description'})
            if meta_desc:
                description = meta_desc.get('content')

        # Try og:image
        og_image = soup.find('meta', property='og:image')
        if og_image:
            image_url = og_image.get('content')

        return {
            'title': title,
            'description': description,
            'image_url': image_url
        }

    except Exception as e:
        print(f"Error fetching product info: {e}")
        return None

def download_image(image_url):
    """
    Download image from URL and return ContentFile
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(image_url, headers=headers, timeout=10)
        response.raise_for_status()

        # Get filename from URL
        parsed_url = urlparse(image_url)
        filename = os.path.basename(parsed_url.path)

        # If no extension, default to jpg
        if '.' not in filename:
            filename = 'product.jpg'

        return ContentFile(response.content), filename

    except Exception as e:
        print(f"Error downloading image: {e}")
        return None, None
