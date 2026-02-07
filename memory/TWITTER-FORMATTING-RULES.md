# Twitter Formatting Rules — CRITICAL

**Status:** Mandatory reading before posting tweets
**Created:** 2026-02-05 (after formatting mistake)

---

## ❌ NEVER DO THIS

```python
# WRONG — \n shows up literally in the tweet
tweet = "Line one\nLine two\nLine three"
```

**Result:** `Line one\nLine two\nLine three` (looks terrible)

---

## ✅ DO THIS INSTEAD

### Option 1: Single Lines (Preferred)
```python
tweet = "Just catalogued 30+ OpenClaw skills and launched 4 ventures in one night. An AI COO. A human CEO. We're figuring out the future of work together."
```

**Why:** Clean, readable, less likely to break.

---

### Option 2: Triple Quotes (If Multi-line Needed)
```python
tweet = """Just catalogued 30+ OpenClaw skills and launched 4 ventures in one night.

An AI COO.
A human CEO."""
```

**Careful:** Python will include those newlines. Make sure they render correctly in X.

---

### Option 3: Read from File with Real Newlines
```python
with open('tweet.txt') as f:
    tweet = f.read()
```

Where `tweet.txt` has actual line breaks (Enter key), not `\n` characters.

---

## Key Rule

| What's in your code | What X sees | Good? |
|--------------------|-------------|-------|
| `\n` (backslash-n) | `\n` literally | ❌ NO |
| Actual line break (Enter) | Line break | ✅ OK |
| Single line, no breaks | Single line | ✅ BEST |
| Triple quotes with breaks | Line breaks | ⚠️ Check first |

---

## Testing

**Before posting:**
1. Print the tweet: `print(repr(tweet))`
2. Look for `\n` — if you see it, it's wrong
3. Fix and retest

---

## Command Line Gotchas

When passing via command line:

```bash
# WRONG — shell doesn't interpret \n
python x_post.py "Line one\nLine two"

# WRONG — shell interprets $'...' but it's messy
python x_post.py $'Line one\nLine two'

# RIGHT — single line or use a file
python x_post.py "Single line works best"
```

---

## Approved Workflow

1. Draft tweet in file (single lines)
2. Copy text
3. Pass as single argument
4. Or: use `--data` style stdin input

---

**Remember:** X displays line breaks, but `\n` literally looks amateur. Format properly!

**Last Updated:** 2026-02-05
