from django.db import models
from django.utils.text import slugify

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            # Use name as slug if slugify doesn't work well (for Japanese)
            slug_candidate = slugify(self.name)
            if not slug_candidate:
                slug_candidate = self.name
            self.slug = slug_candidate
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    image = models.ImageField(upload_to='articles/', null=True, blank=True)
    tags = models.ManyToManyField(Tag, related_name='articles', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Product(models.Model):
    article = models.ForeignKey(Article, related_name='products', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    url = models.URLField()
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    thumbnail = models.ImageField(upload_to='products/', null=True, blank=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class Comment(models.Model):
    article = models.ForeignKey(Article, related_name='comments', on_delete=models.CASCADE)
    author_name = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Comment by {self.author_name} on {self.article.title}'

