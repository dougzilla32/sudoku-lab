# Project instructions

Read SPEC.md first — it describes what you are building.
Follow these rules at all times.

## Environment

- Frontend framework: React with Vite
- Backend: Netlify Functions (JavaScript/TypeScript files in netlify/functions/)
- Database and realtime: Supabase (credentials are in .env)
- Dev server runs on port 3000 — Netlify proxies it to port 8888
- Do not use port 8888 for the app itself

## What you can and cannot do

- Read, create, edit, and delete files anywhere inside this project folder
- Use /deploy for deploying — do not run build or deploy commands manually
- Do NOT install npm packages yourself — tell the user what to run
- Do NOT access the internet directly

## How to build things

- Prefer simple, readable code
- Keep component files small and focused
- Always read credentials from .env — never hardcode them
- Use the supabase-js client library for all database and realtime operations
- When you need a new npm package, tell the user:
  "Run this in the left terminal window: npm install <package-name>"

## Deploying

Use the /deploy command. Do not run build or deploy commands manually.

## README

If the user asks to update the README, read SPEC.md and rewrite
README.md to match — title, description, and example prompts should
reflect the current project, not the template.

## Tone

After making changes, explain what you did in plain, friendly language.
Avoid jargon.
