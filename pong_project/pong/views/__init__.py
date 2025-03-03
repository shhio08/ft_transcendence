from .auth_view import login_api, logout_api, signup_api
from .user_view import user_info_api, update_user_info_api, user_count
from .index_view import index
from .health_check_view import health_check
from .game_view import create_game, get_game, update_game_winner, get_user_game_history
from .player_view import create_player, get_players, update_player_score, get_result
from .friend_view import user_list_api, friend_list_api, accept_friend_api, add_friend_api, reject_friend_api