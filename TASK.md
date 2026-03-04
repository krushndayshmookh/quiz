# TASK: Move Admin to Socket.IO

## Current State
- Admin page polls `/api/admin/quiz` every 2 seconds (wasteful)
- Admin actions (start, next, lock, end, reset) go through `/api/admin/control.post.ts` REST endpoint
- Admin login goes through `/api/admin/login.post.ts` REST endpoint
- Upload goes through `/api/admin/upload.post.ts` REST endpoint

## Goal
Move ALL admin interactions to Socket.IO. Admin connects to the same Socket.IO server but joins an 'admin' room.

## Changes Needed

### 1. server/plugins/socket.io.ts — Add admin socket handlers

On connection, add these handlers:

```
socket.on('admin:login', { password }) → validate password, join 'admin' room, emit 'admin:authenticated'
socket.on('admin:upload', { quiz }) → load quiz into state, emit 'admin:quizLoaded' + 'quiz:loaded' to all
socket.on('admin:start') → start quiz (same logic as control.post.ts 'start')
socket.on('admin:next') → next question (same logic as 'next')
socket.on('admin:lock') → lock current question (same logic as 'lock')
socket.on('admin:end') → end quiz (same logic as 'end')
socket.on('admin:reset') → reset state (same logic as 'reset')
```

Admin should receive real-time events:
- `admin:state` — full state update (quiz info, phase, players, current question WITH answers, scores)
- `players:updated` — already broadcast globally
- `quiz:answerCount` — already sent
- All quiz events (question, timer, leaderboard, ended)

Send `admin:state` whenever state changes (after start, next, answer received, timer tick, etc).

### 2. Admin state emission helper

Create a function `emitAdminState()` that sends to the 'admin' room:
```js
function emitAdminState() {
  io.to('admin').emit('admin:state', {
    phase: state.phase,
    quiz: state.quiz ? {
      title: state.quiz.title,
      mode: state.quiz.mode,
      timePerQuestion: state.quiz.timePerQuestion,
      questions: state.quiz.questions, // WITH answers for admin
      questionCount: state.quiz.questions.length,
    } : null,
    currentQuestionIndex: state.currentQuestionIndex,
    timerRemaining: state.timerRemaining,
    questionLocked: state.questionLocked,
    players: [...state.players.values()].map(p => ({
      id: p.id, name: p.name, score: p.score,
      answers: p.answers, connected: p.connected,
      eliminated: p.eliminated, spectator: p.spectator,
    })),
    leaderboard: getLeaderboard(),
  })
}
```

Call `emitAdminState()` after every state change.

### 3. pages/admin.vue — Rewrite to use Socket.IO

- Remove all `$fetch` / polling logic
- Connect to Socket.IO on mount
- Emit `admin:login` with password
- Listen for `admin:authenticated` / `admin:error`
- Listen for `admin:state` to update all dashboard state reactively
- Quiz upload: read file client-side, parse JSON, emit `admin:upload` with the quiz object
- Control buttons emit: `admin:start`, `admin:next`, `admin:lock`, `admin:end`, `admin:reset`
- Listen for all quiz events for real-time updates

### 4. Keep REST endpoints as fallback but they are no longer the primary path
- Keep `/api/admin/login.post.ts`, `/api/admin/upload.post.ts`, `/api/admin/control.post.ts` working
- But admin.vue should NOT use them anymore

### 5. Important details
- Admin password validation: use same logic as current `requireAdmin` (check ADMIN_PASSWORD env, default "admin")
- The `emitQuestionToAll` async function with `fetchSockets()` stays as-is
- All existing player/spectator socket events remain unchanged
- Admin socket should NOT be in 'players' or 'active-players' rooms
- The admin:state should include the full question WITH answers so admin can see correct answers on their dashboard
- Quiz JSON file upload: parse client-side, send as object over socket (not multipart)
- Validate quiz structure server-side before accepting

### 6. Quiz validation on upload
Validate the quiz JSON has: title (string), mode (classic|blitz|survival), questions (array with at least 1 entry). Each question must have: type, question. Emit `admin:error` if invalid.

### Design
Keep the existing admin.vue design/styling. Just replace the data fetching and action dispatching layer.

When done, run: openclaw system event --text "Done: Admin migrated to Socket.IO" --mode now
