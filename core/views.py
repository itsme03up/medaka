import random
from django.shortcuts import render
from articles.models import Article

def dashboard(request):
    # Generate pretend infrastructure data (last 20 points)
    # CPU: fluctuating between 20 and 80
    cpu_data = [random.randint(20, 80) for _ in range(20)]

    # Memory: steady increase then drop
    memory_data = []
    base_mem = 40
    for _ in range(20):
        base_mem += random.randint(-5, 10)
        base_mem = max(20, min(95, base_mem))
        memory_data.append(base_mem)

    # Requests: random spikes
    requests_data = [random.randint(100, 500) for _ in range(20)]

    # Fetch articles for the "Ideas" section
    articles = Article.objects.all().order_by('-created_at')

    context = {
        'cpu_data': cpu_data,
        'memory_data': memory_data,
        'requests_data': requests_data,
        'articles': articles,
    }
    return render(request, 'core/dashboard.html', context)
