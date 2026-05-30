## Project overview

This repository contains **MoneyManager**, a personal finance management application with a mobile-first architecture. It features a React Native (Expo) frontend and a Node.js (Express) backend.

The app provides offline-first tracking, budget management, and an intelligent AI assistant:

- The **Frontend** (`frontend/`) is built with React Native, Expo Router, and Zustand. It uses a local SQLite database for offline-first persistence.
- The **Backend** (`backend/`) is an Express.js API interacting with a MySQL database. It acts as the central cloud sync and provides AI capabilities.
- The AI Agent uses LangGraph, LangChain, and Gemini 3.1 Flash-Lite to analyze spending, manage transactions, and provide financial planning advice.
- All monetary values strictly use `INTEGER` in SQLite to prevent floating-point precision issues with VNĐ.

## Common commands

**Frontend:**
- Install dependencies: `cd frontend && npm install`
- Start the Expo dev server: `cd frontend && npx expo start`
- Start for iOS/Android: `cd frontend && npx expo run:ios` / `npx expo run:android`

**Backend:**
- Install dependencies: `cd backend && npm install`
- Start the backend dev server: `cd backend && npm run dev`
- Start in production: `cd backend && npm start`

## Testing and linting

- There is currently no automated test runner configured in `package.json` for either frontend or backend.
- Lints and code formatting are handled manually; no strict CI hooks are configured.

## Architecture

### Offline-First Data & State
- `frontend/database/db.ts` defines the local SQLite schema for `transactions`, `wallets`, and `budgets`.
- `frontend/store/app-store.ts` is the central Zustand store, managing hydration from SQLite, local mutations, and synchronization with the backend API.
- `frontend/hooks/useMutations.ts` wraps asynchronous actions and manages `isMutating` state.
- `frontend/hooks/useTransactions.ts` processes transaction filtering and calculations (income, expense, category breakdowns) in optimized single-pass loops.

### Backend Services & Transactions
- `backend/src/routes/` and `backend/src/controllers/` define the API endpoints.
- `backend/src/services/` contains the core business logic (`budget.service.js`, `transaction.service.js`, etc.).
- `backend/config/database.js` provides `query`, `execute`, and `withTransaction` utilities for MySQL. 
- All operations that read and then modify related data (e.g., updating a budget or wallet balance) must be wrapped in `withTransaction` to prevent race conditions.

### AI Agent Integration
- `backend/src/services/aiAgent.js` orchestrates the AI assistant using `@langchain/google-genai` and `@langchain/langgraph`.
- The Agent is equipped with custom tools: `get_financial_status` (for current month), `get_trend_report` (for past months), `add_transaction`, `update_transaction`, `delete_transaction`, `set_budget`, and `transfer_funds`.
- The backend's `ai.controller.js` forwards a `dataModified` flag back to the frontend whenever the AI triggers a mutation tool, allowing the frontend to refresh its state without relying on fragile text-matching heuristics.

### UI & Styling
- Expo Router (`frontend/app/`) handles file-based navigation.
- The UI follows a cohesive "Soft" design system (`SoftColors`, `SoftCard`, `SoftAlert`).
- System alerts have been migrated to the custom `SoftAlert.alert()` for visual consistency.
- Date inputs utilize `@react-native-community/datetimepicker` for native calendar interactions.

## Notes for future changes

- If you change the database structure, update both `frontend/database/db.ts` (SQLite) and the backend MySQL schema (`backend/sql/schema.sql`).
- If you add or modify AI capabilities, update the tool definitions and system prompt in `backend/src/services/aiAgent.js`. Remember that the AI should only call one tool per request to ensure stability.
- If you modify how transactions are aggregated or filtered, inspect `frontend/hooks/useTransactions.ts`. Maintain the single-pass loop architecture for performance.
- When creating new UI components, utilize the existing design tokens in `frontend/constants/design.ts` and components in `frontend/components/ui/soft/`.
- Ensure any multi-step backend database write is safely wrapped inside the `withTransaction` helper.