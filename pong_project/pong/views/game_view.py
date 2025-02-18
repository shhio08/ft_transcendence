from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from pong.models import Game, GamePlayers
import json
from django.contrib.auth.decorators import login_required

@csrf_exempt
def create_game(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        game = Game.objects.create(
            mode=data.get('mode'),
            played_at=timezone.now()
        )
        return JsonResponse({'id': str(game.id), 'message': 'Game created successfully'}, status=201)

def get_game(request):
    game_id = request.GET.get('game_id')
    if not game_id:
        return JsonResponse({'error': 'Game ID is required'}, status=400)
    try:
        game = Game.objects.get(id=game_id)
        response_data = {
            'id': str(game.id),
            'mode': game.mode,
            'winner_id': str(game.winner_id) if game.winner_id else None,
            'played_at': game.played_at
        }
        return JsonResponse(response_data, status=200)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Game not found'}, status=404)

@csrf_exempt
def update_game_winner(request):
    if request.method == 'POST':
        try:
            game_id = request.GET.get('game_id')
            winner_id = request.GET.get('winner_id')
            if not game_id or not winner_id:
                return JsonResponse({'error': 'Game ID and Winner ID are required'}, status=400)
            
            game = Game.objects.get(id=game_id)
            game.winner_id = winner_id
            game.save()
            return JsonResponse({'message': 'Game winner updated successfully'}, status=200)
        except Game.DoesNotExist:
            return JsonResponse({'error': 'Game not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def get_user_game_history(request):
    user_id = request.user.id
    try:
        game_players = GamePlayers.objects.filter(user_id=user_id)
        game_history = []
        for game_player in game_players:
            game = game_player.game
            opponent = GamePlayers.objects.filter(game=game).exclude(user_id=user_id).first()
            game_history.append({
                'game_id': str(game.id),
                'mode': game.mode,
                'opponent': opponent.nickname if opponent else "N/A",
                'user_score': game_player.score,
                'opponent_score': opponent.score if opponent else 0
            })
        return JsonResponse({'game_history': game_history}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
