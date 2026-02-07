# JSON Validator Skill

**Purpose:** Validate JSON strings before using them in operations

## Usage

### Command Line
```bash
# Validate a JSON string
~/.openclaw/workspace/scripts/validate-json.sh '{"key": "value"}'

# Validate file content
cat file.json | jq empty && echo "Valid" || echo "Invalid"
```

### In Operations
Before any `edit` or `write` with JSON content:

1. Build the content
2. Test: `echo '<content>' | jq empty`
3. If valid (exit 0) → proceed
4. If invalid (exit 1) → escape/fix the content

## Common Fixes

### Unescaped Quotes
- Find: `"text with "quotes" inside"`
- Fix: `"text with \"quotes\" inside"`

### Unescaped Backslashes  
- Find: `"path\to\file"`
- Fix: `"path\\to\\file"`

### Newlines in Strings
- Find: `"line1\nline2"` (literal newline)
- Fix: `"line1\\nline2"` (escaped) or remove newlines

## Tools Available

- `jq` — JSON parser/validator (installed ✅)
- `jsonlint` — Alternative validator (installed ✅)
- `validate-json.sh` — Wrapper script for easy validation

## Rule

**NO JSON OPERATIONS WITHOUT VALIDATION**

Before every `edit` or `write` call with JSON:
- Run through `jq empty` 
- Confirm exit code 0
- Only then execute the operation
