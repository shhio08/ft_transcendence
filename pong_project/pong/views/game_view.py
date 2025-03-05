from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from pong.models import Game, GamePlayers, Tournament, TournamentMatch
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
            'tournament_id': str(game.tournament_id) if game.tournament_id else None,
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

@login_required
def get_user_game_history(request):
    try:
        user = request.user
        user_id = str(user.id)
        
        # ユーザーが参加したゲームを取得
        games = Game.objects.filter(
            gameplayers__user=user
        ).order_by('-played_at').distinct()
        
        # ゲーム履歴を格納するリスト
        game_history = []
        
        # 処理済みのトーナメントIDを追跡するセット
        processed_tournaments = set()
        
        for game in games:
            try:
                # トーナメントIDがある場合
                if game.tournament_id and game.mode == 'tournament':
                    # 既に処理済みのトーナメントはスキップ
                    if game.tournament_id in processed_tournaments:
                        continue
                    
                    # トーナメント情報を取得
                    try:
                        from pong.models import Tournament, TournamentMatch
                        tournament = Tournament.objects.get(id=game.tournament_id)
                        
                        # 基本情報
                        game_data = {
                            'id': str(tournament.id),
                            'mode': 'tournament',
                            'name': tournament.name,
                            'played_at': tournament.created_at.isoformat() if hasattr(tournament, 'created_at') and tournament.created_at else game.played_at.isoformat(),
                            'is_tournament': True,
                            'player_count': 4
                        }
                        
                        # ユーザー自身の情報
                        game_data['user_nickname'] = "あなた"
                        game_data['user_avatar'] = user.profile.avatar.url if hasattr(user, 'profile') and user.profile.avatar else None
                        
                        # トーナメントの全プレイヤーを取得
                        all_players = set()
                        tournament_matches = TournamentMatch.objects.filter(tournament=tournament)
                        
                        # 参加者リスト作成
                        participants = []
                        
                        # すべてのマッチからプレイヤー情報を集める
                        for match in tournament_matches:
                            if match.game:
                                match_players = GamePlayers.objects.filter(game=match.game)
                                for player in match_players:
                                    # 既にリストに追加済みのプレイヤーはスキップ
                                    player_id = str(player.user_id) if player.user_id else player.nickname
                                    if player_id not in all_players:
                                        all_players.add(player_id)
                                        
                                        # プレイヤー情報をリストに追加
                                        player_info = {
                                            'nickname': player.nickname,
                                            'avatar': player.user.profile.avatar.url if player.user and hasattr(player.user, 'profile') and player.user.profile.avatar else None,
                                            'is_user': str(player.user_id) == user_id if player.user_id else False
                                        }
                                        participants.append(player_info)
                        
                        # 参加者リストを追加
                        game_data['participants'] = participants
                        
                        # 決勝戦の情報を取得
                        try:
                            final_match = TournamentMatch.objects.filter(
                                tournament=tournament,
                                round='final'
                            ).first()
                            
                            if final_match and final_match.game:
                                final_game = final_match.game
                                final_players = GamePlayers.objects.filter(game=final_game)
                                
                                # 優勝者を特定
                                if final_players.count() >= 2:
                                    player1 = final_players.filter(player_number=1).first()
                                    player2 = final_players.filter(player_number=2).first()
                                    
                                    if player1 and player2 and player1.score != player2.score:
                                        winner = player1 if player1.score > player2.score else player2
                                        
                                        game_data['winner_nickname'] = winner.nickname
                                        winner_avatar = None
                                        if winner.user and hasattr(winner.user, 'profile') and winner.user.profile.avatar:
                                            winner_avatar = winner.user.profile.avatar.url
                                        game_data['winner_avatar'] = winner_avatar
                                        game_data['user_won'] = str(winner.user_id) == user_id if winner.user_id else False
                                        game_data['winner_id'] = str(winner.user_id) if winner.user_id else None
                        except Exception as e:
                            print(f"Error processing final match: {e}")
                        
                        # 処理済みとしてマーク
                        processed_tournaments.add(game.tournament_id)
                        
                        game_history.append(game_data)
                    except Exception as e:
                        print(f"Error processing tournament {game.tournament_id}: {e}")
                        # トーナメント情報が取得できない場合は通常ゲームとして表示
                        process_normal_game(game, user, user_id, game_history)
                else:
                    # 通常ゲームの処理
                    process_normal_game(game, user, user_id, game_history)
                    
            except Exception as e:
                print(f"Error processing game {game.id}: {e}")
        
        return JsonResponse({'game_history': game_history}, status=200)
    except Exception as e:
        print(f"Error in get_user_game_history: {e}")
        return JsonResponse({'error': str(e), 'game_history': []}, status=200)  # エラーでも空の配列を返す

def process_normal_game(game, user, user_id, game_history):
    """通常ゲームの情報を処理してgame_historyに追加する"""
    game_data = {
        'id': str(game.id),
        'mode': game.mode,
        'played_at': game.played_at.isoformat() if game.played_at else None,
        'is_tournament': False
    }
    
    # このゲームの全プレイヤーを取得
    all_players = GamePlayers.objects.filter(game=game)
    player_count = all_players.count()
    game_data['player_count'] = player_count
    
    # ユーザー自身のデータを追加
    try:
        user_player = all_players.filter(user_id=user_id).first()
        if user_player:
            game_data['user_nickname'] = user_player.nickname
            game_data['user_score'] = user_player.score
            game_data['user_avatar'] = user.profile.avatar.url if hasattr(user, 'profile') and user.profile.avatar else None
        else:
            game_data['user_nickname'] = "あなた"
            game_data['user_score'] = 0
            game_data['user_avatar'] = None
    except Exception as e:
        print(f"Error getting user data: {e}")
        game_data['user_nickname'] = "あなた"
        game_data['user_score'] = 0
        game_data['user_avatar'] = None
    
    # 対戦相手の情報を取得
    opponents = all_players.exclude(user_id=user_id)
    if opponents.exists():
        opponent = opponents.first()
        game_data['opponent'] = opponent.nickname
        game_data['opponent_score'] = opponent.score
        game_data['opponent_avatar'] = opponent.user.profile.avatar.url if opponent.user and hasattr(opponent.user, 'profile') and opponent.user.profile.avatar else None
    else:
        game_data['opponent'] = "COM"
        game_data['opponent_score'] = 0
        game_data['opponent_avatar'] = None
    
    # 追加プレイヤー情報（4人プレイの場合）
    if player_count >= 4:
        extra_players = list(all_players)
        if len(extra_players) >= 3:
            game_data['player3_nickname'] = extra_players[2].nickname
            game_data['player3_score'] = extra_players[2].score
            game_data['player3_avatar'] = extra_players[2].user.profile.avatar.url if extra_players[2].user and hasattr(extra_players[2].user, 'profile') and extra_players[2].user.profile.avatar else None
        if len(extra_players) >= 4:
            game_data['player4_nickname'] = extra_players[3].nickname
            game_data['player4_score'] = extra_players[3].score
            game_data['player4_avatar'] = extra_players[3].user.profile.avatar.url if extra_players[3].user and hasattr(extra_players[3].user, 'profile') and extra_players[3].user.profile.avatar else None
    
    game_history.append(game_data)
