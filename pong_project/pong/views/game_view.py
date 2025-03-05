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
                        all_players = set()  # player_idのセット
                        participants = []    # 参加者情報のリスト
                        participant_nicknames = []  # 名前のみのリスト（デバッグ用）
                        
                        # すべてのマッチからプレイヤー情報を集める（全試合を確実に取得）
                        tournament_matches = TournamentMatch.objects.filter(tournament=tournament).select_related('game')
                        print(f"Found {tournament_matches.count()} matches for tournament {tournament.id}")
                        
                        for match in tournament_matches:
                            if match.game:
                                print(f"Processing match {match.id}, round: {match.round}, game: {match.game.id}")
                                # 各試合のプレイヤーを取得
                                match_players = GamePlayers.objects.filter(game=match.game)
                                print(f"  Found {match_players.count()} players in this match")
                                
                                for player in match_players:
                                    # プレイヤーの一意識別子として nickname を使用（user_idがない場合もあるため）
                                    player_key = player.nickname
                                    
                                    # まだ追加していないプレイヤーのみ追加
                                    if player_key not in all_players:
                                        all_players.add(player_key)
                                        
                                        # プレイヤー情報をリストに追加
                                        player_info = {
                                            'nickname': player.nickname,
                                            'avatar': player.user.profile.avatar.url if player.user and hasattr(player.user, 'profile') and player.user.profile.avatar else None,
                                            'is_user': str(player.user_id) == user_id if player.user_id else False
                                        }
                                        participants.append(player_info)
                                        participant_nicknames.append(player.nickname)
                                        
                                        # デバッグ: 追加したプレイヤー情報
                                        print(f"  Added player: {player.nickname} (ID: {player.user_id})")
                        
                        # 参加者リストを追加
                        game_data['participants'] = participants
                        game_data['participant_nicknames'] = participant_nicknames
                        
                        # デバッグ用ログ
                        print(f"Tournament {tournament.id} participants: {participant_nicknames}")
                        print(f"Total participants count: {len(participants)}")
                        
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
    all_players = GamePlayers.objects.filter(game=game).order_by('player_number')
    player_count = all_players.count()
    game_data['player_count'] = player_count
    
    # デバッグ情報
    print(f"Game {game.id} has {player_count} players")
    for p in all_players:
        print(f"Player {p.player_number}: {p.nickname} (ID: {p.user_id}), Score: {p.score}")
    
    # プレイヤー情報をプレイヤー番号順に整理
    players_by_number = {}
    for player in all_players:
        players_by_number[player.player_number] = player
    
    # ユーザー自身のデータを追加
    try:
        user_player = all_players.filter(user_id=user_id).first()
        if user_player:
            game_data['user_nickname'] = user_player.nickname
            game_data['user_score'] = user_player.score
            game_data['user_avatar'] = user.profile.avatar.url if hasattr(user, 'profile') and user.profile.avatar else None
            game_data['user_player_number'] = user_player.player_number
        else:
            game_data['user_nickname'] = "あなた"
            game_data['user_score'] = 0
            game_data['user_avatar'] = None
            game_data['user_player_number'] = None
    except Exception as e:
        print(f"Error getting user data: {e}")
        game_data['user_nickname'] = "あなた"
        game_data['user_score'] = 0
        game_data['user_avatar'] = None
        game_data['user_player_number'] = None
    
    # 対戦相手の情報を取得
    opponents = all_players.exclude(user_id=user_id)
    if opponents.exists():
        opponent = opponents.first()
        game_data['opponent'] = opponent.nickname
        game_data['opponent_score'] = opponent.score
        game_data['opponent_avatar'] = opponent.user.profile.avatar.url if opponent.user and hasattr(opponent.user, 'profile') and opponent.user.profile.avatar else None
        game_data['opponent_player_number'] = opponent.player_number
    else:
        game_data['opponent'] = "COM"
        game_data['opponent_score'] = 0
        game_data['opponent_avatar'] = None
        game_data['opponent_player_number'] = None
    
    # 各プレイヤーの情報を明示的にプレイヤー番号ごとに追加
    for player_number in range(1, player_count + 1):
        if player_number in players_by_number:
            player = players_by_number[player_number]
            game_data[f'player{player_number}_nickname'] = player.nickname
            game_data[f'player{player_number}_score'] = player.score
            game_data[f'player{player_number}_avatar'] = player.user.profile.avatar.url if player.user and hasattr(player.user, 'profile') and player.user.profile.avatar else None
            game_data[f'player{player_number}_id'] = str(player.user_id) if player.user_id else None
    
    # デバッグ情報
    print(f"Game data: {game_data}")
    
    game_history.append(game_data)
