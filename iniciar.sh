#!/bin/sh
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
[ -f prisma/dev.db ] || npm run setup
(sleep 1; xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null) &
node server.js
