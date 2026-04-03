# NST Quiz — JSON Format Reference

Use this document as context when generating quiz JSON files for NST Quiz.
All files must be valid JSON. Every field described below is required unless marked **optional**.

---

## Top-level structure

```json
{
  "title": "Human-readable quiz title",
  "mode": "blitz",
  "timePerQuestion": 25,
  "questions": [ ...question objects... ]
}
```

| Field             | Type     | Notes |
|-------------------|----------|-------|
| `title`           | string   | Shown in the lobby, leaderboard, and review screen |
| `mode`            | string   | `"blitz"`, `"classic"`, or `"survival"` — see below |
| `timePerQuestion` | integer  | **optional** — seconds per question. Default 30. Used by blitz and survival only |
| `questions`       | array    | Ordered list of question objects. Any mix of types is allowed |

---

## Modes

### `blitz`
All questions shown one at a time with a countdown timer.
Score = speed bonus per correct answer (max 1000 pts, min 100 pts based on how quickly the player answers).
Wrong answer or timeout = 0 pts for that question. No elimination.

### `classic`
All questions shown at once. Players can navigate freely, edit answers, and submit when ready.
Score = 100 pts per correct answer. No timer. No elimination.
Submission is manual — students click "Submit All".

### `survival`
All questions shown one at a time with a countdown timer.
Each wrong answer or timeout **eliminates** the player.
Score = 1000 pts per survived question + up to 200 speed bonus points.
Speed bonus is only a tiebreaker — surviving more questions always beats going faster.

---

## Question types

### `mcq` — Multiple choice

```json
{
  "type": "mcq",
  "question": "Which command lists running containers?",
  "options": ["docker images", "docker ps", "docker ls", "docker list"],
  "answer": 1
}
```

| Field     | Type            | Notes |
|-----------|-----------------|-------|
| `options` | string[]        | 2–6 choices. Displayed as A, B, C … in order |
| `answer`  | integer         | **0-based index** into `options` |

Options are shuffled per-player automatically. The `answer` index always refers to the original order in the JSON.

---

### `true-false`

```json
{
  "type": "true-false",
  "question": "Docker containers share the host OS kernel.",
  "answer": true
}
```

| Field    | Type    | Notes |
|----------|---------|-------|
| `answer` | boolean | `true` or `false` |

---

### `fill` — Fill in the blank

```json
{
  "type": "fill",
  "question": "The command to run a container is `docker ___`.",
  "answer": "run",
  "caseSensitive": false
}
```

| Field           | Type    | Notes |
|-----------------|---------|-------|
| `answer`        | string  | The exact expected string |
| `caseSensitive` | boolean | **optional** — defaults to `false`. Set `true` for case-sensitive matching (e.g. CLI flags) |

Matching trims leading/trailing whitespace automatically.

---

### `integer`

```json
{
  "type": "integer",
  "question": "What is the default port for a local Docker registry?",
  "answer": 5000
}
```

| Field    | Type    | Notes |
|----------|---------|-------|
| `answer` | integer | Compared numerically — `"5000"` and `5000` both match |

---

### `match` — Match the following

```json
{
  "type": "match",
  "question": "Match each Dockerfile instruction to its purpose.",
  "left":  ["FROM", "RUN", "COPY", "EXPOSE"],
  "right": ["Execute shell command", "Declare base image", "Document a port", "Copy files from host"],
  "answer": [[0, 1], [1, 0], [2, 3], [3, 2]]
}
```

| Field    | Type       | Notes |
|----------|------------|-------|
| `left`   | string[]   | Left-side items (shown in fixed order) |
| `right`  | string[]   | Right-side items (same count as `left`) |
| `answer` | number[][] | Array of `[leftIndex, rightIndex]` pairs |

`answer` must contain exactly one pair per left item. Indices are 0-based and refer to the order in `left` and `right` arrays.

**Constructing the answer array** — for each left item, find its matching right item:
- `FROM` (left[0]) → `"Declare base image"` (right[1]) → `[0, 1]`
- `RUN` (left[1]) → `"Execute shell command"` (right[0]) → `[1, 0]`
- `COPY` (left[2]) → `"Copy files from host"` (right[3]) → `[2, 3]`
- `EXPOSE` (left[3]) → `"Document a port"` (right[2]) → `[3, 2]`

Keep 4–8 pairs for best UX. Avoid pairs that are ambiguous or could map to multiple right items.

---

## Text formatting

Question text and MCQ option text support rich formatting.
All other fields (`answer`, `left`, `right` items) are plain strings — no formatting.

### Newlines

Use `\n` in the JSON string. The UI renders them as real line breaks with `white-space: pre-wrap`.
Use two `\n\n` for paragraph separation.

```json
"question": "Read the output below and identify the error.\n\nError: Cannot find module 'express'\n    at Function.Module._resolveFilename"
```

