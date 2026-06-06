#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="$ROOT/.git/hooks/pre-commit"

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
set -e

if git diff --cached --name-only | grep -q '^tree\.json$'; then
  echo "Validating tree.json..."
  npm run validate
fi
EOF

chmod +x "$HOOK"
echo "Installed pre-commit hook at .git/hooks/pre-commit"
