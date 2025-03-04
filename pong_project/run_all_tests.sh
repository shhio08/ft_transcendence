#!/bin/bash
cd /app/code

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# 区切り線
function print_separator() {
  echo -e "${BLUE}${BOLD}===============================================================${NC}"
}

# テスト実行用関数
function run_test() {
  local test_name=$1
  local test_command=$2
  
  print_separator
  echo -e "${YELLOW}${BOLD}=== Running $test_name ===${NC}"
  echo -e "${BLUE}▶ $test_command${NC}"
  print_separator
  echo ""
  
  # テスト実行と結果取得
  $test_command
  local result=$?
  
  echo ""
  if [ $result -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ $test_name: PASSED${NC}"
  else
    echo -e "${RED}${BOLD}✗ $test_name: FAILED${NC}"
  fi
  echo ""
  
  return $result
}

# 初期化メッセージ
print_separator
echo -e "${BOLD}Starting test suite for Pong Project${NC}"
echo "$(date)"
print_separator
echo ""

# データベースをリセットして新しいテストデータベースを作成
echo -e "${YELLOW}Preparing test environment...${NC}"
python manage.py flush --no-input
python manage.py migrate
echo -e "${GREEN}Environment ready!${NC}"
echo ""

# 結果を記録する変数
TOTAL_TESTS=0
PASSED_TESTS=0

# 認証系APIのテスト
run_test "Authentication API Tests" "python manage.py test pong.tests.test_auth_api -v 2"
if [ $? -eq 0 ]; then ((PASSED_TESTS++)); fi
((TOTAL_TESTS++))

# ゲーム系APIのテスト
run_test "Game API Tests" "python manage.py test pong.tests.test_game_api -v 2"
if [ $? -eq 0 ]; then ((PASSED_TESTS++)); fi
((TOTAL_TESTS++))

# ユーザー系APIのテスト
run_test "User API Tests" "python manage.py test pong.tests.test_user_api -v 2"
if [ $? -eq 0 ]; then ((PASSED_TESTS++)); fi
((TOTAL_TESTS++))

# フレンド系APIのテスト
run_test "Friend API Tests" "python manage.py test pong.tests.test_friend_api -v 2"
if [ $? -eq 0 ]; then ((PASSED_TESTS++)); fi
((TOTAL_TESTS++))

# OAuth系APIのテスト
run_test "OAuth API Tests" "python manage.py test pong.tests.test_oauth_api -v 2"
if [ $? -eq 0 ]; then ((PASSED_TESTS++)); fi
((TOTAL_TESTS++))

# アバター処理テスト
run_test "Avatar Handling Tests" "python manage.py test pong.tests.test_avatar_handling -v 2"
if [ $? -eq 0 ]; then ((PASSED_TESTS++)); fi
((TOTAL_TESTS++))

# アクセス制御のテスト
run_test "Access Control Tests" "python manage.py test pong.tests.test_access_control -v 2"
if [ $? -eq 0 ]; then ((PASSED_TESTS++)); fi
((TOTAL_TESTS++))

# すべてのテストを一括で実行（オプション）
print_separator
echo -e "${YELLOW}${BOLD}=== Running All Tests Together ===${NC}"
python manage.py test pong.tests -v 1
ALL_TESTS_RESULT=$?
print_separator

# 結果のサマリー表示
echo ""
print_separator
echo -e "${BOLD}TEST SUMMARY${NC}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}/${TOTAL_TESTS}${NC} tests"
if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
  echo -e "${GREEN}${BOLD}ALL TESTS PASSED! 🎉${NC}"
else
  echo -e "${RED}${BOLD}SOME TESTS FAILED!${NC} - $(($TOTAL_TESTS - $PASSED_TESTS)) tests failed"
fi
print_separator

# コードカバレッジレポート生成（オプション）
if [ "$COVERAGE" = "true" ]; then
  print_separator
  echo -e "${YELLOW}${BOLD}=== Generating Code Coverage Report ===${NC}"
  coverage run --source='pong' manage.py test pong
  echo ""
  echo -e "${BOLD}Coverage Report:${NC}"
  coverage report
  coverage html
  echo -e "${GREEN}HTML coverage report generated in htmlcov/${NC}"
  print_separator
fi 