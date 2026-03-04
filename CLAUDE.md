# CLAUDE.md — Instructions for Claude Code

You are building NST Quiz, a real-time classroom quiz platform.

## Read BRIEF.md first — it contains the full spec.

## Key Rules
1. NO EMOJIS ANYWHERE in the UI. Use Line Awesome icons instead.
2. No gradients. Solid pastel colors only. Thick lines/borders.
3. Big buttons on student pages (mobile-first).
4. All answer validation server-side. Never expose answers to client.
5. This is a Nuxt 3 app with Socket.IO. Single deploy, no database.
6. Use TypeScript throughout.
7. MIT License.
8. Make it beautiful and animated (Animate.css, canvas-confetti).
9. Keep it minimal — no over-engineering.

## Build Steps
1. Initialize Nuxt 3 project with TypeScript
2. Install dependencies: socket.io, socket.io-client, animate.css, canvas-confetti, papaparse, @nicepkg/line-awesome or similar icon package
3. Build server-side state management (in-memory)
4. Build Socket.IO server plugin
5. Build API routes (admin + student)
6. Build pages: index (join), play, admin, leaderboard
7. Build question components for each type
8. Style everything with the pastel design system
9. Add animations and confetti
10. Add sample quiz JSON files
11. Test that answers are never leaked to client
12. Create Dockerfile for deployment
13. Add README.md with usage instructions

When completely finished, run: openclaw system event --text "Done: NST Quiz platform built — Nuxt 3 + Socket.IO quiz app with 3 modes (Classic/Blitz/Survival), 5 question types, admin dashboard, live leaderboard, pastel design, no DB" --mode now
