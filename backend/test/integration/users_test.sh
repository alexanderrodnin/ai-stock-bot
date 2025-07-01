#!/bin/bash

# Users API Integration Tests
# Тесты основанные на реальных curl запросах для проверки функционала пользователей

set -e  # Exit on error

# Конфигурация
API_BASE="http://localhost:3000/api"
HEALTH_URL="http://localhost:3000/health"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Счетчики тестов
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Переменные для хранения данных
TEST_USER_ID=""
CREATED_USER_IDS=()

# Вспомогательные функции
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

test_api_call() {
    local test_name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="$5"
    local description="$6"
    
    ((TOTAL_TESTS++))
    
    echo
    log_info "🧪 Test ${TOTAL_TESTS}: ${test_name}"
    log_info "   ${description}"
    
    # Выполнение API запроса
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
    fi
    
    # Извлечение тела ответа и статус кода
    body=$(echo "$response" | head -n -1)
    status_code=$(echo "$response" | tail -n 1)
    
    # Проверка статус кода
    if [ "$status_code" = "$expected_status" ]; then
        log_success "Status: $status_code (Expected: $expected_status)"
        
        # Парсинг и отображение ответа
        if command -v jq &> /dev/null; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi
        
        # Сохранение данных для последующих тестов
        case $test_name in
            "CREATE_TEST_USER")
                if echo "$body" | grep -q '"success":true'; then
                    # Извлечение user ID для последующих тестов
                    if command -v jq &> /dev/null; then
                        TEST_USER_ID=$(echo "$body" | jq -r '.data.id // empty')
                        CREATED_USER_IDS+=("$TEST_USER_ID")
                        log_info "   💾 Сохранен User ID: $TEST_USER_ID"
                    fi
                fi
                ;;
        esac
        
    else
        log_error "Status: $status_code (Expected: $expected_status)"
        echo "$body"
    fi
}

# Ожидание готовности API
wait_for_api() {
    log_info "🔄 Ожидание готовности API..."
    
    for i in {1..30}; do
        if curl -s "$HEALTH_URL" > /dev/null 2>&1; then
            log_success "API готов!"
            return 0
        fi
        log_info "   Попытка $i/30 - API еще не готов, ожидание..."
        sleep 2
    done
    
    log_error "API не запустился в течение 60 секунд"
    exit 1
}

# Функция очистки после тестов
cleanup() {
    echo
    log_info "🧹 Очистка созданных тестовых данных..."
    
    # Удаление созданных пользователей
    for user_id in "${CREATED_USER_IDS[@]}"; do
        if [ -n "$user_id" ]; then
            curl -s -X DELETE "$API_BASE/users/$user_id" > /dev/null 2>&1
            log_info "   Удален пользователь: $user_id"
        fi
    done
}

# Запуск тестов
echo "========================================"
echo "🚀 AI Stock Bot - Users API Integration Tests"
echo "========================================"

# Ожидание API
wait_for_api

# Тест 1: Проверка здоровья API
test_api_call "HEALTH_CHECK" "GET" "$HEALTH_URL" "" "200" \
    "Проверка endpoint здоровья API"

# Тест 2: Получение информации об API
test_api_call "API_INFO" "GET" "$API_BASE/" "" "200" \
    "Проверка информационного endpoint API"

# Тест 3: Получение всех пользователей
test_api_call "GET_ALL_USERS" "GET" "$API_BASE/users" "" "200" \
    "Получение списка всех пользователей с пагинацией"

# Тест 4: Создание тестового пользователя
test_api_call "CREATE_TEST_USER" "POST" "$API_BASE/users" \
'{
  "externalId": "test_user_123",
  "externalSystem": "api",
  "username": "john_doe_test",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.test@example.com",
  "preferences": {
    "image": {
      "defaultModel": "dall-e-3",
      "defaultSize": "1024x1024"
    }
  },
  "metadata": {
    "source": "integration_test",
    "version": "1.0"
  }
}' "201" "Создание тестового пользователя с полным профилем"

# Дать время API для обработки
sleep 1

# Тест 5: Получение пользователя по MongoDB ID
if [ -n "$TEST_USER_ID" ]; then
    test_api_call "GET_USER_BY_ID" "GET" "$API_BASE/users/$TEST_USER_ID" "" "200" \
        "Получение пользователя по MongoDB ID"
else
    log_warning "Пропуск теста GET_USER_BY_ID - нет ID пользователя"
fi

# Тест 6: Получение пользователя по внешнему ID
test_api_call "GET_USER_BY_EXTERNAL_ID" "GET" "$API_BASE/users/external/api/test_user_123" "" "200" \
    "Получение пользователя по внешнему ID (api система)"

# Тест 7: Обновление профиля пользователя
if [ -n "$TEST_USER_ID" ]; then
    test_api_call "UPDATE_USER" "PUT" "$API_BASE/users/$TEST_USER_ID" \
'{
  "firstName": "John Updated",
  "email": "john.updated@example.com",
  "preferences": {
    "image": {
      "defaultModel": "dall-e-2",
      "defaultQuality": "hd"
    }
  }
}' "200" "Обновление профиля и настроек пользователя"
else
    log_warning "Пропуск теста UPDATE_USER - нет ID пользователя"
fi

# Тест 8: Получение статистики пользователя
if [ -n "$TEST_USER_ID" ]; then
    test_api_call "GET_USER_STATS" "GET" "$API_BASE/users/$TEST_USER_ID/stats" "" "200" \
        "Получение статистики пользователя"
else
    log_warning "Пропуск теста GET_USER_STATS - нет ID пользователя"
fi

# Тест 9: Попытка создания дублирующего пользователя (должна провалиться)
test_api_call "CREATE_DUPLICATE_USER" "POST" "$API_BASE/users" \
'{
  "externalId": "test_user_123",
  "externalSystem": "api",
  "username": "duplicate_user"
}' "409" "Попытка создания дублирующего пользователя (должна провалиться)"

# Тест 10: Получение несуществующего пользователя (должна провалиться)
test_api_call "GET_NONEXISTENT_USER" "GET" "$API_BASE/users/external/api/nonexistent_user" "" "404" \
    "Попытка получения несуществующего пользователя (должна провалиться)"

# Тест 11: Создание Telegram пользователя
test_api_call "CREATE_TELEGRAM_USER" "POST" "$API_BASE/users" \
'{
  "externalId": "tg_987654321",
  "externalSystem": "telegram",
  "username": "telegram_test_user",
  "firstName": "Alice",
  "lastName": "Smith"
}' "201" "Создание Telegram пользователя с минимальными данными"

# Тест 12: Проверка невалидных данных
test_api_call "CREATE_INVALID_USER" "POST" "$API_BASE/users" \
'{
  "externalSystem": "invalid_system",
  "username": "test"
}' "400" "Создание пользователя с невалидными данными (должна провалиться)"

# Тест 13: Тестирование невалидного MongoDB ID формата
test_api_call "INVALID_ID_FORMAT" "GET" "$API_BASE/users/invalid-id-format" "" "400" \
    "Использование невалидного формата MongoDB ID (должна провалиться)"

# Финальные результаты
echo
echo "========================================"
echo "📊 Результаты тестов"
echo "========================================"
echo -e "Всего тестов: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Пройдено:     ${GREEN}$PASSED_TESTS${NC}"
echo -e "Провалено:    ${RED}$FAILED_TESTS${NC}"

# Очистка
cleanup

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}Все тесты пройдены успешно!${NC}"
    exit 0
else
    echo -e "\n❌ ${RED}Некоторые тесты провалились.${NC}"
    exit 1
fi
