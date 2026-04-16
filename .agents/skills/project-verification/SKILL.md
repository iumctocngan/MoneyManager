---
name: project-verification
description: Mandatory verification loop for build, contract, and UX checks.
---

# Project Verification Loop

Follow this loop before finishing any code change.

## 1. Automated Checks (Root Context)
Run these commands from the **root directory** and ensure they pass:
- **Frontend**: Run `npm run frontend:check` (TypeScript + static checks)
- **Frontend**: Run `npm run frontend:lint` (ESLint)
- **Backend**: Run `npm run backend:check` (Syntax)
- **Backend**: Run `npm run backend:lint` (ESLint)

## 2. Contract Verification
If API shapes changed, verify the "Handshake":
- **Backend**: Inspect `backend/src/utils/serializers.js` and `routes/`.
- **API Client**: Inspect `frontend/utils/api.ts`.
- **Store**: Inspect `frontend/store/app-store.ts`.
- Confirm `Transaction`, `Wallet`, and `Budget` type signatures match between layers.

## 3. Manual UX Verification
Since there is no automated test suite yet, perform these manual checks:
- **Navigation**: Verify affected screens open and transition correctly.
- **State**: Check if the UI updates immediately after a CRUD operation.
- **Persistent Context**: Kill and restart the app to ensure data is restored via Zustand persistence.

## 4. Self-Review Checklist
- [ ] No hardcoded secrets.
- [ ] No `console.log` left in production.
- [ ] Vietnamese copy preserved.
- [ ] Strict VND-only logic maintained.
- [ ] Every backend query is scoped to `:userId`.
