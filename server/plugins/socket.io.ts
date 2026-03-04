import { Server as SocketIOServer } from 'socket.io'
import { randomUUID } from 'node:crypto'
import {
  state,
  validateAnswer,
  calculateBlitzScore,
  getLeaderboard,
  getFullLeaderboard,
  getSafeQuestion,
  getSafeQuestionForPlayer,
  unshuffleAnswer,
  clearTimer,
  resetState,
} from '../utils/state'

let initialized = false

function setupSocketIO(httpServer: any, adminPassword: string) {
  if (initialized) return
  initialized = true

  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    serveClient: false,
    transports: ['websocket', 'polling'],
  })

  state.io = io

  console.log('[socket] Socket.IO server initialized')

  // ─── Helpers ────────────────────────────────────────────────────────────────

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
        id: p.id,
        name: p.name,
        score: p.score,
        connected: p.connected,
        eliminated: p.eliminated,
        spectator: p.spectator,
        submitted: p.submitTime !== undefined,
        answers: Object.fromEntries(
          Object.entries(p.answers).map(([qi, ans]) => [
            qi,
            { answer: ans, correct: validateAnswer(Number(qi), ans) },
          ])
        ),
      })),
      leaderboard: getLeaderboard(),
      playerCount: state.players.size,
    })
  }

  function broadcastPlayers() {
    console.log('[socket] broadcasting players:updated', state.players.size, 'players')
    io.emit('players:updated', {
      players: [...state.players.values()].map(p => ({
        id: p.id,
        name: p.name,
        connected: p.connected,
        eliminated: p.eliminated,
        score: p.score,
      })),
    })
    emitAdminState()
  }

  function startTimer(durationSeconds: number, onExpire: () => void) {
    console.log('[socket] startTimer', durationSeconds, 'seconds')
    clearTimer()
    state.timerRemaining = durationSeconds
    state.questionStartTime = Date.now()

    state.timerInterval = setInterval(() => {
      state.timerRemaining--
      io.emit('quiz:timer', { remaining: state.timerRemaining })
      emitAdminState()

      if (state.timerRemaining <= 0) {
        clearTimer()
        onExpire()
      }
    }, 1000)
  }

  function processAnswersAndScore() {
    console.log('[socket] processAnswersAndScore, qIndex:', state.currentQuestionIndex)
    const mode = state.quiz?.mode
    const qIndex = state.currentQuestionIndex

    for (const player of state.players.values()) {
      if (player.eliminated) continue

      const playerAnswer = player.answers[qIndex]
      const hasAnswer = playerAnswer !== undefined

      if (mode === 'survival') {
        if (!hasAnswer || !validateAnswer(qIndex, playerAnswer)) {
          player.eliminated = true
          io.to(player.id).emit('quiz:eliminated', { reason: hasAnswer ? 'wrong' : 'timeout' })
        }
      } else if (mode === 'blitz') {
        if (hasAnswer && validateAnswer(qIndex, playerAnswer)) {
          const answerMs = (player.answerTime[qIndex] ?? 0) - state.questionStartTime
          const timeLimit = state.quiz?.timePerQuestion ?? 30
          player.score += calculateBlitzScore(answerMs, timeLimit)
        }
      }
    }

    state.questionLocked = true
  }

  function emitLeaderboard() {
    console.log('[socket] emitLeaderboard')
    const lb = state.quiz?.mode === 'survival' ? getFullLeaderboard() : getLeaderboard()
    io.emit('quiz:leaderboard', { leaderboard: lb, questionIndex: state.currentQuestionIndex })
    emitAdminState()
  }

  async function emitQuestionToAll(questionIndex: number, extra: Record<string, unknown> = {}) {
    const q = state.quiz!.questions[questionIndex]
    const safeQ = getSafeQuestion(q)
    const base = {
      index: questionIndex,
      total: state.quiz!.questions.length,
      timer: state.quiz!.timePerQuestion ?? 30,
      locked: false,
      ...extra,
    }

    let sentCount = 0
    for (const [id, player] of state.players) {
      if (player.spectator || !player.connected) continue
      const playerSafeQ = getSafeQuestionForPlayer(q, questionIndex, player)
      io.to(id).emit('quiz:question', { question: playerSafeQ, ...base })
      sentCount++
      console.log('[socket] sent question to player:', player.name, id)
    }
    console.log('[socket] emitQuestionToAll: sent to', sentCount, 'players, state.players:', state.players.size)

    io.to('spectators').emit('quiz:question', { question: safeQ, ...base })
    console.log('[socket] sent question to spectators room')
  }

  // ─── Connection ──────────────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    console.log('[socket] New connection:', socket.id)

    // ─── Admin handlers ───────────────────────────────────────────────────────

    socket.on('admin:login', ({ password }: { password: string }) => {
      console.log('[socket] admin:login attempt')
      if (password !== adminPassword) {
        socket.emit('admin:error', { message: 'Invalid password' })
        return
      }
      socket.join('admin')
      const token = randomUUID()
      state.adminToken = token
      socket.emit('admin:authenticated', { token })
      emitAdminState()
    })

    socket.on('admin:upload', (quiz: any) => {
      if (!socket.rooms.has('admin')) {
        socket.emit('admin:error', { message: 'Not authenticated' })
        return
      }
      if (!quiz?.title || typeof quiz.title !== 'string') {
        socket.emit('admin:error', { message: 'Invalid quiz: missing title' })
        return
      }
      if (!quiz.mode || !['classic', 'blitz', 'survival'].includes(quiz.mode)) {
        socket.emit('admin:error', { message: 'Invalid quiz: mode must be classic, blitz, or survival' })
        return
      }
      if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        socket.emit('admin:error', { message: 'Invalid quiz: must have at least one question' })
        return
      }
      for (const q of quiz.questions) {
        if (!q.type || !q.question) {
          socket.emit('admin:error', { message: 'Invalid quiz: each question must have type and question fields' })
          return
        }
      }

      state.quiz = quiz
      state.phase = 'lobby'
      state.currentQuestionIndex = -1
      state.questionLocked = false
      // Reset player scores/answers but keep them connected
      for (const player of state.players.values()) {
        player.score = 0
        player.answers = {}
        player.answerTime = {}
        player.eliminated = false
        player.spectator = false
        player.shuffleMap = {}
        player.submitTime = undefined
      }

      socket.emit('admin:quizLoaded', {
        title: quiz.title,
        mode: quiz.mode,
        questionCount: quiz.questions.length,
      })
      io.emit('quiz:loaded', {
        title: quiz.title,
        mode: quiz.mode,
        questionCount: quiz.questions.length,
      })
      emitAdminState()
    })

    socket.on('admin:start', async () => {
      if (!socket.rooms.has('admin')) return
      if (!state.quiz) { socket.emit('admin:error', { message: 'No quiz loaded' }); return }
      if (state.phase !== 'lobby') { socket.emit('admin:error', { message: 'Not in lobby' }); return }

      state.phase = 'question'

      if (state.quiz.mode === 'classic') {
        io.emit('quiz:started', { mode: 'classic', title: state.quiz.title })
        let sentCount = 0
        for (const [id, player] of state.players) {
          if (player.spectator || !player.connected) continue
          const safeQuestions = state.quiz.questions.map((q: any, i: number) => getSafeQuestionForPlayer(q, i, player))
          io.to(id).emit('quiz:allQuestions', {
            questions: safeQuestions,
            title: state.quiz.title,
            total: safeQuestions.length,
          })
          sentCount++
          console.log('[socket] sent allQuestions to:', player.name, id)
        }
        console.log('[socket] classic start: sent to', sentCount, 'players')
        state.currentQuestionIndex = 0
      } else {
        io.emit('quiz:started', { mode: state.quiz.mode, title: state.quiz.title })
        state.currentQuestionIndex = 0
        state.questionLocked = false
        await emitQuestionToAll(0)
        startTimer(state.quiz.timePerQuestion ?? 30, () => {
          processAnswersAndScore()
          emitLeaderboard()
          state.phase = 'leaderboard'
          emitAdminState()
        })
      }
      emitAdminState()
    })

    socket.on('admin:next', async () => {
      if (!socket.rooms.has('admin')) return
      if (!state.quiz) { socket.emit('admin:error', { message: 'No quiz loaded' }); return }
      if (state.quiz.mode === 'classic') { socket.emit('admin:error', { message: 'Classic mode has no next' }); return }

      const nextIndex = state.currentQuestionIndex + 1

      if (state.phase === 'question') {
        clearTimer()
        processAnswersAndScore()
        emitLeaderboard()
        state.phase = 'leaderboard'
        emitAdminState()
        return
      }

      if (state.phase === 'leaderboard') {
        if (nextIndex >= state.quiz.questions.length) {
          state.phase = 'ended'
          const lb = state.quiz.mode === 'survival' ? getFullLeaderboard() : getLeaderboard()
          io.emit('quiz:ended', { leaderboard: lb, title: state.quiz.title, mode: state.quiz.mode })
          emitAdminState()
          return
        }

        state.currentQuestionIndex = nextIndex
        state.questionLocked = false
        state.phase = 'question'
        await emitQuestionToAll(nextIndex)
        startTimer(state.quiz.timePerQuestion ?? 30, () => {
          processAnswersAndScore()
          emitLeaderboard()
          state.phase = 'leaderboard'
          emitAdminState()
        })
        emitAdminState()
        return
      }

      socket.emit('admin:error', { message: `Cannot advance in phase: ${state.phase}` })
    })

    socket.on('admin:lock', () => {
      if (!socket.rooms.has('admin')) return
      if (state.phase !== 'question') { socket.emit('admin:error', { message: 'Not in question phase' }); return }
      if (state.quiz?.mode === 'classic') { socket.emit('admin:error', { message: 'Classic mode cannot lock' }); return }
      clearTimer()
      processAnswersAndScore()
      emitLeaderboard()
      state.phase = 'leaderboard'
      emitAdminState()
    })

    socket.on('admin:end', () => {
      if (!socket.rooms.has('admin')) return
      clearTimer()
      state.phase = 'ended'

      if (state.quiz?.mode === 'classic') {
        const lb = getLeaderboard()
        io.emit('quiz:ended', {
          leaderboard: lb,
          title: state.quiz.title,
          mode: state.quiz.mode,
          questions: state.quiz.questions.map(getSafeQuestion),
        })
      } else {
        const lb = state.quiz?.mode === 'survival' ? getFullLeaderboard() : getLeaderboard()
        io.emit('quiz:ended', {
          leaderboard: lb,
          title: state.quiz?.title,
          mode: state.quiz?.mode,
        })
      }
      emitAdminState()
    })

    socket.on('admin:reset', () => {
      if (!socket.rooms.has('admin')) return
      resetState()
      io.emit('quiz:reset', {})
      broadcastPlayers()
    })

    // ─── Player joins quiz ────────────────────────────────────────────────────

    socket.on('player:join', ({ name }: { name: string }) => {
      if (!name || typeof name !== 'string') return
      const trimmed = name.trim().slice(0, 32)
      if (!trimmed) return
      console.log('[socket] player:join', { socketId: socket.id, name: trimmed, phase: state.phase })
      // Deduplicate - if this socket already joined with same name, skip
      const alreadyJoined = state.players.get(socket.id)
      if (alreadyJoined && alreadyJoined.name === trimmed) {
        console.log('[socket] duplicate join, skipping:', trimmed)
        socket.emit('quiz:joined', {
          name: alreadyJoined.name,
          phase: state.phase,
          quizTitle: state.quiz?.title ?? null,
          mode: state.quiz?.mode ?? null,
          eliminated: alreadyJoined.eliminated,
          spectator: alreadyJoined.spectator ?? false,
        })
        return
      }

      // Reconnect: same name, restore player
      const existing = [...state.players.values()].find(p => p.name === trimmed)
      if (existing) {
        const oldId = existing.id
        state.players.delete(oldId)
        existing.id = socket.id
        existing.connected = true
        state.players.set(socket.id, existing)
        console.log('[socket] reconnect:', trimmed, 'old:', oldId, 'new:', socket.id)
      } else {
        const isLateJoin = state.phase !== 'lobby' && state.phase !== 'idle'
        state.players.set(socket.id, {
          id: socket.id,
          name: trimmed,
          score: 0,
          answers: {},
          answerTime: {},
          eliminated: false,
          connected: true,
          shuffleMap: {},
          spectator: isLateJoin,
        })
        if (isLateJoin) {
          console.log('[socket] late join — spectator:', trimmed)
          socket.join('spectators')
        }
      }

      const player = state.players.get(socket.id)!
      socket.join('players')
      if (!player.spectator) {
        socket.join('active-players')
      }
      console.log('[socket] player rooms:', [...socket.rooms], 'spectator:', player.spectator ?? false)
      socket.emit('quiz:joined', {
        name: player.name,
        phase: state.phase,
        quizTitle: state.quiz?.title ?? null,
        mode: state.quiz?.mode ?? null,
        eliminated: player.eliminated,
        spectator: player.spectator ?? false,
        submitted: player.submitTime !== undefined,
        score: player.score,
      })

      // If quiz already active in classic mode, send all questions
      if (state.phase === 'question' && state.quiz?.mode === 'classic') {
        const p = state.players.get(socket.id)
        const safeQuestions = p
          ? state.quiz.questions.map((q, i) => getSafeQuestionForPlayer(q, i, p))
          : state.quiz.questions.map(getSafeQuestion)
        socket.emit('quiz:allQuestions', { questions: safeQuestions, title: state.quiz.title })
      }

      // If mid-question in blitz/survival, send current question + timer
      if (state.phase === 'question' && state.quiz?.mode !== 'classic') {
        const q = state.quiz?.questions[state.currentQuestionIndex]
        const p = state.players.get(socket.id)
        if (q && p) {
          socket.emit('quiz:question', {
            question: getSafeQuestionForPlayer(q, state.currentQuestionIndex, p),
            index: state.currentQuestionIndex,
            total: state.quiz!.questions.length,
            timer: state.timerRemaining,
            locked: state.questionLocked,
          })
        }
      }

      broadcastPlayers()
    })

    // Player answer (blitz / survival — per question)
    socket.on('player:answer', ({ questionIndex, answer }: { questionIndex: number; answer: unknown }) => {
      console.log('[socket] player:answer', { socketId: socket.id, questionIndex, answer })
      const player = state.players.get(socket.id)
      if (!player || player.eliminated) return
      if (player.spectator) return
      if (state.phase !== 'question') return
      if (state.questionLocked) return
      if (state.quiz?.mode === 'classic') return
      if (questionIndex !== state.currentQuestionIndex) return
      if (player.answers[questionIndex] !== undefined) return // no re-answering

      player.answers[questionIndex] = unshuffleAnswer(questionIndex, answer, player)
      player.answerTime[questionIndex] = Date.now()

      socket.emit('quiz:answerAck', { questionIndex })

      // Broadcast updated answer count to admin
      io.emit('quiz:answerCount', {
        questionIndex,
        count: [...state.players.values()].filter(p => p.answers[questionIndex] !== undefined && !p.eliminated).length,
        total: [...state.players.values()].filter(p => !p.eliminated).length,
      })
      emitAdminState()
    })

    // Player submit (classic — all questions at once)
    socket.on('player:submit', ({ answers }: { answers: Record<number, unknown> }) => {
      console.log('[socket] player:submit', { socketId: socket.id, answerCount: Object.keys(answers).length })
      const player = state.players.get(socket.id)
      if (!player) return
      if (player.spectator) return
      if (state.phase !== 'question') return
      if (state.quiz?.mode !== 'classic') return
      if (player.submitTime) return // already submitted

      // Unshuffle MCQ answers back to original indices
      const unshuffled: Record<number, unknown> = {}
      for (const [idx, ans] of Object.entries(answers)) {
        unshuffled[Number(idx)] = unshuffleAnswer(Number(idx), ans, player)
      }
      player.answers = unshuffled
      player.submitTime = Date.now()

      // Score classic mode immediately
      let score = 0
      for (let i = 0; i < (state.quiz?.questions.length ?? 0); i++) {
        if (validateAnswer(i, unshuffled[i])) score += 100
      }
      player.score = score

      socket.emit('quiz:submitAck', { score })

      io.emit('quiz:submitCount', {
        count: [...state.players.values()].filter(p => p.submitTime !== undefined).length,
        total: state.players.size,
      })
      emitAdminState()
    })

    // Spectators (leaderboard page)
    socket.on('spectator:join', () => {
      console.log('[socket] spectator:join', socket.id)
      socket.join('spectators')
      // Send current state
      socket.emit('quiz:joined', {
        phase: state.phase,
        quizTitle: state.quiz?.title ?? null,
        mode: state.quiz?.mode ?? null,
      })
      broadcastPlayers()
    })

    // Disconnection
    socket.on('disconnect', () => {
      console.log('[socket] disconnect', socket.id)
      const player = state.players.get(socket.id)
      if (player) {
        if (state.phase === 'lobby' || state.phase === 'idle') {
          // In lobby: remove entirely
          state.players.delete(socket.id)
          console.log('[socket] removed player from lobby:', player.name)
        } else {
          // During quiz: mark offline, keep for scores
          player.connected = false
        }
        broadcastPlayers()
      }
    })
  })

  // Expose for API routes
  ;(global as any).__nstQuizIo = {
    io,
    startTimer,
    processAnswersAndScore,
    emitLeaderboard,
    broadcastPlayers,
  }

  console.log('[nst-quiz] Socket.IO server attached')
}

export default defineNitroPlugin((nitroApp: any) => {
  const config = useRuntimeConfig()
  const adminPassword = (config.adminPassword as string) || 'admin'

  // Try multiple hooks — 'listen' works in production, 'afterListen' in some versions
  nitroApp.hooks.hook('listen', (server: any) => {
    setupSocketIO(server, adminPassword)
  })

  // Fallback: hook into the request to grab the underlying server
  nitroApp.hooks.hook('request', (event: any) => {
    if (!initialized && event.node?.req?.socket?.server) {
      setupSocketIO(event.node.req.socket.server, adminPassword)
    }
  })
})
