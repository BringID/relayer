# BringID Relayer - Project Documentation

## Project Overview

**BringID Relayer** is a Node.js server application designed to execute blockchain operations through a relayer wallet. The server receives operation requests, sends transactions to the blockchain, tracks their status, and automatically retries failed transactions with increased gas fees.

### Purpose

The server manages blockchain operations by:
- Accepting operation execution requests
- Sending transactions to the blockchain via a relayer wallet
- Tracking transaction status and monitoring for completion
- Automatically retrying failed transactions with increased gas fees
- Managing nonce queue to prevent conflicts in parallel transactions
- Simulating transactions for "claim" type operations before sending

### Technology Stack

- **Runtime**: Node.js 20.x
- **Language**: JavaScript (CommonJS)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Blockchain**: Ethers.js v6
- **Validation**: Celebrate (Joi) - optional
- **Logging**: Winston
- **Monitoring**: Datadog (dd-trace)
- **Task Scheduling**: node-cron

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

1. **Routes** (`src/routes/routes.js`): Defines API endpoints
2. **Controllers** (`src/controllers/relayer-controller.js`): Handles HTTP requests/responses
3. **Services**:
   - `relayer-service.js`: Main operation execution logic
   - `operation-service.js`: CRUD operations for operations
   - `relayer-wallet-service.js`: Wallet and transaction management
   - `transaction-tracker-service.js`: Transaction status tracking
   - `retry-transaction-service.js`: Retry failed transactions
   - `nonce-queue-service.js`: Nonce queue management
   - `latest-nonce-service.js`: Get latest nonce from blockchain and database
4. **Workers** (`tasks/`): Background jobs for processing pending operations and reinitializing nonce queue
5. **Models**: MongoDB schemas for Operation and Transaction entities

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

- `AIRDROP_ALREADY_CLAIMED` - Airdrop already claimed for address
- `AIRDROP_STOPPED` - Airdrop is currently stopped
- `AMOUNT_IS_ZERO` - Amount is zero
- `INSUFFICIENT_SCORE` - Insufficient score. Required threshold not met
- `THRESHOLD_IS_ZERO` - Threshold is zero
- `TRANSFER_FAILED` - Token transfer failed
- `SIMULATION_CALL_FAILED` - Simulation call failed while executing operation
- `INVALID_PROOF` - Invalid Semaphore proof
- `MERKLE_TREE_DEPTH_IS_NOT_SUPPORTED` - Merkle tree depth is not supported
- `MERKLE_TREE_ROOT_IS_EXPIRED` - Merkle tree root is expired
- `MERKLE_TREE_ROOT_IS_NOT_PART_OF_THE_GROUP` - Merkle tree root is not part of the group
- `SAME_NULLIFIERS_USED_TWICE` - The same nullifier is being used twice
- `WRONG_SIBLING_NODES` - Wrong sibling nodes in Merkle proof
- `LEAF_ALREADY_EXISTS` - Leaf already exists in the Merkle tree
- `LEAF_CANNOT_BE_ZERO` - Leaf cannot be zero
- `LEAF_DOES_NOT_EXIST` - Leaf does not exist in the Merkle tree
- `LEAF_GREATER_THAN_SNARK_SCALAR_FIELD` - Leaf value is greater than SNARK scalar field
- `CALLER_IS_NOT_THE_GROUP_ADMIN` - Caller is not the group admin
- `CALLER_IS_NOT_THE_PENDING_GROUP_ADMIN` - Caller is not the pending group admin
- `GROUP_DOES_NOT_EXIST` - Group does not exist
- `GROUP_HAS_NO_MEMBERS` - Group has no members

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
    maxPriorityFeePerGas?: string     // EIP-1559: Max priority fee per gas
    maxFeePerGas?: string             // EIP-1559: Max fee per gas
    gasPrice?: string                 // Legacy: Gas price (for non-EIP-1559 networks)
    data?: string                     // Transaction data
    nonce?: number                    // Transaction nonce
  }
  createdAt: Date                    // Transaction creation timestamp
  updatedAt: Date                    // Transaction last update timestamp
}
```

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

Contract errors from blockchain transactions are intercepted and converted to BadRequestError with appropriate error codes. The server recognizes contract errors through ABI parsing (see `src/utils/error-parser.js`) and maps them to application error codes.

**Error Mapping:**
- Contract errors are parsed using ABI interfaces for airdrop and semaphore contracts
- Errors are mapped to standardized error codes (see list in API Endpoints section)
- Error messages include context when available (e.g., address for `AIRDROP_ALREADY_CLAIMED`)

### Error Logging

Some errors are logged as warnings (see `configs/error-to-warn.json`) while others are logged as errors. Silent errors are not logged at all.

---

## Configuration

### Environment Variables

Key configuration options (see `stage-config.js`):

**Server Configuration:**
- `NODE_ENV`: Environment (development, production, test)
- `PORT`: Server port (default: 8000)
- `CUSTOM_PORT`: Alternative port configuration

**Database:**
- `mongoURI`: MongoDB connection string
- `MIGRATE_MONGO_URI`: Migration database URI
- `MIGRATE_MONGO_DB_NAME`: Migration database name

**Authentication:**
- `API_SECRET`: Secret key for API authentication
- `REQUEST_VALIDATION`: Enable/disable request validation ("true"/"false")

**Blockchain:**
- `CHAIN`: Blockchain network identifier
- `CHAIN_ID`: Chain ID
- `OPSTACK`: Whether using OP Stack ("true"/"false")
- `JSON_RPC_URL`: JSON-RPC provider URL
- `RELAYER_PRIVATE_KEY`: Private key for relayer wallet

**Gas Configuration:**
- `MAX_GAS_PRICE`: Maximum gas price in gwei
- `DEFAULT_GAS_PRICE`: Default gas price in gwei
- `DEFAULT_PIORITY_FEE_PER_GAS_PRICE`: Default priority fee per gas in gwei
- `NON_EIP_1559`: Use legacy gas pricing ("true"/"false")
- `GWEI_ADDED_ON_RETRY`: Gwei to add to gas price on retry
- `GWEI_ADDED_TO_PRIORITY_FEE_ON_RETRY`: Gwei to add to priority fee on retry
- `GWEI_ADDED_TO_MEDIAN_GAS_PRICE`: Gwei to add to median gas price from RPC

**Transaction Tracking:**
- `TRACKER_BLOCKS_TO_WAIT`: Number of blocks to wait before checking transaction status

**Scheduling:**
- `PENDING_OPERATIONS_CRON_SCHEDULE`: Cron schedule for pending operations worker
- `REINIT_NONCE_QUEUE_CRON_SCHEDULE`: Cron schedule for nonce queue reinitialization

**Monitoring:**
- `DD_VERSION`: Datadog version (from package.json version)

**Default Database Name:**
- If `mongoURI` is not provided, defaults to: `mongodb://127.0.0.1:27017/dev_bringid_relayer_db`

