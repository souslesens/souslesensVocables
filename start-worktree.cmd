@echo off
REM Worktree: claude/fix-issue-1796 -- Issue #1796
REM Backend:  http://localhost:4206
REM Frontend: http://localhost:6369

set PORT=4206
set VITE_BACKEND_PORT=4206
set VITE_PORT=6369

echo Starting backend on :4206...
start "Backend #1796" cmd /k "npm run start"

echo Starting frontend on :6369...
start "Frontend #1796" cmd /k "NODE_ENV=development vite mainapp --config mainapp/vite.config.worktree.js"
