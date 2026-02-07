# 🐛 JSON Error Tracking

**Issue:** Repeated "Unexpected non-whitespace character after JSON at position X" errors

**Last Occurrence:** 2026-02-05 7:29 PM CST
**Position:** Line 1, column 851

---

## Root Cause Analysis

**Likely Causes:**
1. **Tool call arguments escaping** - JSON in JSON causing parse failures
2. **Edit operations with unescaped characters** - Newlines, quotes, backslashes
3. **Long string content** - Memory edits with complex text causing cutoffs
4. **Nested JSON payloads** - Double-encoding issues

**Problematic Patterns:**
- `edit` operations with multi-line content
- `write` operations with large JSON payloads
- Tool calls where arguments contain JSON strings

---

## Prevention Rules (TO IMPLEMENT)

### Rule 1: Always Validate Before Edit/Write
Before any `edit` or `write` operation:
- Try to parse the content as JSON
- Check for unescaped quotes `"` inside strings
- Check for unescaped newlines
- Validate bracket/brace matching

### Rule 2: Escape Contents When Editing JSON Files
When editing `.json` files:
- Double-escape backslashes `\` → `\\`
- Escape quotes `"` → `\"`
- Remove/replace newlines in strings
- Use single quotes for outer strings when possible

### Rule 3: Use write() for New Files, edit() for Changes
- Prefer `write` for creating new files (clean slate)
- Use `edit` only for surgical changes
- For large changes, re-write entire file with `write`

### Rule 4: Test JSON Validity
Before calling tools with JSON content:
```javascript
// Pseudo-check
JSON.parse(content)  // Must not throw
```

### Rule 5: Avoid Nested JSON in Tool Calls
- Don't put JSON strings inside tool call arguments
- Instead: reference file paths, use string IDs
- Keep tool call payloads flat

---

## Safe Patterns

### ✅ Safe: Write New File
```json
{
  "path": "/path/to/file.md",
  "content": "Simple string content\nEscaped newlines"
}
```

### ✅ Safe: Simple Edit
```json
{
  "file_path": "/path/to/file.md",
  "old_string": "exact text to replace",
  "new_string": "replacement text"
}
```

### ❌ Dangerous: Complex Edit with JSON
```json
{
  "file_path": "config.json",
  "old_string": "{\"key\": \"value with \"quotes\"\"}",  // BROKEN
  "new_string": "..."
}
```

### ❌ Dangerous: Nested JSON in Arguments
```json
{
  "content": "{ \"nested\": { \"json\": \"here\" } }"  // HARD TO PARSE
}
```

---

## Fix Strategy

**Immediate:**
- [ ] Add `JSON.parse()` validation before all edits/writes
- [ ] Escape content when editing JSON files
- [ ] Prefer `write` over `edit` for configuration files

**Long-term:**
- [ ] Request OpenClaw add JSON validation to `edit`/`write` tools
- [ ] Implement linter pre-check in my workflow
- [ ] Add test suite for file operations

---

## Current Impact

**Affected Operations:**
- TEAM.md edits (complex table structures)
- Configuration file updates
- Long text block replacements

**Error Frequency:** ~2-3 times per hour during heavy operations

**Severity:** Medium — causes tool failures, slows work, but recoverable

---

**Created:** 2026-02-05
**Priority:** High — affects reliability
**Owner:** Remy (self-enforced rules)
