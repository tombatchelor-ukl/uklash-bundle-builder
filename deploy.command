#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "▶ Deploying UKLASH Bundle Builder..."
echo ""

git add .

# Only commit if there are changes
if git diff --cached --quiet; then
  echo "Nothing new to deploy — already up to date."
else
  git commit -m "Update $(date '+%d/%m/%Y %H:%M')"
  git push
  echo ""
  echo "✓ Done! Changes will be live in ~60 seconds at:"
  echo "  https://tombatchelor-ukl.github.io/uklash-bundle-builder/"
fi

echo ""
read -p "Press Enter to close..."
