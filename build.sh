#!/bin/sh
# Builds the game from src/ into:
#   index.html       fragment for the Claude artifact (the platform adds the doctype)
#   dist/trail.html  standalone file to download and open locally
#   site/trail.html  copy served next to the website
cd "$(dirname "$0")"
PARTS="src/00-head.html src/01-core.js src/02-sprites.js src/03-world.js src/04-entities.js src/05-quests.js src/06-ui.js src/07-actions.js src/08-loop.js src/99-tail.html"
cat $PARTS > index.html
mkdir -p dist site
{ printf '<!DOCTYPE html>\n<html lang="en">\n<head>\n'; sed -n '1,/<\/style>/p' src/00-head.html; printf '</head>\n<body>\n'; sed '1,/<\/style>/d' src/00-head.html; cat src/01-core.js src/02-sprites.js src/03-world.js src/04-entities.js src/05-quests.js src/06-ui.js src/07-actions.js src/08-loop.js src/99-tail.html; printf '</body>\n</html>\n'; } > dist/trail.html
cp dist/trail.html site/trail.html
echo "built index.html, dist/trail.html ($(wc -c < dist/trail.html) bytes), site/trail.html"

# website: web/index.html is the artifact fragment; site/index.html is the standalone copy
{ printf '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'; sed -n '1,/<\/style>/p' web/index.html; printf '</head>\n<body>\n'; sed '1,/<\/style>/d' web/index.html; printf '</body>\n</html>\n'; } > site/index.html
echo "built site/index.html ($(wc -c < site/index.html) bytes)"
