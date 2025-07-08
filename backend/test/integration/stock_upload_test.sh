#!/bin/bash

# Stock Upload Integration Tests
# Полный тест: создание пользователя → настройка 123RF → генерация изображения → загрузка на стоки

# Note: не используем set -e так как команды инкремента могут возвращать ненулевой код

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
GENERATED_IMAGE_ID=""
CREATED_USER_IDS=()

# Загрузка переменных окружения
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

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
    body=$(echo "$response" | sed '$d')
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
            "CREATE_STOCK_USER")
                if echo "$body" | grep -q '"success":true'; then
                    if command -v jq &> /dev/null; then
                        USER_ID=$(echo "$body" | jq -r '.data._id // .data.id // empty')
                        log_info "   🔍 Отладка: извлеченный USER_ID = '$USER_ID'"
                        if [ "$USER_ID" != "null" ] && [ "$USER_ID" != "empty" ] && [ -n "$USER_ID" ]; then
                            TEST_USER_ID="$USER_ID"
                            CREATED_USER_IDS+=("$USER_ID")
                            log_info "   💾 Сохранен User ID: $USER_ID"
                        else
                            log_error "   ❌ Не удалось извлечь User ID из ответа"
                            echo "$body" | jq '.data' 2>/dev/null || echo "Ошибка парсинга JSON"
                        fi
                    else
                        # Парсинг без jq - ищем "_id":"значение"
                        USER_ID=$(echo "$body" | grep -o '"_id":"[^"]*"' | sed 's/"_id":"\([^"]*\)"/\1/')
                        if [ -z "$USER_ID" ]; then
                            # Попробуем найти "id":"значение"
                            USER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | sed 's/"id":"\([^"]*\)"/\1/')
                        fi
                        log_info "   🔍 Отладка: извлеченный USER_ID = '$USER_ID'"
                        if [ -n "$USER_ID" ]; then
                            TEST_USER_ID="$USER_ID"
                            CREATED_USER_IDS+=("$USER_ID")
                            log_info "   💾 Сохранен User ID: $USER_ID"
                        else
                            log_error "   ❌ Не удалось извлечь User ID из ответа"
                        fi
                    fi
                fi
                ;;
            "GENERATE_IMAGE")
                if echo "$body" | grep -q '"success":true'; then
                    if command -v jq &> /dev/null; then
                        IMAGE_ID=$(echo "$body" | jq -r '.data.id // empty')
                    else
                        # Парсинг без jq
                        IMAGE_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | sed 's/"id":"\([^"]*\)"/\1/')
                    fi
                    if [ -n "$IMAGE_ID" ]; then
                        GENERATED_IMAGE_ID="$IMAGE_ID"
                        log_info "   💾 Сохранен Image ID: $IMAGE_ID"
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
            echo -e "${GREEN}[PASS]${NC} API готов!"
            return 0
        fi
        log_info "   Попытка $i/30 - API еще не готов, ожидание..."
        sleep 2
    done
    
    echo -e "${RED}[FAIL]${NC} API не запустился в течение 60 секунд"
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

# Проверка переменных окружения
check_env_vars() {
    log_info "🔍 Проверка переменных окружения для 123RF..."
    
    if [ -z "$FTP_HOST" ] || [ -z "$FTP_USER" ] || [ -z "$FTP_PASSWORD" ] || [ -z "$FTP_REMOTE_PATH" ]; then
        log_error "Отсутствуют необходимые переменные окружения:"
        log_error "FTP_HOST: ${FTP_HOST:-'НЕ УСТАНОВЛЕН'}"
        log_error "FTP_USER: ${FTP_USER:-'НЕ УСТАНОВЛЕН'}"
        log_error "FTP_PASSWORD: ${FTP_PASSWORD:+'УСТАНОВЛЕН'}"
        log_error "FTP_REMOTE_PATH: ${FTP_REMOTE_PATH:-'НЕ УСТАНОВЛЕН'}"
        exit 1
    fi
    
    echo -e "${GREEN}[PASS]${NC} Переменные окружения проверены:"
    log_info "   FTP_HOST: $FTP_HOST"
    log_info "   FTP_USER: $FTP_USER"
    log_info "   FTP_REMOTE_PATH: $FTP_REMOTE_PATH"
}

