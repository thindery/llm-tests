# 🛡️ JSON Validation Rule — ENFORCED

**Effective Immediately:** All JSON content must pass validation before use

---

## The Rule

**BEFORE** calling `edit()` or `write()` with JSON content:

```bash
# 1. Build the content string
CONTENT='{"key": "value with \"quotes\""}'

# 2. Validate with jq
if echo "$CONTENT" | jq empty 2>/dev/null; then
    echo "✅ Valid — proceed with operation"
    # execute edit/write
else
    echo "❌ Invalid — fix before proceeding"
    # escape quotes, fix newlines, etc.
fi
```

**NO EXCEPTIONS**

---

## Enforcement

### Tools Installed
- ✅ `jq` — JSON processor (v1.7.1)
- ✅ `jsonlint` — JSON linter (npm)
- ✅ `validate-json.sh` — Custom validation script

### Validation Script Location
`~/.openclaw/workspace/scripts/validate-json.sh`

### Usage
```bash
# Validate inline JSON
~/.openclaw/workspace/scripts/validate-json.sh '{"test": "value"}'

# In agent operations — validate before executing
```

---

## Common Validation Failures

| Issue | Example | Fix |
|-------|---------|-----|
| Unescaped quotes | `"say "hello""` | `"say \"hello\""` |
| Unescaped backslash | `"C:\path"` | `"C:\\path"` |
| Literal newlines | `"line1
line2"` | `"line1\\nline2"` or single line |
| Trailing commas | `{"a": 1,}` | `{"a": 1}` |
| Single quotes | `{'key': 'val'}` | `{"key": "val"}` |

---

## Why This Matters

**Before Rule:**
- 2-3 JSON errors per hour
- Tool calls fail mid-operation
- Context lost, time wasted
- User frustration

**After Rule:**
- Near-zero JSON errors
- Reliable tool execution
- Smooth operations
- Happy thindery 😊

---

## Validation Checklist

Before every `edit` or `write`:

- [ ] Content built as string
- [ ] Passed through `jq empty` validation
- [ ] Exit code 0 confirmed
- [ ] Now safe to execute

---

**Enforced By:** Remy (self-monitoring)
**Tools:** jq, jsonlint, validate-json.sh
**Effective:** 2026-02-05
**Status:** ACTIVE
