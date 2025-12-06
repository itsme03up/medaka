from django.contrib import admin
from django import forms
from .models import Article, Product, Comment, Tag
from .utils import fetch_product_info, download_image

class ProductAdminForm(forms.ModelForm):
    fetch_from_url = forms.BooleanField(
        required=False,
        initial=True,
        help_text='URLから商品情報を自動取得する'
    )

    class Meta:
        model = Product
        fields = '__all__'

    def save(self, commit=True):
        instance = super().save(commit=False)

        # If URL is provided and fetch_from_url is checked
        if self.cleaned_data.get('fetch_from_url') and instance.url:
            product_info = fetch_product_info(instance.url)

            if product_info:
                # Auto-fill name if empty
                if not instance.name and product_info.get('title'):
                    instance.name = product_info['title'][:200]  # Limit to field max_length

                # Auto-fill description if empty
                if not instance.description and product_info.get('description'):
                    instance.description = product_info['description']

                # Download and save image if not already set
                if not instance.thumbnail and product_info.get('image_url'):
                    image_content, filename = download_image(product_info['image_url'])
                    if image_content:
                        instance.thumbnail.save(filename, image_content, save=False)

        if commit:
            instance.save()
        return instance

class ProductInline(admin.TabularInline):
    model = Product
    extra = 1

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    inlines = [ProductInline]
    list_display = ('title', 'created_at', 'display_tags')
    filter_horizontal = ('tags',)

    def display_tags(self, obj):
        return ", ".join([tag.name for tag in obj.tags.all()])
    display_tags.short_description = 'Tags'

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    form = ProductAdminForm
    list_display = ('name', 'article', 'price')
    fieldsets = (
        ('商品情報', {
            'fields': ('article', 'url', 'fetch_from_url')
        }),
        ('詳細（自動入力されます）', {
            'fields': ('name', 'description', 'price', 'thumbnail'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author_name', 'article', 'created_at', 'content_preview')
    list_filter = ('created_at', 'article')
    search_fields = ('author_name', 'content')

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Comment'

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'article_count', 'created_at')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)

    def article_count(self, obj):
        return obj.articles.count()
    article_count.short_description = 'Articles'


