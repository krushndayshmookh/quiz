# CLAUDE.md — NST Quiz project rules

NST Quiz is a **Nuxt 3 + Socket.IO** real-time classroom quiz platform. The app is fully built.

## Key Rules
1. NO EMOJIS anywhere in the UI. Use Line Awesome icons instead.
2. No gradients. Solid pastel colors only. Thick lines/borders.
3. Big buttons on student pages (mobile-first).
4. All answer validation is server-side. Never expose answers to clients.
5. Single-process in-memory state — no database. Everything lives in `server/utils/state.ts`.
6. TypeScript throughout.
7. MIT License.

## Dev commands
```bash
npm run dev          # development server
npm run build        # production build
PORT=3333 node .output/server/index.mjs   # run production build
```

## Architecture
- `server/plugins/socket.io.ts` — all real-time logic
- `server/utils/state.ts` — shared in-memory state + helpers
- `server/api/admin/` — REST endpoints (auth required)
- `pages/` — index (join), play, admin, leaderboard, review, guide
- `components/question/` — MCQ, TrueFalse, FillBlank, Integer, Match
- `quiz-samples/` — sample JSON files for testing
