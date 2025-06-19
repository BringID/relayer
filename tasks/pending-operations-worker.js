const logger = require('../src/utils/logger')
const operationService = require('../src/services/operation-service')
const relayerWalletService = require('../src/services/relayer-wallet-service')
const transactionTrackerService = require('../src/services/transaction-tracker-service')

class PendingOperationsWorker {
  constructor () {
    this.isRunning = false
  }

  async retryOperations (operations) {
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i]
      
      try {
        logger.debug(`__PendingOperationsWorker__: Retrying Operation ${operation.id}`)
        logger.json({ service: '__PendingOperationsWorker__:', method: 'retryOperations', operation: operation.id, status: operation.status })
        const transaction = operation.transactions[operation.transactions.length - 1].toObject()
        
        const receipt = await relayerWalletService.getTransactionReceipt(transaction.hash)

        if (receipt?.status === 1) {
          await operationService.updateStatus({ id: operation.id, status: 'completed' })
          logger.warn(`__PendingOperationsWorker__: Operation ${operation.id} was updated with status 'completed' in DB from blockchain.`)
          await operationService.updateOnTransactionMined(operation.id, transaction.hash, receipt)
          continue
        }

        if (operation.status !== 'pending') {
          await operationService.updateStatus({ id: operation.id, status: 'pending' })
        }
        transactionTrackerService.trackPendingOperation(operation.id, true)
      } catch (error) {
        logger.error(`__PendingOperationsWorker__: Error processing operation ${operation.id}:`, error)
        logger.json({ 
          service: '__PendingOperationsWorker__:', 
          method: 'retryOperations', 
          operation: operation.id, 
          error: error.message,
          action: 'skipping_operation_and_continuing'
        })
        // Continue with the next operation
        continue
      }
    }
  }

  async runWorker () {
    logger.debug('__PendingOperationsWorker__: Starting scheduled execution...')

    if (this.isRunning) {
      logger.warn('__PendingOperationsWorker__: Script is already running. Skipping execution.')
      return null
    }

    this.isRunning = true

    try {
      await this._processPendingOperations()
    } catch (err) {
      logger.error('__PendingOperationsWorker__: Caught an error while executing operation.')
      logger.error(err)
    } finally {
      this.isRunning = false
      logger.debug('__PendingOperationsWorker__: execution completed.')
    }
  }

  async _processPendingOperations () {
    const pendingOperations = await operationService.findPendingTxs()
    
    if (pendingOperations.length === 0) {
      logger.debug('__PendingOperationsWorker__: No pending transactions found.')
      return
    }

    logger.warn(`__PendingOperationsWorker__: Found pending operations: ${pendingOperations.length}`)
    await this.retryOperations(pendingOperations)
    logger.info(`__PendingOperationsWorker__: Re-submitted ${pendingOperations.length} pending operations.`)
  }
}

module.exports = new PendingOperationsWorker() 