### Code blocks (triple backtick fence)

Wrap preformatted code in ` ``` ` fences. The UI renders this as a dark-background monospace code block.
An optional language hint after the opening fence is ignored (stripped silently).

```json
"question": "How many layers does this Dockerfile add?\n```\nFROM node:20-alpine\nRUN npm ci\nCOPY . .\nRUN npm run build\n```"
```

Rendered output:

> How many layers does this Dockerfile add?
> ```
> FROM node:20-alpine
> RUN npm ci
> COPY . .
> RUN npm run build
> ```

You can also use fences inside MCQ `options`. The entire option will render as a code block inside the answer button if the option contains newlines:

```json
"options": [
  "docker run -p 80:8080 myapp",
  "docker run -p 8080:80 myapp",
  "docker run --port 80 myapp",
  "docker run --expose 80:8080 myapp"
]
```

For multi-line code options:

```json
"options": [
  "FROM python:3.11-alpine\nRUN pip install flask\nCOPY . .\nCMD [\"python\", \"app.py\"]",
  "FROM ubuntu:22.04\nRUN apt-get install python3\nCOPY . .\nCMD python3 app.py"
]
```

Both options will render as dark code blocks inside their buttons.

### Inline code (single backtick)

Wrap short commands, flags, or identifiers in single backticks. The UI renders them as highlighted inline code spans.

```json
"question": "Which flag maps host port 8080 to container port 80 in `docker run`?",
"options": [
  "Use `--expose 8080:80`",
  "Use `-p 8080:80`",
  "Use `-v 8080:80`",
  "Use `--port 8080:80`"
]
```

Inline backticks work in both question text and single-line option strings.
They do **not** work inside triple-backtick code blocks (treated as literal text there).

---

## Complete example file

```json
{
  "title": "Docker Basics — Blitz",
  "mode": "blitz",
  "timePerQuestion": 20,
  "questions": [
    {
      "type": "mcq",
      "question": "Which Dockerfile instruction sets the base image?",
      "options": ["BASE", "FROM", "IMAGE", "START"],
      "answer": 1
    },
    {
      "type": "true-false",
      "question": "A Docker container includes its own OS kernel.",
      "answer": false
    },
    {
      "type": "fill",
      "question": "To build an image from the current directory, run `docker ___ .`",
      "answer": "build",
      "caseSensitive": true
    },
    {
      "type": "integer",
      "question": "What exit code indicates a container process completed successfully?",
      "answer": 0
    },
    {
      "type": "mcq",
      "question": "What does this Dockerfile instruction do?\n```\nCOPY --chown=appuser:appuser . /app\n```",
      "options": [
        "Copies files and sets the owner to appuser",
        "Copies only files owned by appuser",
        "Creates a user named appuser and copies files",
        "Changes the working directory to /app"
      ],
      "answer": 0
    },
    {
      "type": "mcq",
      "question": "Which docker-compose snippet correctly limits a service to 512 MB of memory?",
      "options": [
        "memory: 512mb",
        "deploy:\n  resources:\n    limits:\n      memory: 512M",
        "ENV MEMORY_LIMIT=512M",
        "limit:\n  memory: 512M"
      ],
      "answer": 1
    },
    {
      "type": "match",
      "question": "Match each `docker` command to what it does.",
      "left":  ["docker ps",    "docker rm",   "docker pull",  "docker exec"],
      "right": ["Remove a stopped container", "Download an image", "List running containers", "Run a command inside a container"],
      "answer": [[0, 2], [1, 0], [2, 1], [3, 3]]
    }
  ]
}
```

---

## Rules and constraints

- **Minimum questions**: 1. Recommended: 10–30 for blitz/survival, 10–20 for classic.
- **MCQ options**: minimum 2, maximum 6. Keep all options plausible to avoid trivial guessing.
- **Match pairs**: minimum 2, maximum 8. Right-side items must be in a different order than the obvious mapping to avoid trivial answers.
- **Fill answers**: keep them short (1–3 words or a single command). Avoid answers requiring punctuation unless `caseSensitive: true` and the punctuation is critical.
- **Integer answers**: must be a valid JSON number (no units, no commas). Use questions where a unique integer answer exists.
- **No answer leakage**: never include the correct answer in the question text in a way that makes it trivially obvious.
- **Code blocks in questions**: always fence multi-line code snippets with ` ``` `. Never rely on `\n` alone for code that needs monospace rendering.
- **Bloom's taxonomy alignment**: match question difficulty to the intended mode.
  - *Remember / Understand* → good for blitz (fast recall)
  - *Apply / Analyse / Evaluate* → good for classic (longer reasoning time)
  - *Create / Evaluate* → good for survival (high-stakes, design-level thinking)