# Запуск тестов
echo "========================================"
echo "🚀 AI Stock Bot - Stock Upload Integration Tests"
echo "========================================"

# Проверка переменных окружения
check_env_vars

# Ожидание API
wait_for_api

# Генерируем уникальный timestamp для тестов
TIMESTAMP=$(date +%s)
RANDOM_ID=$(openssl rand -hex 4 2>/dev/null || echo "rand$(date +%N | cut -c1-8)")

# Тест 1: Проверка здоровья API
test_api_call "HEALTH_CHECK" "GET" "$HEALTH_URL" "" "200" \
    "Проверка endpoint здоровья API"

# Тест 2: Создание пользователя для тестирования стоков
test_api_call "CREATE_STOCK_USER" "POST" "$API_BASE/users" \
"{
  \"externalId\": \"stock_test_user_${TIMESTAMP}\",
  \"externalSystem\": \"api\",
  \"username\": \"stock_tester_${TIMESTAMP}\",
  \"firstName\": \"Stock\",
  \"lastName\": \"Tester\",
  \"email\": \"stock.test.${TIMESTAMP}@example.com\",
  \"preferences\": {
    \"image\": {
      \"defaultModel\": \"dall-e-3\",
      \"defaultSize\": \"1024x1024\",
      \"defaultQuality\": \"standard\",
      \"defaultStyle\": \"vivid\"
    }
  },
  \"metadata\": {
    \"source\": \"stock_integration_test\",
    \"version\": \"1.0\"
  }
}" "201" "Создание пользователя для тестирования стоков"

sleep 2  # Задержка для обработки

# Тест 3: Настройка 123RF для пользователя (включая пароль)
if [ -n "$TEST_USER_ID" ]; then
    test_api_call "SETUP_123RF_CONFIG" "PUT" "$API_BASE/users/$TEST_USER_ID/stock-services/123rf" \
"{
  \"enabled\": true,
  \"credentials\": {
    \"username\": \"$FTP_USER\",
    \"password\": \"$FTP_PASSWORD\",
    \"ftpHost\": \"$FTP_HOST\",
    \"ftpPort\": 21,
    \"remotePath\": \"$FTP_REMOTE_PATH\"
  },
  \"settings\": {
    \"autoUpload\": false,
    \"defaultKeywords\": [\"ai\", \"generated\", \"digital\", \"art\"],
    \"defaultDescription\": \"AI generated digital artwork\",
    \"pricing\": \"standard\"
  }
}" "200" "Настройка 123RF конфигурации для пользователя"
else
    log_warning "Пропуск настройки 123RF - нет ID пользователя"
fi

sleep 2  # Задержка для обработки

# Тест 4: Генерация изображения
if [ -n "$TEST_USER_ID" ]; then
    test_api_call "GENERATE_IMAGE" "POST" "$API_BASE/images/generate" \
"{
  \"userId\": \"$TEST_USER_ID\",
  \"userExternalId\": \"stock_test_user_${TIMESTAMP}\",
  \"prompt\": \"A beautiful digital artwork of a serene mountain landscape with crystal clear lake reflection\",
  \"options\": {
    \"model\": \"dall-e-3\",
    \"size\": \"1024x1024\",
    \"quality\": \"standard\",
    \"style\": \"vivid\"
  }
}" "201" "Генерация изображения для загрузки на стоки"
else
    log_warning "Пропуск генерации изображения - нет ID пользователя"
fi

sleep 5  # Дополнительная задержка для обработки изображения

