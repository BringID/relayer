const stageConfig = require('../../stage-config')
const operationService = require('./operation-service')
const relayerWalletService = require('./relayer-wallet-service')
const retryTransactionService = require('./retry-transaction-service')
const logger = require('../utils/logger')

class TransactionTrackerService {
  constructor () {
    this.trackers = {}
  }

  async waitNBlocks (n) {
    let currentBlock = await relayerWalletService.getBlockNumber()
    const initialBlock = currentBlock
    while ((currentBlock - initialBlock) <= n) {
      currentBlock = await relayerWalletService.getNextBlock()
    }
    return currentBlock
  }

  async _trackPendingOperation (id, retry = true) {
    await this.waitNBlocks(stageConfig.TRACKER_BLOCKS_TO_WAIT)
    const operation = await operationService.findById(id)
    const transactions = operation.transactions
    let tx
    let receipt

    //check if it was mined for each transaction
    for (let i = 0; i < transactions.length; i++) {
      tx = transactions[i]
      logger.debug(`Checking tx ${tx.hash} of operation ${id} to be mined...`)

      // if mined and waited for enough blocknumbers
      receipt = await relayerWalletService.getTransactionReceipt(tx.hash)
      if (receipt) {
        await this.waitNBlocks(stageConfig.TRACKER_BLOCKS_TO_WAIT)
        receipt = await relayerWalletService.getTransactionReceipt(tx.hash)
        if (receipt) {
          return await operationService.updateOnTransactionMined(id, tx.hash, receipt)
        }
      }
    }

    if (!retry) return null

    try {
      await retryTransactionService.retryTransaction(id)
    } catch (err) {
      const message = err?.message || err?.reason || 'Unknown reason'
      const errorTypes = {
        REPLACEMENT_UNDERPRICED: 'Some non-critical error occurred while retrying transaction',
        NONCE_EXPIRED: 'Nonce expired error was thrown while retrying transaction'
      }

      if (errorTypes[err.cause]) {
        logger.warn(`${errorTypes[err.cause]}. Reason: ${message}, cause: ${err.cause}`)
      } else {
        logger.error(`Error occurred while retrying transaction. Reason: ${message}`)
        logger.error(err)
        logger.error(err.stack)
      }
    }

    return await this._trackPendingOperation(id, retry)
  }

  async trackPendingOperation (id, retry = true) {
    logger.debug(`Adding operation ${id} to trackers.`)
    if (!this.trackers[id]) {
      this.trackers[id] = true
      await this._trackPendingOperation(id, retry)
      this.trackers[id] = false
    } else {
      logger.warn(`Tracker not started for operation ${id}, as it's already being tracked.`)
    }
  }
}

module.exports = new TransactionTrackerService()