### Error Configuration

Error logging behavior is configured in `configs/error-to-warn.json`:
- `warn: true` - Log error as warning instead of error
- `silence: true` - Don't log error at all

---

## Background Workers

### Pending Operations Worker

The `pending-operations-worker.js` processes pending operations on a cron schedule:

1. Finds all operations with status `pending`
2. Checks transaction receipt in blockchain for each operation
3. Updates operation status to `completed` if transaction was successful
4. Re-tracks operations that are still pending
5. Updates transaction statuses accordingly

**Scheduler:** `tasks/pending-operation-retry-scheduler.js`
- Runs on schedule defined by `PENDING_OPERATIONS_CRON_SCHEDULE`

### Nonce Queue Reinit Scheduler

The `nonce-queue-reinit-scheduler.js` reinitializes the nonce queue on a cron schedule:

1. Gets latest nonce from blockchain and database
2. Updates nonce queue service with the maximum nonce value
3. Ensures nonce queue stays synchronized with blockchain state

**Scheduler:** `tasks/nonce-queue-reinit-scheduler.js`
- Runs on schedule defined by `REINIT_NONCE_QUEUE_CRON_SCHEDULE`

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

8. **Gas Price Management**: 
   - Supports both EIP-1559 and legacy gas pricing
   - Gas prices are capped at `MAX_GAS_PRICE`
   - For OP Stack networks, gas price is fetched from RPC and adjusted
   - Default gas prices are used if RPC fetch fails

9. **Error Handling**: 
   - Contract errors are parsed using contract ABIs and mapped to error codes
   - Some errors are logged as warnings (non-critical) while others are logged as errors
   - Silent errors are not logged at all (see `error-to-warn.json`)

10. **Production Mode**: 
    - Background workers (nonce queue reinit and pending operations) only run in production mode (`NODE_ENV=production`)
