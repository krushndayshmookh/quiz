# TASK: Blitz UX Improvements + Review Page

Read all relevant files before making changes. Build must pass (`npx nuxt build`).

## Bug Fixes

### 1. "Next" button shows Q11 on a 10-question quiz
In `pages/admin.vue`, the Next button label shows `Next Q (${qIndex + 2}/${totalQ})` even when on the last question's leaderboard. When `qIndex + 2 > totalQ`, it should say "Final Results" instead.

### 2. Auto-lock when all players answer
In `server/plugins/socket.io.ts`, in the `player:answer` handler, after recording the answer and emitting answerCount: check if ALL active (non-eliminated, non-spectator, connected) players have answered the current question. If so, auto-lock: call `clearTimer()`, `processAnswersAndScore()`, `emitLeaderboard()`, set `state.phase = 'leaderboard'`, and `emitAdminState()`. This avoids waiting for the timer when everyone's already answered.

## New Features

### 3. Live score countdown in blitz (student side)
In blitz mode, the score decreases as time passes. Students should see their POTENTIAL score ticking down alongside the timer.

In `pages/play.vue`:
- Add a `potentialScore` computed or ref that calculates: if not yet answered, `Math.round(1000 * (timerRemaining / timerMax))` (same formula as blitz scoring). If already answered, show the locked-in score.
- Display this prominently above/beside the timer in the blitz question view, like: "1000 pts" counting down to "0 pts"
- Style it with a large font, maybe coral color when low, mint when high
- Use the existing timer tick (`quiz:timer` event updates `timerRemaining`) to drive reactivity

### 4. Show correct answer after lock
When the question is locked/scored, reveal the correct answer to students.

In `server/plugins/socket.io.ts`:
- After `processAnswersAndScore()`, emit a new event `quiz:reveal` to all players with:
  ```js
  { questionIndex, correctAnswer: state.quiz.questions[questionIndex].answer }
  ```
- For MCQ, the `correctAnswer` needs to be SHUFFLED per-player (map original answer index through the player's shuffleMap). So iterate players and send individually: `io.to(id).emit('quiz:reveal', { questionIndex, correctAnswer: shuffled })`
- For true-false, fill, integer: send as-is to all

In `pages/play.vue`:
- Listen for `quiz:reveal` event
- Store `revealedAnswer` ref
- Pass it as `correctAnswer` prop to the current question component (MCQ, TrueFalse, etc.)
- The components already support `correctAnswer` prop and show correct/wrong styling

### 5. Review page after quiz ends
Create `pages/review.vue` — a self-contained page that shows the student's performance WITHOUT any socket connection.

**Data flow:**
- When `quiz:ended` fires on the client, store review data in `localStorage`:
  ```js
  localStorage.setItem('nst-review', JSON.stringify({
    playerName, quizTitle, mode, score, rank,
    questions: [...], // the questions they received (classicQuestions or collected from quiz:question events)
    answers: {...},   // their answers (classicAnswers or collected answers)
    correctAnswers: {...}, // from quiz:reveal events collected during quiz
    totalPlayers, timestamp: Date.now()
  }))
  ```
- For blitz/survival: collect questions as they come in (`quiz:question` events) into an array, collect answers, collect reveals

**In `pages/play.vue`:**
- Add refs to accumulate blitz/survival questions and correct answers throughout the quiz
- On each `quiz:question`, push to `allQuestions` array
- On each `quiz:reveal`, store in `allCorrectAnswers` record
- On `quiz:ended`, save everything to localStorage and show a "Review My Answers" button alongside "Back to Home"

**`pages/review.vue` layout:**
- Read from localStorage on mount
- If no data, show "No review data available" with a back button
- Show: player name, quiz title, mode, score, rank, date
- List ALL questions with:
  - Question text and type
  - For MCQ: show all options, highlight selected answer (green if correct, red if wrong), show correct answer
  - For TrueFalse: show True/False, highlight selection
  - For Fill/Integer: show their answer vs correct answer
  - For Match: show their pairs vs correct pairs
- Summary at top: X/Y correct, score, rank
- Add a print button that calls `window.print()`
- Add print-friendly CSS (`@media print`) that hides the button, removes shadows, uses black/white
- NO socket connection on this page
- Style consistent with the rest of the app (same pastel theme, cards, borders)

**In the ended screen (`pages/play.vue`):**
- Add a button: "Review My Answers" → navigates to `/review`

### 6. Admin "Next" button label on last question
When on the leaderboard of the LAST question (qIndex + 1 >= totalQ), the button should say "End Quiz & Show Results" instead of "Next Q (11/10)".

## Important Notes
- Don't break existing classic mode functionality
- Don't break existing admin socket events
- The `emitAdminState()` must be called after auto-lock so admin dashboard updates
- Timer display on student side already updates via `quiz:timer` socket event
- MCQ correctAnswer needs per-player shuffle mapping (use player's shuffleMap to convert original index to shuffled index)
- Keep all existing styling conventions (no emojis, Line Awesome icons, pastel colors, thick borders)

When done, run: openclaw system event --text "Done: Blitz UX + Review page" --mode now
