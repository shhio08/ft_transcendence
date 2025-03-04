from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from pong.models import Game, GamePlayers
import json
from django.contrib.auth.decorators import login_required

@csrf_exempt
@login_required
def create_game(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        game = Game.objects.create(
            mode=data.get('mode'),
            played_at=timezone.now()
        )
        return JsonResponse({'id': str(game.id), 'message': 'Game created successfully'}, status=201)

@login_required
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
@login_required
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
        user_avatar_url = request.user.get_avatar_url()

        # ユーザーが参加したゲームのプレイヤーデータを取得
        game_players = GamePlayers.objects.filter(user_id=user_id)
        game_history = []
        
        for game_player in game_players:
            game = game_player.game
            
            # ゲームに参加した全プレイヤーを取得（ユーザー自身を含む）
            all_players = GamePlayers.objects.filter(game=game).order_by('player_number')
            
            # プレイヤー数を確認
            player_count = all_players.count()
            
            # 基本データを準備
            game_data = {
                'id': str(game.id),
                'game_id': str(game.id),
                'mode': game.mode,
                'player_count': player_count,
                'user_avatar': user_avatar_url,
                'user_score': game_player.score,
                'user_nickname': game_player.nickname,
                'played_at': game.played_at.isoformat() if game.played_at else None,
            }
            
            # ユーザー以外のプレイヤーデータを追加
            other_players = all_players.exclude(user_id=user_id)
            
            # 少なくとも1人の対戦相手がいる場合
            if other_players.exists():
                # 最初の対戦相手（player2）
                opponent = other_players.first()
                opponent_avatar_url = opponent.user.get_avatar_url() if opponent and opponent.user else None
                
                game_data.update({
                    'opponent': opponent.nickname,
                    'opponent_avatar': opponent_avatar_url,
                    'opponent_score': opponent.score
                })
                
                # 3人目のプレイヤーが存在する場合
                if player_count > 2 and other_players.count() > 1:
                    player3 = other_players[1] if len(other_players) > 1 else None
                    if player3:
                        player3_avatar = player3.user.get_avatar_url() if player3.user else None
                        game_data.update({
                            'player3_nickname': player3.nickname,
                            'player3_score': player3.score,
                            'player3_avatar': player3_avatar
                        })
                
                # 4人目のプレイヤーが存在する場合
                if player_count > 3 and other_players.count() > 2:
                    player4 = other_players[2] if len(other_players) > 2 else None
                    if player4:
                        player4_avatar = player4.user.get_avatar_url() if player4.user else None
                        game_data.update({
                            'player4_nickname': player4.nickname,
                            'player4_score': player4.score,
                            'player4_avatar': player4_avatar
                        })
            else:
                # 対戦相手が見つからない場合のデフォルト値
                game_data.update({
                    'opponent': "N/A",
                    'opponent_avatar': None,
                    'opponent_score': 0
                })
            
            game_history.append(game_data)
            
        return JsonResponse({'game_history': game_history}, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
