from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from pong.models import Tournament, TournamentMatch, Game, GamePlayers
from django.utils import timezone
import json
import uuid

@csrf_exempt
@login_required
def create_tournament(request):
    """トーナメント作成API"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name', f"Tournament")
            
            # トーナメント作成
            tournament = Tournament.objects.create(
                name=name,
                created_by=request.user,
                status='pending'
            )
            
            # 準決勝の2試合分のゲームを作成
            semifinal_games = []
            for i in range(1, 3):
                game = Game.objects.create(
                    mode='tournament',
                    tournament_id=tournament.id,
                    played_at=timezone.now()
                )
                
                # 試合情報を保存
                match = TournamentMatch.objects.create(
                    tournament=tournament,
                    game=game,
                    round='semifinal',
                    match_number=i
                )
                
                semifinal_games.append({
                    'id': str(game.id),
                    'match_id': str(match.id),
                    'round': 'semifinal',
                    'match_number': i
                })
            
            # 決勝戦用のゲームを作成（実際の試合はまだ行われない）
            final_game = Game.objects.create(
                mode='tournament',
                tournament_id=tournament.id,
                played_at=timezone.now()
            )
            
            final_match = TournamentMatch.objects.create(
                tournament=tournament,
                game=final_game,
                round='final',
                match_number=1
            )
            
            return JsonResponse({
                'status': 'success',
                'tournament_id': str(tournament.id),
                'name': tournament.name,
                'semifinal_games': semifinal_games,
                'final_game': {
                    'id': str(final_game.id),
                    'match_id': str(final_match.id),
                    'round': 'final',
                    'match_number': 1
                }
            }, status=201)
            
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@login_required
def get_tournament(request):
    """トーナメント情報取得API"""
    tournament_id = request.GET.get('tournament_id')
    if not tournament_id:
        return JsonResponse({'status': 'error', 'message': 'Tournament ID is required'}, status=400)
    
    try:
        tournament = Tournament.objects.get(id=tournament_id)
        matches = TournamentMatch.objects.filter(tournament=tournament).order_by('round', 'match_number')
        
        matches_data = []
        for match in matches:
            match_data = {
                'id': str(match.id),
                'round': match.round,
                'match_number': match.match_number,
                'game_id': str(match.game.id) if match.game else None,
            }
            
            # ゲームに関連するプレイヤー情報を取得
            if match.game:
                players = GamePlayers.objects.filter(game=match.game)
                
                if players.exists():
                    match_data['players'] = [
                        {
                            'id': str(player.id),
                            'nickname': player.nickname,
                            'score': player.score,
                            'player_number': player.player_number
                        } for player in players
                    ]
            
            matches_data.append(match_data)
        
        return JsonResponse({
            'status': 'success',
            'tournament': {
                'id': str(tournament.id),
                'name': tournament.name,
                'status': tournament.status,
                'created_at': tournament.created_at.isoformat(),
                'created_by': str(tournament.created_by.id),
                'created_by_username': tournament.created_by.username,
            },
            'matches': matches_data
        }, status=200)
        
    except Tournament.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Tournament not found'}, status=404)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)

@csrf_exempt
@login_required
def setup_final_match(request):
    """決勝戦のプレイヤーを設定するAPI"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            game_id = data.get('game_id')
            winner1_id = data.get('winner1_id')
            winner2_id = data.get('winner2_id')
            tournament_id = data.get('tournament_id')
            
            if not all([game_id, winner1_id, winner2_id, tournament_id]):
                return JsonResponse({
                    'status': 'error', 
                    'message': 'Missing required parameters'
                }, status=400)
            
            # ゲームが存在するか確認
            game = Game.objects.get(id=game_id)
            
            # 勝者1の情報を取得
            winner1 = GamePlayers.objects.get(id=winner1_id)
            
            # 勝者2の情報を取得
            winner2 = GamePlayers.objects.get(id=winner2_id)
            
            # トーナメント情報を取得
            tournament = Tournament.objects.get(id=tournament_id)
            
            # 準決勝の試合からゲームオプションを取得
            from pong.models import GameOptions
            semifinal_matches = TournamentMatch.objects.filter(
                tournament=tournament,
                round='semifinal'
            )
            
            # 最初の準決勝のオプションを取得して使用
            if semifinal_matches.exists() and semifinal_matches[0].game:
                try:
                    semifinal_options = GameOptions.objects.get(game=semifinal_matches[0].game)
                    
                    # 決勝戦のゲームオプションを準決勝と同じに設定
                    GameOptions.objects.update_or_create(
                        game=game,
                        defaults={
                            'ball_count': semifinal_options.ball_count,
                            'ball_speed': semifinal_options.ball_speed,
                            'paddle_size': semifinal_options.paddle_size if hasattr(semifinal_options, 'paddle_size') else 'normal',
                            'power_ups': semifinal_options.power_ups if hasattr(semifinal_options, 'power_ups') else False
                        }
                    )
                except GameOptions.DoesNotExist:
                    # 準決勝にオプションがない場合はデフォルト設定
                    GameOptions.objects.update_or_create(
                        game=game,
                        defaults={
                            'ball_count': 1,
                            'ball_speed': 'normal',
                            'paddle_size': 'normal',
                            'power_ups': False
                        }
                    )
            
            # 決勝戦のプレイヤー1を作成
            player1 = GamePlayers.objects.create(
                game=game,
                user=winner1.user,
                nickname=winner1.nickname,
                player_number=1,
                score=0
            )
            
            # 決勝戦のプレイヤー2を作成
            player2 = GamePlayers.objects.create(
                game=game,
                user=winner2.user,
                nickname=winner2.nickname,
                player_number=2,
                score=0
            )
            
            # トーナメントのステータスを更新
            tournament.status = 'ongoing'
            tournament.save()
            
            return JsonResponse({
                'status': 'success',
                'message': 'Final match set up successfully',
                'game_id': str(game.id),
                'player1': {
                    'id': str(player1.id),
                    'nickname': player1.nickname
                },
                'player2': {
                    'id': str(player2.id),
                    'nickname': player2.nickname
                }
            }, status=200)
            
        except Game.DoesNotExist:
            return JsonResponse({
                'status': 'error', 
                'message': 'Game not found'
            }, status=404)
        except GamePlayers.DoesNotExist:
            return JsonResponse({
                'status': 'error', 
                'message': 'Player not found'
            }, status=404)
        except Tournament.DoesNotExist:
            return JsonResponse({
                'status': 'error', 
                'message': 'Tournament not found'
            }, status=404)
        except Exception as e:
            return JsonResponse({
                'status': 'error', 
                'message': str(e)
            }, status=400) 