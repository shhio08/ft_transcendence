#!/bin/bash
cd /app/code

# データベースをリセットして新しいテストデータベースを作成
python manage.py flush --no-input

# テスト実行前にマイグレーション
python manage.py migrate

# 認証系APIのテスト
echo "=== Running Authentication API Tests ==="
python manage.py test pong.tests.test_auth_api

# ゲーム系APIのテスト
echo "=== Running Game API Tests ==="
python manage.py test pong.tests.test_game_api

# ユーザー系APIのテスト
echo "=== Running User API Tests ==="
python manage.py test pong.tests.test_user_api

# フレンド系APIのテスト
echo "=== Running Friend API Tests ==="
python manage.py test pong.tests.test_friend_api

# アクセス制御のテスト
echo "=== Running Access Control Tests ==="
python manage.py test pong.tests.test_access_control

# すべてのテストを一括で実行（オプション）
echo "=== Running All Tests Together ==="
python manage.py test pong.tests

# コードカバレッジレポート生成（オプション）
if [ "$COVERAGE" = "true" ]; then
  echo "=== Generating Code Coverage Report ==="
  coverage run --source='pong' manage.py test pong
  coverage report
  coverage html
  echo "HTML coverage report generated in htmlcov/"
fi 