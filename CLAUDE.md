# BringID Relayer - Project Documentation

## Project Overview

**BringID Relayer** (`bringid-relayer`, version 3.0.0) is a Node.js server application that executes blockchain operations through a relayer wallet. It accepts operation requests, sends transactions to the blockchain, tracks their status, and processes pending operations via background workers.

### Purpose

The server:
- Accepts operation execution requests (POST `/api/v1/operations/execute`)
- Sends transactions via a relayer wallet (Ethers.js, EIP-1559 fee model)
- Tracks transaction status and monitors for completion
- Runs a pending-operations worker to update status from chain and re-track pending ops
- Manages a nonce queue to avoid conflicts in parallel transactions
- Reinitializes the nonce queue on a cron schedule
- Simulates "claim" operations before sending to surface contract errors early

### Technology Stack

- **Runtime**: Node.js 20.x
- **Language**: JavaScript (CommonJS)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Blockchain**: Ethers.js v6
- **Validation**: Request auth via `api-secret-key` header (optional via `REQUEST_VALIDATION`). Celebrate (Joi) is present but route-level celebrate schemas are commented out for the current API.
- **Logging**: Winston
- **Monitoring**: Datadog (dd-trace)
- **Task scheduling**: node-cron
- **Tests**: Mocha, Chai, Sinon, proxyquire

### Architecture

The application follows a layered architecture:

```
┌─────────────────────────────────────┐
│         API Routes Layer            │
│  (Express routes & controllers)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Service Layer                │
│  (Relayer, Operation, Transaction  │
│   Tracker, Retry, Nonce Queue,    │
│   Relayer Wallet services)         │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Data Layer                   │
│  (MongoDB Models: Operation,       │
│   Transaction)                      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     External Services               │
│  (Blockchain via JSON-RPC)          │
└─────────────────────────────────────┘
```

### Key Components

1. **Routes**: `src/routes/index.js` builds the API router; `src/routes/routes.js` defines endpoints and controller methods. Mounted at `/api/v1/` via `buildRouter('routes')`.
2. **Controllers** (`src/controllers/relayer-controller.js`): `executeOperation`, `getOperationStatus`.
3. **Services**:
   - `relayer-service.js`: Execute operation, dedupe by existing operation, simulate claim, send tx, track
   - `operation-service.js`: CRUD and find pending operations
   - `relayer-wallet-service.js`: Wallet (AutoNonceWallet), send tx, fee data (EIP-1559; OP Stack uses `eth_gasPrice` + `GWEI_ADDED_TO_MEDIAN_GAS_PRICE`), simulate call, retry fee calculation
   - `transaction-tracker-service.js`: Track pending operations (wait N blocks, check receipt, update status; retry with higher gas via retry-transaction-service)
   - `retry-transaction-service.js`: Retry failed/dropped transactions with increased gas
   - `nonce-queue-service.js`: Nonce queue and `reInitNextNonce()`
   - `latest-nonce-service.js`: Latest nonce from chain and DB
4. **Workers** (`tasks/`): `pending-operation-retry-scheduler.js` (cron → pending-operations-worker), `nonce-queue-reinit-scheduler.js` (cron → nonce queue reinit). Both run only when `NODE_ENV=production`.
5. **Models**: `src/models/operation.js` (Operation with embedded Transaction schema), `src/models/transaction.js` (TransactionSchema), `src/models/connectDB.js`.
6. **Contract errors**: `src/utils/error-parser.js` parses revert data using ABIs from `contracts/airdrop-errors.json`, `contracts/semaphore-errors.json`, `contracts/registry-errors.json` (CredentialRegistry). Tries interfaces in order: registry, airdrop, semaphore.
7. **Config**: `stage-config.js` loads from `configs/${NODE_ENV}.env` (dotenv). Error logging behavior: `configs/error-to-warn.json`. MongoDB migrations: `src/migrate-mongo-config.js` (migrations dir: `migrations`).

### Project Structure (main files)

```
server.js
stage-config.js
src/
  routes/index.js, routes/routes.js
  controllers/relayer-controller.js
  services/relayer-service.js, operation-service.js, relayer-wallet-service.js,
    transaction-tracker-service.js, retry-transaction-service.js,
    nonce-queue-service.js, latest-nonce-service.js
  models/operation.js, transaction.js, connectDB.js
  utils/logger.js, errors.js, request-validator.js, error-parser.js, celebrate-builder.js
  migrate-mongo-config.js
tasks/
  pending-operation-retry-scheduler.js, pending-operations-worker.js
  nonce-queue-reinit-scheduler.js
configs/
  error-to-warn.json
  development.env, production.env, test.env  (per NODE_ENV; typically not in repo)
contracts/
  airdrop-errors.json, semaphore-errors.json, registry-errors.json
test/
  operation-service.test.js, error-parser.test.js
```

