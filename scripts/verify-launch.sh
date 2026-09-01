#!/usr/bin/env bash
# Launch gate. Fails while anything unapproved is still in the rendered pages.
# This is the mechanical form of the approval list in QA-AND-LAUNCH.md — a rule
# in a script is a rule; a rule in a document is a suggestion.
#
# Exit 0 = safe to publish. Exit 1 = blockers remain.
# Author: Uvin Vindula (IAMUVIN) — iamuvin.com

set -uo pipefail
FAIL=0
PAGES=(en th index.html 404.html)

pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAIL=1; }

echo "JOMTIEN LAUNCH GATE"
echo "----------------------------------------"

# 1. Build slots must be filled or deleted.
SLOTS=$(grep -rln 'class="slot' "${PAGES[@]}" 2>/dev/null || true)
if [ -n "$SLOTS" ]; then
  fail "build slots still rendered:"
  printf '          %s\n' $SLOTS
else
  pass "no build slots in rendered pages"
fi

# 1b. Legal fill-ins the owner or their counsel must supply.
FILLS=$(grep -rc 'class="fill"' "${PAGES[@]}" 2>/dev/null | grep -v ':0$' || true)
if [ -n "$FILLS" ]; then
  fail "unfilled legal values (see docs/PRIVACY-FILL.md):"
  printf '          %s\n' $FILLS
else
  pass "no unfilled legal values"
fi

# 2 + 3. Nothing unverified and no drafting residue may reach a visitor.
#
# Tested against RENDERED TEXT ONLY. A raw grep flags developer notes inside
# HTML comments and the legitimate placeholder="https://" attribute, and a gate
# that fails correct work is a gate someone switches off.
RESIDUE=$(python3 - <<'PY'
import re, pathlib, sys

BANNED = ["unverified", "lorem ipsum", "todo", "fixme", "coming soon", "tbd"]
hits = []

for path in pathlib.Path(".").rglob("*.html"):
    if any(part in {"node_modules", "dist", "instructions"} for part in path.parts):
        continue
    raw = path.read_text(encoding="utf-8")
    body = re.sub(r"<!--.*?-->", "", raw, flags=re.S)   # developer notes
    body = re.sub(r"<script.*?</script>", "", body, flags=re.S)
    body = re.sub(r"<[^>]+>", " ", body)                # attributes go with the tags
    low = body.lower()
    for word in BANNED:
        if word in low:
            hits.append(f"{path}: {word}")

print("\n".join(hits))
PY
)
if [ -n "$RESIDUE" ]; then
  fail "unverified marker or drafting residue in rendered text:"
  printf '          %s\n' $RESIDUE
else
  pass "no unverified marker or residue in rendered text"
fi

# 4. The forms must post to a handler that exists and names a real inbox.
if [ -f contact.php ] && grep -q "MAIL_TO *= *'[^']*@" contact.php; then
  MAILBOX=$(grep -o "MAIL_TO *= *'[^']*'" contact.php | head -1 | sed "s/.*'\(.*\)'/\1/")
  ACTIONS=$(grep -rl 'action="/contact.php"' en th 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ACTIONS" -ge 4 ]; then
    pass "contact handler present, delivering to $MAILBOX ($ACTIONS forms wired)"
  else
    fail "contact.php exists but only $ACTIONS of 4 forms post to it"
  fi
else
  fail "no contact handler — forms cannot claim delivery"
fi

# 5. Both locales must exist and carry equivalent sections.
for loc in en th; do
  if [ -f "$loc/index.html" ]; then
    n=$(grep -c '<section' "$loc/index.html" 2>/dev/null || echo 0)
    printf '  INFO  %s/index.html sections: %s\n' "$loc" "$n"
  else
    fail "$loc/index.html missing"
  fi
done
if [ -f en/index.html ] && [ -f th/index.html ]; then
  a=$(grep -c '<section' en/index.html); b=$(grep -c '<section' th/index.html)
  if [ "$a" -eq "$b" ]; then pass "locale section parity ($a)"; else fail "locale section parity: en=$a th=$b"; fi
fi

# 6. Every external link must carry rel="noopener noreferrer".
BAD=$(grep -rn 'target="_blank"' "${PAGES[@]}" 2>/dev/null | grep -v 'noopener noreferrer' || true)
if [ -n "$BAD" ]; then
  fail "target=_blank without rel=noopener noreferrer:"; printf '          %s\n' "$BAD"
else
  pass "external links carry rel=noopener noreferrer"
fi

# 7. Contrast gate.
if node scripts/check-contrast.mjs >/dev/null 2>&1; then
  pass "contrast gate"
else
  fail "contrast gate — run: node scripts/check-contrast.mjs"
fi

echo "----------------------------------------"
if [ "$FAIL" -eq 0 ]; then echo "READY"; else echo "BLOCKED"; fi
exit "$FAIL"
