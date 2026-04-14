---
name: project-verification
description: Verification checklist tailored to this Expo + Express repository.
origin: Project
---

# Project Verification

Use this before finishing any meaningful code change.

## Frontend Changes

- Run `npm run lint`
- Run `npx tsc --noEmit`

## Backend Changes

- Run `cd backend && npm run check`

## Contract Changes

- Review `utils/api.ts`
- Review `store/app-store.ts`
- Review the affected backend route and service files
- Confirm request and response shapes still line up

## Notes

- There is no established automated test suite yet.
- Do not report tests as passed unless you added and ran them.
- If you skip a verification step, say so explicitly in the final handoff.
