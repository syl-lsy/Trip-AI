#!/bin/bash
set -e

BRANCH=$(git symbolic-ref --short HEAD)
MSG="$1"

if [ -z "$MSG" ]; then
  read -p "Commit message: " MSG
fi

git add .
git commit -m "$MSG" || echo "Nothing to commit, pushing existing commits..."

echo "→ Syncing to GitHub..."
git push github "$BRANCH" && echo "✓ GitHub synced"

echo "→ Syncing to Gitee..."
git push gitee "$BRANCH" && echo "✓ Gitee synced"
