from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from pong.models import Game, GamePlayers
import json

@csrf_exempt
@login_required  # ログインが必要
def create_player(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        game_id = data.get('game_id')
        player_number = data.get('player_number')
        nickname = data.get('nickname')
        print(f"Debug: Received data - game_id: {game_id}, player_number: {player_number}, nickname: {nickname}")  # デバッグログ
        try:
            game = Game.objects.get(id=game_id)
            user_id = request.user.id if player_number == 1 else None  # player1の場合はuser_idを設定
            player = GamePlayers.objects.create(
                game=game,
                player_number=player_number,
                nickname=nickname,
                user_id=user_id  # user_idを追加
            )
            print(f"Debug: Created player {player.id} for game_id {game_id}")  # デバッグログ
            return JsonResponse({
                'id': str(player.id),
                'message': 'Player created successfully',
                'player_number': player.player_number
            }, status=201)
        except Game.DoesNotExist:
            return JsonResponse({'error': 'Game not found'}, status=404)
        except Exception as e:
            print(f"Debug: Exception occurred - {str(e)}")  # デバッグログ
            return JsonResponse({'error': str(e)}, status=400)

def get_players(request):
    game_id = request.GET.get('game_id')
    if not game_id:
        return JsonResponse({'error': 'Game ID is required'}, status=400)
    try:
        players = GamePlayers.objects.filter(game_id=game_id).order_by('player_number')  # player_numberでソート
        print(f"Debug: Found {players.count()} players for game_id {game_id}")  # デバッグログ
        player_data = [
            {
                'id': str(player.id),
                'nickname': player.nickname,
                'player_number': player.player_number
            }
            for player in players
        ]
        return JsonResponse({'players': player_data, 'count': players.count()}, status=200)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Game not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def update_player_score(request):
    if request.method == 'POST':
        try:
            player_id = request.GET.get('player_id')
            score = request.GET.get('score')
            if not player_id or score is None:
                return JsonResponse({'error': 'Player ID and Score are required'}, status=400)
            
            player = GamePlayers.objects.get(id=player_id)
            player.score = score  # スコアを更新
            player.save()
            return JsonResponse({'message': 'Player score updated successfully'}, status=200)
        except GamePlayers.DoesNotExist:
            return JsonResponse({'error': 'Player not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

def get_result(request):
    game_id = request.GET.get('game_id')
    if not game_id:
        return JsonResponse({'error': 'Game ID is required'}, status=400)
    try:
        game = Game.objects.get(id=game_id)
        players = GamePlayers.objects.filter(game_id=game_id).order_by('player_number')

        if not players.exists():
            return JsonResponse({'error': 'No players found for this game'}, status=404)

        player_data = [
            {
                'id': str(player.id),
                'nickname': player.nickname,
                'player_number': player.player_number,
                'score': player.score  # スコアを含める
            }
            for player in players
        ]

        winner = max(players, key=lambda p: p.score)  # スコアが最も高いプレイヤーを勝者とする

        return JsonResponse({
            'game_id': game_id,
            'winner': winner.nickname,
            'player1Score': player_data[0]['score'] if len(player_data) > 0 else 0,
            'player2Score': player_data[1]['score'] if len(player_data) > 1 else 0,
            'players': player_data
        }, status=200)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Game not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)