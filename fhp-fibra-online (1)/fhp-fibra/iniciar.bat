@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
if not exist prisma\dev.db call npm run setup
start "" http://localhost:3000
node server.js
pause
