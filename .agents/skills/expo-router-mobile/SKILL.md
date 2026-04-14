---
name: expo-router-mobile
description: Project-specific guidance for the Expo Router mobile app in this repository.
origin: Project
---

# Expo Router Mobile

Use this skill for work in `app/`, `components/`, `hooks/`, `store/`, `constants/`, `services/`, and `utils/`.

## What To Preserve

- Expo Router file-based navigation under `app/`
- Zustand as the app state boundary
- `utils/api.ts` as the HTTP client boundary
- Shared design tokens from `constants/` and existing `Soft*` components

## Preferred Patterns

- Put screen orchestration in `store/app-store.ts` instead of duplicating request logic inside screens.
- When adding or changing routes, keep them consistent with the current `auth`, `tabs`, `wallet`, `transaction`, `budget`, `(reporting)`, and `(tools)` structure.
- Reuse shared helpers from `utils/` and shared types from `constants/types.ts`.
- Use `SafeAreaView` or `SafeAreaProvider` where screen layout depends on safe areas.
- Keep mobile-specific edge cases in mind: Android back behavior, Expo host URLs, smaller screens, and loading states.

## When API Work Is Involved

- Check whether the change also requires updates in `backend/src/routes/`, `backend/src/services/`, or `backend/sql/schema.sql`.
- If a backend response shape changes, update `utils/api.ts` and any affected store actions.

## Verification

- Run `npm run lint`
- Run `npx tsc --noEmit`

