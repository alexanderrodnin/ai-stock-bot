#!/bin/bash

# API User Management Integration Tests
# Tests all CRUD operations for user management

set -e  # Exit on error

# Configuration
API_BASE="http://localhost:3000/api"
HEALTH_URL="http://localhost:3000/health"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
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
    
    # Make the API call
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url")
    fi
    
    # Extract body and status code
    body=$(echo "$response" | head -n -1)
    status_code=$(echo "$response" | tail -n 1)
    
    # Check status code
    if [ "$status_code" = "$expected_status" ]; then
        log_success "Status: $status_code (Expected: $expected_status)"
        
        # Parse and display response
        if command -v jq &> /dev/null; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi
        
        # Store data for subsequent tests
        case $test_name in
            "CREATE_USER_API"|"CREATE_USER_TELEGRAM"|"CREATE_USER_WEB")
                if echo "$body" | grep -q '"success":true'; then
                    # Extract user ID for later tests
                    if command -v jq &> /dev/null; then
                        USER_ID=$(echo "$body" | jq -r '.data.id // empty')
                        if [ "$test_name" = "CREATE_USER_API" ]; then
                            API_USER_ID="$USER_ID"
                        elif [ "$test_name" = "CREATE_USER_TELEGRAM" ]; then
                            TELEGRAM_USER_ID="$USER_ID"
                        elif [ "$test_name" = "CREATE_USER_WEB" ]; then
                            WEB_USER_ID="$USER_ID"
                        fi
                        log_info "   💾 Stored User ID: $USER_ID"
                    fi
                fi
                ;;
        esac
        
    else
        log_error "Status: $status_code (Expected: $expected_status)"
        echo "$body"
    fi
}

# Wait for API to be ready
wait_for_api() {
    log_info "🔄 Waiting for API to be ready..."
    
    for i in {1..30}; do
        if curl -s "$HEALTH_URL" > /dev/null 2>&1; then
            log_success "API is ready!"
            return 0
        fi
        log_info "   Attempt $i/30 - API not ready yet, waiting..."
        sleep 2
    done
    
    log_error "API failed to start within 60 seconds"
    exit 1
}

# Start tests
echo "=================================="
echo "🚀 AI Stock Bot - User API Tests"
echo "=================================="

# Wait for API
wait_for_api

# Test 1: Health Check
test_api_call "HEALTH_CHECK" "GET" "$HEALTH_URL" "" "200" \
    "Verify API health endpoint"

# Test 2: Create API User
test_api_call "CREATE_USER_API" "POST" "$API_BASE/users" \
'{
  "externalId": "api_user_123",
  "externalSystem": "api",
  "username": "john_doe_api",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.api@example.com",
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
}' "201" "Create new API user with full profile"

# Test 3: Create Telegram User
test_api_call "CREATE_USER_TELEGRAM" "POST" "$API_BASE/users" \
'{
  "externalId": "tg_123456789",
  "externalSystem": "telegram",
  "username": "telegram_user",
  "firstName": "Alice",
  "lastName": "Smith"
}' "201" "Create Telegram user with minimal data"

# Test 4: Create Web User
test_api_call "CREATE_USER_WEB" "POST" "$API_BASE/users" \
'{
  "externalId": "web_user_456",
  "externalSystem": "web",
  "username": "alice_web",
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.web@example.com",
  "preferences": {
    "notifications": {
      "email": true,
      "push": false
    }
  }
}' "201" "Create web user with email and preferences"

# Test 5: Try to create duplicate user (should fail)
test_api_call "CREATE_DUPLICATE_USER" "POST" "$API_BASE/users" \
'{
  "externalId": "api_user_123",
  "externalSystem": "api",
  "username": "duplicate_user"
}' "409" "Attempt to create duplicate user (should fail)"

# Test 6: Create user with invalid data (should fail)
test_api_call "CREATE_INVALID_USER" "POST" "$API_BASE/users" \
'{
  "externalSystem": "invalid_system",
  "username": "test"
}' "400" "Create user with invalid external system (should fail)"

