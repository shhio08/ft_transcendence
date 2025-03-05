from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from pong.models import Game, GameOptions
import json

@csrf_exempt
@login_required
def create_game_options(request):
    """ゲームオプションの作成・更新API"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            game_id = data.get('game_id')
            ball_count = data.get('ball_count', 1)
            ball_speed = data.get('ball_speed', 'normal')
            
            if not game_id:
                return JsonResponse({'error': 'Game ID is required'}, status=400)
            
            game = Game.objects.get(id=game_id)
            
            # 既存のオプションがあれば更新、なければ作成
            options, created = GameOptions.objects.update_or_create(
                game=game,
                defaults={
                    'ball_count': ball_count,
                    'ball_speed': ball_speed
                }
            )

            return JsonResponse(
                {
                    "id": str(options.id),
                    "game_id": str(game.id),
                    "ball_count": options.ball_count,
                    "ball_speed": options.ball_speed,
                    "message": "Game options saved successfully",
                },
                status=201 if created else 200,
            )
            
        except Game.DoesNotExist:
            return JsonResponse({'error': 'Game not found'}, status=404)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

@login_required
def get_game_options(request):
    """ゲームオプション取得API"""
    game_id = request.GET.get('game_id')
    if not game_id:
        return JsonResponse({'error': 'Game ID is required'}, status=400)
    
    try:
        game = Game.objects.get(id=game_id)
        try:
            options = GameOptions.objects.get(game=game)
            return JsonResponse({
                'id': str(options.id),
                'game_id': str(game.id),
                'ball_count': options.ball_count,
                'ball_speed': options.ball_speed
            }, status=200)
        except GameOptions.DoesNotExist:
            # デフォルトオプションを返す
            return JsonResponse({
                'game_id': str(game.id),
                'ball_count': 1,
                'ball_speed': 'normal'
            }, status=200)
            
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Game not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400) 