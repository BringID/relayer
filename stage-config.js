const dotenv = require('dotenv')
const path = require('path')
const version = require('./package.json').version
process.env.DD_GIT_COMMIT_SHA = process.env.HEROKU_SLUG_COMMIT

dotenv.config({
  path: path.resolve(__dirname, `configs/${process.env.NODE_ENV}.env`)
})

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DD_VERSION: version,
  CHAIN: process.env.CHAIN,
  OPSTACK: process.env.OPSTACK,
  PORT: process.env.PORT || 8000,
  CHAIN_ID: process.env.CHAIN_ID,
  mongoURI: process.env.mongoURI,
  API_SECRET: process.env.API_SECRET,
  GAS_STATION: process.env.GAS_STATION,
  JSON_RPC_URL: process.env.JSON_RPC_URL,
  MAX_GAS_PRICE: process.env.MAX_GAS_PRICE,
  MIGRATE_MONGO_URI: process.env.MIGRATE_MONGO_URI,
  DEFAULT_GAS_PRICE: process.env.DEFAULT_GAS_PRICE,
  REQUEST_VALIDATION: process.env.REQUEST_VALIDATION,
  RELAYER_PRIVATE_KEY: process.env.RELAYER_PRIVATE_KEY,
  GWEI_ADDED_ON_RETRY: process.env.GWEI_ADDED_ON_RETRY,
  MIGRATE_MONGO_DB_NAME: process.env.MIGRATE_MONGO_DB_NAME,
  PENDING_TASKS_CRON_SCHEDULE: process.env.PENDING_TASKS_CRON_SCHEDULE,
  GAS_STATION_GAS_PRICE_LEVEL: process.env.GAS_STATION_GAS_PRICE_LEVEL,
  REINIT_NONCE_QUEUE_CRON_SCHEDULE: process.env.REINIT_NONCE_QUEUE_CRON_SCHEDULE,
  DEFAULT_PIORITY_FEE_PER_GAS_PRICE: process.env.DEFAULT_PIORITY_FEE_PER_GAS_PRICE,
  GWEI_ADDED_TO_PRIORITY_FEE_ON_RETRY: process.env.GWEI_ADDED_TO_PRIORITY_FEE_ON_RETRY
}
