#!/bin/bash

# Optimization Middleware Testing Script
# This script tests all optimization features implemented in the backend

echo "======================================"
echo "Testing Backend Optimization Features"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:5000"

# Counter for tests
PASSED=0
FAILED=0

# Helper function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}: $2"
        ((FAILED++))
    fi
}

echo "1. Testing Server Health"
echo "========================"
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q "healthy"; then
    print_result 0 "Server is healthy"
else
    print_result 1 "Server health check failed"
fi
echo ""

echo "2. Testing Compression (Gzip/Deflate)"
echo "======================================"
COMPRESSION=$(curl -s -H "Accept-Encoding: gzip,deflate" -I "$BASE_URL/api/products" 2>&1 | grep -i "content-encoding")
if echo "$COMPRESSION" | grep -iq "gzip\|deflate"; then
    print_result 0 "Compression is enabled"
    echo "   $COMPRESSION"
else
    print_result 1 "Compression is not working"
fi
echo ""

echo "3. Testing Response Time Header"
echo "==============================="
RESPONSE_TIME=$(curl -s -I "$BASE_URL/api/products" 2>&1 | grep -i "x-response-time")
if [ ! -z "$RESPONSE_TIME" ]; then
    print_result 0 "Response time header present"
    echo "   $RESPONSE_TIME"
else
    print_result 1 "Response time header missing"
fi
echo ""

echo "4. Testing ETag Support"
echo "======================="
# First request to get ETag
ETAG_RESPONSE=$(curl -s -i "$BASE_URL/api/products" 2>&1)
ETAG=$(echo "$ETAG_RESPONSE" | grep -i "etag:" | cut -d' ' -f2 | tr -d '\r')

if [ ! -z "$ETAG" ]; then
    print_result 0 "ETag header present"
    echo "   ETag: $ETAG"

    # Second request with If-None-Match
    echo "   Testing conditional request with If-None-Match..."
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "If-None-Match: $ETAG" "$BASE_URL/api/products")

    if [ "$STATUS" -eq "304" ]; then
        print_result 0 "ETag conditional request returns 304 Not Modified"
    else
        print_result 1 "ETag conditional request failed (Status: $STATUS)"
    fi
else
    print_result 1 "ETag header missing"
fi
echo ""

echo "5. Testing Cache-Control Headers"
echo "================================="
CACHE_CONTROL=$(curl -s -I "$BASE_URL/api/products" 2>&1 | grep -i "cache-control")
if [ ! -z "$CACHE_CONTROL" ]; then
    print_result 0 "Cache-Control header present"
    echo "   $CACHE_CONTROL"
else
    print_result 1 "Cache-Control header missing"
fi
echo ""

echo "6. Testing Content-Length Header"
echo "================================="
CONTENT_LENGTH=$(curl -s -I "$BASE_URL/api/products" 2>&1 | grep -i "content-length")
if [ ! -z "$CONTENT_LENGTH" ]; then
    print_result 0 "Content-Length header present"
    echo "   $CONTENT_LENGTH"
else
    print_result 1 "Content-Length header missing"
fi
echo ""

echo "7. Testing Field Filtering"
echo "==========================="
FULL_RESPONSE=$(curl -s "$BASE_URL/api/products")
FILTERED_RESPONSE=$(curl -s "$BASE_URL/api/products?fields=name,price")

FULL_SIZE=${#FULL_RESPONSE}
FILTERED_SIZE=${#FILTERED_RESPONSE}

if [ $FILTERED_SIZE -lt $FULL_SIZE ]; then
    REDUCTION=$(( (FULL_SIZE - FILTERED_SIZE) * 100 / FULL_SIZE ))
    print_result 0 "Field filtering working (${REDUCTION}% size reduction)"
    echo "   Full response: $FULL_SIZE bytes"
    echo "   Filtered response: $FILTERED_SIZE bytes"
else
    print_result 1 "Field filtering not working"
fi
echo ""

echo "8. Testing CORS Headers"
echo "======================="
CORS=$(curl -s -I "$BASE_URL/api/products" 2>&1 | grep -i "access-control")
if [ ! -z "$CORS" ]; then
    print_result 0 "CORS headers present"
    echo "$CORS" | while read line; do echo "   $line"; done
else
    print_result 1 "CORS headers missing"
fi
echo ""

echo "9. Testing Security Headers"
echo "============================"

# Test for various security headers
check_header() {
    HEADER=$(curl -s -I "$BASE_URL/api/products" 2>&1 | grep -i "$1:")
    if [ ! -z "$HEADER" ]; then
        print_result 0 "$1 header present"
    else
        print_result 1 "$1 header missing"
    fi
}

check_header "X-Content-Type-Options"
check_header "X-Frame-Options"
check_header "Strict-Transport-Security"
echo ""

echo "10. Testing Rate Limiting"
echo "========================="
echo "   Making 5 rapid requests to test rate limiting..."
for i in {1..5}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/products")
    echo "   Request $i: Status $STATUS"
done

RATE_LIMIT=$(curl -s -I "$BASE_URL/api/products" 2>&1 | grep -i "ratelimit")
if [ ! -z "$RATE_LIMIT" ]; then
    print_result 0 "Rate limit headers present"
    echo "$RATE_LIMIT" | while read line; do echo "   $line"; done
else
    echo "   ${YELLOW}⚠ Note${NC}: Rate limiting may be disabled in development mode"
fi
echo ""

echo "11. Testing JSON Optimization"
echo "============================="
# Test if null values are removed from response
RESPONSE=$(curl -s "$BASE_URL/api/products")
if echo "$RESPONSE" | grep -q "null"; then
    print_result 1 "JSON optimization may not be working (null values found)"
else
    print_result 0 "JSON optimization working (no null values)"
fi
echo ""

echo "12. Testing Last-Modified Header"
echo "================================="
LAST_MODIFIED=$(curl -s -I "$BASE_URL/api/products" 2>&1 | grep -i "last-modified:")
if [ ! -z "$LAST_MODIFIED" ]; then
    print_result 0 "Last-Modified header present"
    echo "   $LAST_MODIFIED"

    # Test If-Modified-Since
    LAST_MODIFIED_VALUE=$(echo "$LAST_MODIFIED" | cut -d' ' -f2- | tr -d '\r')
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "If-Modified-Since: $LAST_MODIFIED_VALUE" "$BASE_URL/api/products")

    if [ "$STATUS" -eq "304" ]; then
        print_result 0 "If-Modified-Since returns 304 Not Modified"
    else
        echo "   ${YELLOW}⚠ Note${NC}: If-Modified-Since returned status $STATUS (may vary based on data)"
    fi
else
    echo "   ${YELLOW}⚠ Note${NC}: Last-Modified header may only appear with timestamp data"
fi
echo ""

echo "======================================"
echo "Test Summary"
echo "======================================"
TOTAL=$((PASSED + FAILED))
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${YELLOW}Some tests failed. Review the output above.${NC}"
    exit 1
fi
