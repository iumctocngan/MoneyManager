# Project Instructions for AI Agents

This repository is a mobile-first money manager app with a separate API server, organized as a monorepo.
Use this file as the primary project brief.

## Project Shape

- **Frontend**: Expo 54, React Native 0.81, Expo Router, Zustand, AsyncStorage (located in `frontend/`)
- **Backend**: Node.js, Express 4, MySQL, token-based auth (located in `backend/`)
- **Language**: TypeScript for frontend, modern JavaScript modules for backend

## Important Directories

### Frontend (`frontend/`)
- `frontend/app/`: Expo Router screens and layouts
- `frontend/components/`: Reusable React Native UI
- `frontend/constants/`: Design tokens, enums, shared app types
- `frontend/hooks/`: View-level helpers
- `frontend/services/`: Frontend domain logic (reports, tax, etc.)
- `frontend/store/`: Zustand state and app orchestration
- `frontend/utils/api.ts`: Frontend API client and base URL resolution

### Backend (`backend/`)
- `backend/src/routes/`: HTTP route wiring
- `backend/src/services/`: Backend business logic
- `backend/src/utils/`: Validation, auth, serializers, helpers
- `backend/sql/schema.sql`: Canonical database schema

## How This App Works

- The mobile app persists client state locally with Zustand + AsyncStorage.
- Authenticated data sync happens through the Express API.
- `frontend/store/app-store.ts` is the main orchestration layer for auth, sync, and CRUD flows.
- `frontend/services/` contains standalone domain logic like reports and tax calculations.
- `frontend/utils/api.ts` owns frontend HTTP behavior and Expo host resolution.
- Backend routes stay thin; business rules belong in `backend/src/services/`.

## Working Rules

- **Strict VND-only**: The application is strictly VND-only. Multi-currency logic and exchange rate calculations have been removed.
- **API Contracts**: Keep frontend and backend API contracts in sync. Update both `backend/src` and frontend store/hooks when response shapes change.
- **Expo Router**: Preserve Expo Router conventions. Route changes belong under `frontend/app/`.
- **UI Primitives**: Prefer shared design tokens and `Soft*` UI primitives from `frontend/components/`.
- **Vietnamese Copy**: Preserve Vietnamese text where it exists; save files as UTF-8.

## Task Execution Pipeline

### 1. Research & Pre-check
- **Analyze scope**: Determine if the task touches Frontend, Backend, or both.
- **Inspect existing structures**: Check `backend/sql/schema.sql` for data tasks and `frontend/app/` for UI tasks.
- **Formulate a plan**: Briefly state intended changes.

### 2. Development Phase (Strict Ordering)
1. **Backend**: Update `schema.sql` -> `backend/src/routes/` -> `backend/src/services/`.
2. **API Contract**: Update `frontend/utils/api.ts` and `frontend/store/app-store.ts`.
3. **Frontend**: Update `frontend/app/` screens and `frontend/components/`.

### 3. Verification Phase
- **Frontend Check**: `npm run frontend:lint` and `npm run frontend:check` from root.
- **Backend Check**: `npm run backend:lint` and `npm run backend:check` from root.
- **Contract Check**: Verify frontend payloads match backend validation.

## Commands (Run from root)

### Frontend
- `npm run frontend:start`: Start Expo development server
- `npm run frontend:android`: Run on Android
- `npm run frontend:ios`: Run on iOS
- `npm run frontend:lint`: Run linting
- `npm run frontend:check`: Run TypeScript check

### Backend
- `npm run backend:dev`: Start backend with watch mode
- `npm run backend:start`: Start backend server
- `npm run backend:lint`: Run linting
- `npm run backend:check`: Run syntax check

## Environment Notes

- **Frontend**: Configured in `frontend/app.json` under `expo.extra.apiBaseUrl`.
- **Backend**: Lives in `backend/.env`.
- **Key Vars**: `PORT`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `AUTH_TOKEN_SECRET`.

## Project-Local Skills

Located in `.agents/skills/`:
- `expo-router-mobile`: Guidance for frontend development.
- `express-mysql-api`: Guidance for backend development.
- `project-verification`: Checklist for task completion.

