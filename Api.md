# MoneyManager API Documentation (Standardized)

This document defines the standardized API contract for the MoneyManager application.

## 1. General Principles

### Base URL
`http://<host>:<port>/api`

### Authentication
Most endpoints require a Bearer token in the `Authorization` header:
`Authorization: Bearer <access_token>`

### Naming Convention
- **URLs**: Plural nouns (e.g., `/wallets`, `/transactions`).
- **Keys (JSON)**: `camelCase` for both requests and responses.
- **Methods**:
    - `GET`: Retrieve resource(s).
    - `POST`: Create a new resource.
    - `PUT`: Replace a resource/Update settings.
    - `PATCH`: Partially update a resource.
    - `DELETE`: Remove a resource.

---

## 2. Response Structure (Envelope)

All responses follow a consistent JSON envelope.

### Success Response
**Status Code**: `200 OK` or `201 Created`
```json
{
  "success": true,
  "data": { ... } // Can be an object or an array
}
```

### Error Response
**Status Code**: `4xx` or `5xx`
```json
{
  "success": false,
  "error": {
    "message": "Human readable error message",
    "code": "ERROR_CODE", // Optional identifier
    "details": null // Optional additional context (e.g. validation errors)
  }
}
```

---

## 3. Endpoints

### Auth
- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Login and receive access token.
- `GET /api/auth/me`: Get current user profile.

### Wallets
- `GET /api/wallets`: List all wallets for the user.
- `GET /api/wallets/:id`: Get a specific wallet.
- `POST /api/wallets`: Create a new wallet.
- `PATCH /api/wallets/:id`: Update an existing wallet.
- `DELETE /api/wallets/:id`: Delete a wallet and its transactions.

### Transactions
- `GET /api/transactions`: List transactions (with filters: `walletId`, `type`).
- `GET /api/transactions/:id`: Get a specific transaction.
- `POST /api/transactions`: Create a new transaction.
- `POST /api/transactions/batch`: Create multiple transactions at once.
- `PATCH /api/transactions/:id`: Update an existing transaction.
- `DELETE /api/transactions/:id`: Delete a transaction.

### Budgets
- `GET /api/budgets/stats`: Get budget progress (planned).
- `POST /api/budgets`: Create a new budget.
- `DELETE /api/budgets/:id`: Delete a budget.

### State & Settings
- `GET /api/state`: Get full app state snapshot (wallets, transactions, budgets, settings).
- `POST /api/state/import`: Bulk import/sync state.
- `GET /api/settings`: Get user settings.
- `PUT /api/settings`: Update user settings.

### AI (Gemini)
- `POST /api/ai/transcribe`: Upload audio and extract transactions.
- `POST /api/ai/scan-receipt`: Upload image and extract transactions.

---

## 4. Status Codes Summary

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (Creation) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error or invalid payload |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Accessing resource not owned by user |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists (e.g. duplicate email) |
| 500 | Server Error | Unexpected server error |
