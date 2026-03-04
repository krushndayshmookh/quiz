# NST Quiz — Build Brief

A minimal, beautiful, real-time quiz platform for classroom use. Kahoot-inspired but self-hosted, no database, fully open-source.

## Tech Stack
- **Nuxt 3** (Vue 3 + Nitro server, single deploy)
- **Socket.IO** for real-time communication (leaderboard, question sync)
- **Animate.css** + **canvas-confetti** for animations
- **Icons8 Line Awesome** (thick line icons, no emojis anywhere in the UI — zero emojis)
- **MIT License**

## Design System
- **No emojis anywhere.** Use icons only (Icons8 Line Awesome / similar).
- **No gradients.** Flat, solid pastel colors only.
- **Thick lines and borders.**
- **Big buttons** on student-facing pages (mobile-first, thumb-friendly).
- **Minimal, clean layout.** Whitespace is good.
- Pastel palette: soft purple (#b8a9c9), coral (#f7a49a), mint (#a8e6cf), sky blue (#87ceeb), warm yellow (#ffd975) — all solid fills.
- Dark text on light backgrounds. High contrast.
- Animate.css classes for entrances/exits (bounceIn, fadeInUp, etc.)
- Confetti on quiz completion / winner reveal.

## Architecture

```
nst-quiz/
├── server/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── login.post.ts
│   │   │   ├── upload.post.ts
│   │   │   ├── control.post.ts
│   │   │   ├── results.get.ts
│   │   │   └── quiz.get.ts
│   │   └── quiz/
│   │       └── current.get.ts
│   ├── plugins/
│   │   └── socket.io.ts
│   └── utils/
│       └── state.ts
├── pages/
│   ├── index.vue
│   ├── play.vue
│   ├── leaderboard.vue
│   └── admin.vue
├── components/
│   ├── question/
│   │   ├── MCQ.vue
│   │   ├── TrueFalse.vue
│   │   ├── FillBlank.vue
│   │   ├── Integer.vue
│   │   └── Match.vue
│   ├── Leaderboard.vue
│   ├── Timer.vue
│   └── PlayerList.vue
├── composables/
│   ├── useSocket.ts
│   └── useQuiz.ts
├── public/results/
├── assets/css/main.css
└── quiz-samples/
    ├── sample-classic.json
    ├── sample-blitz.json
    └── sample-survival.json
```

## Quiz Modes

### 1. Classic
- All questions displayed at once, students answer at own pace, submit when done
- Admin closes quiz → results revealed
- No live leaderboard during quiz

### 2. Blitz
- Admin releases one question at a time, timer per question (default 30s)
- Speed-based scoring: 1000 base, decays linearly with time
- Live leaderboard after each question

### 3. Survival
- One question at a time, wrong/no answer = eliminated
- Last standing win, eliminated can spectate

## Question JSON Format
```json
{
  "title": "Week 3 - Node.js Fundamentals",
  "mode": "blitz",
  "timePerQuestion": 30,
  "questions": [
    { "type": "mcq", "question": "What is the event loop?", "options": ["A thread pool", "A single-threaded loop", "A database", "A framework"], "answer": 1 },
    { "type": "true-false", "question": "Node.js is single-threaded", "answer": true },
    { "type": "fill", "question": "The ___ module handles file ops", "answer": "fs", "caseSensitive": false },
    { "type": "integer", "question": "Default HTTP port?", "answer": 80 },
    { "type": "match", "question": "Match module system with syntax", "left": ["require()", "import"], "right": ["CommonJS", "ESM"], "answer": [[0,0],[1,1]] }
  ]
}
```

## Security
- Answer fields NEVER sent to students via API or Socket.IO
- Validation happens server-side only
- Admin routes require session token from password login
- ADMIN_PASSWORD env var (default "admin" for dev)

## Socket.IO Events
Server→Client: quiz:started, quiz:question, quiz:timer, quiz:leaderboard, quiz:ended, quiz:eliminated, players:updated
Client→Server: player:join, player:answer, player:submit

## Admin Dashboard
- Password login, upload quiz JSON, see connected players
- Control flow (start, next, end), live response view
- See answers alongside responses, download CSV, toggle answer reveal

## Student Flow
1. Visit quiz.nstsdc.org → enter name → join lobby
2. Wait for start → answer questions → see results

## Leaderboard Page (/leaderboard)
- Projector-friendly (large fonts, high contrast), auto-updates via Socket.IO
- Animated rank changes, confetti for top 3

## CSV Export: Name,Q1,Q1_Correct,Q2,Q2_Correct,...,Total_Score,Rank

## Deployment
- NST K3s cluster, quiz.nstsdc.org, single container
- Env: ADMIN_PASSWORD, PORT (default 3000)

## Dependencies
nuxt ^3.x, socket.io ^4.x, socket.io-client ^4.x, animate.css ^4.x, canvas-confetti ^1.x, papaparse ^5.x, line-awesome icons
