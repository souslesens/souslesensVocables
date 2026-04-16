#!/usr/bin/env bash
# Worktree: claude/fix-issue-1796 — Issue #1796
# Backend:  http://localhost:4206
# Frontend: http://localhost:6369
set -e

export PORT=4206
export VITE_BACKEND_PORT=4206
export VITE_PORT=6369

echo '▶ Backend on :4206'
npm run start &
BACKEND_PID=$!

echo '▶ Frontend on :6369'
NODE_ENV=development vite mainapp --config mainapp/vite.config.worktree.js &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID
