#!/bin/bash
# test-phase-tracker.sh - Test script for Phase 2 implementation
# Usage: ./test-phase-tracker.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHASE_TRACKER="${SCRIPT_DIR}/run-phase-tracker.sh"
AUTO_COMPLETE="${SCRIPT_DIR}/ralph-auto-complete.sh"
RECOVERY="${SCRIPT_DIR}/ralph-recovery.sh"

echo "🦞 Phase Tracker Phase 2 Test Suite"
echo "===================================="
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

# Test helper
run_test() {
    local name="$1"
    local cmd="$2"
    
    echo -n "Testing $name... "
    if eval "$cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "  Command: $cmd"
        ((FAILED++))
    fi
}

# 1. File existence tests
echo "1. File Structure Tests"
echo "------------------------"

run_test "Phase tracker TS exists" "test -f ${SCRIPT_DIR}/phase-tracker.ts"
run_test "Run script exists" "test -f ${SCRIPT_DIR}/run-phase-tracker.sh"
run_test "Auto-complete script exists" "test -f ${SCRIPT_DIR}/ralph-auto-complete.sh"
run_test "Recovery script exists" "test -f ${SCRIPT_DIR}/ralph-recovery.sh"
run_test "Watch script exists" "test -f ${SCRIPT_DIR}/ralph-watch.sh"
run_test "README exists" "test -f ${SCRIPT_DIR}/PHASE2-README.md"

echo

# 2. Permission tests
echo "2. Permission Tests"
echo "-------------------"

run_test "Run script is executable" "test -x ${SCRIPT_DIR}/run-phase-tracker.sh"
run_test "Auto-complete is executable" "test -x ${SCRIPT_DIR}/ralph-auto-complete.sh"
run_test "Recovery is executable" "test -x ${SCRIPT_DIR}/ralph-recovery.sh"
run_test "Watch is executable" "test -x ${SCRIPT_DIR}/ralph-watch.sh"

echo

# 3. TypeScript syntax check
echo "3. Syntax Tests"
echo "---------------"

if command -v npx > /dev/null 2>&1; then
    # Try tsc --noEmit for syntax check
    if npx tsc --version > /dev/null 2>&1; then
        run_test "TypeScript compiles" "npx tsc --noEmit --skipLibCheck --target ES2020 --module commonjs ${SCRIPT_DIR}/phase-tracker.ts"
    else
        echo -e "${YELLOW}⚠ tsc not available, skipping compile test${NC}"
    fi
else
    echo -e "${YELLOW}⚠ npx not available, skipping compile test${NC}"
fi

echo

# 4. Help output tests
echo "4. CLI Help Tests"
echo "-----------------"

run_test "Phase tracker shows help" "${PHASE_TRACKER} --help 2>&1 | grep -q 'Commands'"
run_test "Auto-complete shows help" "${AUTO_COMPLETE} --help 2>&1 | grep -q 'Ralph Auto-Complete'"
run_test "Recovery shows help" "${RECOVERY} --help 2>&1 | grep -q 'Ralph Recovery'"

echo

# 5. State directory tests
echo "5. State Management Tests"
echo "-------------------------"

STATE_DIR="${HOME}/.openclaw/workspace"
run_test "State directory exists" "test -d ${STATE_DIR}"
# Create state file path (won't create actual file)
run_test "Can create temp file" "touch /tmp/phase-tracker-test && rm -f /tmp/phase-tracker-test"

echo

# Summary
echo "===================================="
echo "Test Summary"
echo "===================================="
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi