<script setup lang="ts">
useHead({ title: 'Usage Guide — NST Quiz' })

const { public: { version, repository } } = useRuntimeConfig()

const sections = [
  { id: 'overview',       label: 'Overview' },
  { id: 'quickstart',     label: 'Quick Start' },
  { id: 'modes',          label: 'Quiz Modes' },
  { id: 'question-types', label: 'Question Types' },
  { id: 'json-format',    label: 'JSON Format' },
  { id: 'admin-controls', label: 'Admin Controls' },
  { id: 'flags',          label: 'Feature Flags' },
  { id: 'leaderboard',    label: 'Leaderboard' },
  { id: 'tips',           label: 'Tips' },
  { id: 'version',        label: 'Version' },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="guide-page">
    <!-- Header -->
    <div class="guide-header">
      <div class="container flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="guide-logo"><i class="la la-book" /></div>
          <div>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <h2 class="font-black" style="margin:0">NST Quiz</h2>
              <span class="version-badge">v{{ version }}</span>
            </div>
            <span class="text-muted text-sm">Usage Guide</span>
          </div>
        </div>
        <NuxtLink to="/admin" class="btn btn-ghost btn-sm">
          <i class="la la-arrow-left" /> Admin Panel
        </NuxtLink>
      </div>
    </div>

    <div class="guide-layout container">
      <!-- Sidebar nav -->
      <nav class="guide-nav">
        <p class="text-muted text-sm" style="font-weight:700; margin-bottom:0.5rem">Contents</p>
        <button
          v-for="s in sections"
          :key="s.id"
          class="guide-nav-item"
          @click="scrollTo(s.id)"
        >
          {{ s.label }}
        </button>
      </nav>

      <!-- Content -->
      <main class="guide-content">

        <!-- ─── Overview ─── -->
        <section id="overview" class="guide-section">
          <h2><i class="la la-bolt" /> Overview</h2>
          <p>
            NST Quiz is a real-time classroom quiz platform. The instructor runs the <strong>Admin Panel</strong>
            to upload and control quizzes, while students join via their phones or laptops at the same URL.
            All state lives in memory — no database, no sign-up, no install for students.
          </p>
          <div class="info-grid">
            <div class="info-card">
              <i class="la la-user-shield la-2x" style="color:var(--purple-dark)" />
              <strong>Admin</strong>
              <span class="text-muted text-sm">Uploads quiz, controls flow, sees all answers</span>
            </div>
            <div class="info-card">
              <i class="la la-mobile la-2x" style="color:var(--sky-dark)" />
              <strong>Students</strong>
              <span class="text-muted text-sm">Join by name, answer on any device, see leaderboard</span>
            </div>
            <div class="info-card">
              <i class="la la-tv la-2x" style="color:var(--mint-dark)" />
              <strong>Projector</strong>
              <span class="text-muted text-sm">Open /leaderboard on classroom display</span>
            </div>
          </div>
        </section>

        <!-- ─── Quick Start ─── -->
        <section id="quickstart" class="guide-section">
          <h2><i class="la la-play-circle" /> Quick Start</h2>
          <ol class="guide-steps">
            <li>
              <span class="step-num">1</span>
              <div>
                <strong>Prepare a quiz JSON file.</strong>
                See the <a @click="scrollTo('json-format')" class="guide-link">JSON Format</a> section or use one of the sample files in <code>/quiz-samples/</code>.
              </div>
            </li>
            <li>
              <span class="step-num">2</span>
              <div>
                <strong>Open /admin</strong> and log in with the admin password (default: <code>admin</code>, set via <code>ADMIN_PASSWORD</code> env var).
              </div>
            </li>
            <li>
              <span class="step-num">3</span>
              <div>
                <strong>Upload the quiz JSON</strong> by clicking the upload area. The quiz title, mode, and question count are confirmed.
              </div>
            </li>
            <li>
              <span class="step-num">4</span>
              <div>
                <strong>Students join</strong> by opening the site URL, entering their name, and clicking Join. They wait in the lobby.
              </div>
            </li>
            <li>
              <span class="step-num">5</span>
              <div>
                <strong>Set feature flags</strong> if needed (Hide Scores, Late Join), then click <strong>Start Quiz</strong>.
              </div>
            </li>
            <li>
              <span class="step-num">6</span>
              <div>
                <strong>Control the quiz</strong> with Next / Lock / End buttons. When done, click <strong>End Quiz</strong> — students see the final leaderboard.
              </div>
            </li>
          </ol>
        </section>

        <!-- ─── Modes ─── -->
        <section id="modes" class="guide-section">
          <h2><i class="la la-gamepad" /> Quiz Modes</h2>

          <div class="mode-card mode-classic">
            <div class="mode-header">
              <i class="la la-graduation-cap la-2x" />
              <div>
                <strong>Classic</strong>
                <span class="badge badge-sky ml-1">Self-paced</span>
              </div>
            </div>
            <p>All questions are shown at once. Students navigate freely and submit when ready. No per-question timer. Admin sees live submission progress and per-question breakdown. Best for exams or take-home style assessments.</p>
            <ul>
              <li>Each correct answer = 100 points</li>
              <li>Tiebreak: earlier submission wins</li>
              <li>Students can edit any answer before hitting <strong>Submit All</strong></li>
              <li>Admin can hide scores until quiz ends (<em>Hide Scores</em> flag)</li>
            </ul>
          </div>

          <div class="mode-card mode-blitz">
            <div class="mode-header">
              <i class="la la-bolt la-2x" />
              <div>
                <strong>Blitz</strong>
                <span class="badge badge-yellow ml-1">Speed-scored</span>
              </div>
            </div>
            <p>One question at a time with a countdown timer (default 30s, set per quiz). Points decay from 1000 → 100 based on how quickly you answer. Admin advances manually or lets the timer expire.</p>
            <ul>
              <li>Score formula: <code>max(100, floor(1000 × (1 − timeUsed / timeLimit)))</code></li>
              <li>Auto-locks when all active players have answered</li>
              <li>Leaderboard shown between questions</li>
            </ul>
          </div>

          <div class="mode-card mode-survival">
            <div class="mode-header">
              <i class="la la-shield-alt la-2x" />
              <div>
                <strong>Survival</strong>
                <span class="badge badge-coral ml-1">Elimination</span>
              </div>
            </div>
            <p>One question at a time. Get it wrong (or don't answer before the timer) and you're eliminated. Last player standing wins. Eliminated students become spectators and can still watch.</p>
            <ul>
              <li>Each survived question = <strong>1000 base points</strong> + up to <strong>200 speed bonus</strong></li>
              <li>Speed bonus only breaks ties — surviving more questions always wins</li>
              <li>Eliminated on wrong answer or timeout</li>
              <li>If everyone is eliminated at once, quiz ends immediately</li>
              <li>Full leaderboard shows eliminated players greyed out, ranked by how far they reached</li>
            </ul>
          </div>
        </section>

        <!-- ─── Question Types ─── -->
        <section id="question-types" class="guide-section">
          <h2><i class="la la-question-circle" /> Question Types</h2>

          <div class="qtype-grid">
            <div class="qtype-card">
              <strong><i class="la la-list" /> MCQ</strong>
              <p>Multiple choice with 2–8 options. Answer must be the <strong>integer index</strong> of the correct option (0-based). Options are shuffled per student to prevent copying.</p>
              <code class="code-block">"type": "mcq"<br>"options": ["Paris", "London", "Berlin", "Madrid"]<br>"answer": 0  <span class="text-muted">// Paris</span></code>
            </div>
            <div class="qtype-card">
              <strong><i class="la la-toggle-on" /> True / False</strong>
              <p>Binary choice. Answer is <code>true</code> or <code>false</code>.</p>
              <code class="code-block">"type": "true-false"<br>"answer": true</code>
            </div>
            <div class="qtype-card">
              <strong><i class="la la-font" /> Fill in the Blank</strong>
              <p>Free text entry. Case-insensitive by default; set <code>"caseSensitive": true</code> for exact matching.</p>
              <code class="code-block">"type": "fill"<br>"answer": "photosynthesis"<br>"caseSensitive": false</code>
            </div>
            <div class="qtype-card">
              <strong><i class="la la-hashtag" /> Integer</strong>
              <p>Numeric answer. Uses numeric equality — <code>"42"</code> and <code>42</code> both match <code>42</code>.</p>
              <code class="code-block">"type": "integer"<br>"answer": 42</code>
            </div>
            <div class="qtype-card">
              <strong><i class="la la-random" /> Match</strong>
              <p>Students match left-column items to right-column items. Partial credit available in Blitz. Answer is an array of <code>[leftIdx, rightIdx]</code> pairs.</p>
              <code class="code-block">"type": "match"<br>"left":  ["H₂O", "NaCl", "CO₂"]<br>"right": ["Water", "Carbon dioxide", "Salt"]<br>"answer": [[0,0],[1,2],[2,1]]</code>
            </div>
          </div>
        </section>

        <!-- ─── JSON Format ─── -->
        <section id="json-format" class="guide-section">
          <h2><i class="la la-file-code" /> JSON Format</h2>
          <p>Quiz files are plain JSON. Save as <code>.json</code> and upload via the admin panel. Required top-level fields:</p>

          <table class="guide-table">
            <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Notes</th></tr></thead>
            <tbody>
              <tr><td><code>title</code></td><td>string</td><td><i class="la la-check text-mint" /></td><td>Shown to students in lobby &amp; header</td></tr>
              <tr><td><code>mode</code></td><td><code>"classic" | "blitz" | "survival"</code></td><td><i class="la la-check text-mint" /></td><td></td></tr>
              <tr><td><code>timePerQuestion</code></td><td>number (seconds)</td><td>Blitz/Survival only</td><td>Default 30. Ignored in Classic.</td></tr>
              <tr><td><code>questions</code></td><td>array</td><td><i class="la la-check text-mint" /></td><td>At least one question</td></tr>
            </tbody>
          </table>

          <p class="mt-3">Every question object requires <code>type</code>, <code>question</code> (text), and <code>answer</code>. MCQ also requires <code>options</code>. Match requires <code>left</code> and <code>right</code>.</p>

          <div class="code-example">
            <pre><code>{
  "title": "Chapter 5 Revision",
  "mode": "blitz",
  "timePerQuestion": 20,
  "questions": [
    {
      "type": "mcq",
      "question": "What is the powerhouse of the cell?",
      "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"],
      "answer": 1
    },
    {
      "type": "true-false",
      "question": "The speed of light is approximately 3×10⁸ m/s.",
      "answer": true
    },
    {
      "type": "integer",
      "question": "How many bones are in the adult human body?",
      "answer": 206
    },
    {
      "type": "fill",
      "question": "The process by which plants make food is called ___.",
      "answer": "photosynthesis",
      "caseSensitive": false
    },
    {
      "type": "match",
      "question": "Match the element to its symbol.",
      "left":  ["Gold", "Silver", "Iron", "Sodium"],
      "right": ["Fe", "Au", "Na", "Ag"],
      "answer": [[0,1],[1,3],[2,0],[3,2]]
    }
  ]
}</code></pre>
          </div>
        </section>

        <!-- ─── Admin Controls ─── -->
        <section id="admin-controls" class="guide-section">
          <h2><i class="la la-sliders-h" /> Admin Controls</h2>

          <table class="guide-table">
            <thead><tr><th>Button</th><th>When</th><th>What it does</th></tr></thead>
            <tbody>
              <tr><td><strong>Start Quiz</strong></td><td>Lobby</td><td>Sends questions to all connected students and begins the quiz</td></tr>
              <tr><td><strong>Lock &amp; Score</strong></td><td>Question phase (Blitz/Survival)</td><td>Stops the timer, scores answers, reveals the correct answer, shows leaderboard</td></tr>
              <tr><td><strong>Next Q (n/N)</strong></td><td>Leaderboard (Blitz/Survival)</td><td>Advances to the next question and starts its timer</td></tr>
              <tr><td><strong>End Quiz &amp; Show Results</strong></td><td>Leaderboard after last question</td><td>Ends the quiz, broadcasts final leaderboard to all students</td></tr>
              <tr><td><strong>End Quiz</strong></td><td>Question or Leaderboard</td><td>Force-ends at any point — useful if time is short</td></tr>
              <tr><td><strong>View Results / CSV</strong></td><td>Ended</td><td>Shows per-student, per-question breakdown; exports to CSV</td></tr>
              <tr><td><strong>Reset Quiz</strong></td><td>Any</td><td>Wipes all players and state. Returns to idle. Everyone is disconnected.</td></tr>
            </tbody>
          </table>

          <div class="guide-note mt-3">
            <i class="la la-info-circle" />
            In <strong>Classic</strong> mode there is no Next/Lock — students submit at their own pace. The admin only needs Start and End.
          </div>
        </section>

        <!-- ─── Feature Flags ─── -->
        <section id="flags" class="guide-section">
          <h2><i class="la la-toggle-on" /> Feature Flags</h2>
          <p>Flags appear in the Controls card when a quiz is loaded. They can be toggled any time before or during the quiz.</p>

          <div class="flag-doc-row">
            <div class="flag-doc-badge flag-on-eg"><i class="la la-eye-slash" /> Hide Scores</div>
            <div>
              <strong>Classic mode only.</strong> When active, students see "Score hidden until quiz ends" instead of their score after submitting. Prevents them from sharing correct answers with classmates who haven't finished. Scores are revealed when the admin clicks End Quiz.
            </div>
          </div>

          <div class="flag-doc-row mt-3">
            <div class="flag-doc-badge flag-on-eg"><i class="la la-user-plus" /> Late Join</div>
            <div>
              <strong>All modes.</strong> By default, students who join after the quiz has started become silent spectators (they can watch but not answer). With Late Join on, they join as full participants — they receive any current/remaining questions and can score points. In Classic they get all questions; in Blitz/Survival they start from the current question with 0 points.
            </div>
          </div>
        </section>

        <!-- ─── Leaderboard ─── -->
        <section id="leaderboard" class="guide-section">
          <h2><i class="la la-tv" /> Leaderboard / Projector</h2>
          <p>
            Open <code>/leaderboard</code> on a second screen (projector, TV, browser tab) for a live display. It updates in real time as scores change. It also shows a QR code and join link during the lobby so students can scan to join.
          </p>
          <p>
            The leaderboard is automatically shown between questions in Blitz/Survival mode. In Classic mode it appears after the admin ends the quiz.
          </p>
        </section>

        <!-- ─── Tips ─── -->
        <section id="tips" class="guide-section">
          <h2><i class="la la-lightbulb" /> Tips</h2>
          <ul class="tips-list">
            <li><i class="la la-check-circle" /><span>Ask students to use their <strong>roll number or URN</strong> as their name — use the "Change" button visible in the lobby and topbar.</span></li>
            <li><i class="la la-check-circle" /><span>For exams, enable <strong>Hide Scores</strong> before starting to prevent students from sharing which answers were right.</span></li>
            <li><i class="la la-check-circle" /><span>Open <code>/leaderboard</code> on a projector before starting — students see it update live between Blitz/Survival questions.</span></li>
            <li><i class="la la-check-circle" /><span><strong>MCQ answers must be integer indices</strong> (0, 1, 2…), not the option text. The server will reject uploads with string answers.</span></li>
            <li><i class="la la-check-circle" /><span>In Survival mode, <strong>partial submissions still count</strong> for Match questions — even one correct pair beats a timeout.</span></li>
            <li><i class="la la-check-circle" /><span>If a student mistyped their name, they can fix it with the <strong>Change</strong> button — the server reconnects them under the new name.</span></li>
            <li><i class="la la-check-circle" /><span>Use <strong>Reset Quiz</strong> between sessions to clear all players and scores before uploading the next quiz.</span></li>
            <li><i class="la la-check-circle" /><span>The <strong>CSV export</strong> (View Results → Download CSV) gives you a full answer matrix per student — import it into a spreadsheet for grading.</span></li>
          </ul>
        </section>

        <!-- ─── Version ─── -->
        <section id="version" class="guide-section">
          <h2><i class="la la-tag" /> Version</h2>

          <div class="version-card">
            <div class="version-row">
              <span class="version-label"><i class="la la-cube" /> App version</span>
              <code class="version-value">v{{ version }}</code>
            </div>
            <div class="version-row">
              <span class="version-label"><i class="la la-balance-scale" /> License</span>
              <code class="version-value">MIT</code>
            </div>
            <div v-if="repository" class="version-row">
              <span class="version-label"><i class="la la-code-branch" /> Repository</span>
              <a :href="repository" target="_blank" rel="noopener" class="version-repo-link">
                <i class="la la-external-link-alt" />
                {{ repository.replace('https://', '') }}
              </a>
            </div>
          </div>
        </section>

      </main>
    </div>
  </div>
</template>

<style scoped>
.guide-page { min-height: 100vh; background: var(--light); }

.guide-header {
  background: var(--white);
  border-bottom: 3px solid var(--dark);
  padding: 1rem 1.5rem;
  position: sticky;
  top: 0;
  z-index: 100;
}
.guide-logo {
  width: 40px;
  height: 40px;
  background: var(--purple-light);
  border: 2px solid var(--purple-dark);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: var(--purple-dark);
}

.guide-layout {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 2.5rem;
  padding-top: 2rem;
  padding-bottom: 4rem;
  align-items: start;
}

/* Sidebar */
.guide-nav {
  position: sticky;
  top: 80px;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.guide-nav-item {
  text-align: left;
  background: none;
  border: none;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--mid);
  transition: background 0.12s, color 0.12s;
}
.guide-nav-item:hover { background: var(--purple-light); color: var(--purple-dark); }

/* Sections */
.guide-content { min-width: 0; }
.guide-section {
  margin-bottom: 3rem;
  scroll-margin-top: 80px;
}
.guide-section h2 {
  font-size: 1.4rem;
  font-weight: 900;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 3px solid var(--dark);
}
.guide-section p { margin-bottom: 0.85rem; line-height: 1.7; }
.guide-section ul, .guide-section ol { padding-left: 1.25rem; }
.guide-section li { margin-bottom: 0.4rem; line-height: 1.6; }

/* Overview info cards */
.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem; }
.info-card {
  background: var(--white);
  border: 2px solid var(--dark);
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  box-shadow: 3px 3px 0 rgba(30,30,46,0.1);
}

/* Steps */
.guide-steps { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 1rem; }
.guide-steps li { display: flex; align-items: flex-start; gap: 1rem; }
.step-num {
  min-width: 28px;
  height: 28px;
  background: var(--purple);
  color: var(--white);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 0.9rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}
.guide-link { color: var(--purple-dark); cursor: pointer; font-weight: 700; text-decoration: underline; }

/* Mode cards */
.mode-card {
  background: var(--white);
  border: 2px solid var(--dark);
  border-radius: 14px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  box-shadow: 3px 3px 0 rgba(30,30,46,0.1);
}
.mode-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; font-size: 1.1rem; font-weight: 900; }
.mode-classic .mode-header { color: var(--sky-dark); }
.mode-blitz   .mode-header { color: var(--yellow-dark); }
.mode-survival .mode-header { color: var(--coral-dark); }

/* Question type grid */
.qtype-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.qtype-card {
  background: var(--white);
  border: 2px solid var(--dark);
  border-radius: 14px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  box-shadow: 3px 3px 0 rgba(30,30,46,0.1);
}
.qtype-card strong { font-size: 1rem; display: flex; align-items: center; gap: 0.4rem; }
.qtype-card p { margin: 0; font-size: 0.875rem; color: var(--mid); }
.code-block {
  background: var(--light);
  border: 1px solid rgba(30,30,46,0.12);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-family: monospace;
  font-size: 0.8rem;
  display: block;
  line-height: 1.6;
}

/* JSON example */
.code-example {
  background: #1e1e2e;
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  overflow-x: auto;
  margin-top: 1rem;
}
.code-example pre { margin: 0; }
.code-example code { color: #cdd6f4; font-size: 0.875rem; font-family: monospace; line-height: 1.7; }

/* Tables */
.guide-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}
.guide-table th, .guide-table td {
  border: 2px solid rgba(30,30,46,0.12);
  padding: 0.6rem 0.85rem;
  text-align: left;
}
.guide-table th { background: var(--purple-light); font-weight: 700; }
.guide-table code { background: var(--light); padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.8rem; }

/* Note box */
.guide-note {
  background: var(--sky-light);
  border: 2px solid var(--sky-dark);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  font-size: 0.9rem;
}
.guide-note i { color: var(--sky-dark); margin-top: 0.1rem; flex-shrink: 0; }

/* Flag docs */
.flag-doc-row { display: flex; align-items: flex-start; gap: 1rem; }
.flag-doc-badge {
  flex-shrink: 0;
  border-radius: 20px;
  padding: 0.3rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 2px solid var(--purple-dark);
}
.flag-on-eg { background: var(--purple-light); color: var(--purple-dark); }

/* Tips */
.tips-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.tips-list li { display: flex; align-items: flex-start; gap: 0.6rem; line-height: 1.6; }
.tips-list i { color: var(--mint-dark); margin-top: 0.2rem; flex-shrink: 0; }

/* Text helpers */
.text-mint { color: var(--mint-dark); }

/* Version badge in header */
.version-badge {
  background: var(--mint-light);
  color: var(--mint-dark);
  border: 2px solid var(--mint-dark);
  border-radius: 20px;
  padding: 0.1rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* Version section card */
.version-card {
  background: var(--white);
  border: 2px solid var(--dark);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 3px 3px 0 rgba(30,30,46,0.1);
}
.version-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid rgba(30,30,46,0.1);
}
.version-row:last-child { border-bottom: none; }
.version-label {
  min-width: 160px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--mid);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.version-value {
  background: var(--purple-light);
  color: var(--purple-dark);
  border: 1.5px solid var(--purple-dark);
  border-radius: 6px;
  padding: 0.15em 0.5em;
  font-size: 0.95rem;
  font-weight: 700;
  font-family: monospace;
}
.version-repo-link {
  color: var(--sky-dark);
  font-weight: 700;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
}
.version-repo-link:hover { text-decoration: underline; }

@media (max-width: 700px) {
  .guide-layout { grid-template-columns: 1fr; }
  .guide-nav { display: none; }
  .info-grid { grid-template-columns: 1fr; }
  .qtype-grid { grid-template-columns: 1fr; }
}
</style>
