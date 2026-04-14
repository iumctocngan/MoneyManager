# Project Instructions for AI Agents

This repository is a mobile-first money manager app with a separate API server.
Use this file as the primary project brief.

## Project Shape

- Frontend: Expo 54, React Native 0.81, Expo Router, Zustand, AsyncStorage
- Backend: Node.js, Express 4, MySQL, token-based auth
- Language: TypeScript on the app side, modern JavaScript modules in `backend/`

## Important Directories

- `app/` Expo Router screens and layouts
- `components/` reusable React Native UI
- `constants/` design tokens, enums, shared app types
- `hooks/` view-level helpers
- `services/` frontend domain logic (reports, tax, etc.)
- `store/` Zustand state and app orchestration
- `utils/api.ts` frontend API client and base URL resolution
- `backend/src/routes/` HTTP route wiring
- `backend/src/services/` backend business logic
- `backend/src/utils/` validation, auth, serializers, helpers
- `backend/sql/schema.sql` canonical database schema

## How This App Works

- The mobile app persists client state locally with Zustand + AsyncStorage.
- Authenticated data sync happens through the Express API.
- `store/app-store.ts` is the main orchestration layer for auth, sync, and CRUD flows.
- `services/` (frontend) contains standalone domain logic like reports, tax calculations, and currency exchange.
- `utils/api.ts` owns frontend HTTP behavior and Expo host resolution.
- Backend routes should stay thin; business rules belong in `backend/src/services/`.

## Working Rules

- Keep frontend and backend API contracts in sync. If a response shape changes, update both `backend/src` and `utils/api.ts` or `store/app-store.ts`.
- Preserve Expo Router conventions. Route changes belong under `app/` and should not introduce custom navigation abstractions unless necessary.
- Prefer shared design tokens and `Soft*` UI primitives over one-off styling when editing existing screens.
- Keep domain logic out of screen components when it can live in the store or backend services.
- **VND Standardization**: The application is strictly VND-only. All multi-currency logic, exchange rate calculations, and currency conversion fields have been removed.
- Preserve Vietnamese product copy where it already exists, and save text files as UTF-8 to avoid mojibake.
- Prefer project-local skills in `.agents/skills/` over any root-level generic skill bundles to ensure instructions remain tailored to this specific project.

## Task Execution Pipeline

Agents must strictly follow this 3-phase workflow for every requested feature or bug fix:

### 1. Research & Pre-check Phase (Do this before writing any code)
- **Analyze scope:** Determine if the task touches Frontend, Backend, or both.
- **Inspect existing structures:**
  - If it's a backend/data task, read `backend/sql/schema.sql` first.
  - If it's a frontend task, search `app/` and `components/` for existing UI patterns.
- **Formulate a plan:** Briefly state the intended changes (e.g., "I will update the Express route first, then the Zustand store"). Do not jump straight into coding.

### 2. Development Phase (Strict Ordering)
When executing full-stack features, adhere to this order:
1. **Database & Backend:** Update `schema.sql` -> Create/modify routes in `backend/src/routes/` -> Implement business logic in `backend/src/services/`.
2. **API Contract:** Update the interface/types in `utils/api.ts` and ensure state orchestration in `store/app-store.ts` reflects the new backend shape.
3. **Frontend UI:** Build or update screens in `app/` and reusable views in `components/`.

### 3. Verification Phase (Post-check)
Before declaring a task "done" and requesting human review, you MUST run the following validations:
- **Frontend Check**: Execute `npm run lint` and `npm run check`. Fix any TypeScript errors.
- **Backend Check**: Execute `cd backend && npm run lint` and `cd backend && npm run check`.
- **Contract Check**: Explicitly confirm that frontend payloads match backend validation rules.

## Commands

Frontend:

- `npm run start`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run lint`
- `npm run check`

Backend:

- `cd backend && npm run dev`
- `cd backend && npm run start`
- `cd backend && npm run check`
- `cd backend && npm run lint`

## Environment Notes

- Frontend API base URL is configured in `app.json` under `expo.extra.apiBaseUrl`.
- `utils/api.ts` rewrites `localhost` for Expo dev hosts and Android emulators.
- Backend env lives in `backend/.env`.
- Important backend env vars include `PORT`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `AUTH_TOKEN_SECRET`, and `ACCESS_TOKEN_TTL_HOURS`.

## Verification

- For frontend changes, run `npm run lint` and `npm run check`.
- For backend changes, run `cd backend && npm run lint` and `cd backend && npm run check`.
- For API-contract changes, verify both the backend route/service path and the frontend store/client path.
- This repo does not have a real automated test suite yet. Do not claim tests passed unless you actually added and ran them.

## Project-Local Skills

Preferred project-local skills live in `.agents/skills/`.
Use these first when relevant:

- `expo-router-mobile` for `app/`, `components/`, `hooks/`, `store/`, and mobile UI flows
- `express-mysql-api` for `backend/src/` route, service, auth, and schema work
- `project-verification` before wrapping up meaningful code changes

## Multi-Agent Guidance

Use the configured explorer, reviewer, and docs researcher roles only for tasks that benefit from parallel evidence gathering or review.
For routine edits in this repo, direct work is usually faster than delegation.
