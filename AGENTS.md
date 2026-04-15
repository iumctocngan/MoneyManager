# Project Instructions for AI Agents

This repository is a mobile-first money manager app with a separate API server, organized as a monorepo. Use this file as the primary project brief and source of truth for all AI interactions.

## 🎯 Project Context

- **Frontend**: Expo 55, React Native, Expo Router, Zustand, AsyncStorage.
- **Backend**: Node.js, Express 4, MySQL, token-based auth.
- **Strict Constraints**: 
  - **VND-only**: The app is strictly VND-only. Never add multi-currency logic.
  - **Vietnamese Copy**: Preserve Vietnamese text in UI; save files as UTF-8.

## 🛠 Development Workflow

### 1. Research & Contract Alignment
- Inspect `backend/sql/schema.sql` for data changes.
- Sync `frontend/utils/api.ts` and `frontend/store/app-store.ts` with backend routes.

### 2. Implementation Order (STRICT)
1. **Backend**: Schema -> Routes -> Services.
2. **API Client**: Update `frontend/utils/api.ts`.
3. **Frontend Store**: Update `frontend/store/app-store.ts`.
4. **UI**: Update `app/` screens and `components/`.

## 🔍 Review Priorities

### 🔴 CRITICAL -- Security & Integrity
- **VND Integrity**: Ensure no decimals or exchange rate logic is introduced.
- **Injection**: Use parameterized queries in `backend/src/services/`.
- **Auth Scoping**: Every backend query MUST be scoped to `:userId`.

### 🟡 HIGH -- Type Safety & Async
- **Sync Logic**: Maintain the local-to-remote import bridge in `app-store.ts`.
- **Async Handling**: Use `withTransaction` for multi-step backend operations.
- **Type Casting**: Avoid `any`; keep frontend types in sync with `backend/src/utils/serializers.js`.

### 🔵 MEDIUM -- UX & Patterns
- **UI Primitives**: Use `Soft*` components and design tokens from `frontend/constants/`.
- **Thin Routes**: Business rules belong in `services/`, not `routes/`.

## 🧪 Diagnostic Commands (Run from Root)

| Task | Command |
| :--- | :--- |
| **Full Setup** | `npm install` |
| **Frontend Check** | `npm run frontend:check` (Lint + TS) |
| **Backend Check** | `npm run backend:check` (Syntax) |
| **Backend Dev** | `npm run backend:dev` |
| **Frontend Start** | `npm run frontend:start` |

## 📚 Project-Local Skills

Located in `.agents/skills/`:
- `expo-router-mobile`: UI patterns and mobile edge cases.
- `express-mysql-api`: Backend architecture and security.
- `project-verification`: Mandatory pre-completion checklist.