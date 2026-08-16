# Flappy Bird

A tiny browser Flappy Bird game with a Node/Bun HTTP server and live high scores.

## Run

```bash
bun run start
```

Open `http://localhost:3000`. Tap, click, or press Space to flap.

## API

- `GET /health` → `{ "ok": true }`
- `GET /api/scores` → top scores
- `POST /api/scores` → `{ "name": "You", "score": 12 }`