### Request Authentication

All API requests require an `api-secret-key` header:
```
api-secret-key: <API_SECRET>
```

This can be disabled by setting `REQUEST_VALIDATION=false` in environment variables.

---

## API Endpoints

Base URL: `/api/v1`

### 1. POST /operations/execute

Executes an operation by sending a transaction to the blockchain. If an operation with the same ID already exists and has transactions, returns the existing operation status.

#### Request

**Headers:**
```
Content-Type: application/json
api-secret-key: <API_SECRET>
```

**Body:**
```typescript
interface IExecuteOperationRequest {
  id: string                    // Required: Operation identifier
  to: string                    // Required: Contract address to send transaction to
  type: string                  // Required: Operation type (e.g., "claim")
  data: string                  // Required: Transaction data (hex string)
  value?: string                // Optional: Value to send in wei (default: "0")
}
```

**Example:**
```json
{
  "id": "claim-randomId-0x3f88a5f873d5d714e9135161784c391937cb6d47",
  "to": "0x3f88a5f873d5d714e9135161784c391937cb6d47",
  "type": "claim",
  "data": "0x1234567890abcdef...",
  "value": "0"
}
```

#### Success Response (200)

**TypeScript Interface:**
```typescript
interface IExecuteOperationResponse {
  success: boolean                    // Always true
  tx_hash: string                     // Transaction hash
  operation_id: string                // Operation identifier
  status: string                      // Operation status: 'created' | 'pending' | 'completed' | 'error' | 'canceled' | 'dropped'
}
```

**Example JSON:**
```json
{
  "success": true,
  "tx_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "operation_id": "claim-randomId-0x3f88a5f873d5d714e9135161784c391937cb6d47",
  "status": "pending"
}
```

**Note:** If an operation with the same `id` already exists and has transactions, the existing operation's status and transaction hash are returned instead of creating a new transaction.

#### Error Responses

**Validation Error (400):**
```typescript
interface IValidationErrorResponse {
  success: false
  error: "Validation error"
  errors: string[]  // Array of validation error messages
}
```

**Contract Error (400):**
```typescript
interface IContractErrorResponse {
  success: false
  error: string                    // Human-readable error message
  message?: string                 // Same as error (for operational errors)
  errors: string[]                 // Array with contract error code
}
```

**Common Contract Error Codes:**

Errors are parsed by `src/utils/error-parser.js` using ABIs from `contracts/airdrop-errors.json`, `contracts/semaphore-errors.json`, and `contracts/registry-errors.json` (CredentialRegistry). Full mappings are in `ERROR_MAPPING` in error-parser.

**Airdrop:** `AIRDROP_ALREADY_CLAIMED`, `AIRDROP_STOPPED`, `AMOUNT_IS_ZERO`, `INSUFFICIENT_SCORE`, `THRESHOLD_IS_ZERO`, `TRANSFER_FAILED`

**Semaphore:** `INVALID_PROOF`, `MERKLE_TREE_DEPTH_IS_NOT_SUPPORTED`, `MERKLE_TREE_ROOT_IS_EXPIRED`, `MERKLE_TREE_ROOT_IS_NOT_PART_OF_THE_GROUP`, `SAME_NULLIFIERS_USED_TWICE`, `WRONG_SIBLING_NODES`, `LEAF_ALREADY_EXISTS`, `LEAF_CANNOT_BE_ZERO`, `LEAF_DOES_NOT_EXIST`, `LEAF_GREATER_THAN_SNARK_SCALAR_FIELD`, `CALLER_IS_NOT_THE_GROUP_ADMIN`, `CALLER_IS_NOT_THE_PENDING_GROUP_ADMIN`, `GROUP_DOES_NOT_EXIST`, `GROUP_HAS_NO_MEMBERS`

**CredentialRegistry (registry):** Many codes including `ALREADY_EXPIRED`, `ALREADY_REGISTERED`, `APP_ID_MISMATCH`, `APP_NOT_ACTIVE`, `ATTESTATION_EXPIRED`, `COMMITMENT_MISMATCH`, `CREDENTIAL_GROUP_*`, `INVALID_*`, `NOT_REGISTERED`, `RECOVERY_*`, `WRONG_CHAIN`, etc. See `ERROR_MAPPING` in `src/utils/error-parser.js` and `contracts/registry-errors.json`.

