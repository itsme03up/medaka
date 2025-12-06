from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import messages
from .models import Article, Comment, Tag

def article_list(request):
    # Get tag slug from query parameter
    tag_slug = request.GET.get('tag')
    selected_tag = None

    articles = Article.objects.all()

    # Filter by tag if specified
    if tag_slug:
        selected_tag = get_object_or_404(Tag, slug=tag_slug)
        articles = articles.filter(tags=selected_tag)

    articles = articles.order_by('-created_at')
    all_tags = Tag.objects.all()

    return render(request, 'articles/article_list.html', {
        'articles': articles,
        'all_tags': all_tags,
        'selected_tag': selected_tag
    })

def article_detail(request, pk):
    article = get_object_or_404(Article, pk=pk)

    # Handle comment submission
    if request.method == 'POST':
        author_name = request.POST.get('author_name', '').strip()
        content = request.POST.get('content', '').strip()

        if author_name and content:
            Comment.objects.create(
                article=article,
                author_name=author_name,
                content=content
            )
            messages.success(request, 'コメントを投稿しました！')
            return redirect('article_detail', pk=pk)
        else:
            messages.error(request, '名前とコメント内容を入力してください。')

    comments = article.comments.all()
    return render(request, 'articles/article_detail.html', {
        'article': article,
        'comments': comments
    })

def add_comment(request, pk):
    """Add comment from article list page"""
    if request.method == 'POST':
        article = get_object_or_404(Article, pk=pk)
        author_name = request.POST.get('author_name', '').strip()
        content = request.POST.get('content', '').strip()

        if author_name and content:
            Comment.objects.create(
                article=article,
                author_name=author_name,
                content=content
            )
            messages.success(request, 'コメントを投稿しました！')
        else:
            messages.error(request, '名前とコメント内容を入力してください。')

    # Redirect back to article list, preserving tag filter if present
    tag_slug = request.GET.get('tag', '')
    if tag_slug:
        return redirect(f'/ideas/?tag={tag_slug}')
    return redirect('article_list')

@staff_member_required
def article_delete(request, pk):
    article = get_object_or_404(Article, pk=pk)
    if request.method == 'POST':
        article.delete()
        return redirect('article_list')
    return render(request, 'articles/article_confirm_delete.html', {'article': article})
