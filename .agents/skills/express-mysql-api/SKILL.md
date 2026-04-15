---
name: express-mysql-api
description: Backend logic, database transactions, and security for the Node/Express API.
---

# Express MySQL API

Use this skill for all work in `backend/src/`.

## 🛡 Security Checklist (CRITICAL)

- **Auth Scoping**: Every query MUST filter by `user_id = :userId`. Never return data belonging to other users.
- **SQL Injection**: Use parameterized queries (`:paramName`) via the `execute` helper. Never concatenate raw strings.
- **Validation**: Validate all incoming payloads in the controller or service layer before processing.

## 🏗 Backend Architecture

### Thin Routes, Heavy Services
Keep `routes/` focused on HTTP wiring and use `services/` for business logic.
- **Routes**: Handle request parsing and response sending.
- **Services**: Handle database interaction, calculations, and business rules.

### Atomicity with Transactions
Use `withTransaction` for operations touching multiple tables (e.g., creating a transaction and updating wallet balance).
```javascript
await withTransaction(async (connection) => {
  await createTransaction(connection, userId, payload);
  await adjustWalletBalance(connection, userId, walletId, amount);
});
```

### Serializers
Always use `map*` serializers from `utils/serializers.js` to ensure the API matches the frontend expected types.

## 🧪 Verification

1. **Syntax Check**: Run `npm run backend:check` from the root.
2. **Contract Sync**: If a return shape changes, update `frontend/utils/api.ts` immediately.
3. **Auth Check**: Manually verify that resources are correctly isolated per user.

