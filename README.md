# NST Quiz

A real-time classroom quiz platform — Kahoot-inspired, self-hosted, no database.

Built with Nuxt 3, Socket.IO, Animate.css, and canvas-confetti.

---

## Features

- **3 Quiz Modes**: Classic (self-paced), Blitz (timed, live leaderboard), Survival (elimination)
- **5 Question Types**: MCQ, True/False, Fill in the Blank, Integer, Matching
- **Real-time**: Socket.IO for live player count, leaderboard updates, timer sync
- **Admin Dashboard**: Upload quiz JSON, control flow, view responses, download CSV
- **Leaderboard Page**: Projector-friendly, animated rank changes, confetti on win
- **No Database**: All state is in-memory, single container deployment
- **Secure**: Answers never sent to clients — server-side validation only
- **Mobile-first**: Big buttons, large text, works on phones

---

## Quick Start

### Development

```bash
cp .env.example .env
npm install
npm run dev
```

Open:
- Student join: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin (default password: `admin`)
- Leaderboard: http://localhost:3000/leaderboard

### Production with Docker

```bash
docker build -t nst-quiz .
docker run -p 3000:3000 -e ADMIN_PASSWORD=yourpassword nst-quiz
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ADMIN_PASSWORD` | `admin` | Admin login password |
| `PORT` | `3000` | Server port |

---

## Quiz JSON Format

Create a `.json` file and upload it via the admin dashboard.

```json
{
  "title": "Quiz Title",
  "mode": "blitz",
  "timePerQuestion": 30,
  "questions": [
    {
      "type": "mcq",
      "question": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "answer": 1
    },
    {
      "type": "true-false",
      "question": "The sky is blue.",
      "answer": true
    },
    {
      "type": "fill",
      "question": "The capital of France is ___.",
      "answer": "Paris",
      "caseSensitive": false
    },
    {
      "type": "integer",
      "question": "How many days in a week?",
      "answer": 7
    },
    {
      "type": "match",
      "question": "Match the pairs.",
      "left": ["Cat", "Dog"],
      "right": ["Feline", "Canine"],
      "answer": [[0, 0], [1, 1]]
    }
  ]
}
```

### Modes

| Mode | Description |
|---|---|
| `classic` | All questions shown at once, students submit when done |
| `blitz` | One question at a time, timer per question, speed-based scoring |
| `survival` | One question at a time, wrong/no answer = eliminated |

### Question Types

| Type | `answer` format |
|---|---|
| `mcq` | Integer index of correct option (0-based) |
| `true-false` | `true` or `false` |
| `fill` | String answer |
| `integer` | Number |
| `match` | `[[leftIdx, rightIdx], ...]` pairs |

---

## Admin Flow

1. Go to `/admin`, enter password
2. Upload quiz JSON file
3. Players join at `/` (enter their name)
4. Click **Start Quiz**
5. For Blitz/Survival: click **Next** to advance questions
6. Click **End Quiz** when done
7. Download CSV results

---

## Scoring

- **Classic**: 100 points per correct answer
- **Blitz**: 1000 max, decays linearly with time (min 100 for correct answer)
- **Survival**: No points — last player standing wins

---

## Architecture

```
nst-quiz/
├── server/
│   ├── api/admin/      Admin API routes (auth required)
│   ├── api/quiz/       Student API routes (public)
│   ├── plugins/        Socket.IO server plugin
│   └── utils/          Shared state + helpers
├── pages/
│   ├── index.vue       Student join page
│   ├── play.vue        Student quiz page
│   ├── admin.vue       Admin dashboard
│   └── leaderboard.vue Projector leaderboard
├── components/
│   ├── question/       MCQ, TrueFalse, FillBlank, Integer, Match
│   ├── Timer.vue
│   ├── PlayerList.vue
│   └── LeaderboardDisplay.vue
├── composables/
│   ├── useSocket.ts    Socket.IO client wrapper
│   ├── useQuiz.ts      Quiz state helpers
│   └── useConfetti.ts  Confetti animations
└── quiz-samples/       Example quiz JSON files
```

---

## Socket.IO Events

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `quiz:loaded` | `{ title, mode, questionCount }` | Quiz uploaded |
| `quiz:started` | `{ mode, title }` | Quiz started |
| `quiz:question` | `{ question, index, total, timer }` | New question (no answer) |
| `quiz:allQuestions` | `{ questions, title, total }` | Classic mode questions |
| `quiz:timer` | `{ remaining }` | Timer tick |
| `quiz:leaderboard` | `{ leaderboard, questionIndex }` | Scores after question |
| `quiz:eliminated` | `{ reason }` | Player eliminated (survival) |
| `quiz:ended` | `{ leaderboard, title, mode }` | Quiz complete |
| `players:updated` | `{ players }` | Player list changed |

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `player:join` | `{ name }` | Join the quiz |
| `player:answer` | `{ questionIndex, answer }` | Submit answer (blitz/survival) |
| `player:submit` | `{ answers }` | Submit all answers (classic) |

---

## CSV Export

Format: `Rank,Name,Q1,Q1_Correct,Q2,Q2_Correct,...,Total_Score`

---

## License

MIT
