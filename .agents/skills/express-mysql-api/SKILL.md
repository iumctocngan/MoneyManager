---
name: express-mysql-api
description: Project-specific guidance for the Express and MySQL backend in this repository.
origin: Project
---

# Express MySQL API

Use this skill for work in `backend/src/` and `backend/sql/`.

## Current Architecture

- Route wiring lives in `backend/src/routes/`
- Business logic lives in `backend/src/services/`
- Shared helpers, validation, token, and serializer code live in `backend/src/utils/`
- Environment and database setup live in `backend/src/config/`

## Preferred Patterns

- Keep route files thin. Put real behavior in service functions.
- Reuse existing helpers for validation, auth, error handling, and serialization before adding new abstractions.
- Keep authenticated routes scoped to the current user and consistent with the auth flow described in `backend/AUTH.md`.
- Update `backend/sql/schema.sql` when a persistent data shape changes.
- If a change affects frontend usage, review `utils/api.ts` and `store/app-store.ts` in the app.

## Verification

- Run `cd backend && npm run check`
- If env or auth behavior changes, verify `backend/.env.example` and `backend/AUTH.md` still match the code