# Give API time to process
sleep 1

# Test 7: Get user by ID (using API user)
if [ -n "$API_USER_ID" ]; then
    test_api_call "GET_USER_BY_ID" "GET" "$API_BASE/users/$API_USER_ID" "" "200" \
        "Retrieve API user by MongoDB ID"
else
    log_warning "Skipping GET_USER_BY_ID test - no user ID available"
fi

# Test 8: Get user by External ID - API system
test_api_call "GET_USER_BY_EXTERNAL_ID_API" "GET" "$API_BASE/users/external/api/api_user_123" "" "200" \
    "Retrieve user by external ID (api system)"

# Test 9: Get user by External ID - Telegram system
test_api_call "GET_USER_BY_EXTERNAL_ID_TELEGRAM" "GET" "$API_BASE/users/external/telegram/tg_123456789" "" "200" \
    "Retrieve user by external ID (telegram system)"

# Test 10: Get non-existent user by External ID
test_api_call "GET_NONEXISTENT_USER" "GET" "$API_BASE/users/external/api/nonexistent_user" "" "404" \
    "Try to get non-existent user (should fail)"

# Test 11: Update user profile
if [ -n "$API_USER_ID" ]; then
    test_api_call "UPDATE_USER" "PUT" "$API_BASE/users/$API_USER_ID" \
'{
  "firstName": "John Updated",
  "email": "john.updated@example.com",
  "preferences": {
    "image": {
      "defaultModel": "dall-e-2",
      "defaultQuality": "hd"
    },
    "notifications": {
      "email": true
    }
  }
}' "200" "Update user profile and preferences"
else
    log_warning "Skipping UPDATE_USER test - no user ID available"
fi

# Test 12: Update user with invalid data
if [ -n "$API_USER_ID" ]; then
    test_api_call "UPDATE_USER_INVALID" "PUT" "$API_BASE/users/$API_USER_ID" \
'{
  "email": "invalid-email-format"
}' "400" "Update user with invalid email (should fail)"
else
    log_warning "Skipping UPDATE_USER_INVALID test - no user ID available"
fi

# Test 13: Get user statistics
if [ -n "$API_USER_ID" ]; then
    test_api_call "GET_USER_STATS" "GET" "$API_BASE/users/$API_USER_ID/stats" "" "200" \
        "Get comprehensive user statistics"
else
    log_warning "Skipping GET_USER_STATS test - no user ID available"
fi

# Test 14: Get stats for non-existent user
test_api_call "GET_STATS_NONEXISTENT" "GET" "$API_BASE/users/507f1f77bcf86cd799439011/stats" "" "404" \
    "Get stats for non-existent user (should fail)"

# Test 15: Delete user (soft delete)
if [ -n "$TELEGRAM_USER_ID" ]; then
    test_api_call "DELETE_USER" "DELETE" "$API_BASE/users/$TELEGRAM_USER_ID" "" "200" \
        "Soft delete telegram user"
else
    log_warning "Skipping DELETE_USER test - no telegram user ID available"
fi

# Test 16: Try to get deleted user
if [ -n "$TELEGRAM_USER_ID" ]; then
    test_api_call "GET_DELETED_USER" "GET" "$API_BASE/users/$TELEGRAM_USER_ID" "" "404" \
        "Try to get soft-deleted user (should fail)"
else
    log_warning "Skipping GET_DELETED_USER test - no telegram user ID available"
fi

# Test 17: Try to delete non-existent user
test_api_call "DELETE_NONEXISTENT_USER" "DELETE" "$API_BASE/users/507f1f77bcf86cd799439011" "" "404" \
    "Try to delete non-existent user (should fail)"

# Test 18: Invalid MongoDB ID format
test_api_call "INVALID_ID_FORMAT" "GET" "$API_BASE/users/invalid-id-format" "" "400" \
    "Use invalid MongoDB ID format (should fail)"

# Final results
echo
echo "=================================="
echo "📊 Test Results Summary"
echo "=================================="
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:      ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:      ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n❌ ${RED}Some tests failed.${NC}"
    exit 1
fi