**Other:** `SIMULATION_CALL_FAILED` (when simulation fails and no parseable contract error)

**Example Contract Error:**
```json
{
  "success": false,
  "error": "Airdrop already claimed for address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "errors": ["AIRDROP_ALREADY_CLAIMED"]
}
```

**Transaction Error (400):**
```json
{
  "success": false,
  "errors": ["NONCE_EXPIRED"]
}
```

**Unauthorized Error (403):**
```json
{
  "success": false,
  "error": "Api secret key is not provided.",
  "message": "Api secret key is not provided.",
  "errors": ["API_SECRET_KEY_NOT_PROVIDED"]
}
```

**Forbidden Error (403):**
```json
{
  "success": false,
  "error": "Requests from unauthorized resources are forbidden!",
  "message": "Requests from unauthorized resources are forbidden!",
  "errors": ["UNAUTHORIZED_REQUEST"]
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/v1/operations/execute \
  -H "Content-Type: application/json" \
  -H "api-secret-key: your-secret-key" \
  -d '{
    "id": "claim-randomId-0x3f88a5f873d5d714e9135161784c391937cb6d47",
    "to": "0x3f88a5f873d5d714e9135161784c391937cb6d47",
    "type": "claim",
    "data": "0x1234567890abcdef...",
    "value": "0"
  }'
```

---

### 2. GET /operations/:id/status

Retrieves the status of an operation by its ID.

#### Request

**Headers:**
```
api-secret-key: <API_SECRET>
```

**Path Parameters:**
- `id` (string): Operation identifier

#### Success Response (200)

**TypeScript Interface:**
```typescript
interface IGetOperationStatusResponse {
  success: boolean
  tx_hash: string                   // Transaction hash (from completed transaction if available, otherwise last transaction)
  status: string                    // Operation status: 'created' | 'pending' | 'completed' | 'error' | 'canceled' | 'dropped'
  operation_id: string              // Operation identifier
}
```

**Example JSON:**
```json
{
  "success": true,
  "tx_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "status": "completed",
  "operation_id": "claim-randomId-0x3f88a5f873d5d714e9135161784c391937cb6d47"
}
```

#### Error Responses

**Not Found Error (404):**
```json
{
  "success": false,
  "error": "Operation not found",
  "message": "Operation not found",
  "errors": ["OPERATION_NOT_FOUND"]
}
```

**Unauthorized Error (403):**
```json
{
  "success": false,
  "error": "Api secret key is not provided.",
  "message": "Api secret key is not provided.",
  "errors": ["API_SECRET_KEY_NOT_PROVIDED"]
}
```

**Forbidden Error (403):**
```json
{
  "success": false,
  "error": "Requests from unauthorized resources are forbidden!",
  "message": "Requests from unauthorized resources are forbidden!",
  "errors": ["UNAUTHORIZED_REQUEST"]
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:8000/api/v1/operations/claim-randomId-0x3f88a5f873d5d714e9135161784c391937cb6d47/status \
  -H "api-secret-key: your-secret-key"
```

---

## Data Models

### Operation Model

Operations represent blockchain operations that need to be executed and tracked.

**MongoDB Schema:**
```typescript
interface IOperation {
  _id: mongoose.Types.ObjectId
  id: string                          // Required: Operation identifier (unique per nonce)
  nonce: number                       // Required: Transaction nonce
  status: 'created' | 'pending' | 'completed' | 'canceled' | 'error' | 'dropped'  // Required: Operation status
  contractAddress: string             // Required: Contract address
  mined: boolean                      // Whether transaction was mined (default: false)
  txStarted: number | null            // Blockchain block number when transaction started
  txMined: number | null              // Blockchain block number when transaction was mined
  data: string | null                  // Transaction data
  transactions: ITransaction[]        // Array of transaction attempts
  createdAt: Date                     // Operation creation timestamp
  updatedAt: Date                     // Operation last update timestamp
}
```

**Indexes:**
- `{ id: 1 }` - Index on operation ID
- `{ nonce: 1, id: 1 }` - Unique compound index on nonce and ID

### Transaction Model

Transactions represent individual transaction attempts within an operation.

**MongoDB Schema (nested in Operation):**
```typescript
interface ITransaction {
  hash: string                        // Required: Transaction hash
  status: 'created' | 'pending' | 'completed' | 'error' | 'dropped'  // Required: Transaction status
  params: {
    to: string                        // Required: Contract address
    value: string                     // Required: Value in wei (as string)
    gasLimit: string                  // Required: Gas limit (as string)
    maxPriorityFeePerGas: string      // Required: EIP-1559
    maxFeePerGas: string              // Required: EIP-1559
    data?: string                     // Transaction data
    nonce?: number                    // Transaction nonce
  }
  createdAt: Date                    // Transaction creation timestamp
  updatedAt: Date                    // Transaction last update timestamp
}
```
(The app uses EIP-1559 fee fields only; no legacy `gasPrice` in the schema.)

**Transaction Status Flow:**
- When a transaction is first created: `created`
- When sent to blockchain: `pending`
- When mined successfully: `completed`
- When mined but failed: `error`
- When replaced by a newer transaction: `dropped`

---

## Error Handling

### Error Response Format

All error responses follow a consistent structure:

```typescript
interface IErrorResponse {
  success: false
  error: string        // Human-readable error message
  message?: string     // Same as error (for operational errors)
  errors: string[]     // Array of error codes
}
```

### Error Types

1. **Validation Errors (400)**: Request validation failures
   - Format: `{ success: false, error: "Validation error", errors: string[] }`
   - Error messages come from Celebrate validation

2. **Bad Request (400)**: Business logic errors, contract errors, transaction errors
   - Format: `{ success: false, error: string, message?: string, errors: string[] }`
   - Includes contract error codes and transaction error codes

3. **Not Found (404)**: Resource not found
   - Format: `{ success: false, error: string, message: string, errors: string[] }`

4. **Forbidden (403)**: Authentication/authorization failures
   - Format: `{ success: false, error: string, message: string, errors: string[] }`

5. **Server Error (500)**: Internal server errors
   - Format: `{ success: false, errors: ["SERVER_ERROR"] }`
   - Error details are logged but not exposed to client

### Contract Error Handling

Contract reverts are parsed in `src/utils/error-parser.js` and converted to `BadRequestError` with a cause code. The parser tries three ABIs in order: **registry** (CredentialRegistry), **airdrop**, **semaphore**. First successful parse wins. Error codes and messages come from `ERROR_MAPPING`; messages can include context (e.g. address for `AIRDROP_ALREADY_CLAIMED`).

### Error Logging

Operational errors are logged in the main error handler using `configs/error-to-warn.json`: entries keyed by error cause (e.g. `AIRDROP_ALREADY_CLAIMED`). `warn: true` → log as warning; `silence: true` → do not log; otherwise log as error.

---

## Configuration

### Environment Variables

Configuration is loaded from `configs/${NODE_ENV}.env` via dotenv. Exported options (see `stage-config.js`):

**Server:**
- `NODE_ENV`: development | production | test
- `PORT`: Server port (default: 8000)
- `CUSTOM_PORT`: Alternative port

**Database:**
- `mongoURI`: MongoDB connection string (default in `connectDB.js`: `mongodb://127.0.0.1:27017/dev_bringid_relayer_db`)
- `MIGRATE_MONGO_URI`, `MIGRATE_MONGO_DB_NAME`: Used by migrate-mongo (see `src/migrate-mongo-config.js`)

**Authentication:**
- `API_SECRET`: API secret key
- `REQUEST_VALIDATION`: "true" to require `api-secret-key` header; otherwise validation is skipped

**Blockchain:**
- `CHAIN`, `CHAIN_ID`: Network identifier
- `OPSTACK`: "true" for OP Stack (fee data from `eth_gasPrice` + `GWEI_ADDED_TO_MEDIAN_GAS_PRICE`)
- `JSON_RPC_URL`, `RELAYER_PRIVATE_KEY`: Required for sending transactions

**Gas (EIP-1559):**
- `MAX_GAS_PRICE`: Cap in gwei
- `DEFAULT_GAS_PRICE`, `DEFAULT_PIORITY_FEE_PER_GAS_PRICE`: Defaults when RPC fee fetch fails
- `GWEI_ADDED_ON_RETRY`, `GWEI_ADDED_TO_PRIORITY_FEE_ON_RETRY`: Added on retry
- When `OPSTACK=true`, `relayer-wallet-service.js` uses `GWEI_ADDED_TO_MEDIAN_GAS_PRICE` (gwei added to `eth_gasPrice`). This variable is not exported in `stage-config.js`; if using OP Stack, set it in your env and add it to `stage-config.js` so it is available.