# Тест 5: Проверка сгенерированного изображения
if [ -n "$GENERATED_IMAGE_ID" ] && [ -n "$TEST_USER_ID" ]; then
    test_api_call "CHECK_GENERATED_IMAGE" "GET" "$API_BASE/images/$GENERATED_IMAGE_ID?userId=$TEST_USER_ID" "" "200" \
        "Проверка сгенерированного изображения"
else
    log_warning "Пропуск проверки изображения - нет ID изображения или пользователя"
fi

sleep 2  # Задержка для обработки

# Тест 6: Загрузка изображения на 123RF
if [ -n "$GENERATED_IMAGE_ID" ] && [ -n "$TEST_USER_ID" ]; then
    test_api_call "UPLOAD_TO_123RF" "POST" "$API_BASE/upload/123rf" \
"{
  \"userId\": \"$TEST_USER_ID\",
  \"imageId\": \"$GENERATED_IMAGE_ID\",
  \"title\": \"Beautiful Mountain Landscape Digital Art\",
  \"description\": \"A stunning AI-generated digital artwork featuring a serene mountain landscape with crystal clear lake reflection. Perfect for nature and landscape themed projects.\",
  \"keywords\": [\"mountain\", \"landscape\", \"nature\", \"digital\", \"art\", \"ai\", \"generated\", \"serene\", \"lake\", \"reflection\"],
  \"category\": \"Nature\",
  \"pricing\": \"standard\"
}" "200" "Загрузка изображения на 123RF"
else
    log_warning "Пропуск загрузки на 123RF - нет ID изображения или пользователя"
fi

sleep 3  # Задержка для обработки загрузки

# Тест 7: Проверка статуса загрузки
if [ -n "$GENERATED_IMAGE_ID" ] && [ -n "$TEST_USER_ID" ]; then
    test_api_call "CHECK_UPLOAD_STATUS" "GET" "$API_BASE/upload/status/$GENERATED_IMAGE_ID?userId=$TEST_USER_ID" "" "200" \
        "Проверка статуса загрузки на 123RF"
else
    log_warning "Пропуск проверки статуса загрузки - нет ID изображения или пользователя"
fi

# Тест 8: Получение изображений пользователя
if [ -n "$TEST_USER_ID" ]; then
    test_api_call "GET_USER_IMAGES" "GET" "$API_BASE/images/user/$TEST_USER_ID" "" "200" \
        "Получение списка изображений пользователя"
else
    log_warning "Пропуск получения изображений - нет ID пользователя"
fi

# Тест 9: Тестирование соединения с 123RF
if [ -n "$TEST_USER_ID" ]; then
    test_api_call "TEST_123RF_CONNECTION" "POST" "$API_BASE/users/$TEST_USER_ID/stock-services/123rf/test" "" "200" \
        "Тестирование соединения с 123RF"
else
    log_warning "Пропуск тестирования соединения - нет ID пользователя"
fi

# Финальные результаты
echo
echo "========================================"
echo "📊 Результаты тестов"
echo "========================================"
echo -e "Всего тестов: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Пройдено:     ${GREEN}$PASSED_TESTS${NC}"
echo -e "Провалено:    ${RED}$FAILED_TESTS${NC}"

# Показать созданные данные
if [ -n "$TEST_USER_ID" ]; then
    echo -e "\n📋 Созданные данные:"
    echo -e "User ID: ${BLUE}$TEST_USER_ID${NC}"
    if [ -n "$GENERATED_IMAGE_ID" ]; then
        echo -e "Image ID: ${BLUE}$GENERATED_IMAGE_ID${NC}"
    fi
fi

# Очистка
cleanup

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}Все тесты пройдены успешно!${NC}"
    echo -e "✅ Полный цикл работы со стоками протестирован:"
    echo -e "   • Создание пользователя"
    echo -e "   • Настройка 123RF"
    echo -e "   • Генерация изображения"
    echo -e "   • Загрузка на стоки"
    exit 0
else
    echo -e "\n❌ ${RED}Некоторые тесты провалились.${NC}"
    exit 1
fi
