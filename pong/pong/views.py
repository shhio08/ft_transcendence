from django.http import HttpResponse
from django.shortcuts import render

def home(request):
    return HttpResponse("Welcome to the home page!")

def test_page(request):
    return HttpResponse("This is a test page.")

def index(request):
    return render(request, 'index.html')  # index.htmlをレンダリング