**Transaction tracking:**
- `TRACKER_BLOCKS_TO_WAIT`: Blocks to wait before checking receipt

**Scheduling (production only):**
- `PENDING_OPERATIONS_CRON_SCHEDULE`: Cron for pending-operations worker
- `REINIT_NONCE_QUEUE_CRON_SCHEDULE`: Cron for nonce queue reinit

**Monitoring:**
- `DD_VERSION`: Set from `package.json` version

**Scripts** (`package.json`): `npm run start` (production), `npm run dev` (development with nodemon), `npm run test` (Mocha, timeout 50s).

### Error configuration

See `configs/error-to-warn.json`: keys are error cause codes; `warn: true` logs as warning, `silence: true` suppresses logging.

---

## Background Workers

### Pending Operations Worker

`tasks/pending-operations-worker.js` is invoked on a cron schedule by `tasks/pending-operation-retry-scheduler.js` (only when `NODE_ENV=production`):

1. Finds all operations with status `pending` via `operationService.findPendingTxs()`
2. For each, fetches the last transaction receipt from the chain
3. If receipt exists and `receipt.status === 1`: updates operation to `completed`, calls `operationService.updateOnTransactionMined()`
4. Otherwise: ensures operation status is `pending` and calls `transactionTrackerService.trackPendingOperation(operation.id, true)` to re-track (which may lead to retry with higher gas via retry-transaction-service)

**Cron:** `PENDING_OPERATIONS_CRON_SCHEDULE`

### Nonce Queue Reinit Scheduler

`tasks/nonce-queue-reinit-scheduler.js` runs on a cron (only when `NODE_ENV=production`):

- Calls `nonceQueueService.reInitNextNonce()` to sync the in-memory nonce queue with the latest nonce from chain and DB.

**Cron:** `REINIT_NONCE_QUEUE_CRON_SCHEDULE`

---

## Important Notes

1. **Operation Deduplication**: If an operation with the same `id` already exists and has transactions, the existing operation's status is returned instead of creating a new transaction.

2. **Operation Status Flow**: 
   - `created` → `pending` → `completed` / `error` / `canceled` / `dropped`

3. **Transaction Simulation**: For operations with `type === 'claim'`, the transaction is simulated before sending to catch contract errors early.

4. **Nonce Management**: 
   - Nonce queue prevents conflicts when sending multiple transactions in parallel
   - Nonce is automatically managed and incremented after successful transaction submission
   - Nonce queue is periodically reinitialized to stay synchronized with blockchain

5. **Transaction Tracking**: 
   - Transactions are automatically tracked after submission
   - Tracker waits for specified number of blocks before checking status
   - Failed transactions are automatically retried with increased gas fees

6. **Transaction Retry Logic**: 
   - When a transaction fails or times out, it's automatically retried
   - Gas fees are increased on retry (by `GWEI_ADDED_ON_RETRY` for gas price, `GWEI_ADDED_TO_PRIORITY_FEE_ON_RETRY` for priority fee)
   - Retry uses the same nonce as the original transaction
   - Only the last transaction in an operation is retried

7. **Transaction Hash Selection**: 
   - When getting operation status, if there's a completed transaction, its hash is returned
   - Otherwise, the hash of the last transaction is returned

8. **Gas / fee management**: 
   - EIP-1559 only (maxFeePerGas, maxPriorityFeePerGas). Fees are capped at `MAX_GAS_PRICE`.
   - If `OPSTACK=true`, fee data comes from `eth_gasPrice` + `GWEI_ADDED_TO_MEDIAN_GAS_PRICE` (set in env and add to stage-config if needed).
   - Otherwise fee data from `provider.getFeeData()`; on RPC failure, defaults are used.

9. **Error handling**: 
   - Contract errors are parsed with registry, airdrop, and semaphore ABIs and mapped to codes (see `error-parser.js` and `configs/error-to-warn.json`).
   - `error-to-warn.json`: `warn: true` → log as warning; `silence: true` → do not log.

10. **Production mode**: 
    - Background workers (nonce queue reinit and pending operations) run only when `NODE_ENV=production`.

11. **Tests**: 
    - Run with `npm run test` (Mocha, timeout 50s). Tests in `test/*.test.js` (e.g. `operation-service.test.js`, `error-parser.test.js`).